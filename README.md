# CloudIDE

**Self-hosted cloud development environments.** Import a GitHub repo, get a
Docker workspace in one click, and edit it in *your* Cursor / VS Code over
SSH — cloud CPU and RAM, your own editor, your own AI subscription.

> Open-source Codespaces alternative that runs on **your** Docker and opens
> in **your** IDE.

![License](https://img.shields.io/badge/license-MIT-blue)

<!-- ## Demo
     Record a 30s clip: sign in → import repo → Start → Terminal →
     Cursor connects → type `ls`. Drop it here as docs/demo.gif. -->

## Why

GitHub's answer is Codespaces: their cloud, their editor, their AI bills.
This is the other shape of the same idea:

- **Your infrastructure** — a $5 VPS, a home server, or your laptop
- **Your editor** — Cursor, VS Code, Antigravity, JetBrains over Remote-SSH
- **Your AI** — the assistant already built into your editor; this platform
  runs no model and pays no token costs

## Features

| | |
|---|---|
| ✅ GitHub OAuth sign-in | Encrypted tokens, hashed sessions |
| ✅ Repo import → project | Lists your GitHub repositories with search + pagination |
| ✅ One-click workspaces | Docker container per workspace, CPU / RAM / disk limits |
| ✅ Async provisioning | Redis + BullMQ queue: `PROVISIONING → RUNNING` with retries |
| ✅ Browser terminal | xterm.js over a WebSocket bridge into the container's pty |
| ✅ **Connect to Cursor / VS Code / Antigravity / JetBrains** | Ephemeral SSH key issued per Connect, revoked on Stop, loopback-only ports |
| ✅ Start / Stop / Delete | Quotas on concurrent workspaces, container history |
| ✅ `docker compose up` stack | Postgres + Redis in one command |

## Honest limitations (today)

This is a **working MVP** (architecture "Type 1"), not a finished product:

- **No dashboard file editor yet** — the browser path is the terminal;
  for editing you connect Cursor/VS Code (which is the point of the product).
  code-server runs inside the container (`previewUrl`) but isn't linked from
  the dashboard yet.
- **No git push/pull from the UI** — use `git` in the terminal or in Cursor.
- **Snapshots to object storage are designed, not built**
  ([ARCHITECTURE.md §4](./ARCHITECTURE.md)) — workspace data currently lives
  on the host disk (`apps/backend/.workspaces`).
- **Single host, single user** — no multi-tenant scheduling, no Kubernetes.
- Workspaces of the same project share one directory (don't run two
  concurrently). Storage is not garbage-collected yet.
- Automated tests: not yet — the E2E checklist lives in `ARCHITECTURE.md`.

## How it works

```text
 Sign in (GitHub OAuth)                metadata only
        ↓
 Import repo                           DB rows, no files yet
        ↓
 Start  ──►  {restore} job on Redis ──►  worker: clone repo → docker create+start
        ↓                                → status RUNNING
 Work:   Terminal (browser)  ·  Cursor/VS Code over SSH  ·  code-server
        ↓
 Stop:   container stops, SSH keys revoked, {upload} job enqueued
```

```text
 Browser (Next.js :3000)         Express API (:4000)         Redis/BullMQ
   │  xterm.js + fetch              │  OAuth · repos ·          │
   └──────────► wss service (:4001) └── workspaces · SSH keys ◄─┘
                   │ docker exec pty          │ dockerode
                   ▼                          ▼
             workspace container  ◄── bind mount ──►  .workspaces/projects/<id>
             (code-server + sshd)                    (clone lives here)
```

## Quickstart

**Prerequisites:** Docker, [bun](https://bun.sh) ≥ 1.4, a GitHub account.

**1. Create a GitHub OAuth app**
→ *Settings → Developer settings → OAuth Apps → New*,
homepage `http://localhost:3000`,
callback `http://localhost:4000/auth/github/callback`.

**2. Clone and configure**

```sh
git clone https://github.com/ali-imtiyazkhan/cloudIde.git
cd cloudIde
bun install

cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env`:

```sh
GITHUB_CLIENT_ID=…            # from the OAuth app
GITHUB_CLIENT_SECRET=…
# CRYPTO_KEY: generate one with
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
# Local Postgres from compose (not the Neon placeholder):
DATABASE_URL="postgresql://postgres:postgres@localhost:5431/postgres?sslmode=disable"
```

The web app needs no env locally — `NEXT_PUBLIC_API_URL` /
`NEXT_PUBLIC_WSS_URL` default to `localhost:4000` / `:4001`.

**3. Start the services and build the workspace image**

```sh
docker compose up -d                       # postgres + redis
docker build -f infra/docker/Dockerfile -t cloudide-workspace:latest .

cd packages/db && bun run db:migrate && cd ../..
```

**4. Run everything**

```sh
bun run dev        # turbo: web :3000 · api :4000 · wss :4001
```

Open `http://localhost:3000` → sign in → import a repository → **Start** →
**Terminal**. Then **Connect…** and follow the steps to open it in Cursor.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router), xterm.js, plain CSS modules |
| API | Express, zod validation |
| Terminal bridge | Bun + WebSockets → `docker exec` pty |
| Compute | Docker (code-server + OpenSSH workspace image) |
| IDE access | SSH Remote with ephemeral per-connection keys |
| Queue | Redis + BullMQ (provisioning, snapshots) |
| Database | PostgreSQL + Prisma |
| Monorepo | Turborepo + bun workspaces |

## Project structure

```text
apps/web        dashboard (projects, repo import, terminal, connect modal)
apps/backend    Express API + provisioning worker
apps/wss        WebSocket → container pty bridge
packages/db     Prisma schema + migrations
infra/docker    workspace image (code-server + sshd)
docker-compose.yml   postgres + redis
ARCHITECTURE.md      the full design —25 sections
```

## Documentation

Everything beyond the code is in [`ARCHITECTURE.md`](./ARCHITECTURE.md):

- [§4 Storage design — cloud as source of truth, disk as cache](./ARCHITECTURE.md#4-storage-architecture)
- [§13 IDE access paths (why Remote-SSH, why not network mounts)](./ARCHITECTURE.md#13-ide-client-access-paths)
- [§18 Why this platform ships no LLM](./ARCHITECTURE.md#18-llm-architecture--cut-delegated-to-your-editor)
- [§23 Build order](./ARCHITECTURE.md#23-recommended-build-order)
- [§25 Deploy to a single cloud server](./ARCHITECTURE.md#25-deploy--type-2-single-cloud-server)

## Roadmap

1. **Object storage snapshots** (§4) — MinIO/S3, restore-on-start,
   upload-on-stop, local disk becomes a cache
2. **Git commit/push/pull from the UI**
3. **Preview URLs** — run `npm run dev` in a workspace, open it publicly
4. **Deploy Type 2** — the VPS checklist in §25
5. CI, tests, rate limiting

## Contributing

Issues and PRs welcome. The design doc is the source of truth — read
`ARCHITECTURE.md` §23 for where the project is in its build order.

## License

[MIT](./LICENSE)
