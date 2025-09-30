// scripts/notion-ping.ts
import 'dotenv/config';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN! });
const DB_ID = process.env.NOTION_DB_ID!;

function todayISO() { return new Date().toISOString().slice(0,10); }

async function main() {
  if (!DB_ID) throw new Error('NOTION_DB_ID missing');

  const db: any = await notion.databases.retrieve({ database_id: DB_ID });
  const props: Record<string, any> = db.properties;

  // 1) title kolonunu ismine bakmadan bul (sende "Name")
  const titleKey = Object.keys(props).find(k => props[k].type === 'title');
  if (!titleKey) throw new Error('No title property in DB');

  // 2) Diğerlerini de tipine göre bul
  const urlKey     = Object.keys(props).find(k => props[k].type === 'url');               // "URL"
  const statusKey  = Object.keys(props).find(k => ['status','select'].includes(props[k].type)); // "Application Status"
  const statusType = statusKey ? props[statusKey].type : null;
  const dateKey    = Object.keys(props).find(k => props[k].type === 'date');              // "Followup"
  const roleKey    = Object.keys(props).find(k => props[k].type === 'rich_text');         // "Role" (ilk rich_text)
  const notesKey   = Object.keys(props)
                          .filter(k => props[k].type === 'rich_text' && k !== roleKey)[0]; // "Notes" (ikinci rich_text)

  const properties: any = {};
  properties[titleKey] = { title: [{ text: { content: 'Ping Co' } }] };
  if (roleKey)  properties[roleKey]  = { rich_text: [{ text: { content: 'Ping Role' } }] };
  if (urlKey)   properties[urlKey]   = { url: 'https://example.com' };
  if (statusKey) {
    const payload = { name: 'saved' }; // DB’de option yoksa Notion otomatik oluşturur
    properties[statusKey] = statusType === 'status' ? { status: payload } : { select: payload };
  }
  if (dateKey)  properties[dateKey]  = { date: { start: todayISO() } };
  if (notesKey) properties[notesKey] = { rich_text: [{ text: { content: 'hello from JobBot' } }] };

  const res = await notion.pages.create({ parent: { database_id: DB_ID }, properties });
  console.log('NOTION OK pageId=', res.id);
}

main().catch(e => { console.error('NOTION FAIL', e); process.exit(1); });
