import fs from 'node:fs/promises';

export type AppRow = {
  date: string;
  company: string;
  title: string;
  url: string;
  status: 'saved'|'applied';
  followupDue: string;
  applyEmail?: string;
  notes?: string;
};

export async function readApplicationsCsv(path = 'data/applications.csv'): Promise<AppRow[]> {
  let raw: string;
  try {
    raw = await fs.readFile(path, 'utf-8');
  } catch {
    return [];
  }
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];
  const header = lines[0].split(',');
  const idx = (name: string) => header.indexOf(name);
  const out: AppRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    out.push({
      date: cols[idx('date')] || '',
      company: cols[idx('company')] || '',
      title: cols[idx('title')] || '',
      url: cols[idx('url')] || '',
      status: (cols[idx('status')] || 'saved') as any,
      followupDue: cols[idx('followupDue')] || '',
      applyEmail: cols[idx('applyEmail')] || '',
      notes: cols[idx('notes')] || '',
    });
  }
  return out;
}