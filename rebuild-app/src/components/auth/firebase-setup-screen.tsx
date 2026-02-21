"use client";

import { missingFirebaseClientConfigKeys } from "@/lib/firebase/client";

export function FirebaseSetupScreen() {
  const missing = missingFirebaseClientConfigKeys();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]">
        <h1 className="text-xl font-semibold">Firebase Auth is not configured</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Sign in and sign out won&apos;t work until the Firebase Web App config is set as Netlify environment variables.
        </p>

        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          <div className="text-sm font-medium">Missing env vars (production)</div>
          <pre className="mt-2 overflow-auto rounded-lg bg-black/30 p-3 text-xs">
{missing.length ? missing.join("\n") : "None detected."}
          </pre>
        </div>

        <div className="mt-4 text-sm">
          <div className="font-medium">What to do</div>
          <ol className="mt-2 list-decimal pl-5 text-[var(--muted)]">
            <li>Firebase Console -&gt; Project settings -&gt; Your apps -&gt; Web app -&gt; copy the config values.</li>
            <li>Netlify -&gt; Site configuration -&gt; Environment variables -&gt; add the keys above.</li>
            <li>
              Firebase Console -&gt; Authentication -&gt; Settings -&gt; Authorized domains:
              add <code>socialbutterflie.studio</code> and your Netlify deploy domain.
            </li>
            <li>Trigger a new deploy (env vars are injected at build time).</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

