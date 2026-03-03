"use client";

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

type SafeNavigateOptions = {
  fallbackDelayMs?: number;
};

export function safeNavigate(router: AppRouterInstance, href: string, options: SafeNavigateOptions = {}) {
  if (typeof window === 'undefined') return;

  const fallbackDelayMs = options.fallbackDelayMs ?? 450;
  const start = window.location.pathname + window.location.search + window.location.hash;

  // If client routing wedges (runtime error, stuck router), fall back to hard navigation.
  const timer = window.setTimeout(() => {
    const now = window.location.pathname + window.location.search + window.location.hash;
    if (now === start) {
      window.location.assign(href);
    }
  }, fallbackDelayMs);

  try {
    router.push(href);
  } finally {
    // If push succeeded quickly, cancel fallback.
    window.setTimeout(() => window.clearTimeout(timer), 0);
  }
}

