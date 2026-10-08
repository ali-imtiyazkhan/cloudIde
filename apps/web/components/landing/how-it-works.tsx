import Image from "next/image";

export function HowItWorks() {
  return (
    <section id="how" className="relative z-10 scroll-mt-24 py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-full border border-[#cfe3fb] bg-[#eff6ff] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#1d6fd1]">
            The pipeline
          </p>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-[#0b1220] sm:text-4xl">
            From GitHub to a running workspace
          </h2>
          <p className="mt-4 leading-relaxed text-[#5a6474]">
            GitHub repositories flow into an isolated container workspace,
            which opens in the browser as a file tree, editor and terminal —
            no local clones, no local containers.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-6xl">
          <Image
            src="/cloud-workspace-hub.svg"
            alt="Diagram: GitHub repositories flow into an isolated container workspace that opens in the browser as a file tree, editor and terminal."
            width={1140}
            height={640}
            unoptimized
            className="block h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
