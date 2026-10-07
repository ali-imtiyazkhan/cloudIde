import Link from "next/link";
import { API_URL } from "../lib/api";
import { LogoMark } from "./logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how" },
      { label: "Stack", href: "/#stack" },
    ],
  },
  {
    title: "Access",
    links: [
      { label: "Browser IDE", href: "/#how" },
      { label: "Remote-SSH", href: "/#how" },
      { label: "Terminal", href: "/#how" },
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

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.7fr_repeat(3,minmax(0,1fr))]">
          <div className="max-w-sm">
            <span className="group flex items-center gap-2.5">
              <LogoMark />
              <span className="text-[15px] font-semibold tracking-tight">
                CloudIDE
              </span>
            </span>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              A cloud GitHub development platform. Import a repository, run it
              in an isolated container, and keep your work in object storage —
              not on your laptop.
            </p>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-accent/80">
              cloud is truth · disk is cache
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/75 transition-colors duration-200 hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line/50 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} CloudIDE
          </p>
          <p className="font-mono text-xs text-muted">
            Storage persists. Compute is disposable.
          </p>
        </div>
      </div>
    </footer>
  );
}
