"use client";

import Link from 'next/link';
import { useRef, useState } from 'react';
import {
  AlertCircle, CalendarDays, Hash, Heart, ImagePlus, MessageCircle, MoreHorizontal,
  RefreshCw, Send, Share2, Sparkles, ThumbsUp, WandSparkles, X,
} from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { PageHeader } from '@/components/ui/page-header';
import { useAppState } from '@/components/shell/app-state';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyAssets } from '@/lib/hooks/use-company-assets';
import { useAuth } from '@/lib/firebase/auth-provider';
import { firebaseStorage, firestore } from '@/lib/firebase/client';
import { useSocialConnections } from '@/lib/hooks/use-social-connections';

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X (Twitter)', 'Threads', 'YouTube'] as const;
type Platform = typeof PLATFORMS[number];

const CHAR_LIMITS: Record<Platform, number> = {
  'Instagram':   2200,
  'Facebook':    63206,
  'LinkedIn':    3000,
  'TikTok':      2200,
  'X (Twitter)': 280,
  'Threads':     500,
  'YouTube':     5000,
};

const PROVIDER_MAP: Record<Platform, string | null> = {
  'Instagram':   'instagram',
  'Facebook':    'facebook',
  'LinkedIn':    'linkedin',
  'TikTok':      'tiktok',
  'X (Twitter)': 'twitter',
  'Threads':     'threads',
  'YouTube':     'youtube',
};

const PLATFORM_COLOR: Record<Platform, string> = {
  'Instagram':   '#e1306c',
  'Facebook':    '#1877f2',
  'LinkedIn':    '#0a66c2',
  'TikTok':      '#010101',
  'X (Twitter)': '#1da1f2',
  'Threads':     '#101010',
  'YouTube':     '#ff0000',
};

const HASHTAG_SUGGESTIONS: Record<Platform, string[]> = {
  'Instagram':   ['#instagood', '#photooftheday', '#reels', '#explore'],
  'Facebook':    ['#FacebookLive', '#community'],
  'LinkedIn':    ['#Leadership', '#B2B', '#Growth', '#Innovation'],
  'TikTok':      ['#fyp', '#viral', '#trending', '#foryou'],
  'X (Twitter)': ['#SocialMedia', '#Marketing'],
  'Threads':     ['#threads', '#community'],
  'YouTube':     ['#shorts', '#youtube', '#subscribe'],
};

export default function BuildPage() {
  const { user } = useAuth();
  const { appContext } = useAppState();
  const { activeCompany } = useActiveCompany();
  const { assets } = useCompanyAssets();
  const { connectedProviders, isConnected } = useSocialConnections();

  const [platform, setPlatform] = useState<Platform>('Instagram');
  const [caption, setCaption] = useState('');
  const [campaign, setCampaign] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaPreview, setMediaPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [status, setStatus] = useState<{ msg: string; kind: 'success' | 'error' | 'info' } | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const limit = CHAR_LIMITS[platform];
  const remaining = limit - caption.length;
  const overLimit = remaining < 0;
  const fullCaption = caption + (hashtags.length ? '\n\n' + hashtags.join(' ') : '');

  async function handleFileSelect(file: File) {
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setMediaPreview(localPreview);
    if (!firebaseStorage || !user?.uid) {
      setStatus({ msg: 'Firebase Storage not configured — using local preview only.', kind: 'info' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `workspaces/${appContext.workspaceId}/posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const fileRef = storageRef(firebaseStorage, path);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      setMediaUrl(url);
      setStatus({ msg: 'Media uploaded successfully.', kind: 'success' });
    } catch (e) {
      setStatus({ msg: e instanceof Error ? e.message : 'Upload failed — using local preview.', kind: 'error' });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  async function generateCaption() {
    if (!activeCompany) return;
    setGeneratingCaption(true);
    try {
      const res = await fetch('/api/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'caption',
          platform,
          companyName: activeCompany.name,
          voice: activeCompany.sections?.voice?.tone ?? 'professional',
          context: activeCompany.sections?.identity?.mission ?? activeCompany.sections?.identity?.tagline ?? '',
        }),
      });
      if (res.ok) {
        const data = await res.json() as { caption?: string };
        if (data.caption) setCaption(data.caption);
      } else {
        // Fallback: generate a reasonable placeholder
        const templates: Record<Platform, string> = {
          'Instagram': `✨ Exciting things are happening at ${activeCompany.name}! Stay tuned for more updates. What are you most excited about? Drop a comment below! 👇`,
          'Facebook': `We have some exciting news to share with our community at ${activeCompany.name}! Keep reading to find out more about what we've been working on.`,
          'LinkedIn': `At ${activeCompany.name}, we believe in continuous growth and innovation. Here's what we've been focusing on this week — and why it matters for our industry.`,
          'TikTok': `Wait for it... 👀 ${activeCompany.name} has something big coming! Follow for updates. #fyp #trending`,
          'X (Twitter)': `Big things coming from ${activeCompany.name} 🚀 Stay tuned.`,
          'Threads': `Hey everyone! ${activeCompany.name} here. We've been busy building something amazing — can't wait to share it with you all.`,
          'YouTube': `Welcome to ${activeCompany.name}'s latest video! In today's content, we're diving deep into what makes our brand unique. Make sure to like and subscribe for more!`,
        };
        setCaption(templates[platform]);
      }
      setStatus({ msg: 'Caption generated!', kind: 'success' });
    } catch {
      setStatus({ msg: 'Could not reach AI endpoint. Showing template caption.', kind: 'info' });
    } finally {
      setGeneratingCaption(false);
    }
  }

  function addHashtag(tag: string) {
    if (!hashtags.includes(tag)) setHashtags((prev) => [...prev, tag]);
  }
  function removeHashtag(tag: string) {
    setHashtags((prev) => prev.filter((h) => h !== tag));
  }

  async function submitPost(workflowStatus: 'draft' | 'in_review' | 'scheduled') {
    if (!user?.uid) { setStatus({ msg: 'Sign in to save posts.', kind: 'error' }); return; }
    if (workflowStatus === 'scheduled' && !scheduleAt) {
      setStatus({ msg: 'Pick a schedule date/time before scheduling.', kind: 'error' });
      return;
    }
    const provider = PROVIDER_MAP[platform];
    // Connection check for scheduled/review posts
    if (workflowStatus !== 'draft' && provider && !isConnected(provider as import('@/lib/firebase/connection-store').SocialProvider)) {
      setStatus({ msg: `${platform} is not connected. Go to Integrations to connect it first.`, kind: 'error' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const when = workflowStatus === 'scheduled'
        ? new Date(scheduleAt).toISOString()
        : undefined;

      // 1. Save post to Firestore
      const postData = {
        userId: user.uid,
        platform,
        provider: provider ?? 'generic',
        caption: fullCaption,
        mediaUrl: mediaUrl || null,
        scheduledFor: when ?? null,
        status: workflowStatus,
        campaign: campaign || null,
        hashtags,
        createdAt: serverTimestamp(),
      };

      const companyId = appContext.activeCompanyId;
      let postId: string | undefined;
      if (firestore && companyId) {
        const postsRef = collection(firestore, 'workspaces', appContext.workspaceId, 'companies', companyId, 'posts');
        const docRef = await addDoc(postsRef, postData);
        postId = docRef.id;
      }

      // 2. If scheduling and platform is connected, call publish API
      if (workflowStatus === 'scheduled' && provider && companyId) {
        try {
          const publishRes = await fetch('/api/social/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId: appContext.workspaceId,
              companyId,
              provider,
              caption: fullCaption,
              mediaUrl: mediaUrl || undefined,
              scheduledAt: when,
              postId,
            }),
          });
          if (!publishRes.ok) {
            const errData = await publishRes.json().catch(() => ({}));
            setStatus({ msg: `Post saved but publish failed: ${errData.error || 'Unknown error'}`, kind: 'error' });
            setSaving(false);
            return;
          }
        } catch {
          setStatus({ msg: 'Post saved to Firestore but failed to reach publish API.', kind: 'error' });
          setSaving(false);
          return;
        }
      }

      setStatus({
        msg: workflowStatus === 'draft'     ? 'Saved as draft.' :
             workflowStatus === 'in_review' ? 'Submitted for review.' : 'Post scheduled!',
        kind: 'success',
      });
      if (workflowStatus !== 'draft') {
        setCaption(''); setMediaUrl(''); setMediaPreview(''); setScheduleAt('');
        setCampaign(''); setHashtags([]);
      }
    } catch (e) {
      setStatus({ msg: e instanceof Error ? e.message : 'Failed to save post.', kind: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (!activeCompany) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><WandSparkles className="h-6 w-6" /></div>
        <h3>No company selected</h3>
        <Link className="btn-primary" href="/select-company">Choose company</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Publish"
        subtitle={`Compose for ${activeCompany.name} — schedule, review, or draft.`}
        actions={
          <>
            <button
              className="btn-ghost btn-sm"
              type="button"
              onClick={generateCaption}
              disabled={generatingCaption}
            >
              {generatingCaption
                ? <RefreshCw className="h-3.5 w-3.5" style={{ animation: 'spin 1s linear infinite' }} />
                : <Sparkles className="h-3.5 w-3.5" />
              }
              {generatingCaption ? 'Writing…' : 'AI Caption'}
            </button>
            <button
              className="btn-primary btn-sm"
              type="button"
              onClick={() => submitPost('scheduled')}
              disabled={saving || overLimit}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Schedule
            </button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12 }}>
        {/* ── Composer ── */}
        <div style={{ display: 'grid', gap: 12 }}>
          <section className="panel">
            {/* Platform selector */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '0.70rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Platform
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PLATFORMS.map((p) => {
                  const prov = PROVIDER_MAP[p];
                  const connected = prov ? isConnected(prov as import('@/lib/firebase/connection-store').SocialProvider) : false;
                  return (
                    <button
                      key={p}
                      className={`chip${platform === p ? ' active' : ''}`}
                      type="button"
                      onClick={() => setPlatform(p)}
                      style={platform === p ? { borderColor: PLATFORM_COLOR[p] + '88', background: PLATFORM_COLOR[p] + '22', color: PLATFORM_COLOR[p] } : {}}
                    >
                      {p}{prov && connected ? ' ✓' : ''}
                    </button>
                  );
                })}
              </div>
              {(() => {
                const prov = PROVIDER_MAP[platform];
                const connected = prov ? isConnected(prov as import('@/lib/firebase/connection-store').SocialProvider) : false;
                if (prov && !connected) return (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#f5a623' }}>
                    <AlertCircle className="h-3.5 w-3.5" />
                    {platform} is not connected. <Link href="/integrations" style={{ color: 'var(--company-accent)', fontWeight: 600, textDecoration: 'underline' }}>Connect it</Link>
                  </div>
                );
                return null;
              })()}
            </div>

            {/* Caption */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.70rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Caption
                </span>
                <textarea
                  rows={7}
                  placeholder={`Write your ${platform} caption for ${activeCompany.name}…`}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  style={{ borderColor: overLimit ? 'rgba(255,92,92,0.5)' : undefined }}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <button
                  className="btn-ghost btn-sm"
                  type="button"
                  onClick={() => setShowHashtagSuggestions((v) => !v)}
                  style={{ fontSize: '0.72rem' }}
                >
                  <Hash className="h-3 w-3" /> Hashtags
                </button>
                <span style={{ fontSize: '0.72rem', color: overLimit ? '#ff5c5c' : 'var(--muted)' }}>
                  {overLimit ? `${Math.abs(remaining)} over limit` : `${remaining} remaining`}
                </span>
              </div>

              {/* Hashtag suggestions */}
              {showHashtagSuggestions && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {HASHTAG_SUGGESTIONS[platform].map((tag) => (
                    <button
                      key={tag}
                      className={`chip${hashtags.includes(tag) ? ' active' : ''} btn-sm`}
                      type="button"
                      onClick={() => hashtags.includes(tag) ? removeHashtag(tag) : addHashtag(tag)}
                      style={{ fontSize: '0.72rem' }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected hashtags */}
              {hashtags.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {hashtags.map((tag) => (
                    <span key={tag} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'var(--company-glow-soft)', border: '1px solid var(--company-border)',
                      borderRadius: 6, padding: '2px 7px', fontSize: '0.72rem', color: 'var(--company-accent)',
                    }}>
                      {tag}
                      <button type="button" onClick={() => removeHashtag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', lineHeight: 1 }}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Campaign + schedule */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, position: 'relative', zIndex: 1 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.70rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Campaign</span>
                <input placeholder="e.g. Q1 Launch" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.70rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Schedule</span>
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </label>
            </div>

            {/* Media upload */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '0.70rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Media
              </p>
              {mediaPreview ? (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '16/9', maxHeight: 220 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setMediaPreview(''); setMediaUrl(''); }}
                    style={{
                      position: 'absolute', top: 6, right: 6, width: 26, height: 26,
                      borderRadius: 999, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff',
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {uploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RefreshCw className="h-6 w-6" style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                  {mediaUrl && !uploading && (
                    <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(61,214,140,0.9)', borderRadius: 6, padding: '2px 8px', fontSize: '0.66rem', fontWeight: 600, color: '#061a0e' }}>
                      ✓ Uploaded
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="upload-zone"
                  style={{ cursor: 'pointer', padding: '20px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <ImagePlus className="h-6 w-6" style={{ color: 'var(--company-primary)' }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    Drag & drop, or{' '}
                    <span style={{ color: 'var(--company-primary)', fontWeight: 600 }}>browse files</span>
                  </span>
                  <span style={{ fontSize: '0.70rem', color: 'var(--dim)' }}>Images, videos — JPG, PNG, MP4, MOV</span>
                  {assets.length > 0 && (
                    <span style={{ fontSize: '0.70rem', color: 'var(--muted)' }}>
                      Or pick from {assets.length} company asset{assets.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />

              {/* Also allow URL input */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <span style={{ fontSize: '0.70rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Or paste media URL</span>
                <input
                  placeholder="https://example.com/image.jpg"
                  value={mediaUrl}
                  onChange={(e) => { setMediaUrl(e.target.value); if (e.target.value) setMediaPreview(e.target.value); }}
                />
              </label>
            </div>

            {/* Company assets quick pick */}
            {assets.length > 0 && (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: '0.70rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Company assets
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {assets.slice(0, 8).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setMediaUrl(a.downloadUrl); setMediaPreview(a.thumbnailUrl || a.downloadUrl); }}
                      style={{
                        width: 52, height: 52, borderRadius: 8, overflow: 'hidden',
                        border: `2px solid ${mediaUrl === a.downloadUrl ? 'var(--company-primary)' : 'var(--border)'}`,
                        cursor: 'pointer', padding: 0, background: 'var(--panel)',
                      }}
                    >
                      {a.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.thumbnailUrl} alt={a.type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImagePlus className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                        </div>
                      )}
                    </button>
                  ))}
                  {assets.length > 8 && (
                    <Link href="/assets" className="btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, height: 52, padding: '0 12px', fontSize: '0.72rem' }}>
                      +{assets.length - 8} more
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Status message */}
            {status && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, fontSize: '0.80rem', fontWeight: 500,
                position: 'relative', zIndex: 1,
                color: status.kind === 'success' ? '#3dd68c' : status.kind === 'error' ? '#ff5c5c' : 'var(--company-accent)',
                background: status.kind === 'success' ? 'rgba(61,214,140,0.08)' :
                            status.kind === 'error'   ? 'rgba(255,92,92,0.08)'  : 'rgba(91,160,255,0.08)',
                border: `1px solid ${status.kind === 'success' ? 'rgba(61,214,140,0.25)' : status.kind === 'error' ? 'rgba(255,92,92,0.25)' : 'rgba(91,160,255,0.25)'}`,
              }}>
                {status.kind === 'success' ? '✓ ' : status.kind === 'error' ? '✕ ' : 'ℹ '}{status.msg}
              </div>
            )}

            {/* Action row */}
            <div className="button-row" style={{ position: 'relative', zIndex: 1 }}>
              <button className="btn-ghost" type="button" onClick={() => submitPost('draft')} disabled={saving}>
                Save draft
              </button>
              <button className="btn-ghost" type="button" onClick={() => submitPost('in_review')} disabled={saving}>
                Submit for review
              </button>
              <button className="btn-primary" type="button" onClick={() => submitPost('scheduled')} disabled={saving || overLimit}>
                {saving ? <RefreshCw className="h-3.5 w-3.5" style={{ animation: 'spin 1s linear infinite' }} /> : <Send className="h-3.5 w-3.5" />}
                {saving ? 'Saving…' : 'Schedule Post'}
              </button>
            </div>
          </section>
        </div>

        {/* ── Preview ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Phone preview */}
          <div className="phone-outer">
            <div className="phone-frame">
              <div className="phone-notch"><div className="phone-notch-pill" /></div>
              <div className="phone-screen">
                <div className="phone-safe-top" />

                {platform === 'Instagram' && (
                  <>
                    <div className="phone-ig-header" style={{ padding: '8px 14px 8px' }}>
                      <div className="phone-ig-avatar" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{activeCompany.name}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>Just now · Sponsored</div>
                      </div>
                      <MoreHorizontal style={{ width: 14, color: 'rgba(255,255,255,0.45)' }} />
                    </div>
                    <div className="phone-ig-media">
                      {mediaPreview
                        ? <img src={mediaPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                            <ImagePlus style={{ width: 28, color: 'rgba(255,255,255,0.18)' }} />
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>No media</span>
                          </div>
                      }
                    </div>
                    <div className="phone-ig-actions" style={{ padding: '8px 14px 0' }}>
                      <Heart style={{ width: 18, color: 'rgba(255,255,255,0.8)' }} />
                      <MessageCircle style={{ width: 18, color: 'rgba(255,255,255,0.8)' }} />
                      <Share2 style={{ width: 18, color: 'rgba(255,255,255,0.8)' }} />
                    </div>
                    <div style={{ padding: '6px 14px 10px', fontSize: 10, color: '#fff', lineHeight: 1.45 }}>
                      <strong>{activeCompany.name}</strong>{' '}
                      <span style={{ opacity: caption ? 1 : 0.38 }}>
                        {(fullCaption || 'Your caption will appear here…').slice(0, 120)}{fullCaption.length > 120 ? '… more' : ''}
                      </span>
                    </div>
                  </>
                )}

                {platform === 'Facebook' && (
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 999, background: 'linear-gradient(135deg, var(--company-accent), var(--company-primary))', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{activeCompany.name}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Sponsored · 🌐</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', lineHeight: 1.45 }}>
                      {(fullCaption || 'Your post text will appear here…').slice(0, 150)}{fullCaption.length > 150 ? '…' : ''}
                    </div>
                    {mediaPreview && (
                      <div style={{ borderRadius: 6, overflow: 'hidden', aspectRatio: '1.91', background: 'rgba(255,255,255,0.05)' }}>
                        <img src={mediaPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ThumbsUp style={{ width: 11 }} /> Like</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageCircle style={{ width: 11 }} /> Comment</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Share2 style={{ width: 11 }} /> Share</span>
                    </div>
                  </div>
                )}

                {platform === 'LinkedIn' && (
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 6, background: 'linear-gradient(135deg, var(--company-accent), var(--company-primary))', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{activeCompany.name}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Company · Sponsored</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>🌐 Public</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                      {(fullCaption || 'Your LinkedIn post will appear here…').slice(0, 200)}{fullCaption.length > 200 ? '… see more' : ''}
                    </div>
                    {mediaPreview && <div style={{ borderRadius: 6, overflow: 'hidden', aspectRatio: '1.91' }}><img src={mediaPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                    <div style={{ display: 'flex', gap: 10, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
                      <span>👍 Like</span>
                      <span>💡 Insightful</span>
                      <span>🤝 Celebrate</span>
                      <span>Comment</span>
                    </div>
                  </div>
                )}

                {(platform === 'X (Twitter)' || platform === 'Threads') && (
                  <div style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 999, background: 'linear-gradient(135deg, var(--company-accent), var(--company-primary))', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{activeCompany.name}</span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>@{activeCompany.name.toLowerCase().replace(/\s+/g, '')} · now</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.45, marginTop: 4 }}>
                        {(fullCaption || 'Your tweet…').slice(0, 280)}
                      </div>
                      {mediaPreview && <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1.77', marginTop: 8 }}><img src={mediaPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 9, color: 'rgba(255,255,255,0.38)' }}>
                        <span>💬 Reply</span><span>🔁 Repost</span><span>❤️ Like</span><span>📊 Views</span>
                      </div>
                    </div>
                  </div>
                )}

                {platform === 'TikTok' && (
                  <div style={{ position: 'relative', minHeight: 300, background: '#000' }}>
                    {mediaPreview
                      ? <img src={mediaPreview} alt="Preview" style={{ width: '100%', height: 300, objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 28 }}>🎵</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Upload video</span>
                        </div>
                    }
                    <div style={{ position: 'absolute', bottom: 50, left: 10, right: 50, fontSize: 10, color: '#fff' }}>
                      <div style={{ fontWeight: 700, marginBottom: 3 }}>@{activeCompany.name.toLowerCase().replace(/\s+/g, '_')}</div>
                      <div style={{ opacity: 0.85 }}>{(fullCaption || '').slice(0, 80)}{fullCaption.length > 80 ? '…' : ''}</div>
                    </div>
                    <div style={{ position: 'absolute', bottom: 50, right: 8, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                      <Heart style={{ width: 18, color: '#fff' }} /><MessageCircle style={{ width: 17, color: '#fff' }} /><Share2 style={{ width: 17, color: '#fff' }} />
                    </div>
                  </div>
                )}

                {platform === 'YouTube' && (
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', background: 'rgba(255,0,0,0.08)' }}>
                      {mediaPreview
                        ? <img src={mediaPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 28 }}>▶️</span>
                          </div>
                      }
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                      {(caption || 'Video title / description will appear here').slice(0, 60)}
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{activeCompany.name} · 0 views · just now</div>
                  </div>
                )}

                <div className="phone-safe-bottom" />
                <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 6 }}>
                  <div className="phone-home-bar" />
                </div>
              </div>
            </div>
          </div>

          {/* AI assist card */}
          <div className="panel" style={{ fontSize: '0.8rem' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p className="kicker" style={{ marginBottom: 4 }}>AI Caption Assistant</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 10 }}>
                Generate a caption using {activeCompany.name}&rsquo;s brand voice, optimized for {platform}.
              </p>
              <button
                className="btn-primary btn-sm"
                type="button"
                onClick={generateCaption}
                disabled={generatingCaption}
              >
                {generatingCaption
                  ? <RefreshCw className="h-3.5 w-3.5" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Sparkles className="h-3.5 w-3.5" />
                }
                {generatingCaption ? 'Generating…' : 'Generate caption'}
              </button>
            </div>
          </div>

          {/* Schedule tip */}
          {scheduleAt && (
            <div className="panel" style={{ fontSize: '0.78rem' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p className="kicker" style={{ marginBottom: 4 }}>Scheduled</p>
                <p style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {new Date(scheduleAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: 4 }}>
                  Publishing to {platform}
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}