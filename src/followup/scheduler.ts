import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { sendEmail } from './mailer.js';

const DAYS = Number(process.env.FOLLOWUP_DAYS || 7);
const TIMEZONE = process.env.TIMEZONE || 'America/Toronto';
const MAX_PER_RUN = Number(process.env.MAX_FOLLOWUPS_PER_RUN || 10);
const BUSINESS_HOURS_START = Number(process.env.BUSINESS_HOURS_START || 9);
const BUSINESS_HOURS_END = Number(process.env.BUSINESS_HOURS_END || 17);
const PER_DOMAIN_COOLDOWN_DAYS = Number(process.env.PER_DOMAIN_COOLDOWN_DAYS || 14);

const FOLLOWUPS_PATH = path.resolve('data/followups.json');
const SENT_LOG_PATH = path.resolve('data/sent-log.json');
const NOREPLY = /no-?reply@/i;

type FollowupRec = {
  date: string;
  company: string;
  title: string;
  url: string;
  status: 'saved'|'applied';
  followupDue: string;
  applyEmail?: string;
  notes?: string;
};

function getTorontoHourNow(): number {
  const hourStr = new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    hour12: false,
    timeZone: TIMEZONE,
  }).format(new Date());
  return Number(hourStr);
}

function domainOf(email: string) {
  return email.split('@')[1]?.toLowerCase() || '';
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr as T[] : [];
  } catch {
    return [];
  }
}

async function writeJsonArray<T>(filePath: string, data: T[]) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

type SentLogEntry = { dt: string; email: string; domain: string; url: string };

function wasDomainRecentlyEmailed(log: SentLogEntry[], domain: string, cooldownDays: number) {
  const now = new Date();
  return log.some(e => e.domain === domain && differenceInCalendarDays(now, parseISO(e.dt)) < cooldownDays);
}

function alreadySentThisPosting(log: SentLogEntry[], email: string, url: string) {
  return log.some(e => e.email.toLowerCase() === email.toLowerCase() && e.url === url);
}

async function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

async function main() {
  const torontoHour = getTorontoHourNow();
  if (torontoHour < BUSINESS_HOURS_START || torontoHour >= BUSINESS_HOURS_END) {
    console.log(`Outside business hours (${BUSINESS_HOURS_START}-${BUSINESS_HOURS_END} ${TIMEZONE}); skipping follow-ups.`);
    return;
  }

  let queue: FollowupRec[] = await readJsonArray<FollowupRec>(FOLLOWUPS_PATH);
  const sentLog: SentLogEntry[] = await readJsonArray<SentLogEntry>(SENT_LOG_PATH);

  if (queue.length === 0) {
    console.log('No followups.json yet or queue is empty.');
    return;
  }

  const remaining: FollowupRec[] = [];
  const now = new Date();
  let sentCount = 0;
  let brokeEarly = false;

  for (let i = 0; i < queue.length; i++) {
    const rec = queue[i];
    const email = (rec.applyEmail || '').trim();
    if (!email) { remaining.push(rec); continue; }
    if (NOREPLY.test(email)) { remaining.push(rec); continue; }

    const daysSince = differenceInCalendarDays(now, parseISO(rec.date));
    if (daysSince < DAYS) { remaining.push(rec); continue; }

    const dom = domainOf(email);
    if (dom && wasDomainRecentlyEmailed(sentLog, dom, PER_DOMAIN_COOLDOWN_DAYS)) {
      remaining.push(rec);
      continue;
    }

    if (alreadySentThisPosting(sentLog, email, rec.url)) {
      continue;
    }

    if (sentCount >= MAX_PER_RUN) {
      brokeEarly = true;
      remaining.push(rec);
      continue;
    }

    const jitter = Math.floor(Math.random() * 15000);
    await sleep(jitter);

    const body = `Hi ${rec.company} Hiring Team,

Just checking in on my application for "${rec.title}" (${rec.url}).
Happy to provide anything needed and excited about the opportunity.

Best regards,
${process.env.APPLICANT_NAME}
${process.env.LINKEDIN_URL}
${process.env.GITHUB_URL}

If this is not the right mailbox, please let me know and I won't follow up again.`;

    try {
      await sendEmail(email, `Follow-up: ${rec.title} @ ${rec.company}`, body);
      sentLog.push({ dt: new Date().toISOString(), email, domain: dom, url: rec.url });
      sentCount++;
      console.log('Follow-up sent to', email, 'for', rec.company);
    } catch (e) {
      console.error('Follow-up failed for', rec.company, e);
      remaining.push(rec);
    }
  }

  if (brokeEarly) {
    // leave the rest untouched
  }

  await writeJsonArray(FOLLOWUPS_PATH, remaining);
  await writeJsonArray(SENT_LOG_PATH, sentLog);

  console.log(`Done. Sent this run: ${sentCount}. Remaining in queue: ${remaining.length}`);
}

main();