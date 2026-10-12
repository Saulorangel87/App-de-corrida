# Operação na VPS

Pasta na VPS: `~/apps/app-de-corrida` (copie para lá `docker-compose.yml` e os scripts desta pasta).

## `.env` (só na VPS, `chmod 600`, nunca no Git)

| Variável | Uso |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | superusuário do container (só administração) |
| `MIGRATOR_DB_PASSWORD` | papel `passo_migrator` (migrações e seed) |
| `PASSO_API_DB_PASSWORD` | papel `passo_api` (a API) |
| `DATABASE_URL` | `postgres://passo_api:...@app-de-corrida:5432/passo` |
| `FRONTEND_URL` | origem exata do front, com https (`https://letsgorun.devsaulo.com.br`): CORS, verificação de `Origin` e links dos e-mails |
| `SESSION_SECRET` | 32+ caracteres aleatórios (`openssl rand -hex 32`); troca derruba todas as sessões e invalida os links pendentes |
| `RESEND_API_KEY`, `EMAIL_FROM` | e-mails de conta; a API não inicia em produção sem a chave; o domínio do remetente precisa estar verificado no Resend (SPF e DKIM) |
| `BACKUP_RCLONE_REMOTE` | remote `crypt` do rclone: `corrida-run:` (sobre `cadencia-oos:backups-vps/letsgorun`) |

Gere senhas com `openssl rand -hex 32`.

## Primeira instalação / troca de senha

```
docker compose up -d
```

```
./db-roles.sh
```

## API (container)

Imagem multi-arquitetura, sem root, sistema de arquivos somente leitura, sem portas publicadas (`docker-compose.yml`, serviço `api`). Construir na própria VPS (arm64), a partir de uma cópia limpa do repositório (`git archive`):

```
docker build -f apps/api/Dockerfile -t app-de-corrida-api:latest .
```

```
docker compose up -d api
```

Rede do túnel (uma vez; criada e ligada ao `cloudflared-tunnel` em 2026-10-11, que antes estava só na rede `bridge`):

```
docker network create app-de-corrida_edge
```

```
docker network connect app-de-corrida_edge cloudflared-tunnel
```

O `connect` não sobrevive à recriação do container do túnel: se ele for recriado, repetir. Depois, no painel da Cloudflare (Zero Trust, Networks, Tunnels, o túnel `cloudflared-tunnel`, Public hostnames), a rota `letsgorun-api.devsaulo.com.br` aponta para `http://app-de-corrida-api:3000`. Conferir depois: `curl https://letsgorun-api.devsaulo.com.br/health` e nenhuma porta publicada em `docker ps`.

## Migrações e seed (do repositório, com o banco acessível)

Migrações atuais: 0000 a 0013 (a 0011 guarda onde o plano começa, a 0012 as avaliações de bloco, a 0013 a foto de perfil e o e-mail novo pendente). O seed grava o catálogo com os textos do atleta em português e inglês; rode depois de migrar.

```
MIGRATION_DATABASE_URL=postgres://passo_migrator:...@host:5432/passo pnpm --filter @passo/db db:migrate
```

```
MIGRATION_DATABASE_URL=postgres://passo_migrator:...@host:5432/passo pnpm --filter @passo/db db:seed
```

## Backup

- `backup.sh`: `pg_dump -Fc` enviado direto para o remote `crypt` do rclone (Oracle Object Storage); conteúdo e nomes criptografados antes de sair da VPS.
- Destino: bucket `backups-vps` (Oracle, `sa-vinhedo-1`), pasta `letsgorun/`; os outros projetos usam as pastas `cadencia/`, `despesas/`, `estoque/` e `rotas/` do mesmo bucket. Desde 2026-10-12 (antes: bucket `cadencia-backups`, prefixo `corrida-run/`).
- Retenção de 30 dias por **uma única regra de ciclo de vida do bucket inteiro** (`expirar-30-dias`, sem filtro de prefixo), configurada no console da Oracle; projeto novo já nasce coberto. Isso cumpre o que o texto de Privacidade promete ("até 30 dias"). Controle de versão do bucket: desativado. A VPS não tem permissão de apagar objetos, de propósito (a política `backup-vm-object-storage` só permite criar, listar e ler).
- Timer: copie `systemd/passo-backup.{service,timer}` para `/etc/systemd/system/` e rode `sudo systemctl enable --now passo-backup.timer`.
- `restore-test.sh`: restaura o backup mais recente num container descartável sem rede. Rodar ao menos 1x por mês e anotar a data aqui.
- **Guarde a senha do remote crypt fora da VPS** (gerenciador de senhas): sem ela, os backups não abrem. Atenção: `rclone config show` mascara as senhas; para guardá-las, copie o bloco do remote direto de `~/.config/rclone/rclone.conf`.

Último teste de restauração: **2026-10-12, OK**, a partir do bucket novo (`letsgorun/`), num container descartável sem rede: `pg_restore` sem erros e as 24 tabelas (as 23 do app mais a de controle das migrações) com as mesmas contagens do banco de produção (1.550 linhas). O anterior foi em 2026-10-10 (18 tabelas).

Chaves do crypt (`password` e `password2` do remote `corrida-run`): guardadas no gerenciador de senhas do dono, fora da VPS.
