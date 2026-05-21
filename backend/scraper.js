const axios = require('axios');
const cheerio = require('cheerio');

// Clean and normalize URLs
function cleanUrl(url) {
  if (!url) return '';
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }
  return clean;
}

// Scrape website contents
async function scrapeWebsite(url, logger = console.log) {
  const targetUrl = cleanUrl(url);
  logger(`[Scraper] Initializing scraping for: ${targetUrl}`);
  
  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000 // 10s timeout
    });

    const $ = cheerio.load(response.data);
    
    // Extract metadata
    const title = $('title').text().trim() || '';
    const description = $('meta[name="description"]').attr('content')?.trim() || 
                        $('meta[property="og:description"]').attr('content')?.trim() || '';
    
    // Extract headings
    const headings = {
      h1: [],
      h2: []
    };
    
    $('h1').slice(0, 5).each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.h1.push(text);
    });

    $('h2').slice(0, 8).each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.h2.push(text);
    });

    // Extract raw text content (paragraphs, divs, etc.)
    const paragraphs = [];
    $('p').slice(0, 15).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20) {
        paragraphs.push(text);
      }
    });

    const bodyText = paragraphs.join('\n\n');
    
    logger(`[Scraper] Successfully scraped website. Title: "${title}". Found ${paragraphs.length} paragraphs.`);

    return {
      success: true,
      source: 'website_scrape',
      title,
      description,
      headings,
      bodyText: bodyText.substring(0, 5000), // Limit text content to 5k chars to prevent context overflow
      url: targetUrl
    };
  } catch (error) {
    logger(`[Scraper] Web scraping failed for ${targetUrl}: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Fallback search scraper utilizing DuckDuckGo HTML interface
async function searchCompany(companyName, domain = '', logger = console.log) {
  const query = `${companyName} ${domain}`.trim();
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  logger(`[Scraper] Executing fallback DuckDuckGo search for: "${query}"`);
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.result__body').slice(0, 5).each((_, el) => {
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const link = $(el).find('.result__url').text().trim();
      if (title && snippet) {
        results.push({ title, snippet, link });
      }
    });

    logger(`[Scraper] Found ${results.length} search results from fallback.`);
    
    if (results.length === 0) {
      throw new Error('No search results found');
    }

    const compiledText = results.map(r => `Title: ${r.title}\nSnippet: ${r.snippet}\nLink: ${r.link}`).join('\n\n');

    return {
      success: true,
      source: 'search_enrichment',
      query,
      results,
      bodyText: compiledText
    };
  } catch (error) {
    logger(`[Scraper] Fallback search failed for "${query}": ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Combined enrichment pipeline
async function enrichLeadData(companyName, website, logger = console.log) {
  logger(`[Scraper] Starting data enrichment pipeline for ${companyName}`);
  
  let result = null;
  
  // 1. Try to scrape the company website
  if (website) {
    result = await scrapeWebsite(website, logger);
  }
  
  // 2. If website scraping fails or wasn't provided, try search fallback
  if (!result || !result.success) {
    logger(`[Scraper] Website scraping did not succeed. Moving to search fallback...`);
    const searchResult = await searchCompany(companyName, website || '', logger);
    if (searchResult.success) {
      result = searchResult;
    }
  }

  // 3. If everything fails, return generic baseline info
  if (!result || !result.success) {
    logger(`[Scraper] All enrichment methods failed. Proceeding with baseline data.`);
    result = {
      success: false,
      source: 'baseline',
      bodyText: `Company Name: ${companyName}\nWebsite: ${website || 'Not provided'}\nNo further public information could be retrieved automatically.`
    };
  }

  return result;
}

module.exports = {
  enrichLeadData,
  scrapeWebsite,
  searchCompany
};
