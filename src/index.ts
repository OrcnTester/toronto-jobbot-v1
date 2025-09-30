// src/index.ts
import "dotenv/config";

if (
  !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  !(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  )
) {
  console.error(
    "[fatal] Google creds missing: set GOOGLE_APPLICATIONS_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
  );
  process.exit(2);
}
if (!(process.env.SHEET_ID || process.env.GOOGLE_SHEETS_ID)) {
  console.error("[fatal] Sheet ID missing: set SHEET_ID or GOOGLE_SHEETS_ID");
  process.exit(2);
}

import { appendToNotion } from "./tracker/notion.js";
import path from "node:path";
import fs from "node:fs/promises";
import cron from "node-cron";
import nodemailer from "nodemailer";

import { fetchMockJobs } from "./providers/mock.js";
import { loadCompanies } from "./providers/loadCompanies.js";
import { fetchGreenhouseJobs } from "./providers/greenhouse.js";
import { fetchLeverJobs } from "./providers/lever.js";
import { autodetectCompanies } from "./providers/detectProvider.js";
import { filterJobs } from "./filter.js";
import { generateCoverLetter } from "./generator/coverLetter.js";
import { appendApplication, writeHeartbeat } from "./tracker/tracker.js";
import type { JobItem } from "./providers/types.js";

// Sinyaller / hatalar
process.on("SIGINT", () => {
  console.warn("[signal] SIGINT");
  process.exit(130);
});
process.on("SIGTERM", () => {
  console.warn("[signal] SIGTERM");
  process.exit(143);
});
process.on("unhandledRejection", (e) => {
  console.error("[unhandledRejection]", e);
  process.exit(1);
});
process.on("uncaughtException", (e) => {
  console.error("[uncaughtException]", e);
  process.exit(1);
});

const OUT_DIR = path.resolve("out/cover_letters");
const DETECTED_PATH = path.resolve("data/companies.detected.json");

function getStackFocus() {
  return "Java (Spring Boot), Node.js/TypeScript, React, PostgreSQL";
}
function getProjectSnippet() {
  return "a multi-role construction SaaS dashboard on Vercel with CI/CD and PDF automation (Esdoor, MatchMade)";
}
function dedupeByUrl(items: JobItem[]) {
  const seen = new Set<string>();
  const out: JobItem[] = [];
  for (const it of items) {
    if (!it.url) continue;
    const key = it.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

async function sendCoverLettersEmail(to: string, dir = OUT_DIR) {
  const files = await fs.readdir(dir).catch(() => []);
  if (!files.length) return 0;

  const list = files
    .slice(0, 50)
    .map((f) => `• ${f}`)
    .join("\n");
  const body = [
    `Toronto-JobBot report`,
    `Date: ${new Date().toISOString()}`,
    ``,
    `Cover letters generated: ${files.length}`,
    `Preview (max 50):`,
    list,
  ].join("\n");

  // 1) SMTP_* varsa onu kullan (senin .env buna uygun)
  if (
    process.env.SMTP_HOST &&
    (process.env.SMTP_USER || process.env.FROM_EMAIL) &&
    process.env.SMTP_PASS
  ) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure:
        String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER || process.env.FROM_EMAIL!,
        pass: process.env.SMTP_PASS,
      },
    });
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to,
      bcc:
        process.env.MAIL_BCC || process.env.FROM_EMAIL || process.env.SMTP_USER,
      subject: `JobBot: ${files.length} cover letter hazır`,
      text: body,
    });
    console.log(`[mail] messageId=${info.messageId}`);
    return 1;
  }

  // 2) Aksi halde Gmail basit (MAIL_FROM/MAIL_PASS)
  if (process.env.MAIL_FROM && process.env.MAIL_PASS) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.MAIL_FROM, pass: process.env.MAIL_PASS },
    });
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      bcc: process.env.MAIL_BCC || process.env.MAIL_FROM,
      subject: `JobBot: ${files.length} cover letter hazır`,
      text: body,
    });
    console.log(`[mail] messageId=${info.messageId}`);
    return 1;
  }

  // 3) Hiçbiri yoksa mail atma
  console.log("[mail] skipped (no SMTP_* or MAIL_FROM/MAIL_PASS)");
  return 0;
}

async function processOnce() {
  // 0) Şirket listesi
  const companies = await loadCompanies();

  // 1) Sağlayıcı/slug tespiti
  const detected = await autodetectCompanies(companies);
  await fs.mkdir(path.dirname(DETECTED_PATH), { recursive: true });
  await fs.writeFile(DETECTED_PATH, JSON.stringify(detected, null, 2), "utf-8");

  const ghRows = companies
    .filter((c) => detected[c.company]?.provider === "greenhouse")
    .map((c) => ({ ...c, slug: detected[c.company]!.slug }));
  const lvRows = companies
    .filter((c) => detected[c.company]?.provider === "lever")
    .map((c) => ({ ...c, slug: detected[c.company]!.slug }));

  // 2) İlanları topla
  const [mock, gh, lv] = await Promise.all([
    fetchMockJobs(),
    fetchGreenhouseJobs(ghRows),
    fetchLeverJobs(lvRows),
  ]);

  // 3) Dedupe + filtre
  const combined = dedupeByUrl([...mock, ...gh, ...lv]);
  const filtered = filterJobs(combined);

  // 4) Cover letter + Sheets append
  await fs.mkdir(OUT_DIR, { recursive: true });
  let coverCount = 0;
  let appendedCount = 0;
  const perItemErrors: Array<{
    company: string;
    title: string;
    step: "cover" | "append";
    err: any;
  }> = [];

  for (const j of filtered) {
    // 4a) Cover letter
    // 4a) Cover letter
    try {
      const text = await generateCoverLetter({
        company: j.company,
        title: j.title,
        applicantName: process.env.APPLICANT_NAME || "Orçun Yörük",
        linkedin: process.env.LINKEDIN_URL || "",
        github: process.env.GITHUB_URL || "",
        stackFocus: getStackFocus(),
        projectSnippet: getProjectSnippet(),
      });

      const safeCompany = j.company.replace(/[^a-z0-9-_]+/gi, "_");
      const filename = path.join(
        OUT_DIR,
        `${safeCompany}__${j.title.replace(/[^a-z0-9-_]+/gi, "_")}.txt`
      );

      // 🔥 BOM ekliyoruz ki Notepad ve Windows tarafında Türkçe karakterler (ç, ğ, ü, ö, ı, ş) bozulmasın
      await fs.writeFile(filename, "\uFEFF" + text, { encoding: "utf8" });

      coverCount++;
    } catch (err) {
      perItemErrors.push({
        company: j.company,
        title: j.title,
        step: "cover",
        err,
      });
      continue; // append'e geçmeye gerek yok
    }

    // 4b) Sheets append
    try {
      const followupDue = new Date(
        Date.now() + Number(process.env.FOLLOWUP_DAYS || 7) * 86400000
      )
        .toISOString()
        .slice(0, 10);

      const res = await appendApplication({
        date: new Date().toISOString(),
        company: j.company,
        title: j.title,
        url: j.url,
        status: process.env.SEARCH_ONLY === "true" ? "saved" : "applied",
        followupDue,
        applyEmail: j.applyEmail || "",
        notes: "generated via providers+autodetect",
      });

      appendedCount++;
      console.log(
        `[writer] ok range=${res.updatedRange} cells=${res.updatedCells}`
      );
      // 🔥 Notion sync log
      const n = await appendToNotion({
        company: j.company,
        title: j.title,
        url: j.url,
        status: process.env.SEARCH_ONLY === "true" ? "saved" : "applied",
        followupDue,
        notes: "synced to Notion",
      });
      if ((n as any).ok) {
        console.log("[writer-notion] ok pageId=" + (n as any).pageId);
      } else {
        console.log("[writer-notion] skipped:", (n as any).reason);
      }
    } catch (err) {
      perItemErrors.push({
        company: j.company,
        title: j.title,
        step: "append",
        err,
      });
      console.log(
        `[writer] FAIL for ${j.company} | ${j.title}: ${String(
          (err as Error).message || err
        )}`
      );
    }
  }

  // 5) Özet loglar
  const detectedCounts = {
    greenhouse: Object.values(detected).filter(
      (d) => d?.provider === "greenhouse"
    ).length,
    lever: Object.values(detected).filter((d) => d?.provider === "lever")
      .length,
    unknown: Object.values(detected).filter((d) => !d).length,
  };
  console.log(
    `Detected: GH=${detectedCounts.greenhouse}, Lever=${detectedCounts.lever}, Unknown=${detectedCounts.unknown}`
  );
  console.log(
    `Fetched: GH=${gh.length}, Lever=${lv.length}, Mock=${mock.length} | Filtered=${filtered.length} job(s).`
  );
  console.log(`[files] cover_letters=${coverCount} dir=${OUT_DIR}`);
  console.log(`[writer] sheet: appended=${appendedCount}`);

  // 6) Heartbeat (Debug sekmesi)
  try {
    const hb = await writeHeartbeat();
    console.log(`[debug] heartbeat range=${hb}`);
  } catch (e) {
    console.log("[debug] heartbeat FAIL:", String(e));
  }

  // 7) Mail (opsiyonel)
  if (process.env.MAIL_TO || process.env.MAIL_FROM) {
    try {
      const to =
        process.env.MAIL_TO ||
        process.env.FROM_EMAIL ||
        process.env.MAIL_FROM ||
        "";
      const mailCount = await sendCoverLettersEmail(to, OUT_DIR);
      console.log(`[mail] sent=${mailCount}`);
    } catch (err) {
      console.log("[mail] send failed:", String(err));
    }
  } else {
    console.log("[mail] skipped (MAIL_TO / MAIL_FROM not set)");
  }

  // 8) Item bazlı hataları en sonda raporla
  if (perItemErrors.length) {
    console.log(`[warn] itemErrors=${perItemErrors.length}`);
    for (const e of perItemErrors.slice(0, 5)) {
      console.log(
        `[warn] ${e.step} failed for ${e.company} | ${e.title}:`,
        String(e.err)
      );
    }
  }

  console.log("[done] all steps completed");
  process.exit(0);
}

// Cron: Her sabah 09:00 Toronto (launcher tarafında ENABLE_CRON=false verip kapatabilirsin)
const timezone = process.env.TIMEZONE || "America/Toronto";
if (process.env.ENABLE_CRON !== "false") {
  cron.schedule(
    "0 9 * * *",
    () => {
      processOnce().catch(console.error);
    },
    { timezone }
  );
}

// Elle çağrıldığında da bir kez çalıştır
processOnce().catch(console.error);
