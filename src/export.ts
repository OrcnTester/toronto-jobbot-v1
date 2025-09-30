import 'dotenv/config';
import { readApplicationsCsv } from './utils/csv.js';
import { upsertToGoogleSheets } from './sinks/googleSheets.js';
import { upsertToNotion } from './sinks/notion.js';

async function main() {
  const rows = await readApplicationsCsv();
  if (!rows.length) {
    console.log('No applications found in data/applications.csv');
    return;
  }

  const gs = await upsertToGoogleSheets(rows);
  const nt = await upsertToNotion(rows);

  if (String(process.env.GOOGLE_SHEETS_ENABLED || 'false') === 'true') {
    console.log(`[sheets] appended=${gs.appended} updated=${gs.updated}`);
  } else {
    console.log('[sheets] disabled');
  }
  if (String(process.env.NOTION_ENABLED || 'false') === 'true') {
    console.log(`[notion] created=${nt.created} updated=${nt.updated}`);
  } else {
    console.log('[notion] disabled');
  }
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});