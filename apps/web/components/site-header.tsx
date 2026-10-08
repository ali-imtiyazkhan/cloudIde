"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LogoMark } from "./logo";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#stack", label: "Stack" },
  { href: "/#gallery", label: "Gallery" },
];

type Props = {
  /**
   * Right-hand slot. The landing page passes a "Sign in" CTA, the dashboard
   * passes the avatar + sign-out control — same chrome, different actions.
   */
  actions?: ReactNode;
  /**
   * "landing" — a non-sticky cloud-white bar that sits over the hero photo
   * and dissolves into the page. "app" — the sticky dark chrome the
   * dashboard uses.
   */
  variant?: "landing" | "app";
};

const CLOUD_BAR =
  "linear-gradient(180deg, rgba(247,249,252,0.98) 0%, rgba(247,249,252,0.94) 45%, rgba(247,249,252,0.86) 78%, rgba(247,249,252,0.74) 100%)";

const CLOUD_MIST =
  "linear-gradient(180deg, rgba(247,249,252,0.74) 0%, rgba(247,249,252,0.5) 26%, rgba(247,249,252,0.26) 55%, rgba(247,249,252,0.1) 80%, rgba(247,249,252,0) 100%)";

export function SiteHeader({ actions, variant = "app" }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (variant === "landing") {
    return (
      <header className="absolute inset-x-0 top-0 z-50 text-[#0b1220]">
        <div className="h-[76px]" style={{ background: CLOUD_BAR }}>
          <div className="mx-auto flex h-full max-w-7xl items-center justify-center gap-5 px-5 sm:gap-7 sm:px-8">
            <Link href="/" className="group flex shrink-0 items-center gap-2.5">
              <LogoMark className="h-7 w-7" />
              <span className="text-[15px] font-semibold tracking-tight">
                CloudIDE
              </span>
              <span className="hidden rounded-full border border-[#d7dce4] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#5a6474] sm:inline">
                beta
              </span>
            </Link>

            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="Primary"
            >
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm text-[#3d4756] transition-colors duration-200 hover:bg-white/70 hover:text-[#0b1220]"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-3">{actions}</div>
          </div>
        </div>

        <div
          className="pointer-events-none h-[170px]"
          style={{ background: CLOUD_MIST }}
          aria-hidden
        />
      </header>
    );
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-line/70 bg-background/85 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            CloudIDE
          </span>
          <span className="hidden rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted sm:inline">
            beta
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-muted transition-colors duration-200 hover:bg-surface hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">{actions}</div>
      </div>
    </header>
  );
}
