const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { getConfig } = require('./config');

const LEADS_FILE = path.join(__dirname, 'leads.json');

let pool = null;
let poolUrl = '';
let initialized = false;
let lastInitError = null;

function readLocalLeads() {
  if (!fs.existsSync(LEADS_FILE)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading leads.json, using empty database:', err.message);
    return [];
  }
}

function writeLocalLeads(leads) {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing leads.json:', err.message);
    return false;
  }
}

function getDatabaseUrl() {
  return getConfig().DATABASE_URL || '';
}

function isDatabaseConfigured() {
  return !!getDatabaseUrl();
}

function getPool() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return null;
  }

  if (!pool || poolUrl !== databaseUrl) {
    if (pool) {
      pool.end().catch(() => {});
    }

    poolUrl = databaseUrl;
    initialized = false;
    lastInitError = null;
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
  }

  return pool;
}

async function initializeDatabase() {
  const dbPool = getPool();
  if (!dbPool) {
    initialized = false;
    return false;
  }

  if (initialized) {
    return true;
  }

  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(255) PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        industry VARCHAR(255),
        scraping_source VARCHAR(50),
        seo_score INT,
        report_link TEXT,
        pdf_path TEXT,
        audit_data JSONB,
        email_status VARCHAR(50),
        email_provider VARCHAR(50),
        drive_file_id VARCHAR(255),
        drive_link TEXT,
        sheets_logged BOOLEAN,
        drive_logged BOOLEAN,
        error_message TEXT
      );
    `);
    initialized = true;
    lastInitError = null;
    return true;
  } catch (err) {
    initialized = false;
    lastInitError = err;
    console.error('Error initializing Neon PostgreSQL database:', err.message);
    return false;
  }
}

function rowToLead(row) {
  return {
    id: row.id,
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : null,
    leadInfo: {
      name: row.name,
      email: row.email,
      companyName: row.company_name,
      website: row.website,
      industry: row.industry
    },
    scrapingSource: row.scraping_source,
    seoScore: row.seo_score,
    reportLink: row.report_link,
    pdfPath: row.pdf_path,
    auditData: row.audit_data,
    emailStatus: row.email_status,
    emailProvider: row.email_provider,
    driveFileId: row.drive_file_id,
    driveLink: row.drive_link,
    sheetsLogged: row.sheets_logged,
    driveLogged: row.drive_logged,
    error: row.error_message || undefined
  };
}

async function saveLeadToPostgres(lead) {
  const dbReady = await initializeDatabase();
  if (!dbReady) {
    return false;
  }

  const info = lead.leadInfo || {};
  await getPool().query(
    `
      INSERT INTO leads (
        id, timestamp, name, email, company_name, website, industry,
        scraping_source, seo_score, report_link, pdf_path, audit_data,
        email_status, email_provider, drive_file_id, drive_link,
        sheets_logged, drive_logged, error_message
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19
      )
      ON CONFLICT (id) DO UPDATE SET
        timestamp = EXCLUDED.timestamp,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        company_name = EXCLUDED.company_name,
        website = EXCLUDED.website,
        industry = EXCLUDED.industry,
        scraping_source = EXCLUDED.scraping_source,
        seo_score = EXCLUDED.seo_score,
        report_link = EXCLUDED.report_link,
        pdf_path = EXCLUDED.pdf_path,
        audit_data = EXCLUDED.audit_data,
        email_status = EXCLUDED.email_status,
        email_provider = EXCLUDED.email_provider,
        drive_file_id = EXCLUDED.drive_file_id,
        drive_link = EXCLUDED.drive_link,
        sheets_logged = EXCLUDED.sheets_logged,
        drive_logged = EXCLUDED.drive_logged,
        error_message = EXCLUDED.error_message;
    `,
    [
      lead.id,
      lead.timestamp || new Date().toISOString(),
      info.name,
      info.email,
      info.companyName,
      info.website || null,
      info.industry || null,
      lead.scrapingSource || null,
      lead.seoScore ?? null,
      lead.reportLink || null,
      lead.pdfPath || null,
      lead.auditData || null,
      lead.emailStatus || null,
      lead.emailProvider || null,
      lead.driveFileId || null,
      lead.driveLink || null,
      !!lead.sheetsLogged,
      !!lead.driveLogged,
      lead.error || null
    ]
  );
  return true;
}

async function saveLead(lead) {
  if (isDatabaseConfigured()) {
    try {
      const saved = await saveLeadToPostgres(lead);
      if (saved) {
        return { storage: 'postgres' };
      }
    } catch (err) {
      lastInitError = err;
      console.error('Error saving lead to Neon PostgreSQL, falling back to leads.json:', err.message);
    }
  }

  const leads = readLocalLeads();
  const nextLeads = [lead, ...leads.filter(item => item.id !== lead.id)];
  writeLocalLeads(nextLeads);
  return { storage: 'local' };
}

async function getLeads() {
  if (isDatabaseConfigured()) {
    try {
      const dbReady = await initializeDatabase();
      if (dbReady) {
        const result = await getPool().query('SELECT * FROM leads ORDER BY timestamp DESC');
        return result.rows.map(rowToLead);
      }
    } catch (err) {
      lastInitError = err;
      console.error('Error reading leads from Neon PostgreSQL, falling back to leads.json:', err.message);
    }
  }

  return readLocalLeads();
}

async function getLeadById(id) {
  if (isDatabaseConfigured()) {
    try {
      const dbReady = await initializeDatabase();
      if (dbReady) {
        const result = await getPool().query('SELECT * FROM leads WHERE id = $1', [id]);
        return result.rows[0] ? rowToLead(result.rows[0]) : null;
      }
    } catch (err) {
      lastInitError = err;
      console.error('Error reading lead from Neon PostgreSQL, falling back to leads.json:', err.message);
    }
  }

  return readLocalLeads().find(lead => lead.id === id) || null;
}

function getDatabaseMode() {
  if (!isDatabaseConfigured()) {
    return 'Local JSON Sandbox Mode';
  }

  return lastInitError ? 'Local JSON Sandbox Mode (Neon fallback)' : 'Neon PostgreSQL Cloud Mode';
}

module.exports = {
  getDatabaseMode,
  getLeadById,
  getLeads,
  initializeDatabase,
  isDatabaseConfigured,
  saveLead
};
