import type { Email } from "./mailer";

export type Lang = "pt-BR" | "en";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

type Content = { subject: string; lines: string[]; link?: { url: string; label: string } };

function render(to: string, c: Content): Email {
  const paragraphs = c.lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("");
  const button = c.link
    ? `<p><a href="${escapeHtml(c.link.url)}">${escapeHtml(c.link.label)}</a></p><p style="font-size:12px;color:#555">${escapeHtml(c.link.url)}</p>`
    : "";
  const text = [...c.lines, ...(c.link ? [`${c.link.label}: ${c.link.url}`] : [])].join("\n\n");
  return { to, subject: c.subject, html: `<!doctype html><html><body>${paragraphs}${button}</body></html>`, text };
}

const hi = (lang: Lang, name: string) => (lang === "en" ? `Hi, ${name}!` : `Olá, ${name}!`);

export const templates = {
  verifyEmail: (lang: Lang, to: string, name: string, url: string) =>
    render(to, lang === "en"
      ? { subject: "Confirm your email – Let's Go Run", lines: [hi(lang, name), "Confirm your email to start using Let's Go Run. The link expires in 24 hours."], link: { url, label: "Confirm email" } }
      : { subject: "Confirme seu e-mail – Let's Go Run", lines: [hi(lang, name), "Confirme seu e-mail para começar a usar o Let's Go Run. O link vale por 24 horas."], link: { url, label: "Confirmar e-mail" } }),

  alreadyRegistered: (lang: Lang, to: string, name: string, loginUrl: string, resetUrl: string) =>
    render(to, lang === "en"
      ? { subject: "You already have an Let's Go Run account", lines: [hi(lang, name), "Someone tried to sign up with this email, but you already have an account. If it was you, just log in. Forgot your password? Reset it here: " + resetUrl, "If it wasn't you, you can ignore this email."], link: { url: loginUrl, label: "Log in" } }
      : { subject: "Você já tem uma conta no Let's Go Run", lines: [hi(lang, name), "Alguém tentou se cadastrar com este e-mail, mas você já tem uma conta. Se foi você, é só entrar. Esqueceu a senha? Redefina aqui: " + resetUrl, "Se não foi você, pode ignorar este e-mail."], link: { url: loginUrl, label: "Entrar" } }),

  resetPassword: (lang: Lang, to: string, name: string, url: string) =>
    render(to, lang === "en"
      ? { subject: "Reset your password – Let's Go Run", lines: [hi(lang, name), "Use the link below to choose a new password. It expires in 60 minutes and works only once.", "If you didn't ask for this, ignore this email; your password stays the same."], link: { url, label: "Reset password" } }
      : { subject: "Redefinir sua senha – Let's Go Run", lines: [hi(lang, name), "Use o link abaixo para escolher uma nova senha. Ele vale por 60 minutos e só funciona uma vez.", "Se você não pediu, ignore este e-mail; sua senha continua a mesma."], link: { url, label: "Redefinir senha" } }),

  passwordChanged: (lang: Lang, to: string, name: string, resetUrl: string) =>
    render(to, lang === "en"
      ? { subject: "Your Let's Go Run password was changed", lines: [hi(lang, name), "Your password was changed and all sessions were signed out.", "If it wasn't you, reset your password now."], link: { url: resetUrl, label: "Reset password" } }
      : { subject: "Sua senha do Let's Go Run foi alterada", lines: [hi(lang, name), "Sua senha foi alterada e todas as sessões foram encerradas.", "Se não foi você, redefina a senha agora."], link: { url: resetUrl, label: "Redefinir senha" } }),

  accountLocked: (lang: Lang, to: string, name: string, minutes: number, resetUrl: string) =>
    render(to, lang === "en"
      ? { subject: "Login temporarily blocked – Let's Go Run", lines: [hi(lang, name), `After several wrong password attempts, login to your account was blocked for ${minutes} minutes.`, "If it wasn't you, we recommend resetting your password."], link: { url: resetUrl, label: "Reset password" } }
      : { subject: "Login bloqueado temporariamente – Let's Go Run", lines: [hi(lang, name), `Depois de várias tentativas com senha errada, o login na sua conta foi bloqueado por ${minutes} minutos.`, "Se não foi você, recomendamos redefinir a senha."], link: { url: resetUrl, label: "Redefinir senha" } }),
};
