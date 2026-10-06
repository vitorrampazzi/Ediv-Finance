import nodemailer from "nodemailer";
import { config } from "./config.js";

export const smtp = config.smtpUrl
  ? nodemailer.createTransport({
      url: config.smtpUrl,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
  : null;

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

export function accountEmail({ heading, introduction, link, action }) {
  const safeLink = escapeHtml(link);
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif;color:#303641"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#fff;border-radius:16px"><tr><td style="padding:32px"><p style="color:#287f7d;font-weight:bold">Ediv Finance · Escola do Dividendo</p><h1 style="font-size:24px">${escapeHtml(heading)}</h1><p style="line-height:1.7">${escapeHtml(introduction)}</p><p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;background:#287f7d;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(action)}</a></p><p style="font-size:14px;line-height:1.7">O link vale por 30 minutos. Se o botão não abrir, copie o endereço abaixo para o navegador:</p><p style="word-break:break-all;font-size:12px"><a href="${safeLink}" style="color:#287f7d">${safeLink}</a></p><hr style="border:0;border-top:1px solid #e5e7eb"><p style="font-size:12px;line-height:1.7;color:#606875">Se você não fez esta solicitação, ignore a mensagem. A Ediv não pede senha da corretora ou dados bancários por e-mail.</p></td></tr></table></td></tr></table></body></html>`;
}

export function emailConfiguration() {
  // Credentials, SMTP URL and verification tokens never enter this response.
  const match = config.mailFrom?.match(/@([a-z0-9.-]+\.[a-z]{2,})(?:>|\s|$)/i);
  const senderDomain = match?.[1].toLowerCase() || null;
  return {
    configured: Boolean(smtp && match),
    senderDomain,
    testOnly: senderDomain === "resend.dev",
  };
}

export function registrationAvailability() {
  const email = emailConfiguration();
  const available =
    !config.isProduction ||
    config.isQaDeployment ||
    (email.configured && !email.testOnly);
  return {
    available,
    message: available
      ? ""
      : "Novos cadastros estão em preparação enquanto configuramos a confirmação por e-mail. Você já pode explorar o mercado, a primeira aula e o glossário. Quem tem conta confirmada pode continuar entrando normalmente.",
  };
}

export async function verifyEmailConnection() {
  const configuration = emailConfiguration();
  const checkedAt = new Date().toISOString();
  if (!configuration.configured)
    return {
      status: "missing",
      checkedAt,
      message:
        "Configure SMTP_URL e um MAIL_FROM válido no ambiente correto da Vercel.",
    };
  try {
    await smtp.verify();
    return {
      status: "connected",
      checkedAt,
      message:
        "Conexão e autenticação SMTP confirmadas. Falta confirmar a entrega de um cadastro na caixa de entrada e a autorização do domínio no provedor.",
    };
  } catch (error) {
    const message =
      error.code === "EAUTH"
        ? "O provedor recusou a autenticação. Confira a credencial SMTP na Vercel."
        : "Não foi possível conectar ao serviço de e-mail. Confira host, porta, TLS e disponibilidade do provedor.";
    return { status: "error", checkedAt, message };
  }
}
