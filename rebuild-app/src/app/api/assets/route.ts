import { ok } from '@/lib/server/http';
import { demoCompanies } from '@/lib/mock-data';

export async function GET() {
  const assets = demoCompanies.flatMap((company) =>
    company.assets.map((asset) => ({
      ...asset,
      companyId: company.id,
      companyName: company.name,
    }))
  );
  return ok(assets);
}

