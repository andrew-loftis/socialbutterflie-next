"use client";

import { useMemo, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { updateCompany } from '@/lib/firebase/company-store';
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

function compileSummary(company: CompanyProfile) {
  return [
    `Brand: ${company.name}`,
    `Identity: ${company.sections.identity.tagline || 'n/a'}`,
    `Voice: ${company.sections.voice.tone || 'n/a'}`,
    `Visual: ${company.sections.visual.styleKeywords.join(', ') || 'n/a'}`,
    `Audience: ${company.sections.audience.primaryPersona || 'n/a'}`,
    `Content pillars: ${company.sections.content.pillars.join(', ') || 'n/a'}`,
  ].join(' | ');
}

export function CompanyProfileEditor({ initialCompany }: { initialCompany: CompanyProfile }) {
  const { appContext, setCompanies } = useAppState();
  const [company, setCompany] = useState(initialCompany);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const sectionNames = useMemo(() => ['identity', 'voice', 'visual', 'audience', 'content'] as const, []);

  async function saveCompanyProfile() {
    setSaving(true);
    setStatus(null);
    try {
      const completion = Math.min(
        100,
        Math.round(
          (sectionNames.reduce((acc, section) => {
            const hasAny = Object.values(company.sections[section]).some((value) =>
              Array.isArray(value) ? value.length > 0 : String(value || '').trim().length > 0
            );
            return acc + (hasAny ? 20 : 0);
          }, 0) / 100) * 100
        )
      );

      const next: CompanyProfile = {
        ...company,
        completionScore: completion,
        aiContextCompiled: compileSummary(company),
        updatedAt: new Date().toISOString(),
        updatedBy: appContext.userId,
      };

      await updateCompany(appContext.workspaceId, company.id, next);
      setCompany(next);
      setCompanies((prev) => prev.map((entry) => (entry.id === next.id ? next : entry)));
      setStatus('Saved profile changes.');
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
          <p className="text-sm text-[var(--muted)]">Edit section JSON directly for now.</p>
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
        <h3>Prompt packs</h3>
        <textarea
          value={stringify(company.promptPacks)}
          onChange={(event) => {
            const nextValue = parseOrKeep(event.target.value, company.promptPacks) as CompanyProfile['promptPacks'];
            setCompany((prev) => ({ ...prev, promptPacks: nextValue }));
          }}
        />
        <div className="button-row">
          <button className="btn-primary" type="button" onClick={saveCompanyProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Company Profile'}
          </button>
        </div>
        {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
      </article>
    </section>
  );
}

