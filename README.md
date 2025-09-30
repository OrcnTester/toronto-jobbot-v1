# Toronto JobBot v1 → M2 (Real Job Fetch: Greenhouse + Lever)

**Amaç:** Toronto & Remote yazılım ilanlarını toplayıp filtrelemek, dinamik cover letter üretmek, başvuruları CSV'ye kaydetmek ve **7 gün sonra otomatik follow-up e-mail** atmak.

M2 ile artık **Greenhouse + Lever** job board'larından gerçek ilanları çekiyoruz.

## 🚀 Hızlı Başlangıç
```bash
pnpm i         # veya npm i
cp .env.example .env
pnpm start     # ilanları topla + cover letter üret + CSV'ye yaz
pnpm followups # vadesi gelen takip maillerini gönder (iş saatleri filtresiyle)
pnpm testmail  # SMTP test
```

## 🔑 .env (örnek)
- Gmail App Password kullanın.

```
APPLICANT_NAME="Orçun Yörük"
LINKEDIN_URL="https://www.linkedin.com/in/orcun-yoruk-355b52147"
GITHUB_URL="https://github.com/OrcnTester"

TIMEZONE="America/Toronto"
FOLLOWUP_DAYS=7

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="you@example.com"
SMTP_PASS="app-password-here"
FROM_EMAIL="you@example.com"

SEARCH_ONLY=true
AUTO_EMAIL_APPLY=false

# M2 follow-up frenleri (opsiyonel; defaultlarla çalışır)
MAX_FOLLOWUPS_PER_RUN=10
BUSINESS_HOURS_START=9
BUSINESS_HOURS_END=17
PER_DOMAIN_COOLDOWN_DAYS=14
```

## 📂 Önemli Dosyalar
- `src/providers/greenhouse.ts` — Greenhouse ilan çekici
- `src/providers/lever.ts` — Lever ilan çekici
- `data/companies.csv` — taranacak şirketler
- `out/cover_letters/` — üretilen cover letter'lar
- `data/applications.csv` — başvuru kayıtları
- `data/followups.json` — takip kuyruğu
- `data/sent-log.json` — kime/hangi ilana follow-up yollandı

## 🧱 Yol Haritası
- [ ] Google Sheets / Notion sink
- [ ] E-mail apply (etik/TOS güvenli sınırlar)
- [ ] Şirket listesi otomatize (Top Toronto picks)