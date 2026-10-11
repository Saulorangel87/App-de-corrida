import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { authConfig } from "../src/config";

// A versão aceita no cadastro (tabela consents) tem que ser a dos textos publicados no app.
describe("versão dos documentos legais", () => {
  it("termsVersion da API é a LEGAL_VERSION de apps/web/src/lib/legal.ts", () => {
    const source = readFileSync(resolve(__dirname, "../../web/src/lib/legal.ts"), "utf-8");
    const match = /export const LEGAL_VERSION = "([^"]+)"/.exec(source);
    expect(match?.[1]).toBe(authConfig.termsVersion);
  });
});
