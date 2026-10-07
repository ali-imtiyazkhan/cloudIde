import { API_URL } from "../../lib/api";

type Props = {
  error: string | null;
  checking: boolean;
};

/** A faithful slice of the real worker log — this is what Start actually prints. */
const LOG = [
  { mark: "$", text: "cloudide start ali-imtiyazkhan/cloudIde", tone: "text-foreground" },
  { mark: "→", text: "restore  workspaces/4928d823/snapshot.tar.gz", tone: "text-accent" },
  { mark: "✓", text: "2.7 MiB pulled from object storage", tone: "text-success" },
  { mark: "✓", text: "container RUNNING  ·  2 vCPU / 4 GB", tone: "text-success" },
  { mark: "→", text: "ssh coder@127.0.0.1 -p 52250", tone: "text-accent" },
  { mark: "●", text: "workspace ready", tone: "text-success" },
];

export function Hero({ error, checking }: Props) {
  return (
    <section className="relative z-10 overflow-hidden">
      {/* Aurora: two drifting blobs + a horizon grid, all behind the copy. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-accent-strong/25 blur-[120px] animate-aurora" />
        <div className="absolute -left-32 top-40 h-72 w-72 rounded-full bg-[#7c3aed]/25 blur-[100px] animate-aurora [animation-delay:-6s]" />
        <div className="absolute -right-24 top-64 h-72 w-72 rounded-full bg-[#0ea5e9]/25 blur-[100px] animate-aurora [animation-delay:-11s]" />
        <div
          className="absolute inset-x-0 top-0 h-[560px] opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 75% 60% at 50% 0%, black 35%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 60% at 50% 0%, black 35%, transparent 100%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-24 pt-16 text-center sm:px-8 sm:pt-24">
        <span
          className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent backdrop-blur-xl animate-rise"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-blip" />
          Cloud GitHub Development Platform
        </span>

        <h1 className="mx-auto mt-7 max-w-5xl text-balance text-4xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl animate-rise [animation-delay:80ms]">
          Your code lives in the cloud.
          <br />
          <span className="bg-gradient-to-r from-accent via-white to-accent-strong bg-clip-text text-transparent">
            Your laptop stays light.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted sm:text-lg animate-rise [animation-delay:160ms]">
          Connect GitHub, import a repository, and open it in a browser-based
          IDE backed by an isolated Docker workspace. No local clones, no local{" "}
          <code className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[0.9em] text-accent">
            node_modules
          </code>
          , no local containers.
        </p>

        {error && (
          <div
            role="alert"
            className="mx-auto mt-7 max-w-md rounded-xl border border-danger/45 bg-danger/10 px-4 py-3 text-sm text-danger animate-rise"
          >
            {error}
          </div>
        )}

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row animate-rise [animation-delay:240ms]">
          <a
            href={`${API_URL}/auth/github`}
            aria-disabled={checking}
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-6 py-3.5 text-sm font-semibold text-[#03121f] shadow-[0_24px_60px_-24px_rgba(56,189,248,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-24px_rgba(56,189,248,1)] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:w-auto"
          >
            <GitHubIcon />
            Sign in with GitHub
          </a>
          <a
            href="#how"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-6 py-3.5 text-sm font-medium text-foreground backdrop-blur-xl transition-colors duration-300 hover:border-accent/50 hover:bg-surface-strong sm:w-auto"
          >
            See how it works
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </div>

        {/* Terminal mock — the actual restore path, line by line. */}
        <div className="relative mx-auto mt-16 w-full max-w-3xl">
          <div
            className="pointer-events-none absolute inset-x-12 -top-12 h-44 rounded-full bg-accent-strong/30 blur-[70px]"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-strong/85 text-left shadow-[0_60px_140px_-50px_rgba(56,189,248,0.7)] backdrop-blur-2xl animate-rise [animation-delay:320ms]">
            <div className="flex items-center gap-2.5 border-b border-line/70 bg-white/[0.03] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 font-mono text-[11px] tracking-wide text-muted">
                cloudide — workspace
              </span>
              <span className="ml-auto hidden font-mono text-[11px] text-muted sm:inline">
                live
              </span>
            </div>

            <div className="space-y-1 px-4 py-5 font-mono text-[12.5px] leading-6 sm:px-6 sm:text-[13px]">
              {LOG.map((line, index) => (
                <div
                  key={line.text}
                  className="flex gap-3 animate-rise"
                  style={{ animationDelay: `${520 + index * 110}ms` }}
                >
                  <span className={`w-4 shrink-0 text-center ${line.tone}`}>
                    {line.mark}
                  </span>
                  <span className="text-foreground/85">{line.text}</span>
                  {index === LOG.length - 1 && (
                    <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-accent" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
