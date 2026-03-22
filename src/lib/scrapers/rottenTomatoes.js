import * as cheerio from 'cheerio';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function toTomatometer(value) {
  if (!value || value === 'N/A') return 'N/A';
  const normalized = String(value).trim().replace(/%/g, '');

  // Extract number if embedded in text
  const numMatch = normalized.match(/\d+(\.\d+)?/);
  if (numMatch) {
    const num = Number(numMatch[0]);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      return `${num}%`;
    }
  }

  return 'N/A';
}

export async function scrapeRottenTomatoesRating(slug) {
  if (!slug) {
    console.warn('[RT-SCRAPER] ⚠️ Called with null slug');
    return {
      source: 'Rotten Tomatoes',
      value: 'N/A',
      status: 'missing-slug',
      url: null,
    };
  }

  const url = `https://www.rottentomatoes.com/m/${slug}`;
  console.log(`[RT-SCRAPER] Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.ROTTEN_TOMATOES_USER_AGENT || DEFAULT_USER_AGENT,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`[RT-SCRAPER] HTTP ${response.status} for ${slug}`);
      return {
        source: 'Rotten Tomatoes',
        value: 'N/A',
        status: `http-${response.status}`,
        url,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    console.log(`[RT-SCRAPER] Parsing HTML for ${slug}`);

    // Primary: score-board component (RT's main rating display)
    const scoreBoard = $('score-board').first();
    const scoreAttr = scoreBoard.attr('tomatometerscore');
    console.log(`[RT-SCRAPER] score-board attr:`, scoreAttr || 'NOT FOUND');
    if (scoreAttr) {
      const result = toTomatometer(scoreAttr);
      if (result !== 'N/A') {
        console.log(`[RT-SCRAPER] ✓ Found via score-board: ${result}`);
        return { source: 'Rotten Tomatoes', value: result, status: 'ok', url };
      }
    }

    // Fallback 1: Modern RT layout with data-qa selector
    const scorePanel = $('[data-qa="score-panel"] p').first().text().trim();
    console.log(`[RT-SCRAPER] data-qa selector:`, scorePanel || 'NOT FOUND');
    if (scorePanel) {
      const result = toTomatometer(scorePanel);
      if (result !== 'N/A') {
        console.log(`[RT-SCRAPER] ✓ Found via data-qa: ${result}`);
        return { source: 'Rotten Tomatoes', value: result, status: 'ok', url };
      }
    }

    // Fallback 2: LD-JSON structured data (when page doesn't display rating visually yet)
    const ldJsonRaw = $('script[type="application/ld+json"]').first().text();
    if (ldJsonRaw) {
      try {
        const ldJson = JSON.parse(ldJsonRaw);
        const ratingValue = ldJson?.aggregateRating?.ratingValue;
        console.log(`[RT-SCRAPER] LD-JSON ratingValue:`, ratingValue || 'NOT FOUND');
        if (ratingValue) {
          // RT's LD-JSON ratingValue is already 0-100 (percentage), not 0-10 scale
          const percentage = Math.round(Number(ratingValue));
          const result = toTomatometer(percentage);
          if (result !== 'N/A') {
            console.log(`[RT-SCRAPER] ✓ Found via LD-JSON: ${result}`);
            return { source: 'Rotten Tomatoes', value: result, status: 'ok', url };
          }
        }
      } catch (e) {
        console.warn(`[RT-SCRAPER] LD-JSON parse error:`, e.message);
      }
    }

    console.warn(`[RT-SCRAPER] ✗ No rating found for ${slug}`);

    // No rating found (likely a very new movie with no score yet)
    return {
      source: 'Rotten Tomatoes',
      value: 'N/A',
      status: 'not-found',
      url,
    };
  } catch (error) {
    console.error(`[RT-SCRAPER] Fetch error for ${slug}:`, error.message);
    return {
      source: 'Rotten Tomatoes',
      value: 'N/A',
      status: 'fetch-error',
      url,
    };
  }
}
