# ADR 0008 — Perfil: foto, nome e troca de e-mail

Data: 2026-10-11 · Status: aceito

## Contexto
O dono pediu que o atleta edite o nome, troque o e-mail (com confirmação) e envie uma foto de perfil. O e-mail é o identificador de login e o destino das mensagens de segurança; a foto é um dado pessoal novo.

## Decisão
- **Nome:** `PATCH /auth/profile`, dono pela sessão.
- **E-mail:** `POST /auth/email-change` pede a **senha atual** e manda um link de uso único (60 min) ao endereço **novo**; o antigo recebe só um aviso, com o endereço novo parcialmente escondido. O e-mail só muda em `POST /auth/email-change/confirm` (sem sessão, o link pode abrir em outro aparelho): troca o endereço, marca como verificado, **encerra todas as sessões** e avisa o endereço antigo. A resposta do pedido é a mesma exista ou não conta com o endereço novo, e nada é enviado nesse caso (sem enumeração). O token usa `auth_tokens` (`type = email_change`, `new_email`).
- **Foto:** miniatura **JPEG** única por atleta na tabela `user_photos` (RLS, `bytea`, até 60 KB; o limite geral de corpo da API é 64 KB). O navegador recorta o centro, reduz para 256 px e regrava como JPEG (`apps/web/src/lib/image.ts`), o que também descarta os metadados da câmera. O servidor confere a assinatura do JPEG pelos bytes e recusa o resto (PNG, SVG, texto). Serve com `Content-Type: image/jpeg`, `nosniff` e a CSP da API (`default-src 'none'`). `users.avatar_updated_at` é a versão usada na URL (`?v=`) para o cache.
- A foto entra na exportação (base64) e some com a exclusão da conta (cascata). A CSP do front inclui a origem da API em `img-src`.

## Alternativas
- Foto em bucket de objetos: serve para imagens grandes, mas é mais uma peça para proteger, copiar e apagar na exclusão. Descartado: a miniatura cabe no banco, que já tem backup criptografado.
- Aceitar PNG/WebP no servidor: exigiria decodificar e regravar a imagem no servidor (dependência nativa). Descartado: o navegador já regrava.
- Trocar o e-mail sem confirmação no endereço novo: descartado (sequestro de conta e perda do acesso).

## Consequências
- Política de Privacidade ganhou a foto na lista de dados (versão do texto mantida porque nenhum atleta aceitou ainda; o dono relê antes de abrir).
- O link de confirmação do e-mail novo encerra todas as sessões, inclusive a de quem pediu: é preciso entrar de novo.
