import fs from 'node:fs/promises';
import path from 'node:path';
import type { JobItem } from './types.js';

export async function fetchMockJobs(): Promise<JobItem[]> {
  const p = path.resolve('data/jobs.sample.json');
  const raw = await fs.readFile(p, 'utf-8');
  return JSON.parse(raw) as JobItem[];
}