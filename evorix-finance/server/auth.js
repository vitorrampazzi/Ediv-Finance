import { randomBytes, randomUUID, createHash } from "node:crypto";
import argon2 from "argon2";
import nodemailer from "nodemailer";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { config } from "./config.js";
import { pool } from "./database.js";
import { MysqlLimitStore } from "./limit-store.js";

const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const dummyPasswordHash = argon2.hash(randomBytes(32), ARGON_OPTIONS);
const smtp = config.smtpUrl ? nodemailer.createTransport(config.smtpUrl) : null;
const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(12)
    .max(128)
    .refine((value) => Buffer.byteLength(value, "utf8") <= 1024),
});
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});
const verificationSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,50}$/),
});
const emailOnlySchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
});

const registrationLimiter = rateLimit({
  store: new MysqlLimitStore("register"),
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  },
});
const loginLimiter = rateLimit({
  store: new MysqlLimitStore("login"),
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.",
  },
});
const verificationLimiter = rateLimit({
  store: new MysqlLimitStore("verify"),
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  },
});
const accountDeletionLimiter = rateLimit({
  store: new MysqlLimitStore("delete-account"),
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Muitas tentativas de exclusão. Aguarde alguns minutos e tente novamente.",
  },
});

const digest = (value) => createHash("sha256").update(value).digest("hex");
const makeOpaqueToken = () => randomBytes(32).toString("base64url");

function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success)
    return { error: "Confira os dados informados e tente novamente." };
  return { data: result.data };
}

function verificationUrl(token) {
  const url = new URL("/verificar", config.appBaseUrl);
  url.hash = token;
  return url.toString();
}

async function makeVerificationToken(userId) {
  const token = makeOpaqueToken();
  await pool.execute(
    "DELETE FROM email_verification_tokens WHERE user_id = ? AND consumed_at IS NULL",
    [userId],
  );
  await pool.execute(
    `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 MINUTE))`,
    [randomUUID(), userId, digest(token)],
  );
  return token;
}

async function sendVerification(email, name, token) {
  const link = verificationUrl(token);
  if (!smtp) return { developmentUrl: link };

  await smtp.sendMail({
    from: config.mailFrom,
    to: email,
    subject: "Confirme seu e-mail — Ediv Finance",
    text: `Olá, ${name}.\n\nPara confirmar seu endereço de e-mail, abra este link em até 30 minutos:\n${link}\n\nSe você não solicitou este cadastro, ignore esta mensagem.`,
  });
  return {};
}

function getCookie(req, name) {
  const prefix = `${name}=`;
  const entry = req.headers.cookie
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

function clearSessionCookie(res) {
  res.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "strict",
    path: "/",
  });
}

function setSessionCookie(res, token) {
  res.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "strict",
    path: "/",
  });
}

const publicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  emailVerified: Boolean(row.email_verified_at),
  createdAt: row.created_at,
});

export async function currentUser(req) {
  const token = getCookie(req, config.sessionCookieName);
  if (!token || !SESSION_TOKEN_PATTERN.test(token)) return null;

  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.email_verified_at, u.created_at
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP(3) AND u.email_verified_at IS NOT NULL
     LIMIT 1`,
    [digest(token)],
  );
  return rows[0] ? publicUser(rows[0]) : null;
}

export async function requireAuthenticatedUser(req, res, next) {
  const user = await currentUser(req);
  if (!user)
    return res
      .status(401)
      .json({ error: "Entre na sua conta para continuar." });
  req.authenticatedUser = user;
  return next();
}

router.post("/register", registrationLimiter, async (req, res) => {
  const parsed = parseBody(registerSchema, req.body);
  if (parsed.error) return res.status(400).json(parsed);

  const { name, email, password } = parsed.data;
  const userId = randomUUID();
  const passwordHash = await argon2.hash(password, ARGON_OPTIONS);

  try {
    await pool.execute(
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
      [userId, name, email, passwordHash],
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(202)
        .json({
          message:
            "Se o endereço puder ser cadastrado, enviaremos as próximas instruções por e-mail.",
        });
    }
    throw error;
  }

  const token = await makeVerificationToken(userId);
  let delivery;
  try {
    delivery = await sendVerification(email, name, token);
  } catch (error) {
    console.error(
      "Verification email delivery failed:",
      error.code || "mail transport error",
    );
    return res
      .status(503)
      .json({
        error:
          "Não foi possível enviar o e-mail de confirmação. Tente novamente mais tarde.",
      });
  }

  return res.status(202).json({
    message: "Cadastro recebido. Confirme seu e-mail antes de entrar.",
    ...(delivery.developmentUrl
      ? { verificationUrl: delivery.developmentUrl }
      : {}),
  });
});

router.post("/verification/resend", verificationLimiter, async (req, res) => {
  const parsed = parseBody(emailOnlySchema, req.body);
  if (parsed.error) return res.status(400).json(parsed);

  const [rows] = await pool.execute(
    "SELECT id, name, email FROM users WHERE email = ? AND email_verified_at IS NULL LIMIT 1",
    [parsed.data.email],
  );
  let developmentUrl;
  if (rows[0]) {
    const token = await makeVerificationToken(rows[0].id);
    try {
      ({ developmentUrl } = await sendVerification(
        rows[0].email,
        rows[0].name,
        token,
      ));
    } catch (error) {
      console.error(
        "Verification email delivery failed:",
        error.code || "mail transport error",
      );
      return res
        .status(503)
        .json({
          error:
            "Não foi possível enviar o e-mail de confirmação. Tente novamente mais tarde.",
        });
    }
  }

  return res.status(202).json({
    message:
      "Se houver um cadastro pendente para esse endereço, enviaremos um novo link.",
    ...(developmentUrl ? { verificationUrl: developmentUrl } : {}),
  });
});

router.post("/verify-email", verificationLimiter, async (req, res) => {
  const parsed = parseBody(verificationSchema, req.body);
  if (parsed.error) return res.status(400).json(parsed);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, user_id FROM email_verification_tokens
       WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP(3)
       LIMIT 1 FOR UPDATE`,
      [digest(parsed.data.token)],
    );
    if (!rows[0]) {
      await connection.rollback();
      return res
        .status(400)
        .json({
          error:
            "O link expirou ou já foi usado. Solicite um novo link de confirmação.",
        });
    }

    await connection.execute(
      "UPDATE users SET email_verified_at = UTC_TIMESTAMP(3) WHERE id = ?",
      [rows[0].user_id],
    );
    await connection.execute(
      "UPDATE email_verification_tokens SET consumed_at = UTC_TIMESTAMP(3) WHERE id = ?",
      [rows[0].id],
    );
    await connection.commit();
    return res
      .status(200)
      .json({
        message: "E-mail confirmado. Agora você pode entrar na sua conta.",
      });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const parsed = parseBody(loginSchema, req.body);
  if (parsed.error) return res.status(400).json(parsed);

  const { email, password } = parsed.data;
  const [rows] = await pool.execute(
    "SELECT id, name, email, password_hash, email_verified_at, created_at FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  const user = rows[0];
  const storedHash = user ? user.password_hash : await dummyPasswordHash;
  const isValidPassword = await argon2.verify(storedHash, password);

  if (!user || !isValidPassword || !user.email_verified_at) {
    return res
      .status(401)
      .json({
        error: "E-mail ou senha incorretos, ou e-mail ainda não confirmado.",
      });
  }

  const rawSession = makeOpaqueToken();
  const expiresAt = new Date(Date.now() + config.sessionHours * 60 * 60 * 1000);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [locked] = await connection.execute(
      "SELECT password_hash FROM users WHERE id = ? FOR UPDATE",
      [user.id],
    );
    if (!locked[0] || locked[0].password_hash !== storedHash) {
      await connection.rollback();
      return res
        .status(401)
        .json({
          error: "O acesso mudou. Entre novamente com sua senha atual.",
        });
    }
    await connection.execute(
      "INSERT INTO user_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [randomUUID(), user.id, digest(rawSession), expiresAt],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  setSessionCookie(res, rawSession);
  return res.status(200).json({ user: publicUser(user) });
});

router.get("/me", async (req, res) => {
  const user = await currentUser(req);
  if (!user)
    return res
      .status(401)
      .json({ error: "Entre na sua conta para continuar." });
  return res.status(200).json({ user });
});

router.delete(
  "/me",
  accountDeletionLimiter,
  requireAuthenticatedUser,
  async (req, res) => {
    const parsed = z
      .object({
        password: z.string().min(1).max(128),
        confirmation: z.literal("EXCLUIR"),
      })
      .safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({
          error:
            "Confirme a exclusão digitando EXCLUIR e informe sua senha atual.",
        });

    const [users] = await pool.execute(
      "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
      [req.authenticatedUser.id],
    );
    if (
      !users[0] ||
      !(await argon2.verify(users[0].password_hash, parsed.data.password))
    ) {
      return res
        .status(401)
        .json({
          error: "Senha incorreta. Confira a senha atual da sua conta.",
        });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [locked] = await connection.execute(
        "SELECT password_hash FROM users WHERE id = ? FOR UPDATE",
        [req.authenticatedUser.id],
      );
      if (!locked[0] || locked[0].password_hash !== users[0].password_hash) {
        await connection.rollback();
        return res
          .status(401)
          .json({ error: "Sua senha mudou. Confirme a senha atual." });
      }
      const [result] = await connection.execute(
        "DELETE FROM users WHERE id = ?",
        [req.authenticatedUser.id],
      );
      if (result.affectedRows !== 1) {
        await connection.rollback();
        return res
          .status(401)
          .json({
            error:
              "Não foi possível confirmar sua conta. Entre novamente e tente de novo.",
          });
      }
      await connection.commit();
      clearSessionCookie(res);
      return res.status(204).end();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
);

const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  store: new MysqlLimitStore("password-recovery"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Aguarde alguns minutos antes de solicitar outro link." },
});

router.post("/password/forgot", recoveryLimiter, async (req, res) => {
  const parsed = emailOnlySchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Informe um e-mail válido." });
  const [rows] = await pool.execute(
    "SELECT id, email FROM users WHERE email = ? AND email_verified_at IS NOT NULL",
    [parsed.data.email],
  );
  let developmentUrl;
  if (rows[0]) {
    const token = makeOpaqueToken();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute("SELECT id FROM users WHERE id = ? FOR UPDATE", [
        rows[0].id,
      ]);
      await connection.execute(
        "DELETE FROM password_reset_tokens WHERE user_id = ?",
        [rows[0].id],
      );
      await connection.execute(
        "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 MINUTE))",
        [randomUUID(), rows[0].id, digest(token)],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    const url = new URL("/redefinir-senha", config.appBaseUrl);
    url.hash = token;
    if (smtp) {
      try {
        await smtp.sendMail({
          from: config.mailFrom,
          to: rows[0].email,
          subject: "Redefina sua senha — Ediv Finance",
          text: `Use o link em até 30 minutos: ${url}\nSe não solicitou, ignore. Sua senha não mudou.`,
        });
      } catch (error) {
        console.error(
          "Password recovery delivery failed:",
          error.code || "transport error",
        );
      }
    } else if (!config.isProduction) developmentUrl = String(url);
  }
  return res
    .status(202)
    .json({
      message:
        "Se houver uma conta confirmada para esse e-mail, enviaremos um link de recuperação.",
      ...(developmentUrl ? { developmentUrl } : {}),
    });
});

router.post("/password/reset", recoveryLimiter, async (req, res) => {
  const parsed = z
    .object({
      token: verificationSchema.shape.token,
      password: registerSchema.shape.password,
    })
    .safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({
        error: "Confira o link e use uma senha de 12 a 128 caracteres.",
      });
  const hash = await argon2.hash(parsed.data.password, ARGON_OPTIONS);
  const [tokenRows] = await pool.execute(
    "SELECT user_id FROM password_reset_tokens WHERE token_hash = ?",
    [digest(parsed.data.token)],
  );
  if (!tokenRows[0])
    return res
      .status(400)
      .json({ error: "O link expirou ou já foi usado. Solicite outro." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("SELECT id FROM users WHERE id = ? FOR UPDATE", [
      tokenRows[0].user_id,
    ]);
    const [tokens] = await connection.execute(
      "SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP(3) FOR UPDATE",
      [digest(parsed.data.token)],
    );
    if (!tokens[0]) {
      await connection.rollback();
      return res
        .status(400)
        .json({ error: "O link expirou ou já foi usado. Solicite outro." });
    }
    await connection.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [hash, tokens[0].user_id],
    );
    await connection.execute("DELETE FROM user_sessions WHERE user_id = ?", [
      tokens[0].user_id,
    ]);
    await connection.execute(
      "DELETE FROM password_reset_tokens WHERE user_id = ?",
      [tokens[0].user_id],
    );
    await connection.commit();
    clearSessionCookie(res);
    return res.json({
      message:
        "Senha atualizada. Entre novamente; as sessões anteriores foram encerradas.",
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.post(
  "/password/change",
  recoveryLimiter,
  requireAuthenticatedUser,
  async (req, res) => {
    const parsed = z
      .object({
        currentPassword: loginSchema.shape.password,
        password: registerSchema.shape.password,
      })
      .safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({
          error: "Confira a senha atual e use ao menos 12 caracteres na nova.",
        });
    const hash = await argon2.hash(parsed.data.password, ARGON_OPTIONS);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute(
        "SELECT password_hash FROM users WHERE id = ? FOR UPDATE",
        [req.authenticatedUser.id],
      );
      if (
        !rows[0] ||
        !(await argon2.verify(
          rows[0].password_hash,
          parsed.data.currentPassword,
        ))
      ) {
        await connection.rollback();
        return res.status(401).json({ error: "Senha atual incorreta." });
      }
      await connection.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [hash, req.authenticatedUser.id],
      );
      await connection.execute("DELETE FROM user_sessions WHERE user_id = ?", [
        req.authenticatedUser.id,
      ]);
      await connection.execute(
        "DELETE FROM password_reset_tokens WHERE user_id = ?",
        [req.authenticatedUser.id],
      );
      await connection.commit();
      clearSessionCookie(res);
      return res.json({
        message: "Senha alterada e sessões encerradas. Entre novamente.",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
);

router.post(
  "/sessions/revoke",
  recoveryLimiter,
  requireAuthenticatedUser,
  async (req, res) => {
    await pool.execute("DELETE FROM user_sessions WHERE user_id = ?", [
      req.authenticatedUser.id,
    ]);
    clearSessionCookie(res);
    return res.status(204).end();
  },
);

router.get("/export", requireAuthenticatedUser, async (req, res) => {
  const userId = req.authenticatedUser.id;
  const queries = [
    [
      "transactions",
      "SELECT id, side, ticker, asset_name, asset_type, quantity, unit_price, fees, traded_at FROM portfolio_transactions WHERE user_id = ? ORDER BY traded_at, created_at, id",
    ],
    [
      "events",
      "SELECT id, ticker, kind, amount, factor, occurred_at, status, note FROM portfolio_events WHERE user_id = ? ORDER BY occurred_at",
    ],
    [
      "favorites",
      "SELECT ticker, created_at FROM user_favorites WHERE user_id = ?",
    ],
    [
      "preferences",
      "SELECT risk_profile, email_notifications, whatsapp_notifications FROM user_preferences WHERE user_id = ?",
    ],
    [
      "financialSummary",
      "SELECT declared_invested_amount FROM user_financial_summaries WHERE user_id = ?",
    ],
    [
      "conversations",
      "SELECT id, subject, status, share_portfolio, created_at FROM support_threads WHERE user_id = ?",
    ],
    [
      "messages",
      "SELECT m.thread_id, m.is_staff, m.body, m.created_at FROM support_messages m JOIN support_threads t ON t.id = m.thread_id WHERE t.user_id = ? ORDER BY m.created_at, m.id",
    ],
  ];
  const data = {
    exportedAt: new Date().toISOString(),
    profile: req.authenticatedUser,
  };
  for (const [name, query] of queries) {
    const [rows] = await pool.execute(query, [userId]);
    data[name] = rows;
  }
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="ediv-meus-dados.json"',
  );
  return res.json(data);
});

router.post("/logout", async (req, res) => {
  const token = getCookie(req, config.sessionCookieName);
  if (token && SESSION_TOKEN_PATTERN.test(token)) {
    await pool.execute("DELETE FROM user_sessions WHERE token_hash = ?", [
      digest(token),
    ]);
  }
  clearSessionCookie(res);
  return res.status(204).end();
});

export const authRouter = router;
