# Sinks Patch — Google Sheets & Notion

Bu patch ile `data/applications.csv` verilerini **Google Sheets** ve/veya **Notion Database** içine aktarabilirsiniz.

## 1) Kurulum
- `package.json` içine şu eklemeleri yapın (veya üzerine yazın):
  - scripts: `"export": "node --import tsx ./src/export.ts"`
  - dependencies: `@notionhq/client`, `googleapis`
- Sonra:
```bash
pnpm install
```

## 2) Google Sheets
1. Sheet oluşturun ve ID'yi alın (URL'deki `/d/ID/`).
2. Service Account oluşturup Sheet'e **Editor** olarak ekleyin.
3. `.env`:
```
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEETS_ID="your-sheet-id"
GOOGLE_SERVICE_ACCOUNT_EMAIL="...@...iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
4. `pnpm export`

## 3) Notion
1. https://www.notion.so/my-integrations → token oluşturun, database ile paylaşın.
2. Database property'leri: Title, Company, Status, FollowupDue, URL, ApplyEmail, Notes, Date
3. `.env`:
```
NOTION_ENABLED=true
NOTION_TOKEN="secret_xxx"
NOTION_DATABASE_ID="xxxx-xxxx"
```
4. `pnpm export`