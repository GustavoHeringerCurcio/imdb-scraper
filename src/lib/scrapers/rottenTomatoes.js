import { scrapeWithPuppeteer, buildErrorResponse } from './scraper-base.js';

/**
 * Scrape Rotten Tomatoes rating using Puppeteer.
 * Extracts the Tomatometer score (critic score) with multiple fallback strategies.
 * 
 * @param {string} slug - Rotten Tomatoes movie slug (e.g., 'interstellar-2014')
 * @returns {Promise<object>} Standardized rating response
 */
export async function scrapeRottenTomatoesRating(slug) {
  if (!slug) {
    console.warn('[ROTTEN-TOMATOES] ⚠️ Called with null slug');
    return buildErrorResponse('Rotten Tomatoes', 'missing-slug', null);
  }

  const url = `https://www.rottentomatoes.com/m/${slug}`;

  // Extraction function: Get Tomatometer percentage with multiple fallback strategies
  const extractFn = (selector) => {
    // Try 1: score-panel selector (modern RT layout)
    let element = document.querySelector('[data-qa="score-panel"] p');
    if (element) {
      const text = element.textContent.trim();
      const match = text.match(/(\d+)/);
      if (match) return `${match[1]}%`;
    }

    // Try 2: Score board component
    element = document.querySelector('score-board');
    if (element) {
      const score = element.getAttribute('tomatometerscore');
      if (score) return `${score}%`;
    }

    // Try 3: Any element with class containing "score" or "tomatometer"
    const scoreElements = document.querySelectorAll('[class*="score"], [class*="tomatometer"], [class*="rating"]');
    for (let elem of scoreElements) {
      const text = elem.textContent.trim();
      const match = text.match(/(\d+)\s*%/);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 0 && num <= 100) return `${num}%`;
      }
    }

    // Try 4: LD-JSON fallback
    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (let script of ldJsonScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.aggregateRating && data.aggregateRating.ratingValue) {
          const score = Math.round(parseFloat(data.aggregateRating.ratingValue));
          if (score >= 0 && score <= 100) return `${score}%`;
        }
      } catch (e) {
        // Continue searching
      }
    }

    return null;
  };

  return scrapeWithPuppeteer({
    source: 'Rotten Tomatoes',
    url,
    selector: 'body',
    extractFn,
    options: {
      navigation: {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
        userAgent: process.env.ROTTEN_TOMATOES_USER_AGENT,
      },
      selectorTimeout: 3000,
    },
  });
}
