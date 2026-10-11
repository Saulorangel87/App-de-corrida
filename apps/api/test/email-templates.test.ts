import { describe, expect, it } from "vitest";
import { templates, type Lang } from "../src/lib/email-templates";

// E-mails transacionais: visual da marca em HTML de e-mail (tabelas e estilos inline) e versão em texto.

const URL_WITH_AMP = "https://letsgorun.devsaulo.com.br/verificar-email#token=abc_DEF-123&x=1";
const EVIL_NAME = `<img src=x onerror=alert(1)> "Ana" & 'Cia'`;

const all = (lang: Lang, name = "Ana", url = URL_WITH_AMP) => ({
  verifyEmail: templates.verifyEmail(lang, "ana@exemplo.com", name, url),
  alreadyRegistered: templates.alreadyRegistered(lang, "ana@exemplo.com", name, url, url),
  resetPassword: templates.resetPassword(lang, "ana@exemplo.com", name, url),
  passwordChanged: templates.passwordChanged(lang, "ana@exemplo.com", name, url),
  confirmNewEmail: templates.confirmNewEmail(lang, "ana@exemplo.com", name, url),
  emailChangeRequested: templates.emailChangeRequested(lang, "ana@exemplo.com", name, "n***@exemplo.com", url),
  emailChanged: templates.emailChanged(lang, "ana@exemplo.com", name, "n***@exemplo.com", url),
  accountLocked: templates.accountLocked(lang, "ana@exemplo.com", name, 15, url),
});

const luminance = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe.each<Lang>(["pt-BR", "en"])("e-mails (%s)", (lang) => {
  it("todos têm HTML completo da marca, rodapé automático e versão em texto com o link", () => {
    for (const [name, mail] of Object.entries(all(lang))) {
      expect(mail.html, name).toMatch(/^<!doctype html><html lang="/);
      expect(mail.html, name).toContain("Let&#39;s Go Run");
      expect(mail.html, name).toContain("#FF5A1F");
      expect(mail.html, name).toContain('<meta name="viewport"');
      expect(mail.html, name).toMatch(/<h1[^>]*>(Olá|Hi), Ana!<\/h1>/);
      expect(mail.text, name).toContain(URL_WITH_AMP);
      expect(mail.subject, name).toContain("Let's Go Run");
      expect(mail.html, name).toContain(lang === "en" ? "please don&#39;t reply" : "não responda");
    }
  });

  it("o link vai no botão e por extenso, com & escapado; nada de script nem recurso externo", () => {
    for (const [name, mail] of Object.entries(all(lang))) {
      expect(mail.html, name).toContain('href="https://letsgorun.devsaulo.com.br/verificar-email#token=abc_DEF-123&amp;x=1"');
      expect(mail.html, name).not.toMatch(/<script|<img|<link|<iframe|url\(|@import/i);
      expect(mail.html, name).not.toMatch(/(src)=/i);
    }
  });

  it("nome do atleta com HTML não vira marcação (nem no título nem no corpo)", () => {
    for (const [name, mail] of Object.entries(all(lang, EVIL_NAME))) {
      expect(mail.html, name).not.toContain("<img");
      expect(mail.html, name).toContain("&lt;img src=x onerror=alert(1)&gt;");
    }
  });
});

describe("texto dos e-mails", () => {
  it("o aviso de conta existente usa o artigo certo em inglês", () => {
    const mail = templates.alreadyRegistered("en", "a@b.co", "Ana", "https://x/entrar", "https://x/reset");
    expect(mail.subject).toBe("You already have a Let's Go Run account");
  });

  it("o assunto em português continua o que os testes de fluxo procuram", () => {
    expect(templates.verifyEmail("pt-BR", "a@b.co", "Ana", "https://x").subject).toContain("Confirme");
  });
});

describe("contraste do botão (WCAG AA, 4,5:1)", () => {
  it("claro: texto branco sobre #C2410C", () => expect(contrast("#ffffff", "#C2410C")).toBeGreaterThanOrEqual(4.5));
  it("escuro: texto #0F172A sobre #FF5A1F", () => expect(contrast("#0F172A", "#FF5A1F")).toBeGreaterThanOrEqual(4.5));
});
