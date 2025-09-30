import type { JobItem } from './types.js';
import type { CompanyRow } from './loadCompanies.js';

async function fetchJson(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchGreenhouseJobs(rows: CompanyRow[]): Promise<JobItem[]> {
  const all: JobItem[] = [];
  for (const row of rows) {
    const slug = row.slug || row.company.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
    try {
      const data: any = await fetchJson(url);
      const jobs: any[] = Array.isArray(data?.jobs) ? data.jobs : [];
      for (const j of jobs) {
        const title = String(j?.title ?? '');
        const location = String(j?.location?.name ?? '');
        const absoluteUrl = String(j?.absolute_url ?? '');
        if (!title || !absoluteUrl) continue;
        const tags: string[] = [];
        if (Array.isArray(j?.departments)) {
          for (const d of j.departments) if (d?.name) tags.push(String(d.name));
        }
        all.push({
          company: row.company,
          title,
          location,
          url: absoluteUrl,
          tags,
        });
      }
    } catch (e) {
      console.error('[greenhouse]', row.company, 'failed:', (e as Error).message);
    }
  }
  return all;
}