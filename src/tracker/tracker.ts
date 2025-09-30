// src/tracker/tracker.ts
import { google } from "googleapis";
import fs from "node:fs/promises";
import path from "node:path";
import { createObjectCsvWriter } from "csv-writer";
function normalizePrivateKey(pk?: string) {
  return pk ? pk.replace(/\\n/g, "\n") : undefined; // .env'deki \n'leri gerçek newline yap
}
function getSheetId(): string {
  const id = process.env.SHEET_ID || process.env.GOOGLE_SHEETS_ID;
  if (!id)
    throw new Error("Missing Sheet ID: set SHEET_ID or GOOGLE_SHEETS_ID");
  return id;
}
function getSheetTab(): string {
  return process.env.SHEET_TAB || "Jobs";
}

export type ApplicationRecord = {
  date: string;
  company: string;
  title: string;
  url: string;
  status: "saved" | "applied";
  followupDue: string;
  applyEmail?: string;
  notes?: string;
};

//const SHEET_ID = process.env.SHEET_ID!;
//const SHEET_TAB = process.env.SHEET_TAB || 'Jobs';

// İsteğe bağlı CSV yedek (lokalde iz sürmek istersen)
const CSV_PATH = path.resolve("data/applications.csv");

function getAuth() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = normalizePrivateKey(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );

  if (keyFile) {
    return new google.auth.GoogleAuth({
      keyFile,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  if (clientEmail && privateKey) {
    // Doğrudan JWT client dön → GoogleAuth’a sarmalamaya gerek yok
    return new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  throw new Error(
    "No Google creds: set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
  );
}


/** Google Sheets'e tek satır append eder. Başarısızsa throw eder. */
export async function appendApplication(
  rec: ApplicationRecord
): Promise<{ updatedRange: string; updatedCells: number }> {
  // CSV yedek (sessiz) – hata olsa bile Sheets'i etkilemesin
  try {
    await fs.access(CSV_PATH);
  } catch {
    const header =
      "date,company,title,url,status,followupDue,applyEmail,notes\n";
    await fs.mkdir(path.dirname(CSV_PATH), { recursive: true });
    await fs.writeFile(CSV_PATH, header, "utf-8");
  }
  const csvWriter = createObjectCsvWriter({
    path: CSV_PATH,
    header: [
      { id: "date", title: "date" },
      { id: "company", title: "company" },
      { id: "title", title: "title" },
      { id: "url", title: "url" },
      { id: "status", title: "status" },
      { id: "followupDue", title: "followupDue" },
      { id: "applyEmail", title: "applyEmail" },
      { id: "notes", title: "notes" },
    ],
    append: true,
  });
  csvWriter.writeRecords([rec]).catch(() => {
    /* yedek başarısızsa umursama */
  });

  // Google Sheets
  const auth = await getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const values = [
    [
      rec.date,
      rec.company,
      rec.title,
      rec.url,
      rec.status,
      rec.followupDue,
      rec.applyEmail ?? "",
      rec.notes ?? "",
    ],
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${getSheetTab()}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });

  const updates = res.data.updates;
  if (!updates || !updates.updatedRange) {
    throw new Error(
      `Sheets append returned no updates; check SHEET_ID/tab/share. raw=${JSON.stringify(
        res.data
      )}`
    );
  }

  return {
    updatedRange: updates.updatedRange!,
    updatedCells: updates.updatedCells ?? 0,
  };
}

/** DEBUG: Debug!A1'e zaman damgası at (yazma yetkisini doğrulamak için) */
export async function writeHeartbeat(): Promise<string> {
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const ts = new Date().toISOString();
  const tab = process.env.HEARTBEAT_TAB || 'Debug'; // Debug yoksa Jobs yazmak istersen: || getSheetTab()

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `'${tab}'!A1`, // sekme adında boşluk/özel karakter olsa da çalışsın
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[ts, 'heartbeat from JobBot']] },
  });
  return res.data.updates?.updatedRange ?? 'unknown';
}

