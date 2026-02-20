"use client";

import { useMemo, useState } from 'react';
import type { CompanyProfile, CompanySectionState } from '@/types/interfaces';

function stringify(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseOrKeep(raw: string, fallback: unknown) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function CompanyProfileEditor({ initialCompany }: { initialCompany: CompanyProfile }) {
  const [company, setCompany] = useState(initialCompany);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const sectionNames = useMemo(() => ['identity', 'voice', 'visual', 'audience', 'content'] as const, []);

  async function saveCompany() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company),
      });
      if (!res.ok) throw new Error(await res.text());

      await fetch(`/api/companies/${company.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Profile editor save' }),
      });
      setStatus('Saved and version snapshot created.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid-two">
      {sectionNames.map((section) => (
        <article className="panel" key={section}>
          <h3>{section.charAt(0).toUpperCase() + section.slice(1)}</h3>
          <p className="text-sm text-[var(--muted)]">Edit JSON for now. This is persisted to Firestore when configured.</p>
          <textarea
            value={stringify(company.sections[section])}
            onChange={(event) => {
              const nextValue = parseOrKeep(event.target.value, company.sections[section]) as CompanySectionState[typeof section];
              setCompany((prev) => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  [section]: nextValue,
                },
              }));
            }}
          />
        </article>
      ))}

      <article className="panel two-col-span">
        <h3>Prompt Packs</h3>
        <textarea
          value={stringify(company.promptPacks)}
          onChange={(event) => {
            const nextValue = parseOrKeep(event.target.value, company.promptPacks) as CompanyProfile['promptPacks'];
            setCompany((prev) => ({ ...prev, promptPacks: nextValue }));
          }}
        />
        <div className="button-row">
          <button className="btn-primary" type="button" onClick={saveCompany} disabled={saving}>
            {saving ? 'Saving...' : 'Save Company Profile'}
          </button>
          <button
            className="btn-ghost"
            type="button"
            onClick={async () => {
              const res = await fetch(`/api/companies/${company.id}/context-compile`, { method: 'POST' });
              if (res.ok) {
                const json = (await res.json()) as { data?: { compiledPrompt?: string } };
                setStatus(`Compiled context: ${(json.data?.compiledPrompt || '').slice(0, 120)}...`);
              }
            }}
          >
            Compile AI Context
          </button>
        </div>
        {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
      </article>
    </section>
  );
}
