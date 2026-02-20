import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';

const jobs = [
  { id: 'job-44', model: 'kling-3', mode: 'video', status: 'running' },
  { id: 'job-41', model: 'nano-banana-pro', mode: 'image', status: 'succeeded' },
];

export default function StudioLibraryPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Studio Library" subtitle="Generated outputs with provenance, status, and routing controls." />
      <section className="panel">
        <table className="table">
          <thead>
            <tr><th>Job</th><th>Model</th><th>Mode</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.id}</td>
                <td>{job.model}</td>
                <td>{job.mode}</td>
                <td><span className="badge">{job.status}</span></td>
                <td><Link className="inline-link" href={`/studio/jobs/${job.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

