import { PageHeader } from '@/components/ui/page-header';

const rows = [
  { id: 'post-1', when: 'Feb 22 10:00', platform: 'Instagram', campaign: 'Summit Launch', status: 'review' },
  { id: 'post-2', when: 'Feb 23 16:30', platform: 'TikTok', campaign: 'Creator Spotlight', status: 'review' },
];

export default function ReviewPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Review Queue" subtitle="Approve or reject content before it enters scheduling pipelines." />
      <section className="panel">
        <div className="button-row">
          <button className="btn-primary">Approve Selected</button>
          <button className="btn-ghost">Reject Selected</button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th />
              <th>When</th>
              <th>Platform</th>
              <th>Campaign</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><input type="checkbox" /></td>
                <td>{row.when}</td>
                <td>{row.platform}</td>
                <td>{row.campaign}</td>
                <td><span className="badge">{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

