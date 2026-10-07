import { API_URL } from "../../lib/api";

type Props = {
  checking: boolean;
};

export function FinalCta({ checking }: Props) {
  return (
    <section id="get-started" className="relative z-10 pb-24 pt-4 sm:pb-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-accent/30 px-6 py-16 text-center backdrop-blur-xl sm:px-12 sm:py-20">
          {/* Gradient wash inside the panel. */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-accent-strong/18 via-transparent to-[#7c3aed]/12" aria-hidden />
          <div
            className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[620px] -translate-x-1/2 rounded-full bg-accent-strong/35 blur-[90px]"
            aria-hidden
          />

          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            Ready when you are
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Import a repository. Be coding in seconds.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-balance text-muted">
            Sign in with GitHub, pick a project, and start a workspace that
            outlives your laptop&apos;s battery, disk and Wi-Fi.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={`${API_URL}/auth/github`}
              aria-disabled={checking}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-7 py-3.5 text-sm font-semibold text-[#03121f] shadow-[0_24px_60px_-24px_rgba(56,189,248,0.95)] transition-all duration-300 hover:-translate-y-0.5 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:w-auto"
            >
              <svg
                viewBox="0 0 16 16"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              Get started
            </a>
            <a
              href="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-xl border border-line bg-surface px-7 py-3.5 text-sm font-medium text-foreground transition-colors duration-300 hover:border-accent/50 hover:bg-surface-strong sm:w-auto"
            >
              Open dashboard
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
