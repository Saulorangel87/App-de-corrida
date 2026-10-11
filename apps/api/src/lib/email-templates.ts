import type { Email } from "./mailer";

export type Lang = "pt-BR" | "en";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** `lines[0]` é a saudação (vira o título); as demais viram parágrafos. */
type Content = { subject: string; lines: string[]; link?: { url: string; label: string } };

// Identidade do app (apps/web/src/index.css). O botão usa o laranja mais escuro do app (#C2410C)
// para o texto branco passar de 4,5:1 de contraste; o laranja da marca fica na faixa do topo.
const BRAND = "Let's Go Run";
const copy = {
  "pt-BR": {
    fallback: "Se o botão não abrir, copie e cole este endereço no navegador:",
    footer: `Este é um e-mail automático do ${BRAND}; não responda a esta mensagem.`,
  },
  en: {
    fallback: "If the button doesn't open, copy and paste this address into your browser:",
    footer: `This is an automatic email from ${BRAND}; please don't reply to it.`,
  },
} satisfies Record<Lang, { fallback: string; footer: string }>;

// E-mail não carrega CSS externo e muitos clientes ignoram <style>: o visual vai em estilos inline,
// com tabelas. O <style> só acrescenta o modo escuro e o ajuste para telas pequenas, onde há suporte.
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const DARK_AND_MOBILE = `
:root{color-scheme:light dark;supported-color-schemes:light dark}
@media (max-width:620px){.pad{padding-left:20px!important;padding-right:20px!important}}
@media (prefers-color-scheme:dark){
  body,.bg{background:#0F172A!important}
  .card{background:#111827!important;border-color:#1F2937!important}
  .title,.brand{color:#F9FAFB!important}
  .txt{color:#E5E7EB!important}
  .muted{color:#94A3B8!important}
  .btn{background:#FF5A1F!important}
  .btn a{color:#0F172A!important}
  .rule{border-color:#1F2937!important}
}`;

function render(lang: Lang, to: string, c: Content): Email {
  const t = copy[lang];
  const [greeting = "", ...body] = c.lines;
  const paragraphs = body
    .map((l) => `<p class="txt" style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#374151">${escapeHtml(l)}</p>`)
    .join("");
  const action = c.link
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr>` +
      `<td class="btn" bgcolor="#C2410C" style="border-radius:10px;background:#C2410C">` +
      `<a href="${escapeHtml(c.link.url)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(c.link.label)}</a>` +
      `</td></tr></table>` +
      `<p class="muted" style="margin:0 0 4px;font-size:13px;line-height:1.5;color:#64748B">${escapeHtml(t.fallback)}</p>` +
      `<p class="muted" style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748B;word-break:break-all">${escapeHtml(c.link.url)}</p>`
    : "";
  const preheader = escapeHtml(body[0] ?? greeting);
  const html =
    `<!doctype html><html lang="${lang === "en" ? "en" : "pt-BR"}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">` +
    `<title>${escapeHtml(c.subject)}</title><style>${DARK_AND_MOBILE}</style></head>` +
    `<body style="margin:0;padding:0;background:#F5F6F8;font-family:${FONT}">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px">${preheader}</div>` +
    `<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F6F8"><tr><td align="center" style="padding:24px 12px">` +
    `<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden">` +
    `<tr><td style="height:4px;line-height:4px;font-size:0;background:#FF5A1F" bgcolor="#FF5A1F">&nbsp;</td></tr>` +
    `<tr><td class="pad" style="padding:28px 32px 8px"><span class="brand" style="font-size:20px;font-weight:800;letter-spacing:-0.3px;color:#111827">${escapeHtml(BRAND)}</span></td></tr>` +
    `<tr><td class="pad" style="padding:8px 32px 8px">` +
    `<h1 class="title" style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:#111827">${escapeHtml(greeting)}</h1>` +
    `${paragraphs}${action}</td></tr>` +
    `<tr><td class="pad" style="padding:8px 32px 28px"><p class="muted rule" style="margin:0;padding-top:16px;border-top:1px solid #E5E7EB;font-size:12px;line-height:1.5;color:#64748B">${escapeHtml(t.footer)}</p></td></tr>` +
    `</table></td></tr></table></body></html>`;
  const text = [...c.lines, ...(c.link ? [`${c.link.label}: ${c.link.url}`] : [])].join("\n\n");
  return { to, subject: c.subject, html, text };
}

const hi = (lang: Lang, name: string) => (lang === "en" ? `Hi, ${name}!` : `Olá, ${name}!`);

export const templates = {
  verifyEmail: (lang: Lang, to: string, name: string, url: string) =>
    render(lang, to, lang === "en"
      ? { subject: "Confirm your email – Let's Go Run", lines: [hi(lang, name), "Confirm your email to start using Let's Go Run. The link expires in 24 hours."], link: { url, label: "Confirm email" } }
      : { subject: "Confirme seu e-mail – Let's Go Run", lines: [hi(lang, name), "Confirme seu e-mail para começar a usar o Let's Go Run. O link vale por 24 horas."], link: { url, label: "Confirmar e-mail" } }),

  alreadyRegistered: (lang: Lang, to: string, name: string, loginUrl: string, resetUrl: string) =>
    render(lang, to, lang === "en"
      ? { subject: "You already have a Let's Go Run account", lines: [hi(lang, name), "Someone tried to sign up with this email, but you already have an account. If it was you, just log in. Forgot your password? Reset it here: " + resetUrl, "If it wasn't you, you can ignore this email."], link: { url: loginUrl, label: "Log in" } }
      : { subject: "Você já tem uma conta no Let's Go Run", lines: [hi(lang, name), "Alguém tentou se cadastrar com este e-mail, mas você já tem uma conta. Se foi você, é só entrar. Esqueceu a senha? Redefina aqui: " + resetUrl, "Se não foi você, pode ignorar este e-mail."], link: { url: loginUrl, label: "Entrar" } }),

  resetPassword: (lang: Lang, to: string, name: string, url: string) =>
    render(lang, to, lang === "en"
      ? { subject: "Reset your password – Let's Go Run", lines: [hi(lang, name), "Use the link below to choose a new password. It expires in 60 minutes and works only once.", "If you didn't ask for this, ignore this email; your password stays the same."], link: { url, label: "Reset password" } }
      : { subject: "Redefinir sua senha – Let's Go Run", lines: [hi(lang, name), "Use o link abaixo para escolher uma nova senha. Ele vale por 60 minutos e só funciona uma vez.", "Se você não pediu, ignore este e-mail; sua senha continua a mesma."], link: { url, label: "Redefinir senha" } }),

  passwordChanged: (lang: Lang, to: string, name: string, resetUrl: string) =>
    render(lang, to, lang === "en"
      ? { subject: "Your Let's Go Run password was changed", lines: [hi(lang, name), "Your password was changed and all sessions were signed out.", "If it wasn't you, reset your password now."], link: { url: resetUrl, label: "Reset password" } }
      : { subject: "Sua senha do Let's Go Run foi alterada", lines: [hi(lang, name), "Sua senha foi alterada e todas as sessões foram encerradas.", "Se não foi você, redefina a senha agora."], link: { url: resetUrl, label: "Redefinir senha" } }),

  confirmNewEmail: (lang: Lang, to: string, name: string, url: string) =>
    render(lang, to, lang === "en"
      ? { subject: "Confirm your new email – Let's Go Run", lines: [hi(lang, name), "You asked to use this email address for your Let's Go Run account. Confirm to finish the change. The link expires in 60 minutes and works only once.", "If you didn't ask for this, ignore this email; nothing changes."], link: { url, label: "Confirm new email" } }
      : { subject: "Confirme seu novo e-mail – Let's Go Run", lines: [hi(lang, name), "Você pediu para usar este endereço na sua conta do Let's Go Run. Confirme para concluir a troca. O link vale por 60 minutos e só funciona uma vez.", "Se você não pediu, ignore este e-mail; nada muda."], link: { url, label: "Confirmar novo e-mail" } }),

  emailChangeRequested: (lang: Lang, to: string, name: string, newEmailHint: string, resetUrl: string) =>
    render(lang, to, lang === "en"
      ? { subject: "Email change requested – Let's Go Run", lines: [hi(lang, name), `Someone asked to change the email of your account to ${newEmailHint}. Nothing changes until that address is confirmed.`, "If it wasn't you, reset your password now."], link: { url: resetUrl, label: "Reset password" } }
      : { subject: "Pedido de troca de e-mail – Let's Go Run", lines: [hi(lang, name), `Alguém pediu para trocar o e-mail da sua conta para ${newEmailHint}. Nada muda até que esse endereço seja confirmado.`, "Se não foi você, redefina a senha agora."], link: { url: resetUrl, label: "Redefinir senha" } }),

  emailChanged: (lang: Lang, to: string, name: string, newEmailHint: string, resetUrl: string) =>
    render(lang, to, lang === "en"
      ? { subject: "Your Let's Go Run email was changed", lines: [hi(lang, name), `The email of your account is now ${newEmailHint} and all sessions were signed out.`, "If it wasn't you, reset your password now."], link: { url: resetUrl, label: "Reset password" } }
      : { subject: "Seu e-mail do Let's Go Run foi alterado", lines: [hi(lang, name), `O e-mail da sua conta agora é ${newEmailHint} e todas as sessões foram encerradas.`, "Se não foi você, redefina a senha agora."], link: { url: resetUrl, label: "Redefinir senha" } }),

  accountLocked: (lang: Lang, to: string, name: string, minutes: number, resetUrl: string) =>
    render(lang, to, lang === "en"
      ? { subject: "Login temporarily blocked – Let's Go Run", lines: [hi(lang, name), `After several wrong password attempts, login to your account was blocked for ${minutes} minutes.`, "If it wasn't you, we recommend resetting your password."], link: { url: resetUrl, label: "Reset password" } }
      : { subject: "Login bloqueado temporariamente – Let's Go Run", lines: [hi(lang, name), `Depois de várias tentativas com senha errada, o login na sua conta foi bloqueado por ${minutes} minutos.`, "Se não foi você, recomendamos redefinir a senha."], link: { url: resetUrl, label: "Redefinir senha" } }),
};
