import 'dotenv/config';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN! });
const dbId = process.env.NOTION_DB_ID!;

async function main() {
  if (!dbId) throw new Error('NOTION_DB_ID missing');
  const db: any = await notion.databases.retrieve({ database_id: dbId });

  console.log('Database title:', db.title?.[0]?.plain_text || '(no title)');
  console.log('Properties:');
  for (const [name, prop] of Object.entries(db.properties)) {
    console.log(`- ${name} : ${ (prop as any).type }`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
