import { ROLE_KEYWORDS, STACK_KEYWORDS } from './config/keywords.js';
import { TARGET_LOCATIONS } from './config/locations.js';
import type { JobItem } from './providers/types.js';

const REQUIRE_STACK = String(process.env.REQUIRE_STACK || 'false') === 'true';
const REMOTE_MUST_BE_CANADA = String(process.env.REMOTE_MUST_BE_CANADA || 'true') === 'true';
const DEBUG_FILTER = String(process.env.DEBUG_FILTER || 'false') === 'true';

function includesAny(text: string, keywords: string[]) {
  const hay = (text || '').toLowerCase();
  return keywords.some(k => hay.includes(k.toLowerCase()));
}

export function filterJobs(jobs: JobItem[]) {
  let keep = 0, dropRole = 0, dropLoc = 0, dropStack = 0;

  const out = jobs.filter(j => {
    const title = `${j.title || ''}`;
    const locText = `${j.location || ''}`;
    const tagsText = (j.tags || []).join(' ');
    const hayForStack = `${title} ${tagsText}`;

    const roleOk = includesAny(title, ROLE_KEYWORDS);

    // Lokasyon: başlık + lokasyon + tag’lerde geçen ipuçlarını birlikte değerlendir
    const hayForLoc = `${title} ${locText} ${tagsText}`;
    const locOk = includesAny(hayForLoc, TARGET_LOCATIONS);

    // Remote kabul: "remote" geçiyorsa ve (Canada/CA da varsa) ya da REMOTE_MUST_BE_CANADA=false ise
    const hasRemote = /\bremote\b/i.test(hayForLoc);
    const mentionsCanada = /\bcanada\b|\bca\b/i.test(hayForLoc);
    const remoteOk = hasRemote && (!REMOTE_MUST_BE_CANADA || mentionsCanada);

    const stackOk = includesAny(hayForStack, STACK_KEYWORDS);

    const pass = roleOk && (locOk || remoteOk) && (!REQUIRE_STACK || stackOk);

    if (pass) keep++;
    else {
      if (!roleOk) dropRole++;
      else if (!(locOk || remoteOk)) dropLoc++;
      else if (REQUIRE_STACK && !stackOk) dropStack++;
    }

    return pass;
  });

  if (DEBUG_FILTER) {
    console.log(`[filter] kept=${keep} dropRole=${dropRole} dropLoc=${dropLoc} dropStack=${dropStack}`);
  }
  return out;
}
