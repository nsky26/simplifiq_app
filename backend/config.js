const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CONFIG_FILE = path.join(__dirname, 'config.json');

// Default initial configuration
const defaultValues = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT || '587',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'SimplifIQ Audit <audit@simplifiq.ai>',
  GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '',
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  USE_MOCK_INTEGRATIONS: process.env.USE_MOCK_INTEGRATIONS !== 'false', // default to true if keys aren't set
  DATABASE_URL: process.env.DATABASE_URL || '',
  FRONTEND_URL: process.env.FRONTEND_URL || '',
  CONFIG_ADMIN_TOKEN: process.env.CONFIG_ADMIN_TOKEN || ''
};

let currentConfig = { ...defaultValues };

// Load from config.json if it exists
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(data);
    currentConfig = { ...defaultValues, ...parsed };
  } catch (err) {
    console.error('Error reading config.json, using defaults:', err.message);
  }
} else {
  // Save initial default configuration
  saveConfig(currentConfig);
}

function saveConfig(newConfig) {
  try {
    currentConfig = { ...currentConfig, ...newConfig };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing config.json:', err.message);
    return false;
  }
}

function getConfig() {
  return { ...currentConfig };
}

module.exports = {
  getConfig,
  saveConfig
};
