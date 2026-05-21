const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { getConfig } = require('./config');

const GOOGLE_LOG_FILE = path.join(__dirname, 'simulated_google_api.log');

function loadGoogleCredentials(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (e) {
    // Try to load as a file path if not valid JSON
    if (fs.existsSync(value)) {
      return JSON.parse(fs.readFileSync(value, 'utf8'));
    }

    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not a valid JSON object, JSON string, or file path');
  }
}

// Log simulated Google API transaction to local file
function logSimulatedGoogle(action, payload, logger) {
  const timestamp = new Date().toISOString();
  const logMessage = `
========================================
SIMULATED GOOGLE INTEGRATION SERVICE
Timestamp: ${timestamp}
Action: ${action}
Payload: ${JSON.stringify(payload, null, 2)}
----------------------------------------
Operation succeeded in Mock Sandbox mode.
========================================
\n`;

  try {
    fs.appendFileSync(GOOGLE_LOG_FILE, logMessage, 'utf8');
    logger(`[Google Integration] Simulated ${action} saved to backend/simulated_google_api.log`);
  } catch (err) {
    logger(`[Google Integration] Error writing to simulated_google_api.log: ${err.message}`);
  }
}

// 1. Google Drive PDF Archiving
async function archivePdfToDrive(companyName, pdfPath, logger = console.log) {
  const config = getConfig();
  
  if (!config.GOOGLE_SERVICE_ACCOUNT_JSON) {
    logger(`[Google Drive] No Service Account credentials configured. Using sandbox fallback...`);
    const mockFileId = `mock-drive-id-${Math.random().toString(36).substring(2, 15)}`;
    const mockLink = `https://drive.google.com/file/d/${mockFileId}/view?usp=drivesdk`;
    
    logSimulatedGoogle('Drive PDF Archive', {
      companyName,
      pdfPath,
      mockFileId,
      mockLink
    }, logger);
    
    return { success: true, fileId: mockFileId, webViewLink: mockLink, isMock: true };
  }

  logger(`[Google Drive] Initializing upload for ${companyName} PDF...`);
  try {
    const credentials = loadGoogleCredentials(config.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });

    const drive = google.drive({ version: 'v3', auth });
    
    const fileMetadata = {
      name: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Digital_Audit.pdf`,
      mimeType: 'application/pdf'
    };

    if (config.GOOGLE_DRIVE_FOLDER_ID) {
      fileMetadata.parents = [config.GOOGLE_DRIVE_FOLDER_ID];
    }

    const media = {
      mimeType: 'application/pdf',
      body: fs.createReadStream(pdfPath)
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    // Make file public/shareable so it can be viewed by download link
    try {
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });
      logger(`[Google Drive] PDF file permissions updated to public shareable link.`);
    } catch (permErr) {
      logger(`[Google Drive] Could not make PDF file public: ${permErr.message}. Link may require authentication.`);
    }

    logger(`[Google Drive] Success! File uploaded. File ID: ${response.data.id}`);
    return {
      success: true,
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
      isMock: false
    };
  } catch (error) {
    logger(`[Google Drive] Error uploading file: ${error.message}. Returning fallback...`);
    const mockFileId = `fallback-id-${Date.now()}`;
    return {
      success: false,
      error: error.message,
      fileId: mockFileId,
      webViewLink: `https://drive.google.com/file/d/${mockFileId}/view`
    };
  }
}

// 2. Google Sheets Leads Logging
async function logLeadToSheets(leadInfo, auditData, pdfLink, status = 'COMPLETED', logger = console.log) {
  const config = getConfig();
  const timestamp = new Date().toISOString();
  
  const valuesRow = [
    timestamp,
    leadInfo.name,
    leadInfo.email,
    leadInfo.companyName,
    leadInfo.website || 'N/A',
    leadInfo.industry || 'N/A',
    auditData.digitalPresence?.seoScore || 'N/A',
    status,
    pdfLink
  ];

  if (!config.GOOGLE_SERVICE_ACCOUNT_JSON || !config.GOOGLE_SHEETS_ID) {
    logger(`[Google Sheets] No Sheet ID or Service Account configured. Using sandbox fallback...`);
    
    logSimulatedGoogle('Sheets Row Append', {
      spreadsheetId: config.GOOGLE_SHEETS_ID || 'mock-sheets-id',
      rowValues: valuesRow
    }, logger);
    
    return { success: true, isMock: true };
  }

  logger(`[Google Sheets] Logging lead details to spreadsheet ID: ${config.GOOGLE_SHEETS_ID}...`);
  try {
    const credentials = loadGoogleCredentials(config.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // We try to append row to Sheet 1 (defaults to Sheet1 range A:I)
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: config.GOOGLE_SHEETS_ID,
      range: 'Sheet1!A:I',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [valuesRow]
      }
    });

    logger(`[Google Sheets] Success! Row appended to spreadsheet. Cells modified: ${appendResponse.data.updates?.updatedCells || 0}`);
    return { success: true, isMock: false };
  } catch (error) {
    logger(`[Google Sheets] Error logging lead row: ${error.message}. Returning fallback...`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  archivePdfToDrive,
  logLeadToSheets
};
