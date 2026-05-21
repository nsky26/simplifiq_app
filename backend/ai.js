const axios = require('axios');
const { getConfig } = require('./config');

// System prompts for structural PDF audits
const SYSTEM_PROMPT = `You are an elite business analyst, digital strategist, and senior growth consultant. 
Your task is to analyze a prospect's company details and scraped website data, then generate a highly detailed, professional, and personalized audit report in JSON format.
This report is the very first interaction the prospect will have with our brand, so it must be extremely insightful, visually structured, and free of fluff.

You must return EXACTLY a JSON object matching this schema (do not wrap in markdown blocks, just raw JSON):
{
  "executiveSummary": "A highly professional 3-sentence summary of what the company does, their primary digital opportunity, and how they can accelerate growth.",
  "digitalPresence": {
    "websiteUX": "Detailed critique of their website user experience, layout, Call-To-Action (CTA), and mobile-friendliness based on scraped info.",
    "seoScore": 75, // integer between 0 and 100
    "seoAudit": "Assessment of their search engine presence, page structure, meta tags, and visual keywords from scraped headings.",
    "messaging": "Evaluation of their brand voice, positioning, clarity of value proposition, and alignment with target audience."
  },
  "swot": {
    "strengths": ["Strength 1 (specific and detailed)", "Strength 2 (specific and detailed)"],
    "weaknesses": ["Weakness 1 (specific and detailed)", "Weakness 2 (specific and detailed)"],
    "opportunities": ["Opportunity 1 (specific and detailed)", "Opportunity 2 (specific and detailed)"],
    "threats": ["Threat 1 (specific and detailed)", "Threat 2 (specific and detailed)"]
  },
  "growthStrategy": {
    "industryInsights": "Specific macro trends in the company's sector and how they apply directly to this company's business model.",
    "roadmap": {
      "phase1QuickWins": ["Quick win 1 (can be done in 1 week)", "Quick win 2 (can be done in 1 week)"],
      "phase2MediumTerm": ["Medium term strategy 1 (1-3 months)", "Medium term strategy 2 (1-3 months)"],
      "phase3Strategic": ["Strategic transformation 1 (3-6 months)", "Strategic transformation 2 (3-6 months)"]
    }
  },
  "outreachEmail": {
    "subject": "Compelling, non-spammy, highly personalized email subject line",
    "body": "A highly personalized outreach email. Address the prospect by their name. Mention their specific company. Reference a specific insight from the audit. Pitch a collaborative 15-minute call without being salesy. Do not include placeholders like [Your Name], use 'The SimplifIQ Team'."
  }
}`;

// Helper to call OpenAI API
async function callOpenAI(apiKey, prompt, logger) {
  logger('[AI] Contacting OpenAI API (gpt-4o-mini)...');
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 25000
    });

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    logger(`[AI] OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    throw error;
  }
}

// Helper to call Gemini API
async function callGemini(apiKey, prompt, logger) {
  logger('[AI] Contacting Google Gemini API (gemini-2.5-flash)...');
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT + "\n\nAnalyze this company data and return a JSON object:\n\n" + prompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000
      }
    );

    const content = response.data.candidates[0].content.parts[0].text;
    return JSON.parse(content);
  } catch (error) {
    logger(`[AI] Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    throw error;
  }
}

// Highly stylized Mock Audit generator based on Industry and Lead metadata
function generateMockAudit(leadInfo, scrapingData) {
  const { companyName, industry = 'other', name } = leadInfo;
  
  const title = scrapingData.title || `${companyName} Home`;
  const desc = scrapingData.description || `Leading solutions in ${industry}.`;
  
  const industryNorm = industry.toLowerCase();
  
  let sectorInsights = '';
  let strengths = [];
  let weaknesses = [];
  let opportunities = [];
  let threats = [];
  let quickWins = [];
  let mediumTerm = [];
  let strategic = [];
  let uxAudit = '';
  let seoAuditText = '';
  let messagingReview = '';
  let seoScore = 78;

  if (industryNorm.includes('saas') || industryNorm.includes('software') || industryNorm.includes('tech')) {
    seoScore = 82;
    uxAudit = `The user interface of ${companyName}'s digital interface shows solid core layout components. However, friction exists in the primary conversion funnel: the product sign-up flow requires 4 steps, and value metrics are placed below the fold. Adding visual interactive dashboards or interactive sandboxes would significantly increase initial conversion rates.`;
    seoAuditText = `Good structural crawlability with standard heading tags. Meta description is present but lacks specific product differentiator keywords. Ranking highly for direct brand queries, but there is a major untapped search volume for high-intent transactional search queries like "${industry} solutions for enterprises" and related comparison keywords.`;
    messagingReview = `${companyName} employs clean, tech-forward styling. The core value proposition is focused on technical features rather than business outcomes. Shifting from a feature-based narrative to a benefit-led story ("Save 12 hours/week" vs "Fully automated cron engine") will increase relevance for decision-makers.`;
    
    sectorInsights = `The B2B SaaS landscape is experiencing high customer acquisition costs. Product-Led Growth (PLG) mechanics and localized pricing are now essential. Companies must prioritize rapid 'time-to-value' to minimize trial dropouts and ensure positive onboarding experiences.`;
    
    strengths = [
      `Modern structural web layout with clear branding elements.`,
      `Excellent response times on technical endpoints and clear pricing breakdown.`
    ];
    weaknesses = [
      `Friction-filled signup process requiring excessive input fields.`,
      `Lack of social proof, case studies, or logos of verified customers above the fold.`
    ];
    opportunities = [
      `Implementing a self-service interactive demo module on the landing page.`,
      `Developing high-quality comparisons and SEO articles targeting competitor platforms.`
    ];
    threats = [
      `Highly saturated market with rapid commoditization of technical feature sets.`,
      `Aggressive search ad campaigns by heavily funded competitors stealing core brand search traffic.`
    ];

    quickWins = [
      `Implement a 1-click Google OAuth login option on the primary signup screen.`,
      `Add 3 verified customer quotes with faces/logos directly in the hero fold.`
    ];
    mediumTerm = [
      `Launch a dedicated 'Compare' section targeting top 3 direct competitors.`,
      `Set up behavioral trigger emails (e.g., in-app milestones or onboarding hints) using automated flows.`
    ];
    strategic = [
      `Design an Enterprise tier package with advanced security (SAML SSO, RBAC) to target high-budget contracts.`,
      `Build a developer API ecosystem and list it on major software marketplaces.`
    ];
  } else if (industryNorm.includes('consulting') || industryNorm.includes('finance') || industryNorm.includes('service')) {
    seoScore = 72;
    uxAudit = `The website of ${companyName} has a highly professional visual theme, but it relies on static pages. The lead intake form is buried in the 'Contact Us' sub-page and contains 8 text fields. Converting this to a high-end multi-step interactive assessor (similar to this audit) will boost lead flow by up to 40%.`;
    seoAuditText = `The site has a clear domain authority but lacks search engine optimization for local and semantic query intent. While ranking for company personnel names, there is almost zero visibility for core terms like "strategic financial consulting" or "operational advisory services" in their target market.`;
    messagingReview = `The messaging is highly corporate, authoritative, and authoritative. It successfully projects trust and security. However, it is highly generic. Defining a unique intellectual framework or signature methodology ("The 4-D Client Framework") will separate them from a crowded advisory market.`;
    
    sectorInsights = `Professional service firms are facing high pressure to productize their offerings. Clients expect transparency in engagements and fast digital interaction. Building custom digital client portals and releasing white-papers acts as the primary trust builder today.`;
    
    strengths = [
      `Deep domain authority and highly credible professional brand voice.`,
      `Clear list of services and detailed bios of principal managing consultants.`
    ];
    weaknesses = [
      `Extremely low conversion density on home screen - no direct call to action.`,
      `Lack of educational whitepapers, ebooks, or quantitative research assets.`
    ];
    opportunities = [
      `Productizing consultations into standard transparent packages (e.g., 'Growth Sprint').`,
      `Automating inbound lead enrichment and immediately scheduling calls using interactive calendars.`
    ];
    threats = [
      `Traditional network-driven consulting models are being disrupted by agile digital-first boutique agencies.`,
      `Talent churn and rising operational costs reducing margin on custom advisory jobs.`
    ];

    quickWins = [
      `Add a prominent, high-contrast 'Schedule a Strategy Session' CTA in the top right menu.`,
      `Embed a calendar link (e.g., Calendly) directly on the contact page to skip back-and-forth scheduling.`
    ];
    mediumTerm = [
      `Publish a comprehensive PDF guide/industry report to capture emails in exchange for whitepapers.`,
      `Launch a 4-part automated email welcome sequence for all inbound contacts highlighting past success.`
    ];
    strategic = [
      `Build a proprietary digital calculator tool that prospects can use to compute their operational ROI.`,
      `Establish a thought-leadership content engine on LinkedIn, leveraging executive personal brands.`
    ];
  } else {
    // General B2B / SaaS default fallback
    seoScore = 76;
    uxAudit = `The website layout is functional and clean. However, the visual hierarchy is flat - the primary Call-To-Action (CTA) blends into the header background. Optimizing navigation, highlighting client logos, and adding interactive forms will dramatically improve user engagement.`;
    seoAuditText = `Good metadata implementation, but heading tags are underutilized. There is a strong baseline, but it lacks structured blog data and schema markup. Focus on structured data integrations and landing-page optimization for target service areas.`;
    messagingReview = `The brand voice is reliable and clear. The core messaging successfully addresses *what* the company does, but misses *why* they do it better than anyone else. Emphasizing client case studies and concrete outcomes will enhance engagement.`;
    
    sectorInsights = `Businesses today must move fast to implement digital workflows and automation. Providing instantaneous, highly customized value at the very first touchpoint is the modern benchmark of customer experience.`;
    
    strengths = [
      `Clear statement of core business services and contact coordinates.`,
      `Mobile responsive layout that adjusts well to smaller screens.`
    ];
    weaknesses = [
      `Interactive elements are sparse, leading to a high bounce rate on the homepage.`,
      `Sparse case studies or quantitative metrics to back up business claims.`
    ];
    opportunities = [
      `Creating an interactive digital audit or evaluation tool for prospective leads.`,
      `Creating high-value case studies highlighting client cost-savings and operational upgrades.`
    ];
    threats = [
      `Competitors offering highly personalized digital-first customer boarding experiences.`,
      `Loss of search relevance due to static web content and lack of fresh keyword targeting.`
    ];

    quickWins = [
      `Color-highlight the primary 'Get Started' button in the navigation header.`,
      `Add 3 high-impact customer testimonials to the main service landing pages.`
    ];
    mediumTerm = [
      `Develop an automated, interactive questionnaire to pre-qualify and route inbound leads.`,
      `Set up a retargeting pixel to nurture website visitors with case-study ads.`
    ];
    strategic = [
      `Develop custom, automated report assets to provide free instantly-generated value to all site visitors.`,
      `Launch a full-funnel content marketing strategy targeting high-intent long-tail keywords.`
    ];
  }

  return {
    executiveSummary: `Through an audit of ${companyName}'s digital assets and presence, we detected a solid foundation in the ${industry} space. However, significant opportunities exist to increase lead conversion by restructuring their onboarding flows and digital CTAs. By implementing targeted web automation and automated value-delivery models, ${companyName} can unlock highly qualified pipeline growth.`,
    digitalPresence: {
      websiteUX: uxAudit,
      seoScore,
      seoAudit: seoAuditText,
      messaging: messagingReview
    },
    swot: {
      strengths,
      weaknesses,
      opportunities,
      threats
    },
    growthStrategy: {
      industryInsights: sectorInsights,
      roadmap: {
        phase1QuickWins: quickWins,
        phase2MediumTerm: mediumTerm,
        phase3Strategic: strategic
      }
    },
    outreachEmail: {
      subject: `Personalized Digital Audit & Growth Roadmap for ${companyName}`,
      body: `Hi ${name},\n\nI was reviewing ${companyName}'s digital presence today and put together a comprehensive audit of your website, SEO, and positioning.\n\nI noticed that while you have a highly credible brand, there's a significant opportunity to optimize your lead generation flow. Specifically, converting your static forms into interactive assessment tools could help capture up to 40% more inbound prospects.\n\nI've attached the full PDF report containing a tailored 3-phase growth roadmap for ${companyName} to this email.\n\nI'd love to hop on a quick 15-minute call to walk you through these insights and discuss how you can automate these workflows. Would you be open to a call this Thursday at 2 PM?\n\nBest regards,\nThe SimplifIQ Team`
    }
  };
}

// Coordinate AI execution
async function generateAuditReport(leadInfo, scrapingData, logger = console.log) {
  const config = getConfig();
  
  const prompt = `
Lead Information:
- Prospect Name: ${leadInfo.name}
- Prospect Email: ${leadInfo.email}
- Company Name: ${leadInfo.companyName}
- Company Website: ${leadInfo.website || 'None'}
- Company Industry: ${leadInfo.industry || 'B2B Services'}

Scraped Website / Search Data:
${scrapingData.bodyText || 'No website text available.'}
`;

  // Try Gemini first if configured
  if (config.GEMINI_API_KEY) {
    try {
      const result = await callGemini(config.GEMINI_API_KEY, prompt, logger);
      logger('[AI] Successfully generated personalized audit report via Gemini.');
      return result;
    } catch (e) {
      logger(`[AI] Gemini failed, checking OpenAI fallback...`);
    }
  }

  // Try OpenAI second if configured
  if (config.OPENAI_API_KEY) {
    try {
      const result = await callOpenAI(config.OPENAI_API_KEY, prompt, logger);
      logger('[AI] Successfully generated personalized audit report via OpenAI.');
      return result;
    } catch (e) {
      logger(`[AI] OpenAI failed, falling back to local template...`);
    }
  }

  // Fallback to local high-end mock engine
  logger('[AI] No active AI keys available or APIs failed. Activating local mock audit generator...');
  const result = generateMockAudit(leadInfo, scrapingData);
  logger('[AI] Local mock audit report generated successfully.');
  return result;
}

module.exports = {
  generateAuditReport
};
