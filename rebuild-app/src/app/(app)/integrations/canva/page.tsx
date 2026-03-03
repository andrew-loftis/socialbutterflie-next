"use client";

/**
 * Canva Integration Page
 * ───────────────────────
 * Browse and import designs from Canva into the asset library.
 * Uses the Canva Connect API (Button SDK) pattern.
 *
 * Route: /integrations/canva
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FileImage,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useAppState } from '@/components/shell/app-state';
import type { CanvaImport } from '@/types/interfaces';

/* ---- Demo designs (simulates Canva API response) ---- */

interface CanvaDesign {
  id: string;
  title: string;
  thumbnail: string;
  type: 'social_media' | 'presentation' | 'video' | 'print' | 'other';
  pages: number;
  updatedAt: string;
}

const DEMO_DESIGNS: CanvaDesign[] = [
  { id: 'cd-1', title: 'Instagram Post - Summer Collection', thumbnail: '', type: 'social_media', pages: 1, updatedAt: '2025-01-10T14:30:00Z' },
  { id: 'cd-2', title: 'Facebook Cover Photo', thumbnail: '', type: 'social_media', pages: 1, updatedAt: '2025-01-09T11:20:00Z' },
  { id: 'cd-3', title: 'TikTok Video Template', thumbnail: '', type: 'video', pages: 3, updatedAt: '2025-01-08T09:15:00Z' },
  { id: 'cd-4', title: 'Brand Guidelines Deck', thumbnail: '', type: 'presentation', pages: 12, updatedAt: '2025-01-07T16:45:00Z' },
  { id: 'cd-5', title: 'Product Launch Carousel', thumbnail: '', type: 'social_media', pages: 5, updatedAt: '2025-01-06T13:10:00Z' },
  { id: 'cd-6', title: 'Story Highlight Covers', thumbnail: '', type: 'social_media', pages: 8, updatedAt: '2025-01-05T10:30:00Z' },
  { id: 'cd-7', title: 'Newsletter Banner', thumbnail: '', type: 'other', pages: 1, updatedAt: '2025-01-04T08:00:00Z' },
  { id: 'cd-8', title: 'YouTube Thumbnail Set', thumbnail: '', type: 'social_media', pages: 4, updatedAt: '2025-01-03T15:20:00Z' },
];

const TYPE_LABELS: Record<CanvaDesign['type'], string> = {
  social_media: 'Social Media',
  presentation: 'Presentation',
  video: 'Video',
  print: 'Print',
  other: 'Other',
};

const FORMAT_OPTIONS: CanvaImport['exportedFormat'][] = ['png', 'jpg', 'mp4', 'gif', 'pdf'];

/* ---- Design Card ---- */

function DesignCard({
  design,
  importing,
  imported,
  onImport,
}: {
  design: CanvaDesign;
  importing: boolean;
  imported: boolean;
  onImport: () => void;
}) {
  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: '1px solid var(--border)',
      background: 'var(--panel)',
      transition: 'border-color 0.15s',
    }}>
      {/* Thumbnail */}
      <div style={{
        height: 140, background: 'linear-gradient(135deg, rgba(245,166,35,0.08), rgba(91,160,255,0.08))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <Palette className="h-8 w-8" style={{ color: 'var(--muted)', opacity: 0.5 }} />
        <div style={{
          position: 'absolute', top: 8, right: 8,
          padding: '2px 8px', borderRadius: 999,
          background: 'rgba(0,0,0,0.5)', color: '#fff',
          fontSize: '0.58rem', fontWeight: 600,
        }}>
          {TYPE_LABELS[design.type]}
        </div>
        {design.pages > 1 && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            padding: '2px 8px', borderRadius: 999,
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            fontSize: '0.58rem',
          }}>
            {design.pages} pages
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px' }}>
        <h4 style={{
          fontSize: '0.82rem', fontWeight: 600, margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {design.title}
        </h4>
        <p style={{ fontSize: '0.68rem', color: 'var(--muted)', margin: '4px 0 8px' }}>
          Updated {new Date(design.updatedAt).toLocaleDateString()}
        </p>
        <button
          type="button"
          className={imported ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
          onClick={onImport}
          disabled={importing || imported}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {importing ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing...</>
          ) : imported ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Imported</>
          ) : (
            <><Download className="h-3.5 w-3.5" /> Import</>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---- Main Page ---- */

export default function CanvaIntegrationPage() {
  const { activeCompany } = useActiveCompany();
  const { appContext } = useAppState();
  const [connected, setConnected] = useState(false);
  const [designs, setDesigns] = useState<CanvaDesign[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CanvaDesign['type'] | 'all'>('all');
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<CanvaImport['exportedFormat']>('png');

  async function handleConnect() {
    setLoading(true);
    // In production: open Canva OAuth popup → receive access token
    await new Promise((r) => setTimeout(r, 1200));
    setConnected(true);
    setDesigns(DEMO_DESIGNS);
    setLoading(false);
  }

  async function handleImport(design: CanvaDesign) {
    if (!activeCompany) return;
    setImportingIds((s) => new Set(s).add(design.id));

    // In production: call Canva Export API → download → upload to Firebase Storage → create CanvaImport doc
    await new Promise((r) => setTimeout(r, 1500));

    setImportingIds((s) => { const n = new Set(s); n.delete(design.id); return n; });
    setImportedIds((s) => new Set(s).add(design.id));
  }

  const filteredDesigns = designs.filter((d) => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!activeCompany) {
    return (
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon"><Palette className="h-6 w-6" /></div>
          <h3>No company selected</h3>
          <Link className="btn-primary" href="/select-company">Select company</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Canva Integration"
        subtitle={connected ? `${designs.length} designs available \u00B7 ${importedIds.size} imported` : 'Connect your Canva account to import designs'}
        actions={
          <Link href="/integrations" className="btn-ghost btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" /> Integrations
          </Link>
        }
      />

      {!connected ? (
        /* Connect screen */
        <section className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16,
            background: 'linear-gradient(135deg, #7b2ff7, #00c4cc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Palette className="h-8 w-8" style={{ color: '#fff' }} />
          </div>
          <h2 style={{ marginBottom: 8 }}>Connect Canva</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.84rem', maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Import designs directly from your Canva workspace. Export as PNG, JPG, MP4, GIF, or PDF and add them to your content library.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={handleConnect}
            disabled={loading}
            style={{ padding: '10px 24px', fontSize: '0.88rem' }}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</>
            ) : (
              <><ExternalLink className="h-4 w-4" /> Connect with Canva</>
            )}
          </button>
        </section>
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 10px',
            }}>
              <Search className="h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search designs..."
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'social_media', 'video', 'presentation', 'other'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip${typeFilter === t ? ' active' : ''}`}
                  onClick={() => setTypeFilter(t)}
                >
                  {t === 'all' ? 'All' : TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Format:</span>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as CanvaImport['exportedFormat'])}
                style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '4px 8px', color: 'var(--text)',
                  fontSize: '0.78rem', fontFamily: 'inherit',
                }}
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <button type="button" className="btn-ghost btn-sm" onClick={handleConnect}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {/* Design grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}>
            {filteredDesigns.map((d) => (
              <DesignCard
                key={d.id}
                design={d}
                importing={importingIds.has(d.id)}
                imported={importedIds.has(d.id)}
                onImport={() => handleImport(d)}
              />
            ))}
          </div>

          {filteredDesigns.length === 0 && (
            <div className="empty-state" style={{ padding: 48 }}>
              <div className="empty-state-icon"><FileImage className="h-6 w-6" /></div>
              <h3>No designs match</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Try a different search or filter.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
