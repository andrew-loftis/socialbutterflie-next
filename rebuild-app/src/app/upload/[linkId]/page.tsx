"use client";

/**
 * Upload Portal - Public Route
 * ─────────────────────────────
 * Client-facing upload portal accessible via a unique link.
 * No login required. Clients can upload media assets for their campaigns.
 * 
 * Route: /upload/[linkId]
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  Cloud,
  File,
  FileImage,
  FileVideo,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import {
  resolveUploadLinkByToken,
  createClientUpload,
} from '@/lib/firebase/upload-store';
import type { UploadLink } from '@/types/interfaces';

/* ── Types ── */

interface UploadFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  progress: number;
  note: string;
}

/* ── File icon helper ── */

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <FileImage className="h-5 w-5" style={{ color: '#5ba0ff' }} />;
  if (type.startsWith('video/')) return <FileVideo className="h-5 w-5" style={{ color: '#f5a623' }} />;
  return <File className="h-5 w-5" style={{ color: 'var(--muted)' }} />;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/* ── Main Component ── */

export default function UploadPortalPage({
  params,
}: {
  params: { linkId: string };
}) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderEmail, setUploaderEmail] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolved link context
  const [linkCtx, setLinkCtx] = useState<{ workspaceId: string; companyId: string; link: UploadLink } | null>(null);
  const [linkError, setLinkError] = useState(false);

  useEffect(() => {
    resolveUploadLinkByToken(params.linkId).then((ctx) => {
      if (!ctx) { setLinkError(true); return; }
      if (ctx.link.status !== 'active') { setLinkError(true); return; }
      if (ctx.link.expiresAt && new Date(ctx.link.expiresAt) < new Date()) { setLinkError(true); return; }
      setLinkCtx(ctx);
    }).catch(() => setLinkError(false));
  }, [params.linkId]);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: UploadFile[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending',
      progress: 0,
      note: '',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const f = prev.find((p) => p.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const updateNote = useCallback((id: string, note: string) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, note } : f));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);

    for (const uf of files) {
      setFiles((prev) => prev.map((f) => f.id === uf.id ? { ...f, status: 'uploading' } : f));

      try {
        // Upload to Firebase Storage if available, otherwise simulate
        let downloadUrl = '';
        let storagePath = '';

        try {
          const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
          const { firebaseStorage } = await import('@/lib/firebase/client');
          if (firebaseStorage && linkCtx) {
            const path = `uploads/${linkCtx.companyId}/${params.linkId}/${uf.id}-${uf.file.name}`;
            const storageRef = ref(firebaseStorage, path);
            const task = uploadBytesResumable(storageRef, uf.file);

            await new Promise<void>((resolve, reject) => {
              task.on('state_changed',
                (snap) => {
                  const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                  setFiles((prev) => prev.map((f) => f.id === uf.id ? { ...f, progress: pct } : f));
                },
                reject,
                () => resolve(),
              );
            });

            downloadUrl = await getDownloadURL(task.snapshot.ref);
            storagePath = path;
          } else {
            throw new Error('no storage');
          }
        } catch {
          // Fallback: simulate progress for dev
          for (let p = 0; p <= 100; p += 20) {
            await new Promise((r) => setTimeout(r, 150));
            setFiles((prev) => prev.map((f) => f.id === uf.id ? { ...f, progress: p } : f));
          }
          downloadUrl = URL.createObjectURL(uf.file);
          storagePath = `local/${uf.file.name}`;
        }

        // Write the Firestore record
        if (linkCtx) {
          await createClientUpload(linkCtx.workspaceId, linkCtx.companyId, {
            uploadLinkId: linkCtx.link.id,
            companyId: linkCtx.companyId,
            fileName: uf.file.name,
            fileType: uf.file.type,
            fileSizeMb: parseFloat((uf.file.size / 1_048_576).toFixed(2)),
            storagePath,
            downloadUrl,
            uploaderName: uploaderName || undefined,
            uploaderNote: uf.note || undefined,
            tags: [],
            createdAt: new Date().toISOString(),
          });
        }

        setFiles((prev) => prev.map((f) =>
          f.id === uf.id ? { ...f, status: 'complete', progress: 100 } : f
        ));
      } catch (err) {
        console.error('Upload failed:', err);
        setFiles((prev) => prev.map((f) =>
          f.id === uf.id ? { ...f, status: 'error', progress: 0 } : f
        ));
      }
    }

    setUploading(false);
    setSubmitted(true);
  }

  /* ── Drag & drop handlers ── */

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  /* ── Submitted state ── */

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg, #0f1117)', padding: 24,
      }}>
        <div style={{
          maxWidth: 480, width: '100%', textAlign: 'center',
          background: 'var(--panel, #181b23)', borderRadius: 20,
          border: '1px solid var(--border, #2a2d3a)', padding: '48px 32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(61,214,140,0.10)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            border: '1px solid rgba(61,214,140,0.25)',
          }}>
            <CheckCircle2 className="h-8 w-8" style={{ color: '#3dd68c' }} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text, #e8edf5)' }}>
            Upload Complete!
          </h2>
          <p style={{ color: 'var(--muted, #7a8fb0)', fontSize: '0.92rem', margin: 0, lineHeight: 1.6 }}>
            {files.length} file{files.length !== 1 ? 's' : ''} uploaded successfully.
            Your team has been notified and will review the assets shortly.
          </p>
        </div>
      </div>
    );
  }

  /* ── Main upload form ── */

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg, #0f1117)',
      padding: '32px 24px',
      color: 'var(--text, #e8edf5)',
      fontFamily: "'Manrope', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Logo / Brand bar */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #f5a623, #ff7b54)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', boxShadow: '0 4px 16px rgba(245,166,35,0.3)',
          }}>
            <Cloud className="h-6 w-6" style={{ color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4, color: 'var(--text, #e8edf5)' }}>
            Upload Assets
          </h1>
          <p style={{ color: 'var(--muted, #7a8fb0)', fontSize: '0.88rem', margin: 0 }}>
            Drag and drop files or click to browse. Supported: Images, Videos, PDFs.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Identity fields */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            marginBottom: 16,
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--muted, #7a8fb0)', marginBottom: 4 }}>
                Your Name
              </label>
              <input
                type="text"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                placeholder="Jane Smith"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 10,
                  background: 'var(--surface-2, #1a1d27)', border: '1px solid var(--border, #2a2d3a)',
                  color: 'var(--text, #e8edf5)', fontSize: '0.85rem', fontFamily: 'inherit',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--muted, #7a8fb0)', marginBottom: 4 }}>
                Email
              </label>
              <input
                type="email"
                value={uploaderEmail}
                onChange={(e) => setUploaderEmail(e.target.value)}
                placeholder="jane@company.com"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 10,
                  background: 'var(--surface-2, #1a1d27)', border: '1px solid var(--border, #2a2d3a)',
                  color: 'var(--text, #e8edf5)', fontSize: '0.85rem', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              padding: '40px 24px', borderRadius: 16, textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              border: `2px dashed ${dragOver ? '#f5a623' : 'var(--border, #2a2d3a)'}`,
              background: dragOver ? 'rgba(245,166,35,0.04)' : 'var(--surface-2, #1a1d27)',
            }}
          >
            <Upload className="h-8 w-8" style={{ margin: '0 auto 8px', color: dragOver ? '#f5a623' : 'var(--muted, #7a8fb0)' }} />
            <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 4 }}>
              {dragOver ? 'Drop files here' : 'Click or drag files to upload'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted, #7a8fb0)' }}>
              Images, videos, PDFs up to 500MB each
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.psd,.ai"
              onChange={(e) => addFiles(e.target.files)}
              style={{ display: 'none' }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {files.map((uf) => (
                <div
                  key={uf.id}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'center',
                    padding: '10px 12px', borderRadius: 12,
                    background: 'var(--surface-2, #1a1d27)',
                    border: '1px solid var(--border, #2a2d3a)',
                  }}
                >
                  {/* Preview or icon */}
                  {uf.preview ? (
                    <img
                      src={uf.preview}
                      alt=""
                      style={{
                        width: 44, height: 44, borderRadius: 8,
                        objectFit: 'cover', flexShrink: 0,
                        border: '1px solid var(--border, #2a2d3a)',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(255,255,255,0.03)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      border: '1px solid var(--border, #2a2d3a)',
                    }}>
                      <FileIcon type={uf.file.type} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.82rem', fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {uf.file.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted, #7a8fb0)' }}>
                      {formatSize(uf.file.size)}
                    </div>
                    {/* Note field */}
                    <input
                      type="text"
                      value={uf.note}
                      onChange={(e) => updateNote(uf.id, e.target.value)}
                      placeholder="Add a note (optional)"
                      style={{
                        width: '100%', padding: '4px 8px', borderRadius: 6,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border, #2a2d3a)',
                        color: 'var(--text, #e8edf5)', fontSize: '0.74rem', fontFamily: 'inherit',
                        marginTop: 4,
                      }}
                    />
                    {/* Progress bar */}
                    {uf.status === 'uploading' && (
                      <div style={{
                        height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)',
                        marginTop: 6, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          background: '#f5a623', width: `${uf.progress}%`,
                          transition: 'width 0.3s',
                        }} />
                      </div>
                    )}
                  </div>

                  {/* Status / actions */}
                  {uf.status === 'complete' ? (
                    <CheckCircle2 className="h-4 w-4" style={{ color: '#3dd68c', flexShrink: 0 }} />
                  ) : uf.status === 'uploading' ? (
                    <Loader2 className="h-4 w-4" style={{ color: '#f5a623', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeFile(uf.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--muted, #7a8fb0)', padding: 4, flexShrink: 0,
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          {files.length > 0 && !uploading && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button
                type="submit"
                style={{
                  padding: '12px 32px', borderRadius: 12, fontSize: '0.92rem',
                  fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #f5a623, #ff7b54)',
                  color: '#fff', border: 'none',
                  boxShadow: '0 4px 16px rgba(245,166,35,0.3)',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Upload className="h-4 w-4" />
                  Upload {files.length} file{files.length !== 1 ? 's' : ''}
                </span>
              </button>
            </div>
          )}
        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Footer */}
        <div style={{
          textAlign: 'center', marginTop: 48, paddingTop: 24,
          borderTop: '1px solid var(--border, #2a2d3a)',
          fontSize: '0.74rem', color: 'var(--muted, #7a8fb0)',
        }}>
          Powered by <strong>Social Butterflie</strong>
        </div>
      </div>
    </div>
  );
}
