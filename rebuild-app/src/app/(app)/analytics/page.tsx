import { PageHeader } from '@/components/ui/page-header';

export default function AnalyticsPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Analytics" subtitle="Operational and ROI analytics with compact report-ready views." />
      <section className="grid-two">
        <article className="panel">
          <h3>Delivery Health</h3>
          <div className="chart-strip">
            <div style={{ height: '45%' }} />
            <div style={{ height: '66%' }} />
            <div style={{ height: '33%' }} />
            <div style={{ height: '81%' }} />
            <div style={{ height: '72%' }} />
            <div style={{ height: '56%' }} />
            <div style={{ height: '90%' }} />
          </div>
        </article>
        <article className="panel">
          <h3>Campaign Attribution</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Clicks</th>
                <th>Conv.</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Summit Launch</td><td>3,412</td><td>5.4%</td></tr>
              <tr><td>Creator Spotlight</td><td>1,893</td><td>4.1%</td></tr>
              <tr><td>Evergreen Tips</td><td>1,104</td><td>3.8%</td></tr>
            </tbody>
          </table>
        </article>
      </section>
      <section className="panel">
        <h3>Exports</h3>
        <div className="button-row">
          <button className="btn-ghost">Export CSV</button>
          <button className="btn-ghost">Export PDF</button>
          <button className="btn-primary">Schedule Report</button>
        </div>
      </section>
    </div>
  );
}

