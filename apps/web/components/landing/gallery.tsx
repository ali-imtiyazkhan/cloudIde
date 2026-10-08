import Image from "next/image";
import { API_URL } from "../../lib/api";

type Props = {
  checking: boolean;
};

/** Cloud-white top (continues the page) into a dark base the footer melts into. */
const GALLERY_SCRIM =
  "linear-gradient(180deg, #f4f6fa 0%, rgba(244,246,250,0.6) 6%, rgba(3,8,16,0.3) 22%, rgba(3,8,16,0.46) 55%, rgba(3,8,16,0.7) 100%)";

export function Gallery({ checking }: Props) {
  return (
    <section
      id="gallery"
      className="relative isolate flex min-h-[min(78svh,760px)] scroll-mt-24 items-center justify-center overflow-hidden px-5 py-28 text-center text-white sm:px-8"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <Image
          src="/golden-hour-coding-retreat.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0" style={{ background: GALLERY_SCRIM }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_55%,rgba(3,8,16,0.3),transparent_70%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4">
        <span className="inline-flex items-center rounded-full border border-[#7dd3fc]/45 bg-[#0e7490]/35 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#bae6fd] backdrop-blur-md">
          Built for long sessions
        </span>

        <h2 className="mt-2 text-balance text-3xl font-semibold leading-[1.06] tracking-tight drop-shadow-[0_12px_40px_rgba(0,0,0,0.55)] sm:text-5xl">
          Your workspace, with a view.
        </h2>

        <p className="max-w-xl text-balance leading-relaxed text-white/88 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
          Workspaces wake up in seconds and stay warm while you do — come back
          tomorrow and every buffer, terminal and branch is exactly where you
          left it.
        </p>

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
            Start with GitHub
          </a>
          <a
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-full border border-white/40 bg-[#030810]/45 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-md transition-colors duration-300 hover:border-white/75 hover:bg-[#030810]/65 sm:w-auto"
          >
            Open dashboard
          </a>
        </div>
      </div>
    </section>
  );
}
