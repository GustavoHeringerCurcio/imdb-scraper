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

  // Extraction function: Get BOTH rating and metascore from IMDb page
  const extractFn = (selector) => {
    const result = {
      imdbRating: null,
      metascore: null,
    };

    // Extract IMDb rating
    const ratingElement = document.querySelector(selector);
    if (ratingElement) {
      let text = ratingElement.textContent.trim();
      if (text && text.match(/\d+\.\d+/)) {
        result.imdbRating = text;
      } else {
        const span = ratingElement.querySelector('span');
        if (span) {
          text = span.textContent.trim();
          if (text && text.match(/\d+\.\d+/)) result.imdbRating = text;
        }
      }
    }

    // Extract Metascore from IMDb page
    const metascoreElement = document.querySelector('.metacritic-score-box');
    if (metascoreElement) {
      const text = metascoreElement.textContent.trim();
      if (text && text.match(/^\d+$/)) {
        result.metascore = text;
      }
    }

    return result;
  };

  return scrapeWithPuppeteer({
    source: 'IMDb',
    url,
    selector: '[data-testid="hero-rating-bar__aggregate-rating__score"]',
    extractFn,
    options: {
      navigation: {
        waitUntil: 'networkidle0',
        timeout: 25000,
        userAgent: process.env.IMDB_USER_AGENT,
      },
      selectorTimeout: 12000,
    },
  });
}
