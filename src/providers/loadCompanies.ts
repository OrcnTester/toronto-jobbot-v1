import fs from 'node:fs/promises';
import path from 'node:path';

export type CompanyRow = {
  company: string;
  provider: 'greenhouse' | 'lever';
  slug?: string;
  notes?: string;
};

function normalizeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export async function loadCompanies(): Promise<CompanyRow[]> {
  const p = path.resolve('data/companies.csv');
  let raw = '';
  try {
    raw = await fs.readFile(p, 'utf-8');
  } catch {
    return [];
  }
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const out: CompanyRow[] = [];
  const startIdx = lines[0].toLowerCase().includes('company,') ? 1 : 0;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const [company='', provider='', slug='', notes=''] = line.split(',').map(s => s.trim());
    if (!company || !provider) continue;
    out.push({
      company,
      provider: provider as any,
      slug: slug || normalizeSlug(company),
      notes,
    });
  }
  return out;
}