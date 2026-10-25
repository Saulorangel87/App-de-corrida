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
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | lembrete do treino (Web Push); par gerado uma vez com `web-push generate-vapid-keys` (2026-10-24, dentro da imagem de build). Trocar o par invalida todos os lembretes ligados (cada aparelho precisa ligar de novo). Sem as chaves, o lembrete fica desligado |
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

Rotina de atualização (feita em 2026-10-11, 2026-10-12, 2026-10-17 e 2026-10-24): 1) `./backup.sh`; 2) do computador, `git archive --format=tar HEAD | ssh vps "cd ~/apps/app-de-corrida && mkdir repo.new && tar -x -C repo.new"` (só com o commit enviado e a árvore limpa); 3) na VPS, renomear `repo` para `repo.old-AAAAMMDD` e `repo.new` para `repo`; 4) `docker tag app-de-corrida-api:latest app-de-corrida-api:previous`; 5) `docker build` e `docker compose up -d api`; 6) conferir `docker inspect` (healthy), `/health` pela internet, uma rota de atleta sem sessão (401), origem estranha (403) e `systemctl is-active passo-api-logs.service`. Voltar atrás: `docker tag app-de-corrida-api:previous app-de-corrida-api:latest && docker compose up -d api`. Atenção: o `compose up` pode recriar também o container do banco se a configuração dele mudou desde a criação (aconteceu em 2026-10-17, cerca de 1 s de parada); os dados ficam no volume `app-de-corrida_data`, mas confira a contagem de migrações e de usuários depois. Sem migração nova, não há nada a rodar no banco.

Rede do túnel (uma vez; criada e ligada ao `cloudflared-tunnel` em 2026-10-11, que antes estava só na rede `bridge`):

```
docker network create app-de-corrida_edge
```

```
docker network connect app-de-corrida_edge cloudflared-tunnel
```

O `connect` não sobrevive à recriação do container do túnel: se ele for recriado, repetir. Depois, no painel da Cloudflare (Zero Trust, Networks, Tunnels, o túnel `cloudflared-tunnel`, Public hostnames), a rota `letsgorun-api.devsaulo.com.br` aponta para `http://app-de-corrida-api:3000`. Conferir depois: `curl https://letsgorun-api.devsaulo.com.br/health` e nenhuma porta publicada em `docker ps`.

## Migrações e seed (do repositório, com o banco acessível)

Migrações atuais: 0000 a 0014 (a 0011 guarda onde o plano começa, a 0012 as avaliações de bloco, a 0013 a foto de perfil e o e-mail novo pendente, a 0014 o lembrete do treino). Na VPS não há Node: a migração roda na imagem de build da API, na rede interna do banco (`docker build --target build -t app-de-corrida-api:build .` e `docker run --rm --network app-de-corrida_data -e MIGRATION_DATABASE_URL=postgres://passo_migrator:...@app-de-corrida:5432/passo app-de-corrida-api:build pnpm --filter @passo/db db:migrate`; feito assim em 2026-10-24). O seed grava o catálogo com os textos do atleta em português e inglês; rode depois de migrar.

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

## Logs da API (persistem entre deploys)

Cada deploy recria o container e o Docker apaga o log dele. Para não perder o histórico, um serviço segue o log e grava em arquivo:

- `api-logs.sh` + `systemd/passo-api-logs.service`: segue `docker logs` e grava em `/var/log/passo-api/api.log` (JSON, uma linha por evento, sem dados pessoais). Ao reiniciar, retoma do último `ts`; no máximo uma linha repete (mesmo `requestId`).
- `api-logs-rotate.sh` + `systemd/passo-api-logs-rotate.{service,timer}`: todo dia 00:10 UTC compacta o log do dia (`api.log.<data>.gz`) e apaga o que passou de 30 dias. Sem `logrotate` de propósito (não está instalado na VPS).
- Instalação (desde 2026-10-12): copiar os dois scripts para `~/apps/app-de-corrida/`, as unidades para `/etc/systemd/system/` e `sudo systemctl enable --now passo-api-logs.service passo-api-logs-rotate.timer`.
- Consulta: `grep -a '"status":5' /var/log/passo-api/api.log` (erros 5xx) ou `zcat /var/log/passo-api/api.log.*.gz | grep ...` para dias anteriores.
- O arquivo é `640` (dono `ubuntu`) em pasta `750`. Como o log não tem dado pessoal, os 30 dias seguem a mesma janela dos backups.
