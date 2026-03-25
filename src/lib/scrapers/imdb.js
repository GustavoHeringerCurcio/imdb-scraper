import { scrapeWithPuppeteer, buildErrorResponse } from './scraper-base.js';

/**
 * Scrape IMDb rating using Puppeteer for JavaScript rendering.
 * 
 * @param {string} imdbId - IMDb ID (e.g., 'tt12042730')
 * @returns {Promise<object>} Standardized rating response
 */
export async function scrapeImdbRating(imdbId) {
  if (!imdbId) {
    console.warn('[IMDB] ⚠️ Called with null imdbID');
    return buildErrorResponse('IMDb', 'missing-id', null);
  }

  const url = `https://www.imdb.com/title/${imdbId}/`;

  // Extraction function: Get rating from the hero rating bar
  const extractFn = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;

    // Try direct text content first
    let text = element.textContent.trim();
    if (text && text.match(/\d+\.\d+/)) return text;

    // Try first span child
    const span = element.querySelector('span');
    if (span) {
      text = span.textContent.trim();
      if (text && text.match(/\d+\.\d+/)) return text;
    }

    return null;
  };

  return scrapeWithPuppeteer({
    source: 'IMDb',
    url,
    selector: '[data-testid="hero-rating-bar__aggregate-rating__score"]',
    extractFn,
    options: {
      navigation: {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
        userAgent: process.env.IMDB_USER_AGENT,
      },
      selectorTimeout: 8000,
    },
  });
}
