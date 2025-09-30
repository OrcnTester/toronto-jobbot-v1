import { NextResponse } from "next/server";
import { google } from "googleapis";

function normalize(pk?: string) { return pk?.replace(/\\n/g, "\n"); }

async function getSheets() {
  const jwt = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: normalize(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)!,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth: jwt });
}

export async function GET() {
  try {
    const sheets = await getSheets();
    const id = process.env.GOOGLE_SHEETS_ID!;
    // Jobs sheet: A:H (date, company, title, url, status, followupDue, applyEmail, notes)
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: "Jobs!A1:H1000",
    });
    const [header, ...rows] = data.values ?? [];
    const items = rows.map((r) => {
      const o: any = {};
      header.forEach((h: string, i: number) => (o[h] = r[i] || ""));
      return o;
    });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
