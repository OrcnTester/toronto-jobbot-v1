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

export async function fetchLeverJobs(rows: CompanyRow[]): Promise<JobItem[]> {
  const all: JobItem[] = [];
  for (const row of rows) {
    const slug = row.slug || row.company.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
    try {
      const jobs: any[] = await fetchJson(url);
      for (const j of jobs) {
        const title = String(j?.text ?? '');
        const location = String(j?.categories?.location ?? '');
        const hostedUrl = String(j?.hostedUrl ?? j?.applyUrl ?? '');
        if (!title || !hostedUrl) continue;
        const tags: string[] = [];
        if (Array.isArray(j?.tags)) {
          for (const t of j.tags) if (t) tags.push(String(t));
        }
        all.push({
          company: row.company,
          title,
          location,
          url: hostedUrl,
          tags,
        });
      }
    } catch (e) {
      console.error('[lever]', row.company, 'failed:', (e as Error).message);
    }
  }
  return all;
}