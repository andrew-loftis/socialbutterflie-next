"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Command, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';

type SearchResult = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function CommandBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { appContext, setAppContext } = useAppState();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (!open && event.key === '/') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open]);

  useEffect(() => {
    if (!query.trim()) return;

    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = (await res.json()) as { data?: SearchResult[] };
      setResults(data.data || []);
    }, 160);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] pl-9 pr-14 text-sm outline-none"
            placeholder="Search entities, commands, routes..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (!event.target.value.trim()) setResults([]);
              setOpen(true);
            }}
          />
          <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--panel)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
            <Command className="h-3 w-3" />K
          </div>
        </div>

        <select
          className="h-10 min-w-[190px] rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-sm"
          value={appContext.activeCompanyId || ''}
          onChange={(event) => setAppContext({ ...appContext, activeCompanyId: event.target.value })}
        >
          <option value="company-aurora">Aurora Outdoors</option>
          <option value="company-nova">Nova Creative</option>
          <option value="company-ridge">Ridge Athletics</option>
        </select>

        <div className="flex items-center gap-2">
          <Link href="/build" className="btn-primary">New Post</Link>
          <Link href="/studio" className="btn-ghost">AI Studio</Link>
          <Link href="/companies" className="btn-ghost">Companies</Link>
        </div>
      </div>

      {open && results.length > 0 ? (
        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-1">
          {results.map((result) => (
            <button
              key={`${result.kind}-${result.id}`}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--panel)]"
              type="button"
              onClick={() => {
                router.push(result.href);
                setOpen(false);
              }}
            >
              <div className="font-medium">{result.title}</div>
              <div className="text-xs text-[var(--muted)]">{result.kind}{result.subtitle ? ` • ${result.subtitle}` : ''}</div>
            </button>
          ))}
        </div>
      ) : null}

      {open && !results.length && query.trim() ? (
        <div className="mt-2 rounded-xl border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted)]">
          {`No matching entity for "${query}".`}
        </div>
      ) : null}

      <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
        <span>Route:</span>
        <code className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] px-2 py-0.5">{pathname}</code>
        <span>Active company:</span>
        <strong>{appContext.activeCompanyId || 'none'}</strong>
      </div>
    </div>
  );
}

