import type { CompanyRow } from './loadCompanies.js';

type Detected = { provider: 'greenhouse'|'lever'; slug: string } | null;

async function fetchOk(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function testGreenhouse(slug: string): Promise<boolean> {
  // API test first
  if (await fetchOk(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`)) return true;
  // HTML board as fallback signal
  if (await fetchOk(`https://boards.greenhouse.io/${slug}`)) return true;
  return false;
}

async function testLever(slug: string): Promise<boolean> {
  // API test
  if (await fetchOk(`https://api.lever.co/v0/postings/${slug}?mode=json`)) return true;
  // Hosted page
  if (await fetchOk(`https://jobs.lever.co/${slug}`)) return true;
  return false;
}

function normalizeCandidates(name: string, slug?: string): string[] {
  const base = slug && slug.trim().length ? slug : name;
  const raw = base.toLowerCase().trim();
  const alnum = raw.replace(/[^a-z0-9]+/g, '');
  const hyph = raw.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$|/g, '');
  const uniq = new Set([raw, alnum, hyph]);
  return Array.from(uniq).filter(s => s.length > 0);
}

export async function autodetectCompanies(rows: CompanyRow[]) {
  const detected: Record<string, Detected> = {};
  for (const row of rows) {
    const candidates = normalizeCandidates(row.company, row.slug);
    let found: Detected = null;

    // 1) If CSV already says provider, try it first
    if (row.provider === 'greenhouse') {
      for (const c of candidates) {
        if (await testGreenhouse(c)) { found = { provider: 'greenhouse', slug: c }; break; }
      }
    } else if (row.provider === 'lever') {
      for (const c of candidates) {
        if (await testLever(c)) { found = { provider: 'lever', slug: c }; break; }
      }
    }

    // 2) Otherwise try both
    if (!found) {
      for (const c of candidates) {
        if (await testGreenhouse(c)) { found = { provider: 'greenhouse', slug: c }; break; }
        if (await testLever(c)) { found = { provider: 'lever', slug: c }; break; }
      }
    }

    detected[row.company] = found;
  }
  return detected;
}