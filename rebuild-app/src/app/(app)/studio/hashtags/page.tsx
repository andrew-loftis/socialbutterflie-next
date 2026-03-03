"use client";

/**
 * Hashtag Studio Page
 * ───────────────────
 * SEO & hashtag research, saved groups, caption analysis,
 * banned hashtag detection, and performance tracking.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  BookmarkPlus,
  Copy,
  Hash,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useHashtagStudio } from '@/lib/hooks/use-hashtag-studio';
import { useAppState } from '@/components/shell/app-state';

/* -- Types -- */

interface HashtagResult {
  tag: string;
  posts: number;
  difficulty: 'low' | 'medium' | 'high';
  trending: boolean;
  banned: boolean;
  avgReach?: number;
}

/* -- Mock search results (would come from external API in production) -- */

const MOCK_RESULTS: HashtagResult[] = [
  { tag: '#socialmedia', posts: 124_000_000, difficulty: 'high', trending: false, banned: false, avgReach: 15200 },
  { tag: '#contentcreator', posts: 45_000_000, difficulty: 'medium', trending: true, banned: false, avgReach: 8900 },
  { tag: '#digitalmarketing', posts: 78_000_000, difficulty: 'high', trending: false, banned: false, avgReach: 11300 },
  { tag: '#socialmediamanager', posts: 6_200_000, difficulty: 'low', trending: true, banned: false, avgReach: 22400 },
  { tag: '#instagramtips', posts: 8_900_000, difficulty: 'low', trending: false, banned: false, avgReach: 18700 },
  { tag: '#growthhacking', posts: 12_500_000, difficulty: 'medium', trending: false, banned: false, avgReach: 9800 },
  { tag: '#contentmarketing', posts: 34_000_000, difficulty: 'medium', trending: true, banned: false, avgReach: 13100 },
  { tag: '#reelsinstagram', posts: 18_000_000, difficulty: 'medium', trending: true, banned: false, avgReach: 28500 },
  { tag: '#pods', posts: 1_200_000, difficulty: 'low', trending: false, banned: true },
  { tag: '#follow4follow', posts: 52_000_000, difficulty: 'high', trending: false, banned: true },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  low: '#3dd68c',
  medium: '#f5a623',
  high: '#ff5c5c',
};

/* ── Helper ── */

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/* ── Caption Analyzer ── */

function CaptionAnalyzer({ bannedSet }: { bannedSet: Set<string> }) {
  const [caption, setCaption] = useState('');
  const analysis = useMemo(() => {
    if (!caption.trim()) return null;
    const hashtagMatches = caption.match(/#\w+/g) || [];
    const tags = hashtagMatches.map((t) => t.toLowerCase());
    const bannedFound = tags.filter((t) => bannedSet.has(t.replace('#', '')));
    const charCount = caption.length;
    const wordCount = caption.split(/\s+/).filter(Boolean).length;

    let score = 100;
    if (tags.length > 30) score -= 20;
    if (tags.length < 5 && tags.length > 0) score -= 10;
    if (bannedFound.length > 0) score -= 25 * bannedFound.length;
    if (charCount > 2200) score -= 15;
    if (wordCount < 10) score -= 5;
    score = Math.max(0, Math.min(100, score));

    return { tags, bannedFound, charCount, wordCount, hashtagCount: tags.length, score };
  }, [caption]);

  return (
    <section className="panel">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
        <Sparkles className="h-4 w-4" style={{ color: 'var(--accent)' }} />
        Caption Analyzer
      </h3>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={4}
        placeholder="Paste your caption here to analyze hashtags, detect banned tags, and get a quality score..."
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          color: 'var(--text)', fontSize: '0.84rem', fontFamily: 'inherit',
          resize: 'vertical', position: 'relative', zIndex: 1,
        }}
      />
      {analysis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 10, position: 'relative', zIndex: 1 }}>
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(91,160,255,0.06)', border: '1px solid rgba(91,160,255,0.15)',
          }}>
            <div style={{ fontSize: '0.70rem', color: 'var(--muted)' }}>Hashtags</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{analysis.hashtagCount}</div>
          </div>
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(61,214,140,0.06)', border: '1px solid rgba(61,214,140,0.15)',
          }}>
            <div style={{ fontSize: '0.70rem', color: 'var(--muted)' }}>Characters</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{analysis.charCount.toLocaleString()}</div>
          </div>
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: analysis.bannedFound.length > 0 ? 'rgba(255,92,92,0.06)' : 'rgba(61,214,140,0.06)',
            border: `1px solid ${analysis.bannedFound.length > 0 ? 'rgba(255,92,92,0.15)' : 'rgba(61,214,140,0.15)'}`,
          }}>
            <div style={{ fontSize: '0.70rem', color: 'var(--muted)' }}>Banned Tags</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: analysis.bannedFound.length > 0 ? '#ff5c5c' : '#3dd68c' }}>
              {analysis.bannedFound.length}
            </div>
          </div>
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: analysis.score >= 70 ? 'rgba(61,214,140,0.06)' : analysis.score >= 40 ? 'rgba(245,166,35,0.06)' : 'rgba(255,92,92,0.06)',
            border: `1px solid ${analysis.score >= 70 ? 'rgba(61,214,140,0.15)' : analysis.score >= 40 ? 'rgba(245,166,35,0.15)' : 'rgba(255,92,92,0.15)'}`,
          }}>
            <div style={{ fontSize: '0.70rem', color: 'var(--muted)' }}>Quality Score</div>
            <div style={{
              fontSize: '1.1rem', fontWeight: 700,
              color: analysis.score >= 70 ? '#3dd68c' : analysis.score >= 40 ? '#f5a623' : '#ff5c5c',
            }}>
              {analysis.score}/100
            </div>
          </div>

          {analysis.bannedFound.length > 0 && (
            <div style={{
              gridColumn: '1 / -1', padding: '10px 14px', borderRadius: 8,
              background: 'rgba(255,92,92,0.06)', border: '1px solid rgba(255,92,92,0.2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle className="h-4 w-4" style={{ color: '#ff5c5c', flexShrink: 0 }} />
              <div style={{ fontSize: '0.80rem' }}>
                <span style={{ fontWeight: 600, color: '#ff5c5c' }}>Banned hashtags detected: </span>
                {analysis.bannedFound.map((t) => (
                  <span key={t} style={{ fontWeight: 600, color: 'var(--text)' }}>{t} </span>
                ))}
                <span style={{ color: 'var(--muted)' }}>— These can shadow-ban your post or reduce reach.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ── Main Page ── */

export default function HashtagStudioPage() {
  const { activeCompany } = useActiveCompany();
  const { appContext } = useAppState();
  const { groups, bannedSet, loading, saveGroup, removeGroup } = useHashtagStudio();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HashtagResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [tab, setTab] = useState<'groups' | 'research' | 'analyze'>('groups');

  function doSearch() {
    if (!searchQuery.trim()) return;
    // Simulate search — in production, this would call an API or Firestore
    setSearchResults(MOCK_RESULTS.filter((r) =>
      r.tag.toLowerCase().includes(searchQuery.toLowerCase()) || searchQuery.length > 2
    ));
  }

  function toggleResult(tag: string) {
    setSelectedResults((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  async function saveSelectionAsGroup() {
    if (selectedResults.size === 0 || !newGroupName.trim()) return;
    const now = new Date().toISOString();
    await saveGroup({
      companyId: activeCompany?.id || '',
      name: newGroupName.trim(),
      hashtags: [...selectedResults],
      createdBy: appContext.userId,
      createdAt: now,
      updatedAt: now,
    });
    setSelectedResults(new Set());
    setNewGroupName('');
    setShowNewGroup(false);
  }

  function copyGroupTags(group: { id: string; hashtags: string[] }) {
    navigator.clipboard.writeText(group.hashtags.join(' ')).catch(() => undefined);
    setCopiedGroup(group.id);
    setTimeout(() => setCopiedGroup(null), 2000);
  }

  function deleteGroup(id: string) {
    if (!window.confirm('Delete this hashtag group?')) return;
    removeGroup(id);
  }

  if (!activeCompany) {
    return (
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon"><Hash className="h-6 w-6" /></div>
          <h3>No company selected</h3>
          <Link className="btn-primary" href="/select-company">Select company</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Hashtag Studio"
        subtitle="Research, organize, and optimize your hashtag strategy."
      />

      {/* Tab bar */}
      <div className="panel" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
          <Hash className="h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
          {[
            { key: 'groups' as const, label: 'Saved Groups' },
            { key: 'research' as const, label: 'Research' },
            { key: 'analyze' as const, label: 'Analyze Caption' },
          ].map((t) => (
            <button
              key={t.key}
              className={`chip${tab === t.key ? ' active' : ''}`}
              type="button"
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Saved Groups Tab ─── */}
      {tab === 'groups' && (
        <>
          {groups.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groups.map((group) => (
                <section key={group.id} className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{group.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                          {group.hashtags.length} tags
                        </span>
                        {group.performance?.avgImpressions && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <TrendingUp className="h-3 w-3" /> ~{formatNumber(group.performance.avgImpressions)} reach
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {group.hashtags.map((tag) => {
                          const isBanned = bannedSet.has(tag.replace('#', '').toLowerCase());
                          return (
                            <span key={tag} style={{
                              padding: '2px 8px', borderRadius: 999, fontSize: '0.74rem',
                              background: isBanned ? 'rgba(255,92,92,0.10)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${isBanned ? 'rgba(255,92,92,0.3)' : 'var(--border)'}`,
                              color: isBanned ? '#ff5c5c' : 'var(--text)',
                            }}>
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => copyGroupTags(group)}
                        title="Copy all tags"
                      >
                        <Copy className="h-3.5 w-3.5" /> {copiedGroup === group.id ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => deleteGroup(group.id)}
                        style={{ color: '#ff5c5c' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <section className="panel">
              <div className="empty-state" style={{ padding: '32px 16px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(91,160,255,0.10)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px',
                  border: '1px solid rgba(91,160,255,0.25)',
                }}>
                  <Hash className="h-6 w-6" style={{ color: '#5ba0ff' }} />
                </div>
                <h3>No saved groups yet</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>
                  Search for hashtags in the Research tab and save them as reusable groups.
                </p>
                <button type="button" className="btn-primary" onClick={() => setTab('research')}>
                  <Search className="h-3.5 w-3.5" /> Start Researching
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* ─── Research Tab ─── */}
      {tab === 'research' && (
        <>
          {/* Search bar */}
          <section className="panel" style={{ padding: '12px 14px' }}>
            <form
              onSubmit={(e) => { e.preventDefault(); doSearch(); }}
              style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative', zIndex: 1 }}
            >
              <Search className="h-4 w-4" style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hashtags (e.g. social media, marketing, branding)..."
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'inherit',
                }}
              />
              <button type="submit" className="btn-primary btn-sm">
                <Search className="h-3.5 w-3.5" /> Search
              </button>
            </form>
          </section>

          {/* Results */}
          {searchResults.length > 0 && (
            <>
              {/* Save selection bar */}
              {selectedResults.size > 0 && (
                <section className="panel" style={{ padding: '10px 14px', borderColor: 'var(--accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {selectedResults.size} tag{selectedResults.size !== 1 ? 's' : ''} selected
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {showNewGroup ? (
                        <>
                          <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="Group name..."
                            style={{
                              padding: '6px 10px', borderRadius: 6,
                              background: 'var(--surface-2)', border: '1px solid var(--border)',
                              color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                              width: 180,
                            }}
                          />
                          <button type="button" className="btn-primary btn-sm" onClick={saveSelectionAsGroup} disabled={!newGroupName.trim()}>
                            Save
                          </button>
                          <button type="button" className="btn-ghost btn-sm" onClick={() => setShowNewGroup(false)}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn-primary btn-sm" onClick={() => setShowNewGroup(true)}>
                            <BookmarkPlus className="h-3.5 w-3.5" /> Save as Group
                          </button>
                          <button type="button" className="btn-ghost btn-sm" onClick={() => {
                            navigator.clipboard.writeText([...selectedResults].join(' ')).catch(() => undefined);
                          }}>
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              )}

              <section className="panel">
                <table className="table" style={{ position: 'relative', zIndex: 1 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }} />
                      <th>Hashtag</th>
                      <th>Posts</th>
                      <th>Difficulty</th>
                      <th>Avg Reach</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((r) => (
                      <tr key={r.tag} style={{ opacity: r.banned ? 0.55 : 1 }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedResults.has(r.tag)}
                            onChange={() => toggleResult(r.tag)}
                            style={{ width: 15, height: 15, cursor: 'pointer' }}
                            disabled={r.banned}
                          />
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.tag}</span>
                        </td>
                        <td style={{ fontSize: '0.80rem', color: 'var(--muted)' }}>
                          {formatNumber(r.posts)}
                        </td>
                        <td>
                          <span style={{
                            padding: '1px 8px', borderRadius: 999, fontSize: '0.70rem', fontWeight: 600,
                            color: DIFFICULTY_COLORS[r.difficulty],
                            background: `${DIFFICULTY_COLORS[r.difficulty]}15`,
                            border: `1px solid ${DIFFICULTY_COLORS[r.difficulty]}33`,
                            textTransform: 'capitalize',
                          }}>
                            {r.difficulty}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.80rem', color: 'var(--muted)' }}>
                          {r.avgReach ? formatNumber(r.avgReach) : '—'}
                        </td>
                        <td>
                          {r.banned ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '1px 8px', borderRadius: 999, fontSize: '0.70rem', fontWeight: 600,
                              color: '#ff5c5c', background: 'rgba(255,92,92,0.10)',
                              border: '1px solid rgba(255,92,92,0.3)',
                            }}>
                              <AlertTriangle className="h-3 w-3" /> Banned
                            </span>
                          ) : r.trending ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '1px 8px', borderRadius: 999, fontSize: '0.70rem', fontWeight: 600,
                              color: '#3dd68c', background: 'rgba(61,214,140,0.10)',
                              border: '1px solid rgba(61,214,140,0.3)',
                            }}>
                              <TrendingUp className="h-3 w-3" /> Trending
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}

          {searchResults.length === 0 && searchQuery && (
            <section className="panel">
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                <p style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>
                  Enter a topic or keyword and click Search to discover relevant hashtags.
                </p>
              </div>
            </section>
          )}
        </>
      )}

      {/* ─── Analyze Tab ─── */}
      {tab === 'analyze' && <CaptionAnalyzer bannedSet={bannedSet} />}
    </div>
  );
}
