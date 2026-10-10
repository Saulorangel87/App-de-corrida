# Operação na VPS

Pasta na VPS: `~/apps/app-de-corrida` (copie para lá `docker-compose.yml` e os scripts desta pasta).

## `.env` (só na VPS, `chmod 600`, nunca no Git)

| Variável | Uso |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | superusuário do container (só administração) |
| `MIGRATOR_DB_PASSWORD` | papel `passo_migrator` (migrações e seed) |
| `PASSO_API_DB_PASSWORD` | papel `passo_api` (a API) |
| `DATABASE_URL` | `postgres://passo_api:...@app-de-corrida:5432/passo` |
| `BACKUP_RCLONE_REMOTE` | remote `crypt` do rclone, ex. `passo-crypt:` |

Gere senhas com `openssl rand -hex 32`.

## Primeira instalação / troca de senha

```
docker compose up -d
```

```
./db-roles.sh
```

## Migrações e seed (do repositório, com o banco acessível)

```
MIGRATION_DATABASE_URL=postgres://passo_migrator:...@host:5432/passo pnpm --filter @passo/db db:migrate
```

```
MIGRATION_DATABASE_URL=postgres://passo_migrator:...@host:5432/passo pnpm --filter @passo/db db:seed
```

## Backup

- `backup.sh`: `pg_dump -Fc` enviado direto para o remote `crypt` do rclone (Oracle Object Storage); conteúdo e nomes criptografados antes de sair da VPS; retenção de 30 dias.
- Timer: copie `systemd/passo-backup.{service,timer}` para `/etc/systemd/system/` e rode `sudo systemctl enable --now passo-backup.timer`.
- `restore-test.sh`: restaura o backup mais recente num container descartável sem rede. Rodar ao menos 1x por mês e anotar a data aqui.
- **Guarde a senha do remote crypt fora da VPS** (gerenciador de senhas): sem ela, os backups não abrem.

Último teste de restauração: (ainda não feito)
