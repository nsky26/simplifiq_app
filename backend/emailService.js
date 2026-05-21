const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const axios = require('axios');
const { getConfig } = require('./config');

const EMAIL_LOG_FILE = path.join(__dirname, 'simulated_emails.log');

// Log simulated email to a file
function logSimulatedEmail(to, subject, body, pdfPath, logger) {
  const timestamp = new Date().toISOString();
  const pdfFilename = path.basename(pdfPath);
  const pdfSize = fs.existsSync(pdfPath) ? `${(fs.statSync(pdfPath).size / 1024).toFixed(2)} KB` : 'File not found';
  
  const emailLog = `
========================================
SIMULATED EMAIL TRANSACTION
Timestamp: ${timestamp}
To: ${to}
Subject: ${subject}
Attachment: ${pdfFilename} (Size: ${pdfSize})
----------------------------------------
${body}
========================================
\n`;

  try {
    fs.appendFileSync(EMAIL_LOG_FILE, emailLog, 'utf8');
    logger(`[Email] Simulating delivery. Email details written to: backend/simulated_emails.log`);
  } catch (err) {
    logger(`[Email] Error writing to simulated_emails.log: ${err.message}`);
  }
}

// Coordinate Email Sending
async function sendAuditEmail(leadInfo, auditData, pdfPath, logger = console.log) {
  const { email, name, companyName } = leadInfo;
  const config = getConfig();
  const subject = auditData.outreachEmail.subject || `Your Personalized Digital Audit - ${companyName}`;
  
  // HTML mail content
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B; line-height: 1.6;">
      <h2 style="color: #4F46E5;">Hi ${name},</h2>
      <p>Thank you for submitting your lead details to <strong>SimplifIQ</strong>.</p>
      <p>We have automatically analyzed <strong>${companyName}</strong>'s digital footprint and compiled a high-end customized business audit and a 3-phase strategic roadmap.</p>
      <p><strong>What is in your report:</strong></p>
      <ul>
        <li><strong>Digital Presence & UX Audit:</strong> Deep-dive of your homepage structure and Call-To-Action conversion bottlenecks.</li>
        <li><strong>Personalized SEO Score:</strong> Analysis of meta elements and keyword presence.</li>
        <li><strong>SWOT Matrix:</strong> Tailored list of Strengths, Weaknesses, Opportunities, and Threats for your domain.</li>
        <li><strong>Actionable Growth Roadmap:</strong> Concrete deliverables split into Quick Wins, Medium Term, and Long Term.</li>
      </ul>
      <p>Your full report is attached to this email as a PDF. Feel free to review it and let us know your thoughts!</p>
      <p>We'd love to jump on a quick 15-minute strategy call to discuss how you can automate these workflows. Would you be open to a session this Thursday at 2:00 PM?</p>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 30px 0;" />
      <p style="font-size: 12px; color: #64748B;">Best regards,<br /><strong>The SimplifIQ Team</strong><br /><a href="https://simplifiq.ai" style="color: #4F46E5; text-decoration: none;">simplifiq.ai</a></p>
    </div>
  `;

  const plainTextBody = `
Hi ${name},

Thank you for submitting your company details. 
We have automatically enriched ${companyName}'s data and compiled a personalized digital audit and 3-phase strategic roadmap.

We have attached your complete PDF report to this email.

We'd love to schedule a quick 15-minute strategy session to walk you through these findings. Are you available this Thursday at 2:00 PM?

Best regards,
The SimplifIQ Team
  `;

  // 1. Try Resend API first
  if (config.RESEND_API_KEY) {
    logger(`[Email] Attempting dispatch via Resend API...`);
    try {
      const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
      const response = await axios.post('https://api.resend.com/emails', {
        from: config.SMTP_FROM || 'SimplifIQ Audit <onboarding@resend.dev>',
        to: [email],
        subject: subject,
        html: emailHtml,
        attachments: [
          {
            filename: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Digital_Audit.pdf`,
            content: pdfBase64
          }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${config.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data && response.data.id) {
        logger(`[Email] Success! Resend Email Dispatched. ID: ${response.data.id}`);
        return { success: true, provider: 'resend', id: response.data.id };
      } else {
        throw new Error('Invalid response structure from Resend API');
      }
    } catch (error) {
      logger(`[Email] Resend API failed: ${error.response?.data?.message || error.message}. Trying SMTP fallback...`);
    }
  }

  // 2. Try SMTP Nodemailer second
  if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
    logger(`[Email] Attempting dispatch via SMTP: ${config.SMTP_HOST}...`);
    try {
      const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: parseInt(config.SMTP_PORT) || 587,
        secure: parseInt(config.SMTP_PORT) === 465, // true for 465, false for other ports
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS
        },
        timeout: 15000
      });

      const info = await transporter.sendMail({
        from: config.SMTP_FROM || `"SimplifIQ Audit" <${config.SMTP_USER}>`,
        to: email,
        subject: subject,
        text: plainTextBody,
        html: emailHtml,
        attachments: [
          {
            filename: `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Digital_Audit.pdf`,
            path: pdfPath
          }
        ]
      });

      logger(`[Email] Success! SMTP Email Dispatched. MessageId: ${info.messageId}`);
      return { success: true, provider: 'smtp', id: info.messageId };
    } catch (error) {
      logger(`[Email] SMTP failed: ${error.message}. Triggering simulated sandbox...`);
    }
  }

  // 3. Simulated Sandbox Fallback
  logger(`[Email] No operational email configuration found. Initializing sandbox simulation...`);
  logSimulatedEmail(email, subject, plainTextBody, pdfPath, logger);
  return { 
    success: true, 
    provider: 'simulated_sandbox', 
    logPath: 'backend/simulated_emails.log' 
  };
}

module.exports = {
  sendAuditEmail
};
