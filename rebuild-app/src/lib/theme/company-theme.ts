import type { CompanyProfile, CompanyThemeTokens } from '@/types/interfaces';

function normalizeHex(input: string, fallback: string) {
  const value = (input || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return fallback;
}

function hexToRgb(input: string) {
  const value = normalizeHex(input, '#5ba0ff').slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function brighten(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const next = (channel: number) => Math.min(255, Math.round(channel + (255 - channel) * amount));
  return `#${[next(r), next(g), next(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export function buildCompanyTheme(company: CompanyProfile | null): CompanyThemeTokens {
  const primary = normalizeHex(company?.branding.primary || '#5ba0ff', '#5ba0ff');
  const secondary = normalizeHex(company?.branding.secondary || brighten(primary, 0.18), brighten(primary, 0.18));
  const accent = normalizeHex(company?.branding.accent || brighten(primary, 0.32), brighten(primary, 0.32));

  return {
    primary,
    secondary,
    accent,
    glow: rgba(primary, 0.28),
    glowSoft: rgba(accent, 0.16),
    border: rgba(accent, 0.42),
    panelTint: rgba(primary, 0.12),
  };
}

export function applyCompanyTheme(company: CompanyProfile | null) {
  if (typeof document === 'undefined') return;
  const tokens = buildCompanyTheme(company);
  const root = document.documentElement;
  root.style.setProperty('--company-primary', tokens.primary);
  root.style.setProperty('--company-secondary', tokens.secondary);
  root.style.setProperty('--company-accent', tokens.accent);
  root.style.setProperty('--company-glow', tokens.glow);
  root.style.setProperty('--company-glow-soft', tokens.glowSoft);
  root.style.setProperty('--company-border', tokens.border);
  root.style.setProperty('--company-panel-tint', tokens.panelTint);
}

