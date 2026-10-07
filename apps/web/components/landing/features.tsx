import type { ReactNode } from "react";

const FEATURES = [
  {
    title: "GitHub OAuth",
    body: "Sign in with GitHub. Your token is encrypted at rest with CRYPTO_KEY and only ever used for repo access.",
    icon: "github",
  },
  {
    title: "Repository import",
    body: "The API re-reads every repo from GitHub server-side, so a clone URL can never be spoofed from the client.",
    icon: "repo",
  },
  {
    title: "Isolated workspaces",
    body: "Each workspace is its own Docker container: non-root, 2 vCPU / 4 GB, loopback-only ports, no shared state.",
    icon: "box",
  },
  {
    title: "Browser IDE",
    body: "File tree, editor and an xterm.js terminal wired straight to a pty inside the container. Nothing installed locally.",
    icon: "browser",
  },
  {
    title: "Remote-SSH access",
    body: "One key per connection in Cursor, VS Code or JetBrains Gateway. Rotated on Connect, revoked the moment you Stop.",
    icon: "key",
  },
  {
    title: "Object storage snapshots",
    body: "Stop tars the workspace into S3; Start restores it before the container mounts. Cloud is truth, disk is cache.",
    icon: "layers",
  },
] as const;

const ICONS: Record<string, ReactNode> = {
  github: (
    <>
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.3 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </>
  ),
  repo: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H18a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </>
  ),
  box: (
    <>
      <path d="M21 8.5v7a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 15.5v-7a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8.5z" />
      <path d="m3.3 7.5 8.7 5 8.7-5M12 22v-9.5" />
    </>
  ),
  browser: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M7 6.5h.01M10 6.5h.01" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4" />
      <path d="m10.5 12.5 8-8M17 6l2.5 2.5M14.5 8.5 17 11" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2.5 9 4.5-9 4.5-9-4.5z" />
      <path d="m3 12.5 9 4.5 9-4.5M3 17l9 4.5L21 17" />
    </>
  ),
};

export function Features() {
  return (
    <section id="features" className="relative z-10 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            Everything, working
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            A complete platform, not a demo
          </h2>
          <p className="mt-4 text-muted">
            Sign-in, compute, editors and storage are all wired together —
            each one validated end to end against a real queue and a real
            bucket.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-line bg-surface/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-accent/45 hover:bg-surface-strong/80"
            >
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent-strong/20 opacity-0 blur-[60px] transition-opacity duration-500 group-hover:opacity-100"
                aria-hidden
              />
              <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-accent transition-colors duration-300 group-hover:border-accent/50">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {ICONS[feature.icon]}
                </svg>
              </span>

              <div className="relative mt-5 flex items-center gap-2.5">
                <h3 className="text-[15px] font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/35 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-success">
                  <span className="h-1 w-1 rounded-full bg-success" />
                  live
                </span>
              </div>
              <p className="relative mt-2.5 text-sm leading-relaxed text-muted">
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
