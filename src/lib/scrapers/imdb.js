import * as cheerio from 'cheerio';
import { getBrowser, returnBrowser } from '../utils/browserPool.js';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function toRatingValue(value) {
  if (!value || value === 'N/A') return 'N/A';
  return String(value);
}

/**
 * Scrape IMDb rating using Puppeteer for JavaScript rendering.
 * Falls back to static Cheerio parsing if Puppeteer fails.
 * 
 * @param {string} imdbId - IMDb ID (e.g., 'tt12042730')
 * @returns {Promise<{source: string, value: string, status: string, url: string|null}>}
 */
export async function scrapeImdbRating(imdbId) {
  if (!imdbId) {
    console.warn('[IMDb-SCRAPER] ⚠️ Called with null imdbID');
    return {
      source: 'IMDb',
      value: 'N/A',
      status: 'missing-id',
      url: null,
    };
  }

  const url = `https://www.imdb.com/title/${imdbId}/`;
  console.log(`[IMDb-SCRAPER] Fetching: ${url}`);

  let browser = null;
  try {
    // Try Puppeteer first (handles JavaScript rendering)
    console.log(`[PUPPETEER] Acquiring browser instance...`);
    browser = await getBrowser();
    
    console.log(`[PUPPETEER] Creating new page...`);
    const page = await browser.newPage();
    
    try {
      // Set user agent
      await page.setUserAgent(process.env.IMDB_USER_AGENT || DEFAULT_USER_AGENT);
      
      // Navigate with timeout
      console.log(`[PUPPETEER] Navigating to ${url}`);
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 8000,
      });
      
      console.log(`[PUPPETEER] Page loaded, waiting for rating element...`);
      
      // Wait for the rating element to appear (max 5 seconds)
      const ratingSelector = '[data-testid="hero-rating-bar__aggregate-rating__score"]';
      
      try {
        await page.waitForSelector(ratingSelector, { timeout: 5000 });
        console.log(`[PUPPETEER] ✓ Rating element found`);
      } catch (e) {
        console.log(`[PUPPETEER] ⚠️ Rating element not found within timeout`);
        // Element might not exist, continue to extraction attempt below
      }
      
      // Extract rating value via page.evaluate()
      console.log(`[PUPPETEER] Extracting rating value...`);
      const ratingValue = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          // Get direct text content or search within child span
          let text = element.textContent.trim();
          if (!text) {
            const span = element.querySelector('span');
            text = span ? span.textContent.trim() : '';
          }
          return text;
        }
        return null;
      }, ratingSelector);
      
      if (ratingValue && ratingValue.match(/\d+\.\d+/)) {
        console.log(`[PUPPETEER] ✓ Found via Puppeteer: ${ratingValue}`);
        await page.close();
        await returnBrowser(browser);
        return {
          source: 'IMDb',
          value: toRatingValue(ratingValue),
          status: 'ok',
          url,
        };
      }
      
      console.log(`[PUPPETEER] ⚠️ No valid rating extracted via Puppeteer`);
      await page.close();
      await returnBrowser(browser);
      
      // Fall back to static HTML parsing
      console.log(`[IMDb-SCRAPER] Falling back to static HTML parsing...`);
      return await scrapeImdbRatingStatic(url, imdbId);
      
    } catch (pageError) {
      console.log(`[PUPPETEER] Page error: ${pageError.message}`);
      // Close page and fall back to static parsing
      if (page) {
        try {
          await page.close();
        } catch (e) {
          // Ignore close errors
        }
      }
      await returnBrowser(browser);
      return await scrapeImdbRatingStatic(url, imdbId);
    }
    
  } catch (error) {
    console.error(`[PUPPETEER] Fetch error for ${imdbId}:`, error.message);
    
    // Release browser back to pool on error
    if (browser) {
      await returnBrowser(browser);
    }
    
    // Fall back to static parsing
    return await scrapeImdbRatingStatic(url, imdbId);
  }
}

/**
 * Fallback static HTML parsing using Cheerio.
 * Used if Puppeteer fails or for testing.
 * 
 * @param {string} url - Full IMDb URL
 * @param {string} imdbId - IMDb ID for logging
 * @returns {Promise<{source: string, value: string, status: string, url: string}>}
 */
async function scrapeImdbRatingStatic(url, imdbId) {
  console.log(`[IMDb-SCRAPER] Fetching static HTML for ${imdbId}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.IMDB_USER_AGENT || DEFAULT_USER_AGENT,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`[IMDb-SCRAPER] HTTP ${response.status} for ${imdbId}`);
      return {
        source: 'IMDb',
        value: 'N/A',
        status: `http-${response.status}`,
        url,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    console.log(`[IMDb-SCRAPER] Parsing static HTML for ${imdbId}`);

    // Try LD-JSON first
    const ldJsonRaw = $('script[type="application/ld+json"]').first().text();
    if (ldJsonRaw) {
      try {
        const ldJson = JSON.parse(ldJsonRaw);
        const value = toRatingValue(ldJson?.aggregateRating?.ratingValue);
        if (value !== 'N/A') {
          console.log(`[IMDb-SCRAPER] ✓ Found via static LD-JSON: ${value}`);
          return {
            source: 'IMDb',
            value,
            status: 'ok',
            url,
          };
        }
      } catch (e) {
        console.warn(`[IMDb-SCRAPER] LD-JSON parse error for ${imdbId}:`, e.message);
      }
    }

    // Try multiple CSS selectors (fallback)
    const selectors = [
      '[data-testid="hero-rating-bar__aggregate-rating__score"] span',
      '[data-testid="hero-rating-bar__aggregate-rating__score"]',
      '[data-testid="hero-rating-bar__rating"]',
      'div[data-testid="hero-rating-bar__aggregate-rating__score"] span',
      'span[class*="ratingValue"]',
      '[class*="AggregateRatingButton"] span',
      '[aria-label*="Rating"]',
      'span[data-test-id*="rating"]',
    ];

    let selectorValue = '';
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      const element = $(selector).first();
      selectorValue = element.text().trim();
      
      if (selectorValue && selectorValue.match(/\d+\.\d+/)) {
        console.log(`[IMDb-SCRAPER] ✓ Found via static selector[${i}]: ${selectorValue}`);
        return {
          source: 'IMDb',
          value: toRatingValue(selectorValue),
          status: 'ok',
          url,
        };
      }
    }

    // If primary selectors fail, try alternative approach
    if (!selectorValue) {
      console.log(`[IMDb-SCRAPER] Static selectors failed, trying alternative scan...`);
      $('span').each((idx, elem) => {
        const text = $(elem).text().trim();
        if (text && text.match(/^[\d.]{3,4}$/) && !selectorValue) {
          selectorValue = text;
          console.log(`[IMDb-SCRAPER] ✓ Found via static alternative: ${selectorValue}`);
          return false; // Break
        }
      });
    }

    if (!selectorValue) {
      console.warn(`[IMDb-SCRAPER] ✗ No rating found for ${imdbId} (page structure changed or ratings not loaded)`);
    }

    return {
      source: 'IMDb',
      value: toRatingValue(selectorValue),
      status: selectorValue ? 'ok' : 'not-found',
      url,
    };
  } catch (error) {
    console.error(`[IMDb-SCRAPER] Static fetch error for ${imdbId}:`, error.message);
    return {
      source: 'IMDb',
      value: 'N/A',
      status: 'fetch-error',
      url,
    };
  }
}
