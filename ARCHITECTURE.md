# Cloud GitHub Development Platform — Architecture

## 1. Architecture Goal

The system separates three concerns:

```text
┌─────────────────────────────────────────────┐
│                 STORAGE                     │
│          Persistent repository data         │
└─────────────────────┬───────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────┐
│                 COMPUTE                     │
│      Temporary Docker development env       │
│            CPU + RAM + processes            │
└─────────────────────┬───────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────┐
│                  CLIENT                     │
│       Browser IDE + Terminal + Preview      │
└─────────────────────────────────────────────┘
```

The key principle:

> **Storage persists. Compute is disposable.**

---

# 2. High-Level Architecture

```text
                              ┌───────────────┐
                              │    GitHub     │
                              │ Repositories  │
                              └───────┬───────┘
                                      │
                              GitHub OAuth/API
                                      │
                                      ↓
┌────────────────────────────────────────────────────────────────┐
│                         YOUR PLATFORM                          │
│                                                                │
│  ┌─────────────────────┐       ┌───────────────────────────┐  │
│  │      Next.js        │       │      Express API          │  │
│  │      Frontend       │◄─────►│      TypeScript           │  │
│  └──────────┬──────────┘       └─────────────┬─────────────┘  │
│             │                                │                │
│             │ WebSocket                      │                │
│             ↓                                ↓                │
│     ┌───────────────┐                ┌───────────────┐        │
│     │ Monaco Editor │                │   PostgreSQL  │        │
│     │ xterm.js      │                │    Prisma     │        │
│     └───────────────┘                └───────────────┘        │
│                                              │                │
│                                              ↓                │
│                                      ┌───────────────┐        │
│                                      │     Redis     │        │
│                                      │ Cache / Queue │        │
│                                      └───────┬───────┘        │
│                                              │                │
│                                              ↓                │
│                                      ┌───────────────┐        │
│                                      │ Worker/BullMQ │        │
│                                      └───────┬───────┘        │
│                                              │                │
│                         ┌────────────────────┼─────────────┐  │
│                         ↓                    ↓             │  │
│                  ┌──────────────┐    ┌──────────────┐      │  │
│                  │ Object       │    │    Docker    │      │  │
│                  │ Storage      │    │   Workspace  │      │  │
│                  │ R2 / S3      │    │              │      │  │
│                  └──────────────┘    └──────┬───────┘      │  │
│                                             │              │  │
│                                             ↓              │  │
│                                      ┌──────────────┐      │  │
│                                      │ Reverse      │      │  │
│                                      │ Proxy        │      │  │
│                                      └──────┬───────┘      │  │
└─────────────────────────────────────────────┼──────────────┘
                                              ↓
                                      Browser Preview
```

---

# 3. Main Components

## A. Next.js Frontend

Responsible for:

- Login
- Dashboard
- Repository selection
- Workspace management
- File explorer
- Monaco editor
- Terminal UI
- Preview

---

## B. Express API

Responsible for:

- Authentication
- GitHub API communication
- Repository management
- Workspace creation
- Workspace lifecycle
- File operations
- Terminal sessions
- Git operations

---

## C. PostgreSQL + Prisma

PostgreSQL stores metadata.

Example:

```text
User
 ├── GitHub account
 └── Workspaces

Repository
 ├── GitHub URL
 ├── branch
 └── storage location

Workspace
 ├── repository
 ├── container ID
 ├── status
 ├── createdAt
 └── lastActiveAt
```

Repository source files should NOT be stored as normal PostgreSQL rows.

---

# 4. Storage Architecture

Use an S3-compatible object storage system.

Recommended:

```text
Development → MinIO
Production  → Cloudflare R2 / AWS S3
```

> **Implementation plan for build-order step 12 — designed, not yet built.**
> Everything below describes the version to implement first; later
> improvements (incremental sync, versioning) are called out explicitly.

## 4.1 The rule: cloud is truth, disk is cache

```text
TODAY   local directory is the only copy      → lose the host, lose the work
AFTER   object storage is the source of truth → host directory is a cache
```

A running container must always write to a real local filesystem — that part
can never be removed. What changes is authority: the local directory may be
deleted at any time and rebuilt from the bucket.

## 4.2 Object layout

```text
bucket: cloudide-snapshots
│
└── workspaces/
    └── <workspaceId>/
        └── snapshot.tar.gz      # full copy of the project directory
```

- Keyed **per workspace**, not per project: `DELETE /workspaces/:id` removes
  that workspace's objects, while the local directory
  (`.workspaces/projects/<storagePrefix>`) is shared by every workspace of
  the project and must survive.
- The original `users/` and `repositories/` branches are dropped — user and
  repository metadata live in PostgreSQL, not in the bucket.

## 4.3 Restore (BullMQ `restore` job — inside provisionWorkspace)

```text
local dir has .git?      → cache hit, use it, skip download
else snapshot in bucket? → download + extract into the dir
else                      → git clone (true cold start)
```

This runs **before** the container is created, because /workspace is
bind-mounted at start. The frontend already polls PROVISIONING, so the
download time needs no new UI.

## 4.4 Upload (BullMQ `upload` job — on Stop)

```text
Stop: container.stop → revoke SSH keys → status STOPPED → enqueue upload
Upload: tar -czf <dir> → PutObject (overwrites the previous snapshot)
```

The workspace is already STOPPED when the upload runs, so no new status
value is needed for the MVP; the job is observable in BullMQ. A future
`SNAPSHOTTING` state can surface progress in the dashboard.

## 4.5 Components to build

| Piece | Detail |
| --- | --- |
| MinIO service | `docker-compose.yml`: loopback `:9000`, console `:9001`, named volume, bucket auto-bootstrap |
| Env | `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — added to the zod schema in `lib/env.ts` and `.env.example` |
| `lib/storage.ts` | `snapshotExists()`, `loadSnapshot()`, `saveSnapshot()`, `deleteSnapshots()` via `@aws-sdk/client-s3` (`forcePathStyle: true` for MinIO) |
| Wire-in | `lib/provision.ts` → restore step before clone; `index.ts` → replace the three `TODO` handlers |

## 4.6 Failure modes and MVP limits

- **Crash between Stop and upload** → previous snapshot stays; BullMQ's 3×
  retry covers transient MinIO/network failures. A hard crash inside the
  window loses only that session's last edits (periodic sync is the later fix).
- **Start while an upload is still running** → local cache hit wins; the
  in-flight tar may include the fresh writes — harmless, next Stop overwrites.
- **Full overwrite, no versioning or dedup** → simple and predictable;
  incremental sync (rsync-style or git bundles) comes after.
- **Snapshots include `node_modules`** → correctness first; optional excludes
  are a later tuning knob.
- **Single-host assumption** → while a workspace is RUNNING, local is
  newest. Multi-host compute (Type 4) is unaffected: restore-before-mount
  is already the rule.

## 4.7 Test plan (definition of done)

```text
1. docker compose up → MinIO healthy, bucket exists
2. Start workspace → RUNNING (clone path unchanged)
3. Create a marker file in the workspace → Stop
   → object appears in the bucket (marker inside the tar)
4. Delete the local .workspaces/projects/<id> directory → Start
   → files return from the bucket, marker present, no re-clone needed
5. Delete the workspace → bucket objects for that workspaceId are gone
6. Stop MinIO → Stop workspace → upload job fails + retries,
   workspace row unaffected (still STOPPED)
```

## 4.8 Build order for step 12

```text
1. MinIO compose service + env schema + bucket bootstrap
2. lib/storage.ts (+ a small script test against MinIO)
3. restore hook in provision.ts
4. upload + delete handlers in index.ts
5. E2E: 4.7 checklist, then PR
```

---

# 5. Compute Architecture

Each active workspace gets a Docker container.

```text
workspace-789
│
├── /workspace
│   └── repository
│
├── Node.js
├── Git
├── npm
└── shell
```

The container provides:

- CPU
- RAM
- Process execution
- Development tools
- Network namespace
- Workspace filesystem

When the user stops the workspace:

```text
Container
   ↓
Save required state
   ↓
Destroy container
```

Later:

```text
Start workspace
   ↓
Create new container
   ↓
Restore repository
   ↓
Continue working
```

---

# 6. Type 1 — Local Docker MVP

The simplest architecture.

```text
Browser
   ↓
Next.js
   ↓
Express
   ↓
Docker
   ↓
Container
```

Everything runs on one development machine.

Use this first.

### Purpose

Prove:

- Terminal
- File editing
- Git
- Container execution
- Workspace lifecycle

---

# 7. Type 2 — Single Cloud Server

Move the backend and Docker host to a cloud VM.

```text
                 Internet
                    │
                    ↓
              Reverse Proxy
                    │
             ┌──────┴──────┐
             ↓             ↓
          Next.js       Express
                           │
              ┌────────────┼───────────┐
              ↓            ↓           ↓
          PostgreSQL     Redis       Docker
                                        │
                                ┌───────┴───────┐
                                ↓               ↓
                           Workspace A     Workspace B
```

This is a good first production-like version.

---

# 8. Type 3 — Cloud Storage + Ephemeral Compute

Recommended architecture for the main project.

```text
             GitHub
                │
                ↓
          Repository Import
                │
                ↓
        Object Storage
         R2 / S3 / MinIO
                │
                ↓
        Workspace Manager
                │
                ↓
          Docker Container
                │
                ↓
          Browser IDE
```

Storage persists while compute is temporary.

---

# 9. Type 4 — Kubernetes Architecture

Advanced version.

```text
                         Kubernetes Cluster
                                  │
          ┌───────────────────────┼──────────────────────┐
          │                       │                      │
          ↓                       ↓                      ↓
     Workspace A             Workspace B            Workspace C
       Pod                       Pod                    Pod
          │                       │                      │
          └───────────────────────┼──────────────────────┘
                                  ↓
                           Object Storage
```

Kubernetes handles:

- Scheduling
- Resource limits
- Container lifecycle
- Restarting workloads
- Scaling
- Node management

---

# 10. Workspace Lifecycle

## Create

```text
User clicks "Create Workspace"
              ↓
API validates repository
              ↓
Job added to Redis/BullMQ
              ↓
Worker receives job
              ↓
Create Docker container
              ↓
Clone repository
              ↓
Workspace ready
```

---

## Active

```text
Browser
  ↓ WebSocket
Terminal Service
  ↓
Container
  ↓
Shell / Application
```

---

## Stop

```text
User stops workspace
        ↓
Save required state
        ↓
Stop container
        ↓
Container removed
        ↓
Workspace status = STOPPED
```

---

## Resume

```text
User opens workspace
        ↓
Create new container
        ↓
Restore repository
        ↓
Start development environment
        ↓
Workspace ready
```

---

# 11. Terminal Architecture

Use xterm.js in the browser.

```text
┌────────────────────┐
│    xterm.js        │
│                    │
│ $ npm run dev      │
│ $ git status       │
│ $ npm install      │
└─────────┬──────────┘
          │ WebSocket
          ↓
┌────────────────────┐
│ Terminal Service   │
│                    │
│ Node.js            │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Docker Container   │
│                    │
│ /bin/bash          │
└────────────────────┘
```

---

# 12. IDE Architecture

Recommended:

```text
Monaco Editor
       │
       ↓
File API / WebSocket
       │
       ↓
Workspace Service
       │
       ↓
Container filesystem
```

Main UI:

```text
┌─────────────────────────────────────────────┐
│ Project        Terminal        Run           │
├───────────────┬─────────────────────────────┤
│               │                             │
│ src/          │      Monaco Editor          │
│  app.ts       │                             │
│  index.ts     │                             │
│ package.json  │                             │
│               │                             │
├───────────────┴─────────────────────────────┤
│ $ npm run dev                               │
│ Server running on port 3000                 │
└─────────────────────────────────────────────┘
```

This is the browser path. Users who prefer a desktop IDE connect to the same
container over Remote-SSH instead. See section 13.

---

# 13. IDE Client Access Paths

The container is the single source of truth. The IDE is a swappable client.

The code never lands on the user's laptop. The client is only a renderer.

```text
┌──────────────────────┐        ┌──────────────────────┐
│  VS Code / Cursor    │        │  Browser             │
│  (thin client)       │        │  Monaco + xterm.js   │
└──────────┬───────────┘        └──────────┬───────────┘
           │ SSH tunnel                    │ WebSocket
           │ (Remote-SSH extension)        │
           └───────────────┬────────────────┘
                           ↓
              ┌────────────────────────────┐
              │  Workspace Gateway         │
              │  session + token auth      │
              └────────────┬───────────────┘
                           ↓
              ┌────────────────────────────┐
              │  Docker Container          │
              │   ├─ VS Code Server        │
              │   ├─ language server        │
              │   ├─ /bin/bash              │
              │   └─ node / git / python    │
              └────────────┬───────────────┘
                           ↓
                  Object Storage (R2 / S3 / MinIO)
```

Three client paths are supported. All of them talk to the same container.

| Client           | Transport  | Target user             |
| ---------------- | ---------- | ----------------------- |
| Browser          | WebSocket  | No install, quick start |
| VS Code / Cursor | Remote-SSH | Desktop IDE power users |
| JetBrains IDEs   | Gateway    | Java / Go / Rust shops  |

---

## 13.1 Browser Client

Described in section 12. Monaco and xterm.js run in the page. File and
terminal traffic goes over WebSocket to the API, which proxies to the
container filesystem.

This is the default and most important path.

---

## 13.2 Remote-SSH Path

The user keeps their own editor. We run the IDE backend inside the container.

This is the same model as VS Code Remote-SSH, Dev Containers, and JetBrains
Gateway. Cursor supports Remote-SSH, so supporting Cursor costs nothing extra.

### Connect flow

```text
User clicks "Connect with VS Code" in the dashboard
              ↓
API validates session + workspace ownership
              ↓
Workspace is STARTING, container is being provisioned
              ↓
API generates a short-lived SSH keypair
              ↓
Public key injected into the container authorized_keys with a TTL
              ↓
API returns a connection command
              ↓
Local VS Code Remote-SSH extension connects
              ↓
VS Code Server downloads and starts inside the container
              ↓
Language server, terminal and tasks all run in the cloud
```

### Connection command

```text
ssh -p 2222 -i <ephemeral-key> workspace@workspace-789.gateway.example.com
```

Return this from the API, or offer a `cloud+tunnel://<token>@<host>` form that
a small local helper resolves to the same tunnel.

### Connection string handling

```text
User
 ↓
Dashboard issues short-lived token (15 min TTL, single workspace scope)
 ↓
Gateway exchanges token for an ephemeral SSH key
 ↓
Container is reachable only while the workspace is RUNNING
 ↓
Workspace stops → gateway revokes key → connection drops
```

### What runs where

```text
On the laptop              In the container
─────────────             ────────────────
Editor window             Repository files
Cursor / keystrokes       Language server
Rendering                 Extensions
                          Terminal / shell
                          Build / test / dev server
                          Git credentials
```

The laptop holds no repository content and runs no toolchain. This is what
preserves the compute model described in section 11.

### JetBrains Gateway

Gateway reads the same SSH configuration and runs the IDE backend in the
container. It needs no product-specific work, only a correct SSH endpoint.

---

## 13.3 Why Not a Network Filesystem Mount

A tempting alternative is to skip the container entirely and mount object
storage as a network drive, then let the user open it in their local IDE.

```text
S3 / R2 bucket
     ↓
rclone mount / s3fs / RaiDrive / Nextcloud gateway
     ↓
"Open Folder" in local VS Code
```

Do not do this.

**It is not a filesystem.** Object storage has no directories. Every IDE
operation becomes a network round trip.

| IDE operation       | Network cost                    |
| ------------------- | ------------------------------- |
| File tree expansion | One request per directory       |
| `git status`        | One stat per tracked file       |
| Language server     | Reads tsconfig and every import |
| `Ctrl+P` search     | Walks the whole tree            |
| `node_modules`      | 100,000+ files                  |

**It loses the compute.** If the IDE runs on the laptop, `npm run dev` runs on
the laptop. The repo is downloaded to local disk and nothing was saved. The
user now pays the disk, RAM and dependency cost this platform exists to
remove.

**It breaks isolation.** There is no container, so no CPU limit, no memory
limit, no non-root user and no network restriction. Untrusted repository code
would execute directly on the host, violating section 20.

**It does not scale.** One workspace per machine, no sleep and wake, no
Kubernetes scheduling, no preview proxy.

A network mount is also strictly worse than Git for the one case where it
seems attractive, which is lightweight access without a container. Use Git:

```bash
git clone <repo-url>
# edit
git commit -m "..."
git push
```

Git is a sync engine designed for this. It handles conflicts, it is fast, and
it works over flaky networks.

---

# 14. Preview Architecture

Suppose the user runs:

```bash
npm run dev
```

and the app listens on:

```text
localhost:3000
```

Inside the container.

The platform should expose it through a reverse proxy.

```text
Browser
   ↓
workspace-789.preview.example.com
   ↓
Reverse Proxy
   ↓
Container :3000
```

Possible tools:

- Traefik
- Nginx
- Caddy

Traefik is particularly useful later with dynamic container routing.

---

# 15. Redis Architecture

Redis should NOT store the repository permanently.

Use Redis for:

```text
Cache
Queue
Locks
Sessions
Workspace state
Rate limiting
```

Use BullMQ for jobs.

Example:

```text
Create Workspace
       ↓
BullMQ Queue
       ↓
Worker
       ↓
Docker
```

---

# 16. GitHub OAuth Architecture

```text
User
 ↓
Login with GitHub
 ↓
GitHub OAuth
 ↓
GitHub authorization
 ↓
Authorization code
 ↓
Backend
 ↓
Access token
 ↓
Encrypted storage
```

Use the token to:

- Read repositories
- Clone private repositories
- Push commits
- Create branches
- Create pull requests

Only request the minimum GitHub permissions required.

---

# 17. Git Operations

The container should have Git installed.

Commands execute inside the workspace:

```bash
git clone
git status
git add
git commit
git pull
git push
git checkout
git branch
```

For example:

```text
Browser
   ↓
"Commit & Push"
   ↓
API
   ↓
Workspace Container
   ↓
git add
git commit
git push
   ↓
GitHub
```

---

# 18. LLM Architecture — CUT (delegated to your editor)

> **Decision: removed from scope.** The platform runs no LLM. Every
> supported editor already ships one — Cursor, Antigravity and JetBrains AI
> all reach the workspace over Remote-SSH (section 13.2), so users bring
> their own AI and their own subscription. The platform pays zero token
> costs, and building a chat assistant here would mean competing with the
> tools this platform integrates with, not with the editor market.

What replaces it:

```text
User's editor (Cursor / Antigravity / VS Code + Copilot)
        │
        ↓  Remote-SSH (section 13.2)
Workspace container at /workspace
        │
        ↓
Full codebase context + terminal + git — AI included
```

Consequences of this decision:

- Section 19 (AI command safety) is also cut — it only ever guarded an LLM.
- The `ai_conversations`, `ai_messages` and `ai_command_proposals` tables
  in `packages/db` are unused; drop them in a later migration.
- The browser IDE (code-server) intentionally has no assistant. The browser
  path is for zero-install users; anyone who wants AI opens their editor.
  If that ever changes, do NOT build a chat product — wire a single
  "send selection to my own API key" call instead.

---

# 19. AI Command Safety — CUT (see section 18)

This section existed only to stop an LLM from executing shell commands on
the platform without approval. There is no platform LLM, so there is no
proposal channel to secure: a human types every command into the terminal,
and the editor runs inside the container under the normal resource limits.

Removed expectations:

- `ai_command_proposals` approval flow
- LLM policy validation before exec

Section 20 (Security Architecture) is unchanged and still fully required —
it covers the platform itself, not the AI that no longer exists.

---

# 20. Security Architecture

The most important security rule:

> Never execute untrusted repository code directly on the host.

Use:

```text
User Code
   ↓
Isolated Container
   ↓
Resource Limits
```

Recommended controls:

- Non-root container
- CPU limit
- Memory limit
- Disk quota
- Process limit
- Network restrictions
- Command timeout
- Container cleanup
- Rate limiting
- Authentication
- Authorization
- Encrypted GitHub tokens
- Secret isolation

Later consider stronger sandboxing technologies for hostile workloads.

---

# 21. Complete Technology Stack

## Frontend

```text
Next.js
TypeScript
Tailwind CSS
Monaco Editor
xterm.js
WebSocket
```

## Backend

```text
Node.js
TypeScript
Express
WebSocket
```

## Database

```text
PostgreSQL
Prisma
```

## Authentication

```text
GitHub OAuth
```

## Storage

```text
Cloudflare R2 / AWS S3
MinIO for local development
```

## Compute

```text
Docker
```

Later:

```text
Kubernetes
```

## Remote IDE Access

```text
SSH (OpenSSH in the container)
Ephemeral keypair + authorized_keys TTL
VS Code Server (downloaded into the container at connect time)
VS Code Remote-SSH / Dev Containers extension (client side)
JetBrains Gateway (client side, no extra work)
```

The client is always the user's own installed IDE. Nothing is installed on the
laptop by this platform.

## Cache / Queue

```text
Redis
BullMQ
```

## Proxy

```text
Traefik
```

Alternative:

```text
Nginx / Caddy
```

## AI

None — cut (section 18). AI comes from the user's editor over Remote-SSH;
the platform runs no model and stores no API keys.

## Observability

Later add:

```text
OpenTelemetry
Prometheus
Grafana
Loki
```

---

# 22. Suggested Repository Structure

```text
cloud-dev-platform/
│
├── apps/
│   ├── web/
│   │   └── Next.js
│   │
│   ├── api/
│   │   └── Express
│   │
│   └── worker/
│       └── BullMQ workers
│
├── packages/
│   ├── db/
│   │   └── Prisma
│   │
│   ├── github/
│   │   └── GitHub integration
│   │
│   ├── workspace/
│   │   └── Docker management
│   │
│   └── terminal/
│       └── WebSocket terminal
│
├── infra/
│   ├── docker/
│   ├── nginx/
│   └── kubernetes/
│
├── docker-compose.yml
├── package.json
└── README.md
```

---

# 23. Recommended Build Order

Do not build everything simultaneously.

```text
1. Next.js dashboard
        ↓
2. GitHub OAuth
        ↓
3. GitHub repository listing
        ↓
4. Express API
        ↓
5. Docker workspace
        ↓
6. Terminal + xterm.js
        ↓
7. Monaco editor
        ↓
8. Remote-SSH access (VS Code / Cursor / Gateway)
        ↓
9. Git operations
        ↓
10. PostgreSQL + Prisma
        ↓
11. Redis + BullMQ
        ↓
12. Object storage (design: section 4)
        ↓
13. Preview URLs
        ↓
14. LLM assistant — CUT: editors bring their own AI (section 18)
        ↓
15. Security hardening
        ↓
16. Kubernetes
```

This order keeps the project understandable and lets you validate each subsystem before adding the next one.

Step 8 is cheap and high value. It needs nothing beyond step 5, because the
container already provides the IDE backend. Offering the user's own editor at
that point makes the platform immediately usable for serious work, while the
browser IDE in steps 6 and 7 remains the zero-install default.

---

# 24. Final Architecture

The long-term system should look like:

```text
                         ┌──────────────┐
                         │    GitHub    │
                         └──────┬───────┘
                                │
                                ↓
┌──────────────────────────────────────────────────────────┐
│                     PLATFORM                             │
│                                                          │
│  Next.js ─── WebSocket ─── Express API                  │
│     │                         │                          │
│     │                         ├──── PostgreSQL/Prisma     │
│     │                         │                          │
│     │                         ├──── Redis/BullMQ          │
│     │                         │                          │
│     │                         ├──── GitHub OAuth          │
│     │                         │                          │
│     │                         └──── Workspace Manager     │
│     │                                      │             │
│     │                         ┌────────────┴─────────┐   │
│     │                         ↓                      ↓   │
│     │                  Object Storage          Docker/K8s│
│     │                  R2 / S3 / MinIO               │   │
│     │                                                │   │
│     │                                      ┌─────────┴─┐ │
│     │                                      │ Workspace │ │
│     │                                      │ Container │ │
│     │                                      └────┬──────┘ │
│     │                                           │        │
│     │                                    CPU + RAM       │
│     │                                           │        │
│     └────────────── Browser Preview ────────────┘        │
│                                                          │
└──────────────────────────────────────────────────────────┘

                         +
               Cursor / Antigravity / VS Code
                         │
                         ↓
                 Remote-SSH (section 13.2)
                         │
                         ↓
              Bring-your-own AI, your own keys
```
