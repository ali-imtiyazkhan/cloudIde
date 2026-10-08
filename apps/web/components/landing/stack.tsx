const STATS = [
  { value: "0", label: "local installs required" },
  { value: "3", label: "ways to connect" },
  { value: "4 GB", label: "memory cap per workspace" },
  { value: "30 d", label: "session lifetime" },
];

const STACK = [
  "Next.js 16",
  "Express",
  "PostgreSQL",
  "Prisma",
  "Redis",
  "BullMQ",
  "Docker",
  "MinIO / S3",
  "Bun",
  "TypeScript",
  "xterm.js",
  "WebSocket",
];

export function Stack() {
  return (
    <section id="stack" className="relative z-10 scroll-mt-24 pb-36 pt-28 sm:pt-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="overflow-hidden rounded-3xl border border-[#e6eaf1] bg-white shadow-[0_10px_30px_rgba(11,18,32,0.05)]">
          <div className="grid divide-y divide-[#e6eaf1] sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="px-6 py-10 text-center transition-colors duration-300 hover:bg-[#f8fafd] sm:px-8"
              >
                <div className="bg-gradient-to-b from-[#0b1220] to-[#1d6fd1] bg-clip-text font-mono text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
                  {stat.value}
                </div>
                <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6b7484]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#e6eaf1] px-6 py-8 sm:px-8">
            <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[#6b7484]">
              Built on
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {STACK.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-[#e6eaf1] bg-[#fbfcfe] px-3.5 py-1.5 font-mono text-xs text-[#3d4756] transition-colors duration-300 hover:border-[#bcd9f6] hover:text-[#1d6fd1]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
