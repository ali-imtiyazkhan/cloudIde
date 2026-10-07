const STEPS = [
  {
    title: "Sign in with GitHub",
    body: "OAuth returns a token that is encrypted before it ever touches Postgres. Sessions last 30 days, hashed at rest.",
  },
  {
    title: "Import a repository",
    body: "Pick a repo from your account. The server re-reads its metadata from GitHub and creates a project with a storage prefix.",
  },
  {
    title: "Start a workspace",
    body: "A BullMQ job restores files from the bucket — or clones on a true cold start — before the container ever mounts the disk.",
  },
  {
    title: "Connect and work",
    body: "Browser terminal, Remote-SSH from your own editor, or JetBrains Gateway. All three land in the same container.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative z-10 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            Four steps
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            From GitHub to a running workspace
          </h2>
          <p className="mt-4 text-muted">
            No local clones, no local <code className="font-mono text-accent">node_modules</code>,
            no local containers. The laptop renders; the cloud computes.
          </p>
        </div>

        <ol className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Thread connecting the four steps on wide screens. */}
          <div
            className="pointer-events-none absolute inset-x-8 top-7 hidden h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent lg:block"
            aria-hidden
          />

          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-line bg-surface/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-accent/40"
            >
              <span className="relative grid h-11 w-11 place-items-center rounded-full border border-accent/45 bg-gradient-to-b from-accent/25 to-transparent font-mono text-sm font-semibold text-accent shadow-[0_0_30px_-8px_rgba(56,189,248,0.9)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 text-[15px] font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
