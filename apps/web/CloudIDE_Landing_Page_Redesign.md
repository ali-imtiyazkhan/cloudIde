# CloudIDE — Landing Page Feature Section Redesign

## Goal

Redesign the current six-card feature grid so CloudIDE feels like a serious developer infrastructure product rather than a generic SaaS landing page.

The core idea to communicate visually is:

> **Your code → Your workspace → Your state**

CloudIDE should feel closer to products such as Linear, Vercel, and modern developer infrastructure dashboards.

---

# 1. Section Structure

Use this structure instead of six equal feature cards.

## Section headline

### Built for the way you actually code

**Your repository → Your workspace → Your state**

Supporting copy:

> From GitHub import to isolated compute, CloudIDE keeps your entire development environment in the cloud.

---

# 2. Architecture Visual

Create one large, visually dominant architecture panel.

```text
                    ARCHITECTURE

   GitHub ──→ Cloud Storage ──→ Docker Workspace ──→ Preview
                                  │
                                  ├── Browser IDE
                                  │
                                  └── Secure SSH
```

The visual should communicate the complete lifecycle:

1. Repository enters CloudIDE.
2. Repository is persisted in cloud/object storage.
3. CloudIDE creates an isolated workspace.
4. Developer works through the browser IDE or SSH.
5. Application can be previewed.
6. Workspace state can be snapshotted and restored.

---

# 3. Three Main Pillars

Instead of six equally sized cards, group the features into three product concepts.

## 01 — Your Code

### GitHub OAuth

**Your GitHub, connected.**

Connect your account and bring any repository into CloudIDE in seconds.

Metadata:

`OAuth · Encrypted token · Secure repository access`

### Repository Import

**Clone without cloning locally.**

Import repositories directly into your cloud workspace. Your laptop stays clean.

Metadata:

`GitHub → CloudIDE · Server-side import`

---

## 02 — Your Workspace

### Isolated Workspaces

**Every project gets its own machine.**

Each workspace runs inside an isolated container with dedicated resources.

Metadata:

`Docker · 2 vCPU · 4 GB RAM · Isolated`

### Browser IDE

**A full dev environment in your browser.**

Edit files, run commands, install dependencies, and work without setting up your machine.

Metadata:

`Editor · File tree · Terminal · Preview`

### Remote SSH

**Use the tools you already love.**

Connect from VS Code, Cursor, or JetBrains through secure temporary SSH access.

Metadata:

`VS Code · Cursor · JetBrains · SSH`

---

## 03 — Your State

### Object Storage / Snapshots

**Your workspace can disappear. Your code can't.**

Snapshots live in object storage so you can stop, restore, and continue whenever you want.

Metadata:

`Object storage · Snapshots · Restore`

Supporting principle:

> Cloud is truth. Disk is cache.

---

# 4. Product Preview

Below the architecture section, add a large CloudIDE workspace preview.

It should look like a real development environment rather than another marketing card.

```text
┌─────────────────────────────────────────────────────────────┐
│ cloudide   my-project       ● Running     SSH     Preview    │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│ src/         │ const server = ...          │ TERMINAL      │
│ ├ app.ts     │                              │               │
│ ├ db.ts      │ import express ...          │ $ npm run dev │
│ └ api/       │                              │               │
│              │                              │ localhost:3000│
│ package.json │                              │               │
│ Dockerfile   │                              │               │
│              │                              │               │
└──────────────┴──────────────────────────────┴───────────────┘
```

Headline below/above the preview:

> **One workspace. Everything you need.**

---

# 5. Feature Panel Style

Do not use large generic SaaS cards like:

```text
┌───────────────────────────────┐
│                               │
│        ICON                   │
│                               │
│ GitHub OAuth       ● LIVE     │
│                               │
│ Long description...           │
│                               │
└───────────────────────────────┘
```

Instead, use technical product panels:

```text
┌──────────────────────────────────────────┐
│  ◉  GITHUB                               │
│                                          │
│  Repository access              LIVE     │
│  OAuth · Encrypted token                 │
│                                          │
│  ──────────────────────────────────────  │
│  github.com → CloudIDE                   │
└──────────────────────────────────────────┘
```

The bottom metadata line should make each capability feel like part of an actual system.

---

# 6. Visual Direction

## Overall style

Target:

- Linear
- Vercel
- Modern developer infrastructure
- Clean technical dashboards
- Premium but minimal
- Strong typography
- Subtle motion
- Lots of whitespace

Avoid:

- Generic startup SaaS appearance
- Excessive rounded cards
- Heavy shadows
- Excessive gradients
- Bright rainbow colors
- Huge empty cards
- Too many decorative illustrations

---

# 7. Color System

Use a mostly neutral palette.

```text
Background:       #F7F8FA
Cards:            #FFFFFF
Primary text:     #111318
Secondary text:   #667085
Border:           #E6E8EC

Primary accent:   #6366F1
Success:          #16A34A
```

The accent color should be used sparingly for:

- Active states
- Architecture connections
- Important UI controls
- Status indicators
- Small highlights

---

# 8. Borders and Shadows

Prefer borders over shadows.

```css
border: 1px solid rgba(0, 0, 0, 0.08);
```

Recommended border radius:

```css
border-radius: 16px;
```

Use very subtle shadows only when necessary.

Avoid large floating-card shadows.

---

# 9. Status Indicators

Keep the existing `LIVE` idea, but make it more refined.

Example:

```text
● LIVE
```

Use:

- Small green dot
- Uppercase label
- Compact pill
- Thin border
- Minimal padding

Example visual treatment:

```text
┌───────────┐
│ ● LIVE    │
└───────────┘
```

---

# 10. Copywriting Principles

The current descriptions sound too much like technical documentation.

Prefer benefit-oriented copy.

### Instead of

> The API re-reads every repo from GitHub server-side, so a clone URL can never be spoofed from the client.

Use:

> **Clone without cloning locally.**  
> Import repositories directly into your cloud workspace. Your laptop stays clean.

Technical details can remain as small metadata below the main message.

---

# 11. Recommended Final Layout

```text
──────────────────────────────────────────────────────────────

              BUILT FOR THE WAY
              YOU ACTUALLY CODE

        Your repository → Your workspace → Your state

──────────────────────────────────────────────────────────────

                     ARCHITECTURE

       GitHub
          │
          ▼
   Cloud Storage
          │
          ▼
   Docker Workspace
      │         │
      ▼         ▼
 Browser IDE    SSH
      │
      ▼
    Preview

──────────────────────────────────────────────────────────────

      YOUR CODE          YOUR WORKSPACE        YOUR STATE

   GitHub OAuth          Isolated Workspace     Snapshots
   Repository Import     Browser IDE            Object Storage
                         Remote SSH             Restore

──────────────────────────────────────────────────────────────

                    ONE WORKSPACE.
                    EVERYTHING YOU NEED.

              [ Large CloudIDE UI Preview ]

──────────────────────────────────────────────────────────────
```

---

# 12. Core Product Story

The entire section should answer one question:

> **Why should I use CloudIDE instead of developing locally?**

The answer should become obvious from the visual:

```text
Your laptop
     │
     │  GitHub
     ▼
┌─────────────┐
│   CloudIDE  │
├─────────────┤
│ Repository  │
│      ↓      │
│   Storage   │
│      ↓      │
│   Workspace │
│      ↓      │
│ IDE / SSH   │
│      ↓      │
│   Preview   │
└─────────────┘
```

The message:

> **Your laptop is no longer the development environment. CloudIDE is.**

---

# 13. Design Principle

CloudIDE is not simply an online code editor.

It is:

> **A cloud development environment that turns a Git repository into an isolated, persistent, ready-to-code workspace.**

The landing page should therefore visually represent the **system architecture and workflow**, not just list features.
