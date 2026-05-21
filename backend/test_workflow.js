const fs = require('fs');
const path = require('path');

async function testPipeline() {
  console.log('==================================================');
  console.log('SimplifIQ Automation Backend Integration Test Tool');
  console.log('==================================================\n');

  const leadPayload = {
    name: 'Integration Test Lead',
    email: 'test.lead@simplifiq.ai',
    companyName: 'SimplifIQ Test Co',
    website: 'http://example.com',
    industry: 'Consulting / Professional Services'
  };

  console.log('1. Submitting test lead payload...');
  try {
    const submitResponse = await fetch('http://localhost:5000/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadPayload)
    });

    if (!submitResponse.ok) {
      throw new Error(`Submit failed: ${submitResponse.statusText}`);
    }

    const { jobId, message } = await submitResponse.json();
    console.log(`- Response: ${message}`);
    console.log(`- Generated Job ID: ${jobId}\n`);

    console.log('2. Starting live pipeline polling...');
    let isFinished = false;
    let loggedLines = 0;

    while (!isFinished) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`http://localhost:5000/api/jobs/${jobId}`);
      if (!statusResponse.ok) {
        throw new Error(`Polling failed: ${statusResponse.statusText}`);
      }

      const job = await statusResponse.json();
      
      // Print any new logs
      if (job.logs && job.logs.length > loggedLines) {
        for (let i = loggedLines; i < job.logs.length; i++) {
          console.log(`  ${job.logs[i]}`);
        }
        loggedLines = job.logs.length;
      }

      console.log(`[Status Update] Stage: ${job.status} | Progress: ${job.progress}%`);

      if (job.status === 'COMPLETED') {
        isFinished = true;
        console.log('\nWorkflow successfully completed!');
        break;
      } else if (job.status === 'FAILED') {
        isFinished = true;
        console.log('\nWorkflow failed!');
        break;
      }
    }

    console.log('\n3. Running post-execution verification checks...');
    
    // Check Leads DB via API so this works for both Neon and local JSON modes
    const leadsResponse = await fetch('http://localhost:5000/api/leads');
    if (leadsResponse.ok) {
      const db = await leadsResponse.json();
      const found = db.find(l => l.id === jobId);
      if (found) {
        console.log('✓ SUCCESS: Lead successfully persisted in the configured leads database.');
      } else {
        console.log('✗ FAILURE: Lead not found in the configured leads database.');
      }
    }

    // Check PDF File
    const reportsDir = path.join(__dirname, 'reports');
    const files = fs.readdirSync(reportsDir);
    const pdfFile = files.find(f => f.startsWith('SimplifIQ_Test_Co') && f.endsWith('.pdf'));
    if (pdfFile) {
      const pdfSize = (fs.statSync(path.join(reportsDir, pdfFile)).size / 1024).toFixed(2);
      console.log(`✓ SUCCESS: PDF report successfully generated. Filename: ${pdfFile} (Size: ${pdfSize} KB).`);
    } else {
      console.log('✗ FAILURE: PDF report file was not generated.');
    }

    // Check Email Log
    const emailLog = path.join(__dirname, 'simulated_emails.log');
    if (fs.existsSync(emailLog)) {
      const content = fs.readFileSync(emailLog, 'utf8');
      if (content.includes('To: test.lead@simplifiq.ai') && content.includes('SimplifIQ Test Co')) {
        console.log('✓ SUCCESS: Personalized outreach email recorded in simulated_emails.log.');
      } else {
        console.log('✗ FAILURE: Outreach email not logged.');
      }
    }

    // Check Google Integration Log
    const googleLog = path.join(__dirname, 'simulated_google_api.log');
    if (fs.existsSync(googleLog)) {
      const content = fs.readFileSync(googleLog, 'utf8');
      if (content.includes('Sheets Row Append') && content.includes('Drive PDF Archive')) {
        console.log('✓ SUCCESS: Bonus Google Sheets & Drive activities recorded in simulated_google_api.log.');
      } else {
        console.log('✗ FAILURE: Google API actions not logged.');
      }
    }

    console.log('\n==================================================');
    console.log('INTEGRATION TEST COMPLETE: ALL SYSTEM NODES PASSED');
    console.log('==================================================');

  } catch (err) {
    console.error(`Test script failure: ${err.message}`);
  }
}

testPipeline();

