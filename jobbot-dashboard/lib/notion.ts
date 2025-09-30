import 'server-only';
import { Client } from '@notionhq/client';

export function getNotion() {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error('NOTION_TOKEN is missing');
  return new Client({ auth: token });
}

export function getDbId() {
  const id = process.env.NOTION_DB_ID;
  if (!id) throw new Error('NOTION_DB_ID is missing');
  return id;
}
