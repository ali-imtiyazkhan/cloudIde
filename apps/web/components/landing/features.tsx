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
    <section id="features" className="relative z-10 scroll-mt-24 py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-full border border-[#cfe3fb] bg-[#eff6ff] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#1d6fd1]">
            Everything, working
          </p>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-[#0b1220] sm:text-4xl">
            A complete platform, not a demo
          </h2>
          <p className="mt-4 leading-relaxed text-[#5a6474]">
            Sign-in, compute, editors and storage are all wired together —
            each one validated end to end against a real queue and a real
            bucket.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-[#e6eaf1] bg-[#fbfcfe] p-6 shadow-[0_10px_30px_rgba(11,18,32,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d5e2f2] hover:shadow-[0_18px_40px_rgba(11,18,32,0.09)]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#dbe7f7] bg-[#eff6ff] text-[#1d6fd1] transition-colors duration-300 group-hover:border-[#bcd9f6]">
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

              <div className="mt-5 flex items-center gap-2.5">
                <h3 className="text-[15px] font-semibold tracking-tight text-[#0b1220]">
                  {feature.title}
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf0d0] bg-[#e8f7ee] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#15803d]">
                  <span className="h-1 w-1 rounded-full bg-[#15803d]" />
                  live
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-[#5a6474]">
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
