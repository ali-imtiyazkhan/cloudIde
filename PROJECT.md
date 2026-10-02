# Cloud GitHub Development Platform

## 1. Project Overview

A cloud-based development platform where a user connects their GitHub account, imports a GitHub repository, and works on that repository from a browser-based IDE without keeping the full development workspace on their local disk.

The core idea is to separate:

- **Persistent storage** — repository/project data stored in cloud object storage.
- **Compute** — an isolated Docker container that is created when the user needs to run or develop the project.
- **Browser IDE** — the user's interface for editing files, using a terminal, and previewing the application.

### Basic Flow

```text
GitHub Repository
       |
       | GitHub OAuth / Repository URL
       v
   Your Platform
       |
       +----> Persistent Cloud Storage
       |
       +----> Docker Development Container
                    |
                    +---- CPU / RAM
                    +---- Node / Python / Go / etc.
                    +---- Terminal
                    +---- Dev Server
       |
       v
 Browser IDE
```

The user's laptop mainly acts as the client. The actual repository workspace and development processes live in the cloud.

---

## 2. Problem

Normally:

```bash
git clone https://github.com/user/project.git
```

creates a complete local working copy.

For large repositories, this consumes:

- Disk space
- RAM during development
- Local CPU
- Local dependencies such as `node_modules`
- Local Docker/container resources

This project explores moving the development workspace to the cloud.

---

## 3. Main Goal

Build a platform where a user can:

1. Sign in with GitHub.
2. Select/import a GitHub repository.
3. Create a cloud development workspace.
4. Open the repository in a browser IDE.
5. Edit files.
6. Use a cloud terminal.
7. Install dependencies.
8. Run the application inside an isolated container.
9. Preview the running application through the browser.
10. Save changes persistently.
11. Commit and push changes back to GitHub.
12. Stop the workspace when finished.
13. Reopen the project later and continue.

---

# 4. MVP

The first version should NOT try to become a complete GitHub Codespaces replacement.

### MVP features

- GitHub OAuth
- GitHub repository selection
- Repository import
- Workspace creation
- Docker-based development container
- Browser IDE
- File tree
- Code editor
- Terminal
- Run commands
- Persistent project storage
- Project start/stop
- Basic application preview
- Git status
- Commit
- Push to GitHub

---

# 5. Development Phases

## Phase 1 — Basic Workspace

```text
GitHub
  ↓
Backend
  ↓
Docker
  ↓
Repository
  ↓
Terminal
```

Features:

- GitHub OAuth
- Repository URL/import
- Clone repository
- Create Docker container
- Execute commands
- Basic terminal

---

## Phase 2 — Persistent Storage

Add object storage.

```text
Repository
     ↓
Object Storage
     ↓
Docker Workspace
```

The workspace can be stopped and later recreated.

Possible storage providers:

- Cloudflare R2
- AWS S3
- MinIO for local development

---

## Phase 3 — Browser IDE

Add:

- Monaco Editor
- File explorer
- Tabs
- Search
- Save
- Terminal
- Git status
- Command execution

---

## Phase 4 — Preview System

When the user runs:

```bash
npm run dev
```

the application runs inside the cloud container.

A proxy exposes the application through something like:

```text
https://workspace-123.preview.yourapp.com
```

---

## Phase 5 — GitHub Integration

Support:

```text
git clone
git status
git add
git commit
git pull
git push
git checkout
git branch
```

GitHub OAuth is used for authentication and GitHub API access.

---

## Phase 6 — LLM Assistant

Add an AI coding assistant.

Possible features:

- Explain selected code
- Generate code
- Fix errors
- Explain terminal errors
- Search the repository
- Generate tests
- Refactor code
- Create files
- Explain project architecture

The LLM should NOT automatically execute dangerous commands.

Use an approval mechanism:

```text
LLM
 ↓
Proposed command
 ↓
User approval
 ↓
Container
```

---

## Phase 7 — Multi-user Infrastructure

Later introduce Kubernetes.

```text
User A → Container A
User B → Container B
User C → Container C
```

Each workspace gets:

- CPU limit
- Memory limit
- Storage limit
- Network restrictions
- Process isolation

---

# 6. Recommended Tech Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- Monaco Editor
- xterm.js
- WebSocket client

## Backend

- Node.js
- TypeScript
- Express
- REST API
- WebSocket

## Database

- PostgreSQL
- Prisma ORM

Store:

- Users
- GitHub accounts
- Repositories
- Workspaces
- Containers
- Sessions
- Projects
- AI conversations
- Usage information

Do NOT use PostgreSQL for large repository file contents.

---

## Authentication

### GitHub OAuth

Use GitHub OAuth for:

- Login
- Repository access
- GitHub API operations
- Push/pull authorization

Never store the user's GitHub password.

OAuth tokens should be encrypted at rest.

---

## Storage

Use S3-compatible object storage.

Recommended choices:

### Development

```text
MinIO
```

### Production

```text
Cloudflare R2
```

or:

```text
AWS S3
```

Use object storage for:

- Repository snapshots
- Workspace backups
- Large artifacts
- Uploaded files

---

## Containers

### Docker

Each active workspace runs in its own container.

Example:

```text
workspace-123
    |
    +-- /workspace
    +-- Node.js
    +-- Git
    +-- npm
    +-- shell
```

Later:

```text
Docker
   ↓
Kubernetes
```

---

## Cache / Queue

### Redis

Use Redis for:

- Session/cache data
- Workspace state
- Terminal session metadata
- Job queues
- Locks
- Rate limiting

Do not use Redis as permanent repository storage.

For background jobs, consider:

```text
BullMQ
```

---

## Browser IDE

### Monaco Editor

Use Monaco as the main code editor.

It provides an experience similar to VS Code's editor.

### xterm.js

Use xterm.js for the browser terminal.

Architecture:

```text
Browser
   |
   | WebSocket
   v
Terminal Service
   |
   v
Docker Container
   |
   v
Shell
```

---

# 7. LLM Layer

The LLM is an optional intelligent layer, not part of the core execution system.

Possible model providers:

- OpenAI
- Anthropic
- Google
- Other compatible LLM providers

The AI service can receive:

```text
User question
+
Selected code
+
Relevant repository files
+
Terminal error
```

and return:

```text
Explanation
+
Code suggestion
+
Optional command proposal
```

Use repository search/RAG when the AI needs project-wide context.

---

# 8. Other Important Components

### Reverse Proxy

Use:

- Nginx
- Traefik
- Caddy

for routing workspace preview URLs.

Example:

```text
workspace-123.preview.example.com
                ↓
          Reverse Proxy
                ↓
        Container :3000
```

---

### WebSocket

Needed for real-time:

- Terminal output
- File updates
- Workspace status
- Running processes
- Editor collaboration later

---

### Background Worker

Use a worker for long-running tasks:

```text
API
 ↓
Redis/BullMQ
 ↓
Worker
 ↓
Docker
```

Tasks can include:

- Clone repository
- Create workspace
- Install dependencies
- Create backup
- Stop inactive workspace
- Build project

---

# 9. Security Requirements

This is one of the hardest parts of the project.

Never directly run arbitrary user commands on the host machine.

Bad:

```text
User
 ↓
Host OS
 ↓
shell command
```

Better:

```text
User
 ↓
API
 ↓
Isolated container
 ↓
Command
```

Add:

- CPU limits
- Memory limits
- Disk limits
- Network restrictions
- Container isolation
- Non-root containers
- Command timeouts
- Rate limiting
- Secret protection
- Workspace cleanup
- Authentication/authorization

Later, Kubernetes can provide stronger isolation and resource management.

---

# 10. What Happens When a User Runs Code?

Example:

```bash
npm run dev
```

Flow:

```text
Browser
   ↓
WebSocket
   ↓
Backend
   ↓
Workspace Manager
   ↓
Docker Container
   ↓
npm run dev
   ↓
Application
   ↓
Port 3000
   ↓
Reverse Proxy
   ↓
Browser Preview
```

The CPU and RAM used to run the application belong to the cloud compute environment.

---

# 11. Important Design Principle

Do not think:

> "Cloud storage will run my application."

Instead think:

```text
Object Storage = persistent files

Docker Container = active workspace

CPU/RAM = execution

PostgreSQL = metadata

Redis = fast state / queue / cache

Browser = user interface
```

This separation is fundamental to the architecture.

---

# 12. Future Features

After the MVP:

- Kubernetes
- Auto-scaling
- Workspace sleep/wake
- Multiple terminal sessions
- GitHub pull requests
- Branch management
- Environment variables
- Secrets manager
- Team workspaces
- Real-time collaboration
- AI coding agent
- Automatic dependency detection
- Automatic Dockerfile generation
- Project templates
- Usage/billing system
- Workspace snapshots
- One-click deployment

---

# 13. Project Classification

### MVP

Medium-level project.

### Full version

Advanced project.

### Kubernetes + multi-user + secure isolation + autoscaling + AI agent

Very advanced / production-grade project.

The recommended approach is to build the MVP first and progressively introduce the advanced infrastructure.
