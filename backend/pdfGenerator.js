const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generates a beautifully styled PDF and saves it to a file path
function generatePdfReport(auditData, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        bufferPages: true // Enable double-pass page numbering
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // --- COLOR PALETTE ---
      const colors = {
        primary: '#1E293B',   // Deep slate
        secondary: '#4F46E5', // Indigo
        accent: '#06B6D4',    // Cyan
        success: '#10B981',   // Green
        warning: '#F59E0B',   // Amber
        danger: '#EF4444',    // Red
        textDark: '#1E293B',  // Slate 900
        textLight: '#475569', // Slate 600
        bgCard: '#F8FAFC',    // Slate 50
        border: '#E2E8F0',    // Slate 200
        white: '#FFFFFF',
        darkHero: '#0F172A'   // Dark Slate 900
      };

      // ==========================================
      // PAGE 1: GORGEOUS DARK COVER PAGE
      // ==========================================
      
      // Draw background for dark cover page
      doc.rect(0, 0, 595, 842).fill(colors.darkHero);

      // Decorative shapes / glowing lines
      doc.rect(0, 0, 15, 842).fill(colors.secondary);
      doc.rect(15, 0, 5, 842).fill(colors.accent);

      // Cover Logo/Subheading
      doc.fillColor(colors.accent)
         .font('Helvetica-Bold')
         .fontSize(14)
         .text('SIMPLIFIQ AUTOMATION ENGINE', 60, 150);

      // Glowing title line
      doc.fillColor(colors.white)
         .fontSize(36)
         .text('DIGITAL PRESENCE &\nGROWTH AUDIT', 60, 190, { lineGap: 8 });

      // Subtitle
      doc.fillColor(colors.accent)
         .fontSize(16)
         .text('Custom Strategic Insights & Implementation Roadmap', 60, 290);

      // Horizontal separator line
      doc.strokeColor(colors.secondary)
         .lineWidth(2)
         .moveTo(60, 330)
         .lineTo(450, 330)
         .stroke();

      // Lead Details Block
      doc.fillColor(colors.white)
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('PREPARED FOR:', 60, 420);
      
      doc.fillColor(colors.accent)
         .font('Helvetica-Bold')
         .fontSize(22)
         .text(auditData.companyName.toUpperCase(), 60, 440);

      doc.fillColor(colors.white)
         .font('Helvetica')
         .fontSize(12)
         .text(`Website: ${auditData.website || 'N/A'}`, 60, 470)
         .text(`Lead Contact: ${auditData.name || 'N/A'} (${auditData.email || 'N/A'})`, 60, 490)
         .text(`Industry Sector: ${auditData.industry || 'B2B Services'}`, 60, 510);

      // Bottom disclaimer/timestamp
      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.fillColor('#94A3B8')
         .fontSize(10)
         .text(`Date of Audit: ${today}`, 60, 680)
         .text('CONFIDENTIALITY NOTE: The contents of this document are generated automatically and intended solely for the recipient.', 60, 700, { width: 450, lineGap: 4 });

      // ==========================================
      // PAGE 2: EXECUTIVE SUMMARY & SEO SCORE
      // ==========================================
      doc.addPage();

      // Draw Top Page Border Accent
      doc.rect(0, 0, 595, 10).fill(colors.secondary);

      // Section Title: Executive Summary
      doc.fillColor(colors.secondary)
         .font('Helvetica-Bold')
         .fontSize(18)
         .text('EXECUTIVE AUDIT SUMMARY', 50, 60);

      doc.strokeColor(colors.border)
         .lineWidth(1)
         .moveTo(50, 85)
         .lineTo(545, 85)
         .stroke();

      // Executive Summary Content
      doc.fillColor(colors.textDark)
         .font('Helvetica')
         .fontSize(11)
         .text(auditData.executiveSummary, 50, 105, { width: 495, lineGap: 5 });

      // SEO score container
      const scoreY = 190;
      doc.rect(50, scoreY, 495, 100)
         .fill(colors.bgCard)
         .strokeColor(colors.border)
         .lineWidth(1)
         .stroke();

      // SEO Score Circle/Badge
      const score = auditData.digitalPresence.seoScore || 75;
      let badgeColor = colors.success;
      if (score < 50) badgeColor = colors.danger;
      else if (score < 80) badgeColor = colors.warning;

      // Draw Circular Meter Simulation
      doc.circle(110, scoreY + 50, 36)
         .fill(badgeColor);
      doc.circle(110, scoreY + 50, 30)
         .fill(colors.white);

      doc.fillColor(badgeColor)
         .font('Helvetica-Bold')
         .fontSize(22)
         .text(`${score}%`, 90, scoreY + 42, { width: 40, align: 'center' });

      // Label and SEO details
      doc.fillColor(colors.textDark)
         .font('Helvetica-Bold')
         .fontSize(13)
         .text('DIGITAL PRESENCE & SEO SCORE', 165, scoreY + 20);

      doc.fillColor(colors.textLight)
         .font('Helvetica')
         .fontSize(9.5)
         .text(auditData.digitalPresence.seoAudit, 165, scoreY + 40, { width: 360, lineGap: 3 });

      // Website UX critique
      doc.fillColor(colors.secondary)
         .font('Helvetica-Bold')
         .fontSize(13)
         .text('USER EXPERIENCE & CONVERSION AUDIT', 50, 320);

      doc.rect(50, 340, 495, 80)
         .fill(colors.bgCard)
         .strokeColor(colors.border)
         .stroke();

      doc.fillColor(colors.textDark)
         .font('Helvetica')
         .fontSize(10)
         .text(auditData.digitalPresence.websiteUX, 65, 355, { width: 465, lineGap: 4 });

      // Brand Messaging Alignment
      doc.fillColor(colors.secondary)
         .font('Helvetica-Bold')
         .fontSize(13)
         .text('BRAND POSITIONING & VALUATION', 50, 450);

      doc.rect(50, 470, 495, 80)
         .fill(colors.bgCard)
         .strokeColor(colors.border)
         .stroke();

      doc.fillColor(colors.textDark)
         .font('Helvetica')
         .fontSize(10)
         .text(auditData.digitalPresence.messaging, 65, 485, { width: 465, lineGap: 4 });

      // Industry Macro trend
      doc.fillColor(colors.secondary)
         .font('Helvetica-Bold')
         .fontSize(13)
         .text('INDUSTRY OUTLOOK & MACRO TRENDS', 50, 580);

      doc.rect(50, 600, 495, 80)
         .fill(colors.bgCard)
         .strokeColor(colors.border)
         .stroke();

      doc.fillColor(colors.textDark)
         .font('Helvetica')
         .fontSize(10)
         .text(auditData.growthStrategy.industryInsights, 65, 615, { width: 465, lineGap: 4 });


      // ==========================================
      // PAGE 3: SWOT ANALYSIS
      // ==========================================
      doc.addPage();

      // Top Page Border Accent
      doc.rect(0, 0, 595, 10).fill(colors.accent);

      // Section Title: SWOT Analysis
      doc.fillColor(colors.secondary)
         .font('Helvetica-Bold')
         .fontSize(18)
         .text('COMPREHENSIVE SWOT ANALYSIS', 50, 60);

      doc.strokeColor(colors.border)
         .lineWidth(1)
         .moveTo(50, 85)
         .lineTo(545, 85)
         .stroke();

      // Grid Coordinates for SWOT quadrants
      const swotY = 110;
      const cardW = 235;
      const cardH = 265;
      const col1X = 50;
      const col2X = 310;
      const row1Y = swotY;
      const row2Y = swotY + cardH + 20;

      // Quadrant 1: Strengths (Green accent)
      doc.rect(col1X, row1Y, cardW, cardH).fill(colors.bgCard).strokeColor(colors.border).stroke();
      doc.rect(col1X, row1Y, cardW, 6).fill(colors.success);
      doc.fillColor(colors.success).font('Helvetica-Bold').fontSize(14).text('STRENGTHS', col1X + 15, row1Y + 20);
      
      let itemY = row1Y + 50;
      (auditData.swot.strengths || []).forEach(item => {
        doc.fillColor(colors.success).fontSize(12).text('•', col1X + 15, itemY);
        doc.fillColor(colors.textDark).font('Helvetica').fontSize(9.5).text(item, col1X + 28, itemY, { width: cardW - 40, lineGap: 3 });
        itemY += doc.heightOfString(item, { width: cardW - 40 }) + 15;
      });

      // Quadrant 2: Weaknesses (Red accent)
      doc.rect(col2X, row1Y, cardW, cardH).fill(colors.bgCard).strokeColor(colors.border).stroke();
      doc.rect(col2X, row1Y, cardW, 6).fill(colors.danger);
      doc.fillColor(colors.danger).font('Helvetica-Bold').fontSize(14).text('WEAKNESSES', col2X + 15, row1Y + 20);
      
      itemY = row1Y + 50;
      (auditData.swot.weaknesses || []).forEach(item => {
        doc.fillColor(colors.danger).fontSize(12).text('•', col2X + 15, itemY);
        doc.fillColor(colors.textDark).font('Helvetica').fontSize(9.5).text(item, col2X + 28, itemY, { width: cardW - 40, lineGap: 3 });
        itemY += doc.heightOfString(item, { width: cardW - 40 }) + 15;
      });

      // Quadrant 3: Opportunities (Cyan/Blue accent)
      doc.rect(col1X, row2Y, cardW, cardH).fill(colors.bgCard).strokeColor(colors.border).stroke();
      doc.rect(col1X, row2Y, cardW, 6).fill(colors.accent);
      doc.fillColor(colors.accent).font('Helvetica-Bold').fontSize(14).text('OPPORTUNITIES', col1X + 15, row2Y + 20);
      
      itemY = row2Y + 50;
      (auditData.swot.opportunities || []).forEach(item => {
        doc.fillColor(colors.accent).fontSize(12).text('•', col1X + 15, itemY);
        doc.fillColor(colors.textDark).font('Helvetica').fontSize(9.5).text(item, col1X + 28, itemY, { width: cardW - 40, lineGap: 3 });
        itemY += doc.heightOfString(item, { width: cardW - 40 }) + 15;
      });

      // Quadrant 4: Threats (Amber accent)
      doc.rect(col2X, row2Y, cardW, cardH).fill(colors.bgCard).strokeColor(colors.border).stroke();
      doc.rect(col2X, row2Y, cardW, 6).fill(colors.warning);
      doc.fillColor(colors.warning).font('Helvetica-Bold').fontSize(14).text('THREATS', col2X + 15, row2Y + 20);
      
      itemY = row2Y + 50;
      (auditData.swot.threats || []).forEach(item => {
        doc.fillColor(colors.warning).fontSize(12).text('•', col2X + 15, itemY);
        doc.fillColor(colors.textDark).font('Helvetica').fontSize(9.5).text(item, col2X + 28, itemY, { width: cardW - 40, lineGap: 3 });
        itemY += doc.heightOfString(item, { width: cardW - 40 }) + 15;
      });


      // ==========================================
      // PAGE 4: DETAILED STRATEGIC ROADMAP & OUTREACH
      // ==========================================
      doc.addPage();

      // Top Page Border Accent
      doc.rect(0, 0, 595, 10).fill(colors.primary);

      // Section Title: Growth Strategy
      doc.fillColor(colors.secondary)
         .font('Helvetica-Bold')
         .fontSize(18)
         .text('3-PHASE ROADMAP & ENGAGEMENT PLAN', 50, 60);

      doc.strokeColor(colors.border)
         .lineWidth(1)
         .moveTo(50, 85)
         .lineTo(545, 85)
         .stroke();

      // Timeline Flow
      let roadY = 100;
      const roadW = 495;
      const roadmap = auditData.growthStrategy.roadmap;

      // Phase 1: Quick Wins
      doc.rect(50, roadY, roadW, 115).fill(colors.bgCard).strokeColor(colors.border).stroke();
      doc.rect(50, roadY, 6, 115).fill(colors.success);
      doc.fillColor(colors.success).font('Helvetica-Bold').fontSize(12).text('PHASE 1: QUICK WINS (Week 1-2)', 70, roadY + 15);
      
      let winY = roadY + 38;
      (roadmap.phase1QuickWins || []).forEach(win => {
        doc.fillColor(colors.success).fontSize(10).text('✓', 70, winY);
        doc.fillColor(colors.textDark).font('Helvetica').fontSize(9.5).text(win, 85, winY, { width: roadW - 50 });
        winY += doc.heightOfString(win, { width: roadW - 50 }) + 8;
      });

      // Phase 2: Medium Term
      roadY += 130;
      doc.rect(50, roadY, roadW, 115).fill(colors.bgCard).strokeColor(colors.border).stroke();
      doc.rect(50, roadY, 6, 115).fill(colors.warning);
      doc.fillColor(colors.warning).font('Helvetica-Bold').fontSize(12).text('PHASE 2: MEDIUM-TERM GROWTH (Month 1-3)', 70, roadY + 15);
      
      winY = roadY + 38;
      (roadmap.phase2MediumTerm || []).forEach(win => {
        doc.fillColor(colors.warning).fontSize(10).text('⚡', 70, winY);
        doc.fillColor(colors.textDark).font('Helvetica').fontSize(9.5).text(win, 85, winY, { width: roadW - 50 });
        winY += doc.heightOfString(win, { width: roadW - 50 }) + 8;
      });

      // Phase 3: Long Term
      roadY += 130;
      doc.rect(50, roadY, roadW, 115).fill(colors.bgCard).strokeColor(colors.border).stroke();
      doc.rect(50, roadY, 6, 115).fill(colors.secondary);
      doc.fillColor(colors.secondary).font('Helvetica-Bold').fontSize(12).text('PHASE 3: STRATEGIC LEVERAGE (Month 3-6)', 70, roadY + 15);
      
      winY = roadY + 38;
      (roadmap.phase3Strategic || []).forEach(win => {
        doc.fillColor(colors.secondary).fontSize(10).text('★', 70, winY);
        doc.fillColor(colors.textDark).font('Helvetica').fontSize(9.5).text(win, 85, winY, { width: roadW - 50 });
        winY += doc.heightOfString(win, { width: roadW - 50 }) + 8;
      });

      // Proposed Personalized Outreach Template
      roadY += 140;
      doc.fillColor(colors.secondary)
         .font('Helvetica-Bold')
         .fontSize(13)
         .text('SUGGESTED OUTREACH OUTLINE', 50, roadY);

      doc.rect(50, roadY + 20, roadW, 140).fill('#0F172A').strokeColor(colors.secondary).lineWidth(1.5).stroke();
      doc.fillColor(colors.accent).font('Helvetica-Bold').fontSize(9.5).text(`Subject: ${auditData.outreachEmail.subject}`, 65, roadY + 35);
      
      doc.strokeColor('#334155')
         .lineWidth(1)
         .moveTo(65, roadY + 52)
         .lineTo(525, roadY + 52)
         .stroke();

      doc.fillColor(colors.white).font('Helvetica').fontSize(8.5).text(auditData.outreachEmail.body, 65, roadY + 62, { width: 460, lineGap: 3 });


      // ==========================================
      // AUTOMATED PAGE HEADERS & FOOTERS (DOUBLE PASS)
      // ==========================================
      const pagesRange = doc.bufferedPageRange();
      for (let i = 0; i < pagesRange.count; i++) {
        // Skip Cover page
        if (i === 0) continue;

        doc.switchToPage(i);

        // Header
        doc.fillColor(colors.textLight)
           .font('Helvetica-Bold')
           .fontSize(8)
           .text(`DIGITAL AUDIT: ${auditData.companyName.toUpperCase()}`, 50, 30);

        doc.fillColor(colors.textLight)
           .font('Helvetica')
           .fontSize(8)
           .text('SIMPLIFIQ AUDIT AUTOMATION', 425, 30, { align: 'right', width: 120 });

        doc.strokeColor(colors.border)
           .lineWidth(0.5)
           .moveTo(50, 42)
           .lineTo(545, 42)
           .stroke();

        // Footer
        doc.strokeColor(colors.border)
           .lineWidth(0.5)
           .moveTo(50, 792)
           .lineTo(545, 792)
           .stroke();

        doc.fillColor(colors.textLight)
           .font('Helvetica')
           .fontSize(8)
           .text('© 2026 SimplifIQ. Generated automatically under assessment authorization.', 50, 802);

        doc.fillColor(colors.textLight)
           .font('Helvetica-Bold')
           .fontSize(8)
           .text(`Page ${i + 1} of ${pagesRange.count}`, 495, 802, { align: 'right', width: 50 });
      }

      // Finalize the document
      doc.end();

      writeStream.on('finish', () => {
        resolve(outputPath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generatePdfReport
};
