import { PageHeader } from '@/components/ui/page-header';

export default function SettingsPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Settings" subtitle="Workspace context, members, appearance, and AI preferences." />
      <section className="panel">
        <h3>Workspace</h3>
        <div className="form-grid two-col">
          <label>
            <span>Workspace Name</span>
            <input defaultValue="SocialButterflie Demo" />
          </label>
          <label>
            <span>Role</span>
            <select defaultValue="admin">
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
        </div>
      </section>
      <section className="panel">
        <h3>AI Preferences</h3>
        <div className="form-grid">
          <label>
            <span>Brand Voice Defaults</span>
            <textarea defaultValue="Confident, concise, cinematic. Avoid corporate buzzwords." />
          </label>
        </div>
      </section>
    </div>
  );
}

