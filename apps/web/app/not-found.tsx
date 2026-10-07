import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";

export default function NotFound() {
  return (
    <div className="relative z-10 flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-5 py-24">
        <div className="text-center">
          <p className="bg-gradient-to-b from-white to-accent bg-clip-text font-mono text-7xl font-semibold tracking-tighter text-transparent sm:text-9xl">
            404
          </p>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
            This path doesn&apos;t exist
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted">
            The page you asked for isn&apos;t here — but your workspaces are.
            Storage persists even when URLs don&apos;t.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-6 py-3 text-sm font-semibold text-[#03121f] transition-all duration-300 hover:-translate-y-0.5 sm:w-auto"
            >
              Back home
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-xl border border-line bg-surface px-6 py-3 text-sm font-medium transition-colors duration-300 hover:border-accent/50 hover:bg-surface-strong sm:w-auto"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
