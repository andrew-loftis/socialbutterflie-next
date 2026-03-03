"use client";

import { useEffect } from 'react';

function toast(message: string) {
  if (typeof document === 'undefined') return;
  const id = 'sb-ui-unblock-toast';
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = id;
  el.textContent = message;
  el.style.position = 'fixed';
  el.style.right = '12px';
  el.style.bottom = '12px';
  el.style.zIndex = '2147483647';
  el.style.padding = '10px 12px';
  el.style.borderRadius = '12px';
  el.style.border = '1px solid rgba(152, 176, 218, 0.28)';
  el.style.background = 'rgba(8, 11, 20, 0.92)';
  el.style.color = '#f2f6ff';
  el.style.fontSize = '12px';
  el.style.maxWidth = '320px';
  el.style.boxShadow = '0 18px 50px rgba(1,6,16,0.56)';
  el.style.pointerEvents = 'none';
  document.body.appendChild(el);

  window.setTimeout(() => el.remove(), 2600);
}

function safeParseZIndex(value: string) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

function findBlockingFixedOverlays() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const candidates: Array<{ el: HTMLElement; z: number; opacity: number }> = [];
  const all = Array.from(document.body.querySelectorAll<HTMLElement>('*'));

  for (const el of all) {
    // Ignore our own toast.
    if (el.id === 'sb-ui-unblock-toast') continue;
    if ((el as any).dataset?.sbPointerEventsDisabled === '1') continue;

    const cs = window.getComputedStyle(el);
    if (cs.position !== 'fixed') continue;
    if (cs.pointerEvents === 'none') continue;
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;

    const rect = el.getBoundingClientRect();
    const coversViewport =
      rect.width >= vw * 0.9 &&
      rect.height >= vh * 0.9 &&
      rect.left <= vw * 0.05 &&
      rect.top <= vh * 0.05;

    if (!coversViewport) continue;

    candidates.push({
      el,
      z: safeParseZIndex(cs.zIndex),
      opacity: Number.parseFloat(cs.opacity || '1') || 1,
    });
  }

  candidates.sort((a, b) => (b.z - a.z) || (b.opacity - a.opacity));
  return candidates;
}

function disablePointerEventsOnOverlays(max = 5) {
  const candidates = findBlockingFixedOverlays();
  let disabled = 0;
  for (const item of candidates.slice(0, max)) {
    item.el.style.pointerEvents = 'none';
    (item.el as any).dataset.sbPointerEventsDisabled = '1';
    disabled += 1;
  }
  return disabled;
}

export function InteractionUnblocker() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+U: emergency "unblock clicks" if a rogue overlay/backdrop is intercepting everything.
      if (!e.ctrlKey || !e.shiftKey || e.key.toLowerCase() !== 'u') return;
      const disabled = disablePointerEventsOnOverlays(8);
      toast(disabled ? `Unblocked UI (disabled ${disabled} overlay layer${disabled === 1 ? '' : 's'}).` : 'No blocking overlay detected.');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return null;
}

