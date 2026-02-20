"use client";

import { X } from 'lucide-react';
import { useAppState } from '@/components/shell/app-state';

export function InspectorPanel() {
  const { inspector, setInspector } = useAppState();

  return (
    <aside className="inspector">
      <div className="inspector-header">
        <div>
          <p className="inspector-kicker">Inspector</p>
          <h3>{inspector?.title || 'Select an object'}</h3>
        </div>
        <button type="button" className="icon-btn" onClick={() => setInspector(null)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="inspector-meta">
        <span className="badge">{inspector?.status || 'Ready'}</span>
        <span className="text-xs text-[var(--muted)]">{inspector?.kind || 'No selection'}</span>
      </div>

      <section>
        <h4>Summary</h4>
        <p>{inspector?.summary || 'Click a card, row, or asset to open entity context.'}</p>
      </section>

      <section>
        <h4>Version History</h4>
        <ul>
          {(inspector?.versionHistory || ['No versions yet']).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4>Approvals</h4>
        <ul>
          {(inspector?.approvals || ['No approvals']).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4>Audit Log</h4>
        <ul>
          {(inspector?.auditLog || ['No audit entries']).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

