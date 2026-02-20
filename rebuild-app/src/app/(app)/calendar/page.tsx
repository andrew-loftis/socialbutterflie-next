import { PageHeader } from '@/components/ui/page-header';

const days = Array.from({ length: 35 }, (_, index) => index + 1);

export default function CalendarPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Calendar" subtitle="Plan, filter, and inspect publication flow by date and status." />
      <section className="panel">
        <div className="panel-toolbar">
          <div className="pill-row">
            <span className="chip">Instagram</span>
            <span className="chip">Facebook</span>
            <span className="chip">YouTube</span>
            <span className="chip">TikTok</span>
          </div>
          <div className="pill-row">
            <span className="chip">Draft</span>
            <span className="chip">Review</span>
            <span className="chip">Approved</span>
            <span className="chip">Posted</span>
          </div>
        </div>
        <div className="calendar-grid">
          {days.map((day) => (
            <button key={day} className="calendar-day" type="button">
              <span>{((day - 1) % 31) + 1}</span>
              {day % 7 === 0 ? <small>2 posts</small> : null}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

