import { google } from 'googleapis';
import type { AppRow } from '../utils/csv.js';

function getJwt() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) throw new Error('Missing Google service account envs.');
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function assertValidSheetId(id: string) {
  if (!/^[A-Za-z0-9-_]{20,}$/.test(id)) {
    throw new Error('GOOGLE_SHEETS_ID invalid. Use the long ID between /d/ and /edit in the Sheet URL.');
  }
}

// ⚠️ DİKKAT: Bu fonksiyona **root client** geçiyoruz (sheets = google.sheets(...))
// İçeride sheets.spreadsheets.get/batchUpdate çağrılıyor.
async function ensureSheetExists(sheets: any, spreadsheetId: string, sheetName: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = !!(meta.data.sheets ?? []).some((s: any) => s.properties?.title === sheetName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
    });
  }
}

export async function upsertToGoogleSheets(rows: AppRow[]) {
  if (!rows.length) return { appended: 0, updated: 0 };
  if (String(process.env.GOOGLE_SHEETS_ENABLED || 'false') !== 'true') return { appended: 0, updated: 0 };

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;
  assertValidSheetId(spreadsheetId);

  const auth = getJwt();
  const sheets = google.sheets({ version: 'v4', auth });

  const sheetName = 'Applications';

  // 👉 BURADA ROOT CLIENT'ı geçiyoruz (sheets), "sheets.spreadsheets" DEĞİL.
  await ensureSheetExists(sheets, spreadsheetId, sheetName);

  const header = ['date','company','title','url','status','followupDue','applyEmail','notes'];

  // Mevcut tabloyu oku
  const getRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:H10000`,
    majorDimension: 'ROWS',
  }).catch(() => ({ data: {} as any }));
  const values = (getRes.data.values || []) as string[][];

  let startRow = 2;
  const existing: Record<string, number> = {}; // url -> rowIndex

  if (values.length === 0) {
    // Header yoksa yaz
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:H1`,
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
  } else {
    // URL -> satır eşle
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const url = row[3];
      if (url) existing[url] = i + 1; // 1-based
    }
    startRow = values.length + 1;
  }

  let appended = 0, updated = 0;
  const updates: { range: string, values: any[][] }[] = [];
  const appends: any[][] = [];

  for (const r of rows) {
    const arr = [r.date, r.company, r.title, r.url, r.status, r.followupDue, r.applyEmail || '', r.notes || ''];
    const found = existing[r.url];
    if (found) {
      updates.push({ range: `${sheetName}!A${found}:H${found}`, values: [arr] });
      updated++;
    } else {
      appends.push(arr);
      appended++;
    }
  }

  if (updates.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data: updates }
    });
  }

  if (appends.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A${startRow}:H${startRow + appends.length - 1}`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: appends }
    });
  }

  return { appended, updated };
}
