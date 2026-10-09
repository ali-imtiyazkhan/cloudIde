import Link from "next/link";
import { API_URL } from "../lib/api";
import { LogoMark } from "./logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how" },
      { label: "Gallery", href: "/#gallery" },
    ],
  },
  {
    title: "Access",
    links: [
      { label: "Browser IDE", href: "/#how" },
      { label: "Remote-SSH", href: "/#features" },
      { label: "Terminal", href: "/#features" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Sign in", href: `${API_URL}/auth/github` },
      { label: "Import a repo", href: "/dashboard" },
    ],
  },
];

type Props = {
  /**
   * When true the footer paints a black "cloud" gradient that hangs above it,
   * so the section above dissolves into the black footer instead of ending on
   * a hard line. Used by the landing page over its photo band.
   */
  cloud?: boolean;
  /**
   * Solid black footer with no dissolve — used on the light dashboard page,
   * where the cloud band would darken content above it.
   */
  solid?: boolean;
};

const BLACK_CLOUD =
  "linear-gradient(180deg, rgba(5,7,12,0) 0%, rgba(5,7,12,0.35) 34%, rgba(5,7,12,0.8) 70%, #05070c 100%)";

export function SiteFooter({ cloud = false, solid = false }: Props) {
  return (
    <footer
      className={
        cloud || solid
          ? "relative z-10 bg-[#05070c]"
          : "relative z-10 border-t border-line/60 bg-background/70 backdrop-blur-xl"
      }
    >
      {cloud && (
        <div
          className="pointer-events-none absolute inset-x-0 -top-[140px] h-[140px]"
          style={{ background: BLACK_CLOUD }}
          aria-hidden
        />
      )}
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.7fr_repeat(3,minmax(0,1fr))]">
          <div className="max-w-sm">
            <span className="group flex items-center gap-2.5">
              <LogoMark />
              <span className="text-[15px] font-semibold tracking-tight">
                CloudIDE
              </span>
            </span>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              A cloud GitHub development platform. Import a repository, run it
              in an isolated container, and keep your work in object storage —
              not on your laptop.
            </p>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#7dd3fc]/85">
              cloud is truth · disk is cache
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/45">
            © {new Date().getFullYear()} CloudIDE
          </p>
          <p className="font-mono text-xs text-white/40">
            Storage persists. Compute is disposable.
          </p>
        </div>
      </div>
    </footer>
  );
}
