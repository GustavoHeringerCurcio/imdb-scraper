import { getBrowser, returnBrowser } from '../utils/browserPool.js';

/**
 * Scraper Base Module
 * Provides shared utilities and standardized behavior for all web scrapers.
 * 
 * All scrapers return the same response format:
 * {
 *   source: string,      // "IMDb", "Rotten Tomatoes", "Metacritic"
 *   value: string,       // Extracted value or "N/A"
 *   status: string,      // "ok", "missing-id", "http-404", "timeout", "parse-error", etc.
 *   url: string|null,    // URL attempted
 *   timestamp: string    // ISO timestamp of attempt
 * }
 */

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Build a standardized error response.
 * 
 * @param {string} source - Scraper source name ("IMDb", "Rotten Tomatoes", "Metacritic")
 * @param {string} status - Error status code
 * @param {string|null} url - URL attempted (optional)
 * @returns {object} Standardized error response
 */
export function buildErrorResponse(source, status, url = null) {
  return {
    source,
    value: 'N/A',
    status,
    url,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a standardized success response.
 * 
 * @param {string} source - Scraper source name
 * @param {string|number} value - Extracted rating value
 * @param {string} url - URL successfully scraped
 * @returns {object} Standardized success response
 */
export function buildSuccessResponse(source, value, url) {
  return {
    source,
    value: String(value),
    status: 'ok',
    url,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Navigate to a URL with browser instance and wait for page load.
 * Handles navigation errors and timeouts gracefully.
 * 
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string} url - URL to navigate to
 * @param {object} options - Navigation options
 * @param {number} options.waitUntil - Puppeteer waitUntil condition (default: 'domcontentloaded')
 * @param {number} options.timeout - Navigation timeout in ms (default: 15000)
 * @param {string} options.userAgent - User agent string (default: DEFAULT_USER_AGENT)
 * @returns {Promise<{ok: boolean, status?: number, error?: string}>}
 */
export async function navigateToUrl(page, url, options = {}) {
  const {
    waitUntil = 'domcontentloaded',
    timeout = 15000,
    userAgent = DEFAULT_USER_AGENT,
  } = options;

  try {
    await page.setUserAgent(userAgent);
    
    const response = await page.goto(url, {
      waitUntil,
      timeout,
    });

    if (!response || !response.ok) {
      const status = response?.status || 0;
      return {
        ok: false,
        status,
        error: `HTTP ${status}`,
      };
    }

    return { ok: true };
  } catch (error) {
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return {
        ok: false,
        error: 'timeout',
      };
    }
    if (error.message.includes('ERR_CONNECTION')) {
      return {
        ok: false,
        error: 'connection-error',
      };
    }
    return {
      ok: false,
      error: error.message,
    };
  }
}

/**
 * Wait for a selector and optionally extract content via page.evaluate.
 * Handles selector timeout and extraction errors gracefully.
 * 
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector to wait for
 * @param {object} options - Wait and extraction options
 * @param {number} options.timeout - Selector wait timeout in ms (default: 5000)
 * @param {Function} options.extractFn - Function to extract data via page.evaluate (optional)
 * @returns {Promise<{found: boolean, value?: any, error?: string}>}
 */
export async function waitAndExtract(page, selector, options = {}) {
  const {
    timeout = 5000,
    extractFn = null,
  } = options;

  try {
    // Wait for selector
    await page.waitForSelector(selector, { timeout });

    // If no extraction function provided, just return that selector was found
    if (!extractFn) {
      return { found: true };
    }

    // Extract data via page.evaluate
    try {
      const value = await page.evaluate(extractFn, selector);
      return { found: true, value };
    } catch (extractError) {
      return {
        found: true,
        value: null,
        error: `Extraction failed: ${extractError.message}`,
      };
    }
  } catch (waitError) {
    if (waitError.name === 'TimeoutError') {
      return {
        found: false,
        error: 'Selector timeout',
      };
    }
    return {
      found: false,
      error: waitError.message,
    };
  }
}

/**
 * Generic scraper function that handles the full Puppeteer lifecycle.
 * Handles browser acquisition, navigation, extraction, and release.
 * 
 * @param {object} config - Scraper configuration
 * @param {string} config.source - Source name for logging and response
 * @param {string} config.url - URL to scrape
 * @param {string} config.selector - CSS selector to wait for
 * @param {Function} config.extractFn - Extraction function for page.evaluate
 * @param {object} config.options - Additional options (navigation timeout, etc.)
 * @returns {Promise<object>} Standardized response object
 */
export async function scrapeWithPuppeteer(config) {
  const {
    source = 'Unknown',
    url,
    selector,
    extractFn,
    options = {},
  } = config;

  if (!url) {
    return buildErrorResponse(source, 'missing-url');
  }

  if (!selector) {
    return buildErrorResponse(source, 'missing-selector', url);
  }

  const logPrefix = `[${source.toUpperCase()}]`;
  console.log(`${logPrefix} Scraping: ${url}`);

  let browser = null;
  let page = null;

  try {
    // Acquire browser
    browser = await getBrowser();
    page = await browser.newPage();

    // Navigate to URL
    const navResult = await navigateToUrl(page, url, options.navigation || {});
    if (!navResult.ok) {
      console.warn(`${logPrefix} Navigation failed: ${navResult.error}`);
      const statusKey = navResult.error === 'timeout' ? 'timeout' : 
                       navResult.error === 'connection-error' ? 'connection-error' :
                       navResult.status ? `http-${navResult.status}` : 'fetch-error';
      return buildErrorResponse(source, statusKey, url);
    }

    console.log(`${logPrefix} Page loaded successfully`);

    // Wait for selector and extract
    const extractResult = await waitAndExtract(page, selector, {
      timeout: options.selectorTimeout || 5000,
      extractFn,
    });

    if (!extractResult.found) {
      console.warn(`${logPrefix} Selector not found: ${extractResult.error}`);
      return buildErrorResponse(source, 'parse-error', url);
    }

    if (extractResult.value === null || extractResult.value === undefined || extractResult.value === 'N/A') {
      console.warn(`${logPrefix} No value extracted`);
      return buildErrorResponse(source, 'parse-error', url);
    }

    console.log(`${logPrefix} ✓ Successfully extracted: ${extractResult.value}`);
    return buildSuccessResponse(source, extractResult.value, url);

  } catch (error) {
    console.error(`${logPrefix} Unexpected error: ${error.message}`);
    return buildErrorResponse(source, 'fetch-error', url);
  } finally {
    // Cleanup
    if (page) {
      try {
        await page.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    if (browser) {
      await returnBrowser(browser);
    }
  }
}

/**
 * Default extraction function for simple text content.
 * Can be passed to scrapeWithPuppeteer as extractFn.
 * 
 * @param {string} selector - CSS selector (passed by page.evaluate)
 * @returns {string|null} Text content or null if not found
 */
export function defaultExtractFn(selector) {
  const element = document.querySelector(selector);
  if (!element) return null;

  // Try direct text content first
  let text = element.textContent.trim();
  if (text) return text;

  // Try first span child
  const span = element.querySelector('span');
  if (span) {
    text = span.textContent.trim();
    if (text) return text;
  }

  return null;
}
