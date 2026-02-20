"use client";

import Link from 'next/link';
import { Layers, Mic2, Palette, Sparkles, Users } from 'lucide-react';
import { EntityCard } from '@/components/ui/entity-card';
import { useAppState } from '@/components/shell/app-state';
import type { InspectorEntityPayload } from '@/types/interfaces';

const sectionIcons = [Layers, Mic2, Palette, Users, Sparkles];
const sectionLabels = ['Identity', 'Voice', 'Visual', 'Audience', 'Content'];

export function CompanyGrid() {
  const { companies } = useAppState();

  if (!companies.length) {
    return (
      <section className="panel">
        <h3>No companies yet</h3>
        <p>Create your first company from the selector screen and return here to edit full profile details.</p>
        <div className="button-row">
          <Link className="btn-primary" href="/select-company">Open Company Selector</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="company-grid">
      {companies.map((company) => {
        const entity: InspectorEntityPayload = {
          kind: 'company',
          id: company.id,
          title: company.name,
          subtitle: 'Brand Intelligence',
          status: `${company.completionScore}% complete`,
          summary: company.sections.identity.mission || 'Complete company sections to improve AI context quality.',
          versionHistory: [],
          approvals: [],
          auditLog: [`Updated ${new Date(company.updatedAt).toLocaleString()}`],
        };
        return (
          <EntityCard key={company.id} entity={entity} className="company-card">
            <div className="flex items-center justify-between gap-2">
              <h3>{company.name}</h3>
              <span className="badge">{company.completionScore}%</span>
            </div>
            <p className="text-sm text-[var(--muted)]">{company.sections.identity.tagline || 'No tagline set'}</p>

            <div className="company-section-pills">
              {sectionLabels.map((label, index) => {
                const Icon = sectionIcons[index];
                return (
                  <span key={label} className="chip">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </span>
                );
              })}
            </div>

            <div className="button-row">
              <Link className="btn-ghost" href={`/companies/${company.id}`}>Open Profile</Link>
              <Link className="btn-primary" href={`/companies/${company.id}/intake`}>Open Intake</Link>
            </div>
          </EntityCard>
        );
      })}
    </section>
  );
}

