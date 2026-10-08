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
    <section id="how" className="relative z-10 scroll-mt-24 py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-full border border-[#cfe3fb] bg-[#eff6ff] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#1d6fd1]">
            Four steps
          </p>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-[#0b1220] sm:text-4xl">
            From GitHub to a running workspace
          </h2>
          <p className="mt-4 leading-relaxed text-[#5a6474]">
            No local clones, no local{" "}
            <code className="rounded-md border border-[#dbe7f7] bg-[#eff6ff] px-1.5 py-0.5 font-mono text-[0.9em] text-[#1d6fd1]">
              node_modules
            </code>
            , no local containers. The laptop renders; the cloud computes.
          </p>
        </div>

        <ol className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Thread connecting the four steps on wide screens. */}
          <div
            className="pointer-events-none absolute inset-x-8 top-7 hidden h-px bg-gradient-to-r from-transparent via-[#bcd9f6] to-transparent lg:block"
            aria-hidden
          />

          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-[#e6eaf1] bg-white p-6 shadow-[0_10px_30px_rgba(11,18,32,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d5e2f2] hover:shadow-[0_18px_40px_rgba(11,18,32,0.09)]"
            >
              <span className="relative grid h-11 w-11 place-items-center rounded-full border border-[#cfe3fb] bg-[#eff6ff] font-mono text-sm font-semibold text-[#1d6fd1]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-[#0b1220]">
                {step.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#5a6474]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
