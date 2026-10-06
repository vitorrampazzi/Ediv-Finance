import { randomUUID } from "node:crypto";
import { pool } from "./database.js";
import { config } from "./config.js";
import { lockAccessControl, activeAdministratorCount } from "./permissions.js";

const [mode, rawEmail] = process.argv.slice(2);
let connection;
let message;
try {
  connection = await pool.getConnection();
  await connection.beginTransaction();
  await lockAccessControl(connection);
  if (mode === "legacy") {
    const [controls] = await connection.execute(
      "SELECT legacy_imported FROM admin_control WHERE id=1",
    );
    if (controls[0].legacy_imported)
      message = "A migração dos acessos antigos já foi realizada.";
    else {
      let count = 0;
      for (const email of config.rankingAdminEmails) {
        const [rows] = await connection.execute(
          "SELECT u.id,a.role,a.blocked_at FROM users u LEFT JOIN user_access a ON a.user_id=u.id WHERE u.email=? AND u.email_verified_at IS NOT NULL FOR UPDATE",
          [email],
        );
        if (
          !rows[0] ||
          (rows[0].role && rows[0].role !== "USER") ||
          rows[0].blocked_at
        )
          continue;
        const id = rows[0].id;
        await connection.execute(
          "INSERT INTO user_access(user_id,role) VALUES(?,'ANALYST') ON DUPLICATE KEY UPDATE role='ANALYST'",
          [id],
        );
        await connection.execute("DELETE FROM user_sessions WHERE user_id=?", [
          id,
        ]);
        await connection.execute(
          "INSERT INTO admin_audit_events(id,target_id,action,before_state,after_state) VALUES(?,?,'LEGACY_STAFF_IMPORTED',?,?)",
          [
            randomUUID(),
            id,
            JSON.stringify({ role: "USER", blocked: false }),
            JSON.stringify({ role: "ANALYST", blocked: false }),
          ],
        );
        count++;
      }
      await connection.execute(
        "UPDATE admin_control SET legacy_imported=TRUE WHERE id=1",
      );
      message = `Acessos antigos preservados: ${count} conta(s) de Analista.`;
    }
  } else if (mode === "admin" && rawEmail?.includes("@")) {
    const email = rawEmail.trim().toLowerCase();
    const [rows] = await connection.execute(
      "SELECT u.id,u.email_verified_at,a.role,a.blocked_at FROM users u LEFT JOIN user_access a ON a.user_id=u.id WHERE u.email=? FOR UPDATE",
      [email],
    );
    const target = rows[0];
    if (!target)
      throw new Error(
        "A conta informada não foi encontrada. Cadastre-a pelo site antes de configurar o primeiro Administrador.",
      );
    if (!target.email_verified_at || target.blocked_at)
      throw new Error("A conta precisa ter o e-mail confirmado e estar ativa.");
    if (target.role === "ADMIN") message = "Essa conta já é Administrador.";
    else {
      if ((await activeAdministratorCount(connection)) > 0)
        throw new Error(
          "Já existe Administrador ativo. Use o painel para conceder os próximos acessos.",
        );
      await connection.execute(
        "INSERT INTO user_access(user_id,role) VALUES(?,'ADMIN') ON DUPLICATE KEY UPDATE role='ADMIN'",
        [target.id],
      );
      await connection.execute("DELETE FROM user_sessions WHERE user_id=?", [
        target.id,
      ]);
      await connection.execute(
        "INSERT INTO admin_audit_events(id,target_id,action,before_state,after_state) VALUES(?,?,'ADMIN_BOOTSTRAPPED',?,?)",
        [
          randomUUID(),
          target.id,
          JSON.stringify({ role: target.role || "USER", blocked: false }),
          JSON.stringify({ role: "ADMIN", blocked: false }),
        ],
      );
      message =
        "Primeiro Administrador configurado. Entre novamente no site após publicar o código atualizado.";
    }
  } else throw new Error("Use: server/setup-access.js legacy | admin <email>");
  await connection.commit();
  console.info(message);
} catch (error) {
  if (connection) await connection.rollback().catch(() => {});
  console.error(
    error.code
      ? `Não foi possível configurar os acessos: ${error.code}`
      : error.message,
  );
  process.exitCode = 1;
} finally {
  connection?.release();
  await pool.end();
}
