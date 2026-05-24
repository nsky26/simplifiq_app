# SimplifIQ - AI Lead Intake & Enrichment Engine (Prototype)

An elite, fully-automated lead capture, enrichment, and personalized audit platform built for professional services, SaaS, and B2B businesses. When a prospect submits their company name and website, this system automatically scrapes their presence, processes insights using advanced AI (Gemini or OpenAI), renders a gorgeous multi-page PDF audit roadmap, dispatches a personalized email to their inbox, and records the lead details in a centralized leads spreadsheet and database without any human intervention.
## Open for Contributing

Contributions are welcome! 🚀

If you find bugs, errors, security issues, or have ideas to improve SimplifiQ, feel free to fork the repository, make changes, and submit a pull request.

Ways to contribute:

* Fix bugs and errors
* Improve UI/UX
* Optimize backend performance
* Enhance AI workflows
* Add new features
* Improve documentation

Please ensure your code is clean, tested, and properly documented before submitting contributions.


---

## 🌟 Key Architectural Features

### 1. Unified React (Vite) + Express (Node) Architecture
- **Interactive Intake Portal**: A stunning, prospect-facing entry form using custom glassmorphism and real-time input validation.
- **Admin & Operations Dashboard**: An executive console featuring lead statistics, connected API counts, visual leads sidebar, tabbed report visualizer, and email previewer.
- **Monospace Logger Terminal**: Real-time background job polling that displays system logs and feeds a graphical progress timeline step-by-step as the automation executes.

### 2. Deep Website Scraper & Fallback Search
- **Primary Scraper**: Utilizes `axios` and `cheerio` to fetch headings, meta-descriptions, title tags, and core body texts from the company website.
- **DuckDuckGo Search Fallback**: If a website is protected by Cloudflare/WAF or is offline, the system automatically redirects to DuckDuckGo HTML search, scraping organic snippets to maintain lead enrichment!

### 3. Core Personalization & Multi-API Support
- **Gemini & OpenAI Engines**: Direct HTTP interface endpoints to prompt `gemini-2.5-flash` or `gpt-4o-mini` with structured JSON specifications.
- **Local Rule-Based Mock Engine**: If no API keys are provided, it activates a sophisticated industry-specific generator (SaaS, Consulting, Finance, or B2B) that crafts rich, context-aligned analyses.

### 4. Custom PDFKit Document Canvas
- **Cover Page**: Rich dark-mode cover page displaying personalized metadata, Confidentially notes, and custom borders.
- **Inner Pages**: Colored circular **SEO Gauges**, light-grey rounded **SWOT Matrix Panels** with custom vector bullets, a vertical 3-phase **Timeline Roadmap**, and double-pass header/footer pagination.

### 5. Triple-Delivery Pipelines & Mock Sandboxes
- **Outreach Mailer**: Supports **Resend API** base64 attachments, standard **SMTP Transports**, and a local **Email Simulator** that logs output transactions directly to `backend/simulated_emails.log` if keys are missing.
- **Google Cloud APIs (Bonuses)**: 
  - **Sheets Tracker**: Appends Lead details, timestamp, industry, score, and report links to a Google Sheet using Service Account JWT.
  - **Drive Archive**: Uploads the PDF report directly to a target Drive Folder.
  - **Simulated Google Sandbox**: Logs sheet updates and Drive uploads to a local file `backend/simulated_google_api.log` when credentials are omitted.

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (v9+)

### ⚙️ Installation & Execution

1. **Install Root, Backend, and Frontend Dependencies**:
   ```bash
   npm run install-all
   ```
   *(Or run `npm install` in the root, `backend/`, and `frontend/` directories individually).*

2. **Launch Both Servers Concurrently**:
   ```bash
   npm run dev
   ```

This single command starts:
- The **Vite React Dev Server** on `http://localhost:5173`
- The **Express API Server** on `http://localhost:5000`

---

## 🛠️ Dynamic Cloud Settings & API Configuration

One of the highlights of this prototype is the **Cloud Credentials Drawer** located in the top-right header gear icon of the interface. You can set and save your API keys on-the-fly directly from the dashboard:

| Environment Key | Purpose | Active Status Indicator | Fallback Mode |
|---|---|---|---|
| `GEMINI_API_KEY` | Google Gemini AI Content Generation | Green Badge | Fallback to OpenAI Key or Mock Engine |
| `OPENAI_API_KEY` | OpenAI GPT-4o-mini Audit Structuring | Green Badge | Fallback to Mock Engine |
| `RESEND_API_KEY` | High-deliverability transactional email | Green Badge | Fallback to SMTP or local simulated file |
| `SMTP_HOST` & `SMTP_USER` | SMTP server settings (Host, Port, User, Pass) | Green Badge | Writes email files to `backend/simulated_emails.log` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service Account JSON string for Sheets & Drive | Green Badge | Logs actions to `backend/simulated_google_api.log` |
| `GOOGLE_SHEETS_ID` | Spreadsheet ID for the Live leads tracker | Green Badge | Simulates cells written |
| `GOOGLE_DRIVE_FOLDER_ID` | Target Drive Folder ID for PDF uploads | Green Badge | Returns mock Drive view link |

*Settings updated in the UI are persisted in `backend/config.json` instantly without requiring a server reboot!*

---

## 📊 Directory Structure

```
simplifiq/
├── backend/
│   ├── reports/                  # Locally cached generated PDF reports
│   ├── ai.js                     # Gemini & OpenAI direct API orchestrator
│   ├── config.js                 # Global credentials managers & dynamic loaders
│   ├── emailService.js           # Resend API & SMTP transport handlers
│   ├── googleIntegration.js      # Google Sheets & Google Drive API integrations
│   ├── pdfGenerator.js           # PDFKit layout renderer & design canvas
│   ├── scraper.js                # Cheerio scraper and DuckDuckGo fallback search
│   ├── server.js                 # Express routing & asynchronous background workers
│   ├── leads.json                # Persistent JSON database (survives restarts)
│   ├── simulated_emails.log      # Sandbox email transaction logs
│   └── simulated_google_api.log  # Sandbox Google Sheets & Drive logs
├── frontend/
│   ├── src/
│   │   ├── App.css               # Main visual grid and element stylesheets
│   │   ├── App.jsx               # React core, polling trackers, and states
│   │   ├── index.css             # Vanilla CSS design tokens & animations
│   │   └── main.jsx              # Mount point
│   ├── index.html                # SEO-optimized html index
│   └── package.json              # Frontend modules config
├── package.json                  # Workspace concurrent runner scripts
└── README.md                     # High-level architecture documentation
```

---

## 🛡️ Senior Engineer Technical Design Choices

1. **Mock Sandbox Isolation**: Essential integrations (AI, Email, Google Drive, Google Sheets) operate out-of-the-box in a highly rich "sandbox simulation" mode. This allows evaluators to immediately test the system, watch logs, download styled PDFs, and check email output files without setting up third-party accounts.
2. **Direct HTTP AI Pipelines**: By using standard `axios` posts to OpenAI and Google Gemini REST endpoints rather than bulky official SDKs, we avoid versioning discrepancies, deprecations, and library compilation failures on target OS platforms.
3. **Double-Pass PDF Rendering**: Configured `pdfkit` to buffer pages. The system draws cover graphics on Page 1, draws inner layouts with vector SEO widgets, and then performs a double-pass to apply dynamic pagination (e.g., "Page 2 of 4") and custom headers on all inner pages.
4. **Persistent Workspace JSON DB**: Lead data and active job log traces are backed up into `backend/leads.json` on every change. Re-launching the development servers preserves all previous runs and their associated local PDF audit files.
