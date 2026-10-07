"use client";

import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: Props) {
  return (
    <div className="relative z-10 flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-5 py-24">
        <div className="w-full max-w-lg text-center">
          <span className="inline-grid h-14 w-14 place-items-center rounded-2xl border border-danger/40 bg-danger/10 font-mono text-xl text-danger">
            !
          </span>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
            Something broke on our side
          </h1>
          <p className="mt-4 text-muted">
            The page failed to render. Your data is untouched — workspace rows
            and snapshots never go through this code path.
          </p>

          {error?.message && (
            <p className="mt-6 break-words rounded-xl border border-danger/35 bg-danger/8 px-4 py-3 text-left font-mono text-xs leading-relaxed text-danger">
              {error.message}
              {error.digest && <span className="opacity-60"> · {error.digest}</span>}
            </p>
          )}

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={reset}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-6 py-3 text-sm font-semibold text-[#03121f] transition-all duration-300 hover:-translate-y-0.5 sm:w-auto"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex w-full items-center justify-center rounded-xl border border-line bg-surface px-6 py-3 text-sm font-medium transition-colors duration-300 hover:border-accent/50 hover:bg-surface-strong sm:w-auto"
            >
              Back home
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
