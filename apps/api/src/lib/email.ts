import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
const isDev = process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY;

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (isDev) {
    console.log("-----------------------------------------");
    console.log(`[DEV MODE] Email intended for: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML:`);
    console.log(html);
    console.log("-----------------------------------------");
    return;
  }

  try {
    await resend.emails.send({
      from: "Passo App <no-reply@letsgorun.devsaulo.com.br>",
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  // Hardcode frontend URL for now, but usually from env
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const url = `${frontendUrl}/verify-email?token=${token}`;
  
  await sendEmail({
    to: email,
    subject: "Verifique seu e-mail - Passo",
    html: `<p>Olá!</p><p>Clique no link abaixo para verificar seu e-mail no Passo:</p><p><a href="${url}">${url}</a></p>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const url = `${frontendUrl}/reset-password?token=${token}`;
  
  await sendEmail({
    to: email,
    subject: "Redefinir sua senha - Passo",
    html: `<p>Olá!</p><p>Você solicitou a redefinição da sua senha. Clique no link abaixo para continuar:</p><p><a href="${url}">${url}</a></p><p>Se você não solicitou isso, apenas ignore este e-mail.</p>`,
  });
}
