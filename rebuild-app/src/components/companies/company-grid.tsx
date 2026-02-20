"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Layers, Mic2, Palette, Sparkles, Users } from 'lucide-react';
import { EntityCard } from '@/components/ui/entity-card';
import type { CompanyProfile, InspectorEntityPayload } from '@/types/interfaces';

const sectionIcons = [Layers, Mic2, Palette, Users, Sparkles];
const sectionLabels = ['Identity', 'Voice', 'Visual', 'Audience', 'Content'];

export function CompanyGrid() {
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/companies', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json: { data?: CompanyProfile[] }) => {
        if (!active) return;
        setCompanies(json.data || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    return companies.map((company) => {
      const entity: InspectorEntityPayload = {
        kind: 'company',
        id: company.id,
        title: company.name,
        subtitle: 'Brand Intelligence',
        status: `${company.completionScore}% complete`,
        summary: company.sections.identity.mission || 'Complete company sections to unlock AI context quality.',
        versionHistory: ['Latest profile version', 'Onboarding baseline'],
        approvals: ['Admin editable', 'Editor editable'],
        auditLog: [`Updated ${new Date(company.updatedAt).toLocaleString()}`],
      };
      return { company, entity };
    });
  }, [companies]);

  if (loading) {
    return <section className="company-grid"><article className="panel">Loading company cards...</article></section>;
  }

  return (
    <section className="company-grid">
      {cards.map(({ company, entity }) => (
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
            <Link className="btn-ghost" href={`/companies/${company.id}`}>Open Full Profile</Link>
            <Link className="btn-primary" href={`/companies/${company.id}/intake`}>Open Intake</Link>
          </div>
        </EntityCard>
      ))}
    </section>
  );
}
