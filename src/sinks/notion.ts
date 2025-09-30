import { Client } from '@notionhq/client';
import type { AppRow } from '../utils/csv.js';

export async function upsertToNotion(rows: AppRow[]) {
  if (!rows.length) return { created: 0, updated: 0 };
  if (String(process.env.NOTION_ENABLED || 'false') !== 'true') return { created: 0, updated: 0 };

  const token = process.env.NOTION_TOKEN!;
  const databaseId = process.env.NOTION_DATABASE_ID!;
  const notion = new Client({ auth: token });

  const existing: Record<string, string> = {};

  let cursor: string | undefined = undefined;
  do {
    const res: any = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const p of res.results) {
      const props = p.properties || {};
      const urlProp = props.URL;
      let urlVal = '';
      if (urlProp?.type === 'url') urlVal = urlProp.url || '';
      else if (urlProp?.type === 'rich_text' && urlProp.rich_text?.[0]?.plain_text) urlVal = urlProp.rich_text[0].plain_text;
      if (urlVal) existing[urlVal] = p.id;
    }
    cursor = (res as any).has_more ? (res as any).next_cursor : undefined;
  } while (cursor);

  let created = 0, updated = 0;

  for (const r of rows) {
    const props: any = {
      Title: { title: [{ text: { content: r.title || '(no title)' } }] },
      Company: { rich_text: [{ text: { content: r.company || '' } }] },
      Status: { rich_text: [{ text: { content: r.status || '' } }] },
      FollowupDue: { date: r.followupDue ? { start: r.followupDue } : null },
      URL: { url: r.url || null },
      ApplyEmail: { email: r.applyEmail || null },
      Notes: { rich_text: [{ text: { content: r.notes || '' } }] },
      Date: { date: r.date ? { start: r.date } : null },
    };

    const pageId = existing[r.url];
    if (pageId) {
      await notion.pages.update({ page_id: pageId, properties: props });
      updated++;
    } else {
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties: props
      });
      created++;
    }
  }

  return { created, updated };
}