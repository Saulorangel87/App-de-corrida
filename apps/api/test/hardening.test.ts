import { describe, expect, it } from "vitest";
import { createLogger, describeError } from "../src/lib/logger";
import { memoryMailer, throttledMailer } from "../src/lib/mailer";

// Endurecimento da auditoria de segurança (2026-10-11).

describe("log de erros sem dados pessoais", () => {
  it("erro do driver do banco vira só tipo e código: a consulta e os valores ficam de fora", () => {
    const driver = Object.assign(new Error('Failed query: select * from users where email = $1\nparams: ana@exemplo.com'), {
      cause: { code: "23505", detail: "Key (email)=(ana@exemplo.com) already exists." },
    });
    const text = describeError(driver);
    expect(text).toBe("Error:23505");
    expect(text).not.toMatch(/ana@|select|params/);
  });

  it("erro comum e valor que não é erro", () => {
    expect(describeError(new TypeError("x"))).toBe("TypeError");
    expect(describeError("texto")).toBe("unknown");
    expect(describeError(null)).toBe("unknown");
  });

  it("erro do provedor de e-mail entra com o código, que é controlado por nós", () => {
    const e = new Error("validation_error");
    e.name = "ResendError";
    expect(describeError(e)).toBe("ResendError:validation_error");
  });
});

describe("limite de e-mails por destinatário", () => {
  const logger = createLogger({ silent: true });
  const mail = (to: string) => ({ to, subject: "Assunto", html: "<p>x</p>", text: "x" });

  it("passa o limite da janela e descarta o excedente, sem afetar outros endereços", async () => {
    const inner = memoryMailer();
    let t = 1_000;
    const mailer = throttledMailer(inner, logger, { limit: 3, windowMs: 60_000, now: () => t });
    for (let i = 0; i < 5; i++) await mailer.send(mail("vitima@exemplo.com"));
    await mailer.send(mail("outra@exemplo.com"));
    expect(inner.sent.filter((m) => m.to === "vitima@exemplo.com")).toHaveLength(3);
    expect(inner.sent.filter((m) => m.to === "outra@exemplo.com")).toHaveLength(1);

    // maiúsculas contam como o mesmo endereço
    await mailer.send(mail("VITIMA@exemplo.com"));
    expect(inner.sent.filter((m) => m.to.toLowerCase() === "vitima@exemplo.com")).toHaveLength(3);

    // passada a janela, volta a enviar
    t += 61_000;
    await mailer.send(mail("vitima@exemplo.com"));
    expect(inner.sent.filter((m) => m.to === "vitima@exemplo.com")).toHaveLength(4);
  });
});
