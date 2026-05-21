const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { getConfig, saveConfig } = require('./config');
const { enrichLeadData } = require('./scraper');
const { generateAuditReport } = require('./ai');
const { generatePdfReport } = require('./pdfGenerator');
const { sendAuditEmail } = require('./emailService');
const { archivePdfToDrive, logLeadToSheets } = require('./googleIntegration');
const { getDatabaseMode, getLeadById, getLeads, initializeDatabase, isDatabaseConfigured, saveLead } = require('./db');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Middleware
const initialConfig = getConfig();
const allowedOrigins = (initialConfig.FRONTEND_URL || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error(`Blocked CORS origin: ${origin}`);
    return callback(new Error('Origin is not allowed by CORS'));
  }
}));
app.use(express.json({
  limit: '10mb'
}));

// Ensure directories exist
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Active jobs cache for real-time tracking
const activeJobs = {};

function createJobTracker(jobId, leadInfo) {
  activeJobs[jobId] = {
    id: jobId,
    leadInfo,
    status: 'PENDING',
    progress: 0,
    logs: [],
    result: null,
    startedAt: new Date().toISOString()
  };
}

function updateJob(jobId, updates) {
  if (activeJobs[jobId]) {
    activeJobs[jobId] = { ...activeJobs[jobId], ...updates };
  }
}

function addJobLog(jobId, message) {
  if (activeJobs[jobId]) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    activeJobs[jobId].logs.push(logEntry);
    console.log(`[Job ${jobId}] ${message}`);
  }
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function hasConfigAdminAccess(req) {
  const config = getConfig();
  const adminToken = config.CONFIG_ADMIN_TOKEN || process.env.CONFIG_ADMIN_TOKEN || '';

  if (!isProduction() && !adminToken) {
    return true;
  }

  if (!adminToken) {
    return false;
  }

  const authHeader = req.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  return req.get('x-admin-token') === adminToken || bearerToken === adminToken;
}

// Core Automation Background Worker
async function runAutomationJob(jobId) {
  const job = activeJobs[jobId];
  if (!job) return;

  const { leadInfo } = job;
  const logger = (msg) => addJobLog(jobId, msg);

  logger(`Starting automated follow-up process for prospect: ${leadInfo.name}`);
  updateJob(jobId, { status: 'RUNNING', progress: 5 });

  let scrapingResult = null;
  let auditReport = null;
  let pdfPath = null;
  let emailResult = null;
  let driveResult = null;
  let sheetsResult = null;

  const pdfFilename = `${leadInfo.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_Audit.pdf`;
  const localPdfPath = path.join(reportsDir, pdfFilename);

  try {
    // ==========================================
    // STEP 1: Data Enrichment (Scrape / Search)
    // ==========================================
    updateJob(jobId, { status: 'ENRICHING', progress: 15 });
    logger(`Step 1: Commencing company data enrichment...`);
    
    scrapingResult = await enrichLeadData(leadInfo.companyName, leadInfo.website, logger);
    logger(`Data enrichment source selected: ${scrapingResult.source.toUpperCase()}`);
    updateJob(jobId, { progress: 30 });

    // ==========================================
    // STEP 2: AI Audit & Insights Generation
    // ==========================================
    updateJob(jobId, { status: 'ANALYZING', progress: 40 });
    logger(`Step 2: Processing enriched text through core AI audit engine...`);
    
    auditReport = await generateAuditReport(leadInfo, scrapingResult, logger);
    logger(`Successfully generated personalized digital audit. Target SEO Score: ${auditReport.digitalPresence?.seoScore || 'N/A'}`);
    updateJob(jobId, { progress: 55 });

    // ==========================================
    // STEP 3: Professional PDF Generation
    // ==========================================
    updateJob(jobId, { status: 'GENERATING_PDF', progress: 65 });
    logger(`Step 3: Rendering multi-page document layout to PDFKit canvas...`);
    
    pdfPath = await generatePdfReport({ ...auditReport, ...leadInfo }, localPdfPath);
    logger(`Success! PDF report compiled and cached locally.`);
    updateJob(jobId, { progress: 75 });

    // ==========================================
    // STEP 4: Email Dispatch (Resend/SMTP/Mock)
    // ==========================================
    updateJob(jobId, { status: 'SENDING_EMAIL', progress: 80 });
    logger(`Step 4: Dispatching email with PDF attachment to prospect...`);
    
    emailResult = await sendAuditEmail(leadInfo, auditReport, pdfPath, logger);
    updateJob(jobId, { progress: 90 });

    // ==========================================
    // STEP 5: Google Drive Archiving (Bonus)
    // ==========================================
    updateJob(jobId, { status: 'ARCHIVING_PDF', progress: 92 });
    logger(`Step 5 (Bonus): Archiving generated report to Google Drive...`);
    
    driveResult = await archivePdfToDrive(leadInfo.companyName, pdfPath, logger);

    // ==========================================
    // STEP 6: Google Sheets Logging (Bonus)
    // ==========================================
    updateJob(jobId, { status: 'LOGGING_LEAD', progress: 95 });
    logger(`Step 6 (Bonus): Logging lead metrics to live Leads Tracker Sheet...`);
    
    // We log the direct Drive link (or local download route as fallback)
    const reportLink = driveResult.webViewLink || `${BASE_URL}/api/leads/${jobId}/pdf`;
    sheetsResult = await logLeadToSheets(leadInfo, auditReport, reportLink, 'COMPLETED', logger);

    // ==========================================
    // FINALIZATION & DATABASE LOGGING
    // ==========================================
    updateJob(jobId, { status: 'COMPLETED', progress: 100 });
    logger(`Success! All automation nodes executed seamlessly without human intervention.`);

    const completedLead = {
      id: jobId,
      timestamp: new Date().toISOString(),
      leadInfo,
      scrapingSource: scrapingResult.source,
      seoScore: auditReport.digitalPresence?.seoScore || 70,
      reportLink: reportLink,
      pdfPath: pdfFilename,
      auditData: auditReport,
      emailStatus: emailResult.success ? 'DISPATCHED' : 'FAILED',
      emailProvider: emailResult.provider,
      driveFileId: driveResult.fileId || null,
      driveLink: driveResult.webViewLink || null,
      sheetsLogged: sheetsResult.success,
      driveLogged: driveResult.success
    };

    await saveLead(completedLead);

    updateJob(jobId, { result: completedLead });

  } catch (error) {
    logger(`CRITICAL WORKFLOW FAILURE: ${error.message}`);
    console.error(error);
    updateJob(jobId, { status: 'FAILED', progress: 100 });

    // Try to save baseline logs even on failure so the lead is not completely lost
    const failedLead = {
      id: jobId,
      timestamp: new Date().toISOString(),
      leadInfo,
      scrapingSource: scrapingResult?.source || 'unknown',
      seoScore: auditReport?.digitalPresence?.seoScore || 0,
      reportLink: `${BASE_URL}/api/leads/${jobId}/pdf`,
      pdfPath: pdfFilename,
      auditData: auditReport || null,
      emailStatus: 'FAILED',
      error: error.message,
      sheetsLogged: false,
      driveLogged: false
    };

    await saveLead(failedLead);
  }
}

// ==========================================
// ENDPOINTS
// ==========================================

// Trigger lead intake
app.post('/api/leads', (req, res) => {
  const { name, email, companyName, website, industry } = req.body;

  // Simple validations
  if (!name || !email || !companyName) {
    return res.status(400).json({ error: 'Name, Email, and Company Name are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please submit a valid email address.' });
  }

  const jobId = uuidv4();
  const leadInfo = { name, email, companyName, website, industry };

  createJobTracker(jobId, leadInfo);
  
  // Trigger background execution immediately without blocking request
  runAutomationJob(jobId);

  res.status(202).json({
    message: 'Lead received and automated workflows successfully triggered.',
    jobId
  });
});

// Fetch all leads
app.get('/api/leads', async (req, res) => {
  const leads = await getLeads();
  res.json(leads);
});

// Fetch single lead details
app.get('/api/leads/:id', async (req, res) => {
  const lead = await getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead profile not found.' });
  }
  res.json(lead);
});

// Fetch live job progress logs
app.get('/api/jobs/:id', (req, res) => {
  const job = activeJobs[req.params.id];
  if (!job) {
    return res.status(404).json({ error: 'Job tracker session not found.' });
  }
  res.json(job);
});

// Fetch lead PDF
app.get('/api/leads/:id/pdf', async (req, res) => {
  const lead = await getLeadById(req.params.id);
  if (!lead) {
    // If not in DB, check active jobs
    const job = activeJobs[req.params.id];
    if (job && job.status === 'COMPLETED' && job.result) {
      const pdfFilePath = path.join(reportsDir, job.result.pdfPath);
      if (fs.existsSync(pdfFilePath)) {
        return res.sendFile(pdfFilePath);
      }
    }
    return res.status(404).json({ error: 'PDF report not found.' });
  }

  const pdfFilePath = path.join(reportsDir, lead.pdfPath);
  if (!fs.existsSync(pdfFilePath)) {
    return res.status(404).json({ error: 'PDF report file does not exist on disk.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${lead.leadInfo.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Audit.pdf"`);
  res.sendFile(pdfFilePath);
});

// Safe config fetch (no leaking of raw keys)
app.get('/api/config', (req, res) => {
  const config = getConfig();
  const safeConfig = {
    hasGemini: !!config.GEMINI_API_KEY,
    hasOpenAI: !!config.OPENAI_API_KEY,
    hasResend: !!config.RESEND_API_KEY,
    hasSMTP: !!(config.SMTP_HOST && config.SMTP_USER),
    hasGoogleAuth: !!config.GOOGLE_SERVICE_ACCOUNT_JSON,
    hasGoogleSheets: !!config.GOOGLE_SHEETS_ID,
    hasGoogleDrive: !!config.GOOGLE_DRIVE_FOLDER_ID,
    hasDatabase: !!config.DATABASE_URL,
    databaseMode: getDatabaseMode(),
    configUpdatesEnabled: !isProduction() || !!config.CONFIG_ADMIN_TOKEN,
    SMTP_FROM: config.SMTP_FROM
  };
  res.json(safeConfig);
});

// Update configurations dynamically
app.post('/api/config', (req, res) => {
  if (!hasConfigAdminAccess(req)) {
    return res.status(403).json({ error: 'Configuration updates are disabled or require admin authorization.' });
  }

  const configUpdates = req.body;
  
  // Validate dynamic updating
  const allowedKeys = [
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'RESEND_API_KEY',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'GOOGLE_SERVICE_ACCOUNT_JSON',
    'GOOGLE_SHEETS_ID',
    'GOOGLE_DRIVE_FOLDER_ID',
    'DATABASE_URL',
    'FRONTEND_URL'
  ];

  const sanitizedUpdates = {};
  for (const key of allowedKeys) {
    if (configUpdates[key] !== undefined) {
      sanitizedUpdates[key] = configUpdates[key];
    }
  }

  const success = saveConfig(sanitizedUpdates);
  if (success) {
    res.json({ message: 'Configuration successfully updated.' });
  } else {
    res.status(500).json({ error: 'Failed to save configuration updates.' });
  }
});
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SimplifIQ backend running successfully',
    databaseMode: getDatabaseMode(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: getDatabaseMode(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

// Start Express Listener
async function startServer() {

  try {

    // Initialize Neon Database
    if (isDatabaseConfigured()) {

      console.log('Initializing PostgreSQL database...');

      await initializeDatabase();

      console.log('Database initialized successfully.');

    } else {

      console.log('Running in local JSON fallback mode.');

    }

    // Start Railway-compatible server
    app.listen(PORT, '0.0.0.0', () => {

      console.log('========================================');
      console.log('SimplifIQ Leads Automation Server Active');
      console.log(`Local Port: ${PORT}`);
      console.log(`Database Mode: ${getDatabaseMode()}`);
      console.log(`CORS Origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : 'development wildcard'}`);
      console.log('Sandbox Logs: active');
      console.log('========================================');

    });

  } catch (error) {

    console.error('SERVER STARTUP FAILED');
    console.error(error);

    process.exit(1);

  }
}

startServer();
