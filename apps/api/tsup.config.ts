import { defineConfig } from "tsup";

// Empacota a API e os pacotes do workspace (@passo/*) num só arquivo;
// dependências do node_modules ficam externas (instaladas na imagem).
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  noExternal: [/^@passo\//],
  sourcemap: true,
  clean: true,
});
