import 'dotenv/config';
import { Client } from '@notionhq/client';

export type NotionRecord = {
  company: string;
  title: string;      // role
  url?: string;
  status?: 'saved' | 'applied';
  followupDue?: string; // YYYY-MM-DD
  notes?: string;
};

const token = process.env.NOTION_TOKEN;
const dbId  = process.env.NOTION_DB_ID;

if (process.env.NOTION_ENABLED === 'true') {
  if (!token)  console.warn('[notion] WARN: NOTION_TOKEN missing');
  if (!dbId)   console.warn('[notion] WARN: NOTION_DB_ID missing');
}

const notion = new Client({ auth: token });

/** Introspect DB once and cache property keys by type (title/url/status|select/date/rich_text[*]). */
let cachedMap: null | {
  titleKey: string;
  urlKey?: string;
  statusKey?: string; statusType?: 'status'|'select';
  dateKey?: string;
  richKeys: string[]; // we’ll use [0] as Role, [1] as Notes if exist
} = null;

async function getMap() {
  if (cachedMap) return cachedMap;
  if (!dbId) throw new Error('NOTION_DB_ID missing');

  const db: any = await notion.databases.retrieve({ database_id: dbId });
  const props: Record<string, any> = db.properties;

  const titleKey  = Object.keys(props).find(k => props[k].type === 'title');
  if (!titleKey) throw new Error('[notion] No title property in DB');

  const urlKey    = Object.keys(props).find(k => props[k].type === 'url');
  const statusKey = Object.keys(props).find(k => ['status','select'].includes(props[k].type));
  const dateKey   = Object.keys(props).find(k => props[k].type === 'date');

  const richKeys  = Object.keys(props).filter(k => props[k].type === 'rich_text');

  cachedMap = {
    titleKey,
    urlKey,
    statusKey,
    statusType: statusKey ? props[statusKey].type : undefined, // 'status' or 'select'
    dateKey,
    richKeys,
  };
  return cachedMap;
}

async function findByUrl(url: string) {
  const map = await getMap();
  if (!map.urlKey) return null;
  const q = await notion.databases.query({
    database_id: dbId!,
    filter: { property: map.urlKey, url: { equals: url } }
  });
  return q.results[0] ?? null;
}

/** Append one row to Notion DB (dynamic to your schema). */
export async function appendToNotion(rec: NotionRecord) {
  // kapalıysa veya env eksikse sessizce geç
  if (process.env.NOTION_ENABLED !== 'true') {
    return { skipped: true as const, reason: 'NOTION_ENABLED!=true' };
  }
  if (!token || !dbId) {
    return { skipped: true as const, reason: 'token/dbId missing' };
  }

  // 1) URL varsa: upsert koruması (kopyayı engelle)
  if (rec.url) {
    const existing = await findByUrl(rec.url);
    if (existing) {
      return { skipped: true as const, reason: 'duplicate-url', pageId: (existing as any).id };
    }
  }

  // 2) DB şemasını dinamik çöz
  const map = await getMap();

  // 3) property payload
  const props: any = {};
  props[map.titleKey] = { title: [{ text: { content: rec.company } }] };           // Company (title)
  if (map.richKeys[0] && rec.title)  props[map.richKeys[0]] = { rich_text: [{ text: { content: rec.title } }] }; // Role
  if (map.urlKey && rec.url)         props[map.urlKey]      = { url: rec.url };    // URL
  if (map.statusKey && rec.status)   props[map.statusKey]   = map.statusType === 'status'
                                    ? { status: { name: rec.status } }
                                    : { select: { name: rec.status } };            // Status
  if (map.dateKey && rec.followupDue)props[map.dateKey]     = { date: { start: rec.followupDue } };               // Followup
  if (map.richKeys[1] && rec.notes)  props[map.richKeys[1]] = { rich_text: [{ text: { content: rec.notes } }] };  // Notes

  // 4) create
  const res = await notion.pages.create({
    parent: { database_id: dbId! },
    properties: props,
  });

  return { ok: true as const, pageId: res.id };
}
