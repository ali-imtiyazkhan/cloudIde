"use client";

import { useEffect, useState } from "react";
import { API_URL, api } from "../lib/api";
import type { SessionUser } from "../lib/types";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { Hero } from "../components/landing/hero";
import { Features } from "../components/landing/features";
import { HowItWorks } from "../components/landing/how-it-works";
import { Gallery } from "../components/landing/gallery";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_state: "Sign-in was cancelled or expired. Please try again.",
  token_exchange: "GitHub rejected the sign-in. Please try again.",
  profile_fetch: "We could not read your GitHub profile. Please try again.",
};

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (code) {
      setError(
        ERROR_MESSAGES[code] ?? "Something went wrong. Please try again.",
      );
    }

    api<{ user: SessionUser | null }>("/auth/me")
      .then(({ user }) => {
        if (user) window.location.replace("/dashboard");
      })
      .catch(() => {
        // Not signed in — stay on the landing page.
      })
      .finally(() => setChecking(false));
  }, []);

  return (
    <div className="relative z-10 flex min-h-svh flex-col bg-[#f4f6fa] text-[#0b1220]">
      <SiteHeader
        variant="landing"
        actions={
          <a
            href={`${API_URL}/auth/github`}
            aria-disabled={checking}
            className="rounded-full bg-[#0b1220] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#1d2836] aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
          >
            Sign in
          </a>
        }
      />

      <main className="flex-1">
        <Hero error={error} checking={checking} />
        <Features />
        <HowItWorks />
        <Gallery checking={checking} />
      </main>

      <SiteFooter cloud />
    </div>
  );
}
