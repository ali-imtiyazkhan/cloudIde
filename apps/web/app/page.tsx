"use client";

import { useEffect, useState } from "react";
import { API_URL, api } from "../lib/api";
import type { SessionUser } from "../lib/types";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { Hero } from "../components/landing/hero";
import { Features } from "../components/landing/features";
import { HowItWorks } from "../components/landing/how-it-works";
import { Stack } from "../components/landing/stack";
import { FinalCta } from "../components/landing/cta";

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
    // z-10 is load-bearing: the global VideoBackground is a fixed layer at
    // z-index 0, so unpositioned content would paint underneath it.
    <div className="relative z-10 flex min-h-svh flex-col">
      <SiteHeader
        actions={
          <a
            href={`${API_URL}/auth/github`}
            aria-disabled={checking}
            className="rounded-lg border border-accent/40 bg-accent/12 px-3.5 py-2 text-sm font-medium text-accent transition-all duration-300 hover:border-accent/70 hover:bg-accent/20 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
          >
            Sign in
          </a>
        }
      />

      <main className="flex-1">
        <Hero error={error} checking={checking} />
        <Features />
        <HowItWorks />
        <Stack />
        <FinalCta checking={checking} />
      </main>

      <SiteFooter />
    </div>
  );
}
