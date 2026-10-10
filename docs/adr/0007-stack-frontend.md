# ADR 0007: Stack do Frontend (Fase 6)

## Contexto
O projeto entrou na Fase 6, cujo objetivo é a construção das telas e fluxos do usuário no frontend. O esqueleto inicial do Vite (React + TypeScript) foi criado, mas precisamos formalizar as bibliotecas fundamentais (roteamento, formulários, internacionalização e gerência de estado do servidor) para garantir que toda a implementação de telas mantenha a tipagem rígida, performance e suporte a múltiplos idiomas exigidos na especificação. A seção 2 da especificação já aponta as preferências do projeto.

## Decisão

As seguintes ferramentas foram adotadas como a base técnica para a aplicação web em React:

1. **Roteador:** `TanStack Router`
   - **Motivo:** O projeto é fortemente baseado em TypeScript (compartilhando schemas Zod com o backend e o motor). O TanStack Router oferece roteamento 100% type-safe, validação rigorosa de parâmetros de rota e state, garantindo que o front capture erros de rota em tempo de compilação.
2. **Biblioteca de formulários:** `React Hook Form` com `@hookform/resolvers/zod`
   - **Motivo:** Já possuímos o pacote `@passo/shared` com os schemas de validação de Zod (ex: `packages/shared/src/auth.ts`, `packages/shared/src/interview.ts`). O RHF se integra de forma nativa e sem overhead ao Zod, otimizando os re-renders de formulários grandes (como a entrevista e o check-in).
3. **Gerência de estado do servidor:** `TanStack Query (React Query)`
   - **Motivo:** Para lidar eficientemente com chamadas assíncronas para a nossa API Hono, cache, states de `loading`/`error`/`success` (exigência da Fase 6 para todas as telas) e polling de requisições. O TanStack Query é o padrão da indústria e se integra de forma elegante com o ecossistema TanStack (Router).
4. **Internacionalização (i18n):** `i18next` com `react-i18next`
   - **Motivo:** Requisito de oferecer a plataforma em pt-BR (padrão) e EN. Suporta carregamento de traduções, interpolação e se adapta bem aos componentes funcionais do React via hooks (`useTranslation`). Como a API responde com os códigos de motivo do motor (`decision.reasons[].code`), o front poderá traduzi-los de forma reativa usando o i18next.
5. **Estilização e Componentes:** `Tailwind CSS` e `shadcn/ui`
   - **Motivo:** Para implementar a identidade visual (`Inter`, laranja `#FF5A1F`, cantos de 12 a 16 px, conforme Figma e especificação) sem o peso e conflitos de classes do CSS tradicional. `shadcn/ui` fornece componentes acessíveis (WCAG AA) e amigáveis ao teclado, totalmente personalizáveis.

## Consequências
- A equipe precisará definir os arquivos de rotas estritos pelo TanStack Router.
- Haverá um passo adicional para gerenciar o dicionário (pt-BR e EN) no i18next antes de montar views textuais (especialmente motivos e textos do motor).
- O projeto mantém alinhamento com a Especificação (Seção 2) e assegura escalabilidade e segurança de tipos de ponta a ponta.

## Complemento (2026-10-10, revisão do primeiro código de tela)
- **Roteador:** só o TanStack Router (a dependência `react-router-dom` que veio junto foi removida).
- **i18n:** `apps/web/src/i18n/` (`pt-BR.ts` define as chaves; `en.ts` é tipado contra ela, então chave faltando não compila). Idioma inicial: escolha salva no aparelho (só conveniência, com `try/catch`) ou idioma do navegador. Erros da API são traduzidos pelo **código** (`errors.<CODE>`), nunca pelo texto em português que a API devolve.
- **Fonte:** Inter variável pelo pacote `@fontsource-variable/inter` (só os subconjuntos latin e latin-ext), servida do próprio domínio. Nenhum pedido a terceiros, o que mantém a CSP em `'self'` e evita expor o IP do atleta a um CDN de fontes.
- **Foto do login:** gerada por `docs/design/gerar_foto_login.py` (AVIF, WebP e JPEG em 464 e 928 px). `<picture>` com `media="(min-width: 1024px)"`: abaixo disso a foto nem é baixada.
- **CSP e cabeçalhos:** `apps/web/public/_headers` (Cloudflare Pages). O mesmo bloco `/*` é aplicado no `vite preview`, então os testes de interface rodam sob a CSP real (sem `unsafe-inline`).
- **Testes de interface:** Playwright em `apps/web/e2e/` (`pnpm --filter @passo/web e2e`), com a API simulada por `page.route`; roda no CI (job `e2e`). Cobre rótulos, idioma, validação, login, cadastro, foto no celular e cabeçalhos.
- **Cliente HTTP:** `ApiError` com `status`, `code` e `details`; cookie de sessão por `credentials: "include"`; sem token em `localStorage`.
