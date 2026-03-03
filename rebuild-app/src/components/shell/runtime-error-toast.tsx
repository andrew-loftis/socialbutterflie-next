"use client";

import { useEffect, useRef, useState } from 'react';

type ErrorState = {
  message: string;
  source?: string;
};

export function RuntimeErrorToast() {
  const [error, setError] = useState<ErrorState | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const show = (message: string, source?: string) => {
      setError({ message, source });
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setError(null), 8000);
    };

    const onError = (event: ErrorEvent) => {
      show(event.message || 'Runtime error', event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'Unhandled rejection';
      show(message);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!error) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 2147483647,
        padding: '10px 12px',
        borderRadius: 12,
        border: '1px solid rgba(255, 92, 92, 0.45)',
        background: 'rgba(20, 8, 10, 0.92)',
        color: '#f2f6ff',
        fontSize: 12,
        maxWidth: 380,
        boxShadow: '0 18px 50px rgba(1,6,16,0.56)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Runtime error</div>
      <div style={{ opacity: 0.95, lineHeight: 1.3 }}>{error.message}</div>
      {error.source ? <div style={{ opacity: 0.7, marginTop: 6 }}>{error.source}</div> : null}
    </div>
  );
}

