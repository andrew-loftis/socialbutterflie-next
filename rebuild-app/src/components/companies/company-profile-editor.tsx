"use client";

import { useMemo, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { updateCompany } from '@/lib/firebase/company-store';
import type { CompanyProfile, CompanySectionState } from '@/types/interfaces';

function stringify(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseOrThrow(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON');
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

  const [draftSections, setDraftSections] = useState<Record<(typeof sectionNames)[number], string>>(() => ({
    identity: stringify(initialCompany.sections.identity),
    voice: stringify(initialCompany.sections.voice),
    visual: stringify(initialCompany.sections.visual),
    audience: stringify(initialCompany.sections.audience),
    content: stringify(initialCompany.sections.content),
  }));

  const [draftPromptPacks, setDraftPromptPacks] = useState(() => stringify(initialCompany.promptPacks));

  async function saveCompanyProfile() {
    setSaving(true);
    setStatus(null);
    try {
      const parsedSections: CompanySectionState = {
        identity: parseOrThrow(draftSections.identity),
        voice: parseOrThrow(draftSections.voice),
        visual: parseOrThrow(draftSections.visual),
        audience: parseOrThrow(draftSections.audience),
        content: parseOrThrow(draftSections.content),
      };

      const parsedPromptPacks = parseOrThrow(draftPromptPacks) as CompanyProfile['promptPacks'];

      const nextCompanyBase: CompanyProfile = {
        ...company,
        sections: parsedSections,
        promptPacks: parsedPromptPacks,
      };

      const completion = Math.min(
        100,
        Math.round(
          (sectionNames.reduce((acc, section) => {
            const hasAny = Object.values(nextCompanyBase.sections[section]).some((value) =>
              Array.isArray(value) ? value.length > 0 : String(value || '').trim().length > 0
            );
            return acc + (hasAny ? 20 : 0);
          }, 0) / 100) * 100
        )
      );

      const next: CompanyProfile = {
        ...nextCompanyBase,
        completionScore: completion,
        aiContextCompiled: compileSummary(nextCompanyBase),
        updatedAt: new Date().toISOString(),
        updatedBy: appContext.userId,
      };

      await updateCompany(appContext.workspaceId, company.id, next);
      setCompany(next);
      setCompanies((prev) => prev.map((entry) => (entry.id === next.id ? next : entry)));
      setStatus('Saved profile changes.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      setStatus(message.startsWith('Invalid JSON') ? 'Fix invalid JSON (must be valid before saving).' : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid-two">
      {sectionNames.map((section) => (
        <article className="panel" key={section}>
          <h3>{section.charAt(0).toUpperCase() + section.slice(1)}</h3>
          <p className="text-sm text-[var(--muted)]">Edit section JSON. Changes are validated when you save.</p>
          <textarea
            value={draftSections[section]}
            onChange={(event) => {
              const raw = event.target.value;
              setDraftSections((prev) => ({ ...prev, [section]: raw }));
            }}
          />
        </article>
      ))}

      <article className="panel two-col-span">
        <h3>Prompt packs</h3>
        <textarea
          value={draftPromptPacks}
          onChange={(event) => {
            setDraftPromptPacks(event.target.value);
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

