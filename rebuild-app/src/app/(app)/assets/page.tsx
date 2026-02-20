import { PageHeader } from '@/components/ui/page-header';

const assets = [
  { id: 'asset-1', type: 'logo', name: 'Primary logo', tag: 'Brand Core' },
  { id: 'asset-2', type: 'banner', name: 'Winter hero banner', tag: 'Campaign' },
  { id: 'asset-3', type: 'reference', name: 'Texture board set', tag: 'Visual Style' },
  { id: 'asset-4', type: 'mascot', name: 'Fox mascot v2', tag: 'Identity' },
];

export default function AssetsPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Assets" subtitle="Content-first asset grid with metadata and quick inspector actions." />
      <section className="asset-grid">
        {assets.map((asset) => (
          <article key={asset.id} className="panel">
            <div className="asset-thumb" />
            <h3>{asset.name}</h3>
            <p>{asset.type.toUpperCase()}</p>
            <span className="badge">{asset.tag}</span>
          </article>
        ))}
      </section>
    </div>
  );
}

