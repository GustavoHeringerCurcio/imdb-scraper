import { scrapeWithPuppeteer, buildErrorResponse } from './scraper-base.js';

/**
 * Scrape Metacritic score using Puppeteer.
 * Extracts the Metascore (0-100 scale) with multiple fallback strategies.
 * 
 * Metacritic doesn't have clean URLs per movie, so we search for the title
 * and extract the score from search results.
 * 
 * @param {string} movieTitle - Movie title (e.g., 'Interstellar')
 * @returns {Promise<object>} Standardized rating response
 */
export async function scrapeMetacriticRating(movieTitle) {
  if (!movieTitle) {
    console.warn('[METACRITIC] ⚠️ Called with null movieTitle');
    return buildErrorResponse('Metacritic', 'missing-title', null);
  }

  const searchUrl = `https://www.metacritic.com/search/all/${encodeURIComponent(movieTitle)}/results`;

  // Extraction function: Get Metascore with multiple fallback strategies
  const extractFn = (selector) => {
    // Try 1: LD-JSON structured data (most reliable)
    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (let script of ldJsonScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.aggregateRating && data.aggregateRating.ratingValue) {
          const score = Math.round(parseFloat(data.aggregateRating.ratingValue));
          if (score >= 0 && score <= 100) {
            return String(score);
          }
        }
      } catch (e) {
        // Continue searching
      }
    }

    // Try 2: Score board component
    let scoreBoard = document.querySelector('score-board');
    if (scoreBoard) {
      const score = scoreBoard.getAttribute('score');
      if (score && !isNaN(score)) {
        return String(score);
      }
    }

    // Try 3: Search result items with score classes
    const resultItems = document.querySelectorAll('[data-type="game"], [class*="clamp"], .c-productionItem');
    for (let item of resultItems) {
      const scoreSpan = item.querySelector('[class*="metascore"], [class*="score"]:not([class*="user"])');
      if (scoreSpan) {
        const match = scoreSpan.textContent.trim().match(/(\d+)/);
        if (match) {
          const score = parseInt(match[1]);
          if (score >= 0 && score <= 100) return String(score);
        }
      }
    }

    // Try 4: Scan all divs for score-like patterns
    const allDivs = document.querySelectorAll('div[class*="score"]');
    for (let div of allDivs) {
      const text = div.textContent.trim();
      const match = text.match(/^(\d+)$|metascore[:\s]*(\d+)/i);
      if (match) {
        const score = parseInt(match[1] || match[2]);
        if (score >= 0 && score <= 100) return String(score);
      }
    }

    // Try 5: Look for common Metacritic score patterns
    const allText = document.body.innerText;
    const patterns = [/metascore[:\s]*(\d+)/i, /score[:\s]*(\d+)/, /(\d+)\s*\/\s*100/];
    for (let pattern of patterns) {
      const match = allText.match(pattern);
      if (match) {
        const score = parseInt(match[1]);
        if (score >= 0 && score <= 100) return String(score);
      }
    }

    return null;
  };

  return scrapeWithPuppeteer({
    source: 'Metacritic',
    url: searchUrl,
    selector: 'body',
    extractFn,
    options: {
      navigation: {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
        userAgent: process.env.METACRITIC_USER_AGENT,
      },
      selectorTimeout: 2000,
    },
  });
}
