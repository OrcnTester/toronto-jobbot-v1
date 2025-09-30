import 'dotenv/config';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN! });
const parentPageId = process.env.NOTION_PARENT_PAGE_ID!;

async function main() {
  if (!parentPageId) throw new Error('NOTION_PARENT_PAGE_ID missing');

  const db = await notion.databases.create({
    parent: { page_id: parentPageId },
    title: [{ type: 'text', text: { content: 'Applications' } }],
    properties: {
      Company: { title: {} },
      Role:    { rich_text: {} },
      URL:     { url: {} },
      Status:  { select: { options: [
        { name: 'saved', color: 'yellow' },
        { name: 'applied', color: 'green' },
      ]}},
      Followup:{ date: {} },
      Notes:   { rich_text: {} },
    },
  });

  console.log('DB CREATED ✅  id=', db.id);
  console.log('👉 Put this as NOTION_DB_ID in .env');
}
main().catch(e => { console.error('CREATE FAIL', e); process.exit(1); });
