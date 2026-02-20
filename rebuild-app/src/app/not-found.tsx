import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-md text-center">
        <h1 className="text-2xl">Not Found</h1>
        <p className="text-sm text-[var(--muted)]">The requested entity or page does not exist.</p>
        <Link href="/dashboard" className="btn-primary mx-auto mt-2">Go to Dashboard</Link>
      </div>
    </div>
  );
}

