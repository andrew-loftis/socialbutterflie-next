"use client";

/**
 * Stories Composer Page
 * ---------------------
 * Create and schedule Instagram/Facebook stories with multi-slide
 * support, overlays (text, stickers, polls, links), timeline preview,
 * and scheduling. Wired to Firestore for persistence.
 */

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  Clock,
  GripVertical,
  Image,
  Layers,
  Link as LinkIcon,
  MessageSquare,
  Music,
  Plus,
  Send,
  Sparkles,
  Sticker,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useAppState } from '@/components/shell/app-state';
import { useStories } from '@/lib/hooks/use-stories';
import type { StorySlide, StoryOverlay, StoryPost } from '@/types/interfaces';

/* ---- Constants ---- */

const STORY_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', emoji: '\u{1F4F8}' },
  { id: 'facebook', label: 'Facebook', emoji: '\u{1F4D8}' },
  { id: 'tiktok', label: 'TikTok', emoji: '\u{1F3B5}' },
] as const;

const OVERLAY_TYPES: { type: StoryOverlay['type']; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'sticker', label: 'Sticker', icon: Sticker },
  { type: 'poll', label: 'Poll', icon: MessageSquare },
  { type: 'link', label: 'Link', icon: LinkIcon },
  { type: 'music', label: 'Music', icon: Music },
  { type: 'mention', label: 'Mention', icon: Sparkles },
];

/* ---- Helpers ---- */

function generateSlideId() {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptySlide(order: number): StorySlide {
  return {
    id: generateSlideId(),
    mediaRef: '',
    mediaType: 'image',
    duration: 5,
    overlays: [],
    order,
  };
}

/* ---- Slide Preview Thumbnail ---- */

function SlideThumbnail({
  slide,
  index,
  isActive,
  onClick,
  onDelete,
}: {
  slide: StorySlide;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 64,
        height: 112,
        borderRadius: 10,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        border: isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
        background: slide.mediaRef ? 'var(--surface-2)' : 'linear-gradient(135deg, rgba(245,166,35,0.08), rgba(91,160,255,0.08))',
        transition: 'border-color 0.15s',
        flexShrink: 0,
      }}
    >
      {slide.mediaRef ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.mediaRef}
          alt={`Slide ${index + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: 'var(--muted)', fontSize: '0.60rem',
        }}>
          <Image className="h-4 w-4" style={{ marginBottom: 2 }} />
          {index + 1}
        </div>
      )}
      {/* Overlay count badge */}
      {slide.overlays.length > 0 && (
        <div style={{
          position: 'absolute', top: 3, right: 3,
          width: 16, height: 16, borderRadius: 999,
          background: 'var(--accent)', color: '#000',
          fontSize: '0.58rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {slide.overlays.length}
        </div>
      )}
      {/* Delete */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{
          position: 'absolute', bottom: 2, right: 2,
          width: 18, height: 18, borderRadius: 999,
          background: 'rgba(0,0,0,0.6)', border: 'none',
          color: '#ff5c5c', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

/* ---- Overlay Editor ---- */

function OverlayItem({
  overlay,
  index,
  onUpdate,
  onDelete,
}: {
  overlay: StoryOverlay;
  index: number;
  onUpdate: (data: Partial<StoryOverlay>) => void;
  onDelete: () => void;
}) {
  const label = OVERLAY_TYPES.find((o) => o.type === overlay.type)?.label || overlay.type;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '8px 10px', borderRadius: 8,
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
      }}
    >
      <GripVertical className="h-3.5 w-3.5" style={{ color: 'var(--muted)', marginTop: 2, cursor: 'grab' }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)' }}>
            {label}
          </span>
          <span style={{ fontSize: '0.66rem', color: 'var(--muted)' }}>
            ({overlay.position.x}%, {overlay.position.y}%)
          </span>
        </div>
        {overlay.type === 'text' && (
          <input
            type="text"
            value={(overlay.payload.text as string) || ''}
            onChange={(e) => onUpdate({ payload: { ...overlay.payload, text: e.target.value } })}
            placeholder="Enter text..."
            style={{
              width: '100%', padding: '4px 8px', borderRadius: 6,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '0.80rem', fontFamily: 'inherit',
            }}
          />
        )}
        {overlay.type === 'link' && (
          <input
            type="url"
            value={(overlay.payload.url as string) || ''}
            onChange={(e) => onUpdate({ payload: { ...overlay.payload, url: e.target.value } })}
            placeholder="https://..."
            style={{
              width: '100%', padding: '4px 8px', borderRadius: 6,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '0.80rem', fontFamily: 'inherit',
            }}
          />
        )}
        {overlay.type === 'poll' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input
              type="text"
              value={(overlay.payload.question as string) || ''}
              onChange={(e) => onUpdate({ payload: { ...overlay.payload, question: e.target.value } })}
              placeholder="Poll question..."
              style={{
                width: '100%', padding: '4px 8px', borderRadius: 6,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: '0.80rem', fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="text"
                value={(overlay.payload.optionA as string) || ''}
                onChange={(e) => onUpdate({ payload: { ...overlay.payload, optionA: e.target.value } })}
                placeholder="Option A"
                style={{
                  flex: 1, padding: '4px 8px', borderRadius: 6,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.78rem', fontFamily: 'inherit',
                }}
              />
              <input
                type="text"
                value={(overlay.payload.optionB as string) || ''}
                onChange={(e) => onUpdate({ payload: { ...overlay.payload, optionB: e.target.value } })}
                placeholder="Option B"
                style={{
                  flex: 1, padding: '4px 8px', borderRadius: 6,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.78rem', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
        )}
        {overlay.type === 'mention' && (
          <input
            type="text"
            value={(overlay.payload.username as string) || ''}
            onChange={(e) => onUpdate({ payload: { ...overlay.payload, username: e.target.value } })}
            placeholder="@username"
            style={{
              width: '100%', padding: '4px 8px', borderRadius: 6,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '0.80rem', fontFamily: 'inherit',
            }}
          />
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#ff5c5c', padding: 2,
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ---- Phone Preview ---- */

function PhonePreview({ slide }: { slide: StorySlide | null }) {
  if (!slide) return null;

  return (
    <div style={{
      width: 240, height: 426, borderRadius: 20,
      background: slide.mediaRef ? 'var(--surface-2)' : 'linear-gradient(180deg, rgba(245,166,35,0.10) 0%, rgba(91,160,255,0.10) 100%)',
      border: '2px solid var(--border)',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      flexShrink: 0,
    }}>
      {/* Status bar */}
      <div style={{
        padding: '8px 12px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', fontSize: '0.60rem', color: 'var(--muted)',
      }}>
        <span>9:41</span>
        <div style={{
          display: 'flex', gap: 4,
          height: 3, flex: 1, maxWidth: 120, margin: '0 8px',
        }}>
          <div style={{ flex: 1, borderRadius: 2, background: 'var(--accent)' }} />
          <div style={{ flex: 1, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ flex: 1, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <span>...</span>
      </div>

      {/* Media area */}
      {slide.mediaRef ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.mediaRef}
          alt="Slide media"
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
        />
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: 'calc(100% - 80px)', color: 'var(--muted)', fontSize: '0.74rem', gap: 8,
        }}>
          <Image className="h-8 w-8" />
          <span>Add media</span>
        </div>
      )}

      {/* Overlays preview */}
      {slide.overlays.map((overlay, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${overlay.position.x}%`,
            top: `${overlay.position.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10 + i,
            padding: '4px 10px',
            borderRadius: 8,
            background: overlay.type === 'text' ? 'rgba(0,0,0,0.6)' :
              overlay.type === 'poll' ? 'rgba(245,166,35,0.9)' :
              overlay.type === 'link' ? 'rgba(91,160,255,0.9)' :
              'rgba(0,0,0,0.5)',
            color: '#fff',
            fontSize: '0.58rem',
            fontWeight: 600,
            maxWidth: '80%',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {overlay.type === 'text' && ((overlay.payload.text as string) || 'Text')}
          {overlay.type === 'poll' && ((overlay.payload.question as string) || 'Poll')}
          {overlay.type === 'link' && 'See more'}
          {overlay.type === 'sticker' && '\u{2B50}'}
          {overlay.type === 'music' && '\u{1F3B5}'}
          {overlay.type === 'mention' && `@${(overlay.payload.username as string) || '...'}`}
        </div>
      ))}

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
        zIndex: 20,
      }}>
        <div style={{
          padding: '4px 12px', borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff', fontSize: '0.58rem',
        }}>
          Send message
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Send className="h-3.5 w-3.5" style={{ color: '#fff' }} />
        </div>
      </div>
    </div>
  );
}

/* ---- Main Page ---- */

export default function StoriesComposerPage() {
  const { activeCompany } = useActiveCompany();
  const { appContext } = useAppState();
  const { saveStory } = useStories();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [slides, setSlides] = useState<StorySlide[]>([createEmptySlide(0)]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [platforms, setPlatforms] = useState<string[]>(['instagram']);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [saving, setSaving] = useState(false);

  const activeSlide = slides[activeSlideIndex] || null;

  function addSlide() {
    setSlides((prev) => [...prev, createEmptySlide(prev.length)]);
    setActiveSlideIndex(slides.length);
  }

  function deleteSlide(index: number) {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== index));
    setActiveSlideIndex(Math.min(activeSlideIndex, slides.length - 2));
  }

  function updateActiveSlide(data: Partial<StorySlide>) {
    setSlides((prev) => prev.map((s, i) => (i === activeSlideIndex ? { ...s, ...data } : s)));
  }

  function addOverlay(type: StoryOverlay['type']) {
    if (!activeSlide) return;
    const newOverlay: StoryOverlay = {
      type,
      payload: type === 'text' ? { text: '' } :
        type === 'poll' ? { question: '', optionA: 'Yes', optionB: 'No' } :
        type === 'link' ? { url: '' } :
        type === 'mention' ? { username: '' } : {},
      position: { x: 50, y: 50 },
    };
    updateActiveSlide({ overlays: [...activeSlide.overlays, newOverlay] });
  }

  function updateOverlay(overlayIndex: number, data: Partial<StoryOverlay>) {
    if (!activeSlide) return;
    const newOverlays = activeSlide.overlays.map((o, i) =>
      i === overlayIndex ? { ...o, ...data } : o,
    );
    updateActiveSlide({ overlays: newOverlays });
  }

  function deleteOverlay(overlayIndex: number) {
    if (!activeSlide) return;
    updateActiveSlide({ overlays: activeSlide.overlays.filter((_, i) => i !== overlayIndex) });
  }

  function togglePlatform(p: string) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    updateActiveSlide({ mediaRef: url, mediaType });
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlideIndex, activeSlide]);

  async function handlePublish(status: StoryPost['status']) {
    if (!activeCompany) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await saveStory({
        companyId: activeCompany.id,
        type: 'story',
        platforms,
        slides,
        status,
        scheduledFor: scheduleDate && scheduleTime ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString() : undefined,
        createdBy: appContext.userId,
        createdAt: now,
        updatedAt: now,
      });
      // Reset form after save
      setSlides([createEmptySlide(0)]);
      setActiveSlideIndex(0);
      setScheduleDate('');
      setScheduleTime('');
    } catch (err) {
      console.error('Failed to save story:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!activeCompany) {
    return (
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon"><Layers className="h-6 w-6" /></div>
          <h3>No company selected</h3>
          <Link className="btn-primary" href="/select-company">Select company</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Stories Composer"
        subtitle={`${slides.length} slide${slides.length !== 1 ? 's' : ''} \u00B7 ${platforms.map((p) => STORY_PLATFORMS.find((sp) => sp.id === p)?.label).filter(Boolean).join(', ') || 'No platform'}`}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn-ghost btn-sm" onClick={() => handlePublish('draft')} disabled={saving}>
              Save Draft
            </button>
            <button type="button" className="btn-primary btn-sm" onClick={() => handlePublish('scheduled')} disabled={saving || !scheduleDate}>
              <Calendar className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Schedule'}
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 12, alignItems: 'start' }}>
        {/* Left: Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Platform selector */}
          <section className="panel" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)' }}>Platforms:</span>
              {STORY_PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`chip${platforms.includes(p.id) ? ' active' : ''}`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* Slide timeline strip */}
          <section className="panel" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', position: 'relative', zIndex: 1 }}>
              {slides.map((slide, i) => (
                <SlideThumbnail
                  key={slide.id}
                  slide={slide}
                  index={i}
                  isActive={i === activeSlideIndex}
                  onClick={() => setActiveSlideIndex(i)}
                  onDelete={() => deleteSlide(i)}
                />
              ))}
              <button
                type="button"
                onClick={addSlide}
                style={{
                  width: 64, height: 112, borderRadius: 10, flexShrink: 0,
                  border: '2px dashed var(--border)', background: 'transparent',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                  color: 'var(--muted)', fontSize: '0.60rem',
                  transition: 'border-color 0.15s',
                }}
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </section>

          {/* Active slide editor */}
          {activeSlide && (
            <section className="panel">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                <Layers className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                Slide {activeSlideIndex + 1}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
                {/* Media upload */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
                    Media
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Upload className="h-3.5 w-3.5" /> {activeSlide.mediaRef ? 'Replace Media' : 'Upload Image or Video'}
                  </button>
                </div>

                {/* Duration */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--muted)' }}>
                    <Clock className="h-3 w-3" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    Duration:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={activeSlide.duration || 5}
                    onChange={(e) => updateActiveSlide({ duration: Number(e.target.value) || 5 })}
                    style={{
                      width: 60, padding: '4px 8px', borderRadius: 6, textAlign: 'center',
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                    }}
                  />
                  <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>seconds</span>
                </div>

                {/* Overlays */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--muted)' }}>
                      Overlays ({activeSlide.overlays.length})
                    </label>
                  </div>

                  {/* Add overlay buttons */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: activeSlide.overlays.length > 0 ? 10 : 0 }}>
                    {OVERLAY_TYPES.map((ot) => {
                      const Icon = ot.icon;
                      return (
                        <button
                          key={ot.type}
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => addOverlay(ot.type)}
                        >
                          <Icon className="h-3 w-3" /> {ot.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Overlay list */}
                  {activeSlide.overlays.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {activeSlide.overlays.map((overlay, oi) => (
                        <OverlayItem
                          key={oi}
                          overlay={overlay}
                          index={oi}
                          onUpdate={(data) => updateOverlay(oi, data)}
                          onDelete={() => deleteOverlay(oi)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Schedule */}
          <section className="panel" style={{ padding: '14px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
              <Calendar className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              Schedule
            </h3>
            <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                }}
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{
                  width: 120, padding: '8px 12px', borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                }}
              />
            </div>
          </section>
        </div>

        {/* Right: Phone Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'sticky', top: 80 }}>
          <PhonePreview slide={activeSlide} />

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
              disabled={activeSlideIndex === 0}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {activeSlideIndex + 1} / {slides.length}
            </span>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1))}
              disabled={activeSlideIndex === slides.length - 1}
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
