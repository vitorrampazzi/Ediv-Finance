import { config } from "./config.js";

const expectedHostnames = new Set(
  config.appOrigins.map((origin) => new URL(origin).hostname),
);

export async function requireRegistrationChallenge(req, res, next) {
  if (!config.registrationEnabled)
    return res
      .status(503)
      .json({ error: "Novos cadastros estão temporariamente indisponíveis." });
  if (!config.turnstileSiteKey && !config.turnstileSecretKey) return next();
  if (!config.turnstileSiteKey || !config.turnstileSecretKey)
    return res
      .status(503)
      .json({ error: "Novos cadastros estão temporariamente indisponíveis." });

  const token = req.body?.challengeToken;
  if (typeof token !== "string" || !token.trim() || token.length > 2048)
    return res
      .status(400)
      .json({
        error: "Conclua a verificação de segurança antes de criar a conta.",
      });

  let result;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: config.turnstileSecretKey,
          response: token,
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) throw new Error("Challenge provider unavailable");
    result = await response.json();
    if (
      result?.["error-codes"]?.some?.((code) =>
        [
          "internal-error",
          "missing-input-secret",
          "invalid-input-secret",
        ].includes(code),
      )
    )
      throw new Error("Challenge provider unavailable");
  } catch {
    return res
      .status(503)
      .json({
        error:
          "A verificação de segurança está indisponível. Tente novamente em alguns instantes.",
      });
  }
  if (
    result?.success !== true ||
    result.action !== "register" ||
    !expectedHostnames.has(result.hostname)
  )
    return res
      .status(400)
      .json({
        error:
          "A verificação de segurança expirou ou não foi concluída. Tente novamente.",
      });

  // The registration schema is strict: this transport field never reaches it.
  delete req.body.challengeToken;
  return next();
}
