import { Fragment } from "react";
import type { ReactNode } from "react";
import { LogoMark } from "../logo";

type Panel = {
  label: string;
  benefit: string;
  body: string;
  meta: string;
  live?: boolean;
};

type Pillar = {
  index: string;
  title: string;
  panels: Panel[];
  note?: string;
};

const PILLARS: Pillar[] = [
  {
    index: "01",
    title: "Your Code",
    panels: [
      {
        label: "GitHub OAuth",
        benefit: "Your GitHub, connected.",
        body: "Connect your account and bring any repository into CloudIDE in seconds.",
        meta: "OAuth · Encrypted token · Secure repository access",
      },
      {
        label: "Repository Import",
        benefit: "Clone without cloning locally.",
        body: "Import repositories directly into your cloud workspace. Your laptop stays clean.",
        meta: "GitHub → CloudIDE · Server-side import",
        live: true,
      },
    ],
  },
  {
    index: "02",
    title: "Your Workspace",
    panels: [
      {
        label: "Isolated Workspaces",
        benefit: "Every project gets its own machine.",
        body: "Each workspace runs inside an isolated container with dedicated resources.",
        meta: "Docker · 2 vCPU · 4 GB RAM · Isolated",
        live: true,
      },
      {
        label: "Browser IDE",
        benefit: "A full dev environment in your browser.",
        body: "Edit files, run commands, install dependencies, and work without setting up your machine.",
        meta: "Editor · File tree · Terminal · Preview",
        live: true,
      },
      {
        label: "Remote SSH",
        benefit: "Use the tools you already love.",
        body: "Connect from VS Code, Cursor, or JetBrains through secure temporary SSH access.",
        meta: "VS Code · Cursor · JetBrains · SSH",
      },
    ],
  },
  {
    index: "03",
    title: "Your State",
    panels: [
      {
        label: "Snapshots",
        benefit: "Your workspace can disappear. Your code can't.",
        body: "Snapshots live in object storage so you can stop, restore, and continue whenever you want.",
        meta: "Object storage · Snapshots · Restore",
      },
    ],
    note: "Cloud is truth. Disk is cache.",
  },
];

const ARCH: {
  step: string;
  name: string;
  meta: string;
  branch?: string[];
}[] = [
  { step: "01", name: "GitHub", meta: "Repository source" },
  { step: "02", name: "Cloud Storage", meta: "Object storage · snapshots" },
  {
    step: "03",
    name: "Docker Workspace",
    meta: "2 vCPU · 4 GB · isolated",
    branch: ["Browser IDE", "Secure SSH"],
  },
  { step: "04", name: "Preview", meta: "localhost:3000" },
];

const TREE: { name: string; kind: "dir" | "file"; depth: number; active?: boolean }[] = [
  { name: "src", kind: "dir", depth: 0 },
  { name: "app.ts", kind: "file", depth: 1, active: true },
  { name: "db.ts", kind: "file", depth: 1 },
  { name: "api", kind: "dir", depth: 1 },
  { name: "status.ts", kind: "file", depth: 2 },
  { name: "package.json", kind: "file", depth: 0 },
  { name: "Dockerfile", kind: "file", depth: 0 },
];

const CODE_LINES: ReactNode[] = [
  <>
    <span className="text-[#4f46e5]">import</span> express{" "}
    <span className="text-[#667085]">from</span>{" "}
    <span className="text-[#16a34a]">"express"</span>;
  </>,
  <>
    <span className="text-[#4f46e5]">import</span> {"{ db }"}{" "}
    <span className="text-[#667085]">from</span>{" "}
    <span className="text-[#16a34a]">"./db"</span>;
  </>,
  <>&nbsp;</>,
  <>
    <span className="text-[#4f46e5]">const</span> app = express();
  </>,
  <>&nbsp;</>,
  <>
    app.get(<span className="text-[#16a34a]">"/api/status"</span>, (_, res) ={">"}
  </>,
  <>
    {"  "}res.json({"{"} ok: <span className="text-[#16a34a]">true</span>, uptime:
    process.uptime() {"}"});
  </>,
  <>);</>,
  <>&nbsp;</>,
  <>
    app.listen(<span className="text-[#16a34a]">3000</span>);
  </>,
];

const TERMINAL_LINES: ReactNode[] = [
  <>
    <span className="text-[#7ee0a3]">$</span> npm run dev
  </>,
  <>
    <span className="text-white/45">VITE</span> v6.0.1 ready in 412 ms
  </>,
  <>&nbsp;</>,
  <>
    <span className="text-[#7ee0a3]">➜</span> Local:{" "}
    <span className="text-[#7ee0a3]">http://localhost:3000/</span>
  </>,
  <>
    <span className="text-white/40">➜</span> Network:{" "}
    <span className="text-white/40">http://172.17.0.2:3000</span>
  </>,
];

const DEPTH_CLASS = ["pl-0", "pl-3.5", "pl-7"];

function LivePill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#16a34a]/25 bg-[#16a34a]/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#16a34a]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
      Live
    </span>
  );
}

export function Features() {
  return (
    <section id="features" className="relative z-10 scroll-mt-24 py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Section headline */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-full border border-[#6366f1]/20 bg-[#6366f1]/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4f46e5]">
            Everything, working
          </p>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-[#111318] sm:text-4xl">
            Built for the way you actually code
          </h2>
          <p className="mt-4 text-[15px] font-medium text-[#111318]">
            Your repository <span className="text-[#6366f1]">→</span> Your
            workspace <span className="text-[#6366f1]">→</span> Your state
          </p>
          <p className="mt-3 leading-relaxed text-[#667085]">
            From GitHub import to isolated compute, CloudIDE keeps your entire
            development environment in the cloud.
          </p>
        </div>

        {/* Architecture visual */}
        <div className="mt-14 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-[#e6e8ec] px-5 py-3.5 sm:px-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#667085]">
              Architecture
            </span>
            <span className="hidden font-mono text-[11px] text-[#667085] sm:block">
              repository → storage → workspace → preview
            </span>
          </div>

          <div className="flex flex-col gap-4 bg-[#f7f8fa] px-5 py-6 sm:px-6 md:flex-row md:items-start md:gap-0 md:py-8">
            {ARCH.map((node, i) => (
              <Fragment key={node.name}>
                {i > 0 && (
                  <div className="flex shrink-0 items-center justify-center md:mt-[38px] md:px-2.5">
                    <svg
                      viewBox="0 0 28 10"
                      width="28"
                      height="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="rotate-90 text-[#6366f1] md:rotate-0"
                      aria-hidden
                    >
                      <path d="M1 5h24M21 1.5 24.5 5 21 8.5" />
                    </svg>
                  </div>
                )}
                <div className="flex flex-1 flex-col items-stretch">
                  <div className="rounded-2xl border border-[#e6e8ec] bg-white px-4 py-4 transition-colors duration-200 hover:border-[#c9cdd6]">
                    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#667085]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1]" />
                      {node.step}
                    </span>
                    <p className="mt-2.5 text-[15px] font-semibold text-[#111318]">
                      {node.name}
                    </p>
                    <p className="mt-1 text-[13px] leading-snug text-[#667085]">
                      {node.meta}
                    </p>
                  </div>

                  {node.branch && (
                    <div className="flex w-full flex-col items-center">
                      <span className="h-4 w-px bg-[#6366f1]/40" />
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {node.branch.map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-[#e6e8ec] bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#111318]"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Fragment>
            ))}
          </div>

          <div className="border-t border-[#e6e8ec] px-5 py-3 font-mono text-[11px] text-[#667085] sm:px-6">
            github.com → object storage → container runtime → browser · ssh
          </div>
        </div>

        {/* Three pillars */}
        <div className="mt-16 grid gap-5 md:grid-cols-3 md:items-start">
          {PILLARS.map((pillar) => (
            <div key={pillar.index}>
              <div className="flex items-baseline gap-2.5 border-b border-[#e6e8ec] pb-3">
                <span className="font-mono text-[12px] font-medium text-[#6366f1]">
                  {pillar.index} —
                </span>
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#111318]">
                  {pillar.title}
                </h3>
              </div>

              <div className="mt-4 space-y-4">
                {pillar.panels.map((panel) => (
                  <article
                    key={panel.label}
                    className="rounded-2xl border border-[#e6e8ec] bg-white p-5 transition-colors duration-200 hover:border-[#c9cdd6]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#667085]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1]" />
                        {panel.label}
                      </span>
                      {panel.live && <LivePill />}
                    </div>
                    <h4 className="mt-3.5 text-[15px] font-semibold leading-snug text-[#111318]">
                      {panel.benefit}
                    </h4>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[#667085]">
                      {panel.body}
                    </p>
                    <div className="mt-4 border-t border-[#e6e8ec] pt-3">
                      <p className="font-mono text-[11px] leading-relaxed text-[#667085]">
                        {panel.meta}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              {pillar.note && (
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#4f46e5]">
                  {pillar.note}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Core story */}
        <p className="mx-auto mt-16 max-w-2xl text-balance text-center text-xl font-semibold tracking-tight text-[#111318] sm:text-2xl">
          Your laptop is no longer the development environment. CloudIDE is.
        </p>

        {/* Product preview */}
        <div className="mt-16 text-center">
          <h3 className="text-balance text-3xl font-semibold tracking-tight text-[#111318] sm:text-4xl">
            One workspace. Everything you need.
          </h3>
        </div>

        <div className="mx-auto mt-9 max-w-5xl overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white shadow-[0_30px_70px_-45px_rgba(17,19,24,0.5)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6e8ec] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <LogoMark className="h-5 w-5 rounded-[6px]" />
              <span className="font-mono text-[13px] font-semibold text-[#111318]">
                cloudide
              </span>
              <span className="hidden h-3.5 w-px bg-[#e6e8ec] sm:block" />
              <span className="hidden truncate font-mono text-[13px] text-[#667085] sm:block">
                my-project
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#16a34a]/25 bg-[#16a34a]/10 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#16a34a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                Running
              </span>
              <span className="hidden rounded-lg border border-[#e6e8ec] px-2.5 py-1 text-[12px] font-medium text-[#111318] sm:inline-block">
                SSH
              </span>
              <span className="rounded-lg bg-[#6366f1] px-2.5 py-1 text-[12px] font-medium text-white">
                Preview
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
            <aside className="hidden w-[190px] shrink-0 border-r border-[#e6e8ec] bg-[#fbfbfc] p-4 md:block">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#667085]">
                Files
              </p>
              <ul className="mt-3 space-y-0.5">
                {TREE.map((item) => (
                  <li key={item.name}>
                    <span
                      className={`flex items-center gap-1.5 rounded px-1 py-0.5 font-mono text-[12.5px] ${DEPTH_CLASS[item.depth]} ${
                        item.active
                          ? "bg-[#6366f1]/10 text-[#4f46e5]"
                          : item.kind === "dir"
                            ? "text-[#111318]"
                            : "text-[#667085]"
                      }`}
                    >
                      {item.kind === "dir" ? (
                        <span className="text-[#9aa0ab]">▾</span>
                      ) : (
                        <span className="w-3" />
                      )}
                      {item.name}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>

            <div className="min-w-0 flex-1 p-4 sm:p-5">
              <div className="flex items-center gap-2 border-b border-[#e6e8ec] pb-2.5">
                <span className="rounded-md bg-[#6366f1]/10 px-2 py-1 font-mono text-[12px] text-[#4f46e5]">
                  app.ts
                </span>
                <span className="rounded-md px-2 py-1 font-mono text-[12px] text-[#667085]">
                  status.ts
                </span>
              </div>
              <div className="mt-3.5 overflow-x-auto font-mono text-[12.5px] leading-6 text-[#111318]">
                {CODE_LINES.map((line, i) => (
                  <div key={i} className="flex gap-4 whitespace-pre">
                    <span className="w-5 shrink-0 select-none text-right text-[#9aa0ab]">
                      {i + 1}
                    </span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="w-full shrink-0 bg-[#0e1116] p-4 md:w-[270px] md:border-l md:border-[#0e1116]">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                Terminal
              </p>
              <div className="mt-3 space-y-1 font-mono text-[12px] leading-6 text-[#d7dbe2]">
                {TERMINAL_LINES.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap">
                    {line}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
