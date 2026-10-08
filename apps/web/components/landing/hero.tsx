import Image from "next/image";
import { API_URL } from "../../lib/api";

type Props = {
  error: string | null;
  checking: boolean;
};

/** Top-of-page mist: matches the cloud-white bar the header paints. */
const HERO_SCRIM =
  "linear-gradient(180deg, rgba(3,8,16,0.06) 0%, rgba(3,8,16,0.26) 15%, rgba(3,8,16,0.4) 42%, rgba(3,8,16,0.58) 68%, rgba(3,8,16,0.74) 82%, rgba(244,246,250,0.9) 96%, #f4f6fa 100%)";

export function Hero({ error, checking }: Props) {
  return (
    <section className="relative isolate flex min-h-[max(100svh,720px)] items-center justify-center overflow-hidden px-5 pb-44 pt-[190px] text-center text-white sm:px-8">
      {/* Scenic backdrop, scrimmed so copy stays readable and the bottom
          dissolves into the off-white page like cloud. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <Image
          src="/dreamy-sunrise-valley-meadow.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0" style={{ background: HERO_SCRIM }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(3,8,16,0.35),transparent_70%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4">
        <span className="inline-flex items-center rounded-full border border-[#7dd3fc]/45 bg-[#0e7490]/35 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#bae6fd] backdrop-blur-md">
          Cloud GitHub Development Platform
        </span>

        <h1 className="mt-2 text-balance text-4xl font-semibold leading-[1.04] tracking-tight drop-shadow-[0_12px_40px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl">
          Your code lives in the cloud.
          <br />
          Your laptop stays light.
        </h1>

        <p className="max-w-2xl text-balance text-base leading-relaxed text-white/90 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] sm:text-lg">
          Connect GitHub, import a repository, and open it in a browser-based
          IDE backed by an isolated Docker workspace. No local clones, no local{" "}
          <code className="rounded-md border border-white/25 bg-[#030810]/55 px-1.5 py-0.5 font-mono text-[0.9em] text-white">
            node_modules
          </code>
          , no local containers.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-3 max-w-md rounded-xl border border-danger/55 bg-danger/20 px-4 py-3 text-sm text-[#ffe4e6] backdrop-blur-md"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
          <a
            href={`${API_URL}/auth/github`}
            aria-disabled={checking}
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#2ea043] to-[#238636] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(35,134,54,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:from-[#3fb950] hover:to-[#2ea043] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:w-auto"
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
            Sign in with GitHub
          </a>
          <a
            href="#how"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 bg-[#030810]/45 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-md transition-colors duration-300 hover:border-white/75 hover:bg-[#030810]/65 sm:w-auto"
          >
            How it works
          </a>
        </div>
      </div>
    </section>
  );
}
