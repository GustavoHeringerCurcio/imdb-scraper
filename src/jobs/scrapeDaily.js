import { getLiveRatingsForMovies } from '@/lib/ratings/getLiveRatings.js';
import { getAllMovies, saveRatings, logJobRun } from '@/lib/db/queries.js';

/**
 * Run the daily scrape job
 * Fetches ratings for all movies and saves to database
 */
export async function runDailyScrapeJob() {
  console.log('\n[SCRAPE-JOB] ========================================');
  console.log('[SCRAPE-JOB] Starting daily scrape job...');
  console.log('[SCRAPE-JOB] ========================================');

  const startTime = new Date();

  try {
    // Get all movies from database
    const movies = getAllMovies();

    if (movies.length === 0) {
      console.warn('[SCRAPE-JOB] ⚠️  No movies found in database');
      logJobRun('daily_scrape', 'warning', 0, 'No movies in database');
      return;
    }

    console.log(`[SCRAPE-JOB] Processing ${movies.length} movies`);

    // Normalize movie objects for scraper (convert imdbId to imdbID)
    const normalizedMovies = movies.map((m) => ({
      id: m.id,
      title: m.title,
      imdbID: m.imdbId, // Convert imdbId to imdbID for scraper compatibility
      rottenTomatoesSlug: m.rottenTomatoesSlug,
    }));

    // Call existing scraper - reuse your current logic
    const results = await getLiveRatingsForMovies(normalizedMovies);

    console.log(`[SCRAPE-JOB] Received ${results.length} results from scraper`);

    // Transform results into ratings table format
    const ratingsToSave = [];

    for (const result of results) {
      const movie = movies.find((m) => m.id === result.id);

      if (!movie) {
        console.warn(`[SCRAPE-JOB] ⚠️  Movie ID ${result.id} not found in database`);
        continue;
      }

      // IMDb rating
      if (result.imdb?.value && result.imdb.value !== 'N/A') {
        ratingsToSave.push({
          movieId: movie.id,
          source: 'imdb',
          value: result.imdb.value,
          status: result.imdb.status || 'ok',
          url: result.imdb.url || null,
        });
      } else {
        ratingsToSave.push({
          movieId: movie.id,
          source: 'imdb',
          value: 'N/A',
          status: result.imdb?.status || 'parse-error',
          url: result.imdb?.url || null,
        });
      }

      // Rotten Tomatoes rating
      if (result.rottenTomatoes?.value && result.rottenTomatoes.value !== 'N/A') {
        ratingsToSave.push({
          movieId: movie.id,
          source: 'rottenTomatoes',
          value: result.rottenTomatoes.value,
          status: result.rottenTomatoes.status || 'ok',
          url: result.rottenTomatoes.url || null,
        });
      } else {
        ratingsToSave.push({
          movieId: movie.id,
          source: 'rottenTomatoes',
          value: 'N/A',
          status: result.rottenTomatoes?.status || 'parse-error',
          url: result.rottenTomatoes?.url || null,
        });
      }

      // Metascore
      if (result.metascore?.value && result.metascore.value !== 'N/A') {
        ratingsToSave.push({
          movieId: movie.id,
          source: 'metascore',
          value: result.metascore.value,
          status: result.metascore.status || 'ok',
          url: result.metascore.url || null,
        });
      } else {
        ratingsToSave.push({
          movieId: movie.id,
          source: 'metascore',
          value: 'N/A',
          status: result.metascore?.status || 'parse-error',
          url: result.metascore?.url || null,
        });
      }
    }

    // Save to database
    if (ratingsToSave.length > 0) {
      saveRatings(ratingsToSave);
    }

    const duration = new Date() - startTime;
    console.log(`[SCRAPE-JOB] ✓ Completed successfully in ${duration}ms`);
    console.log(`[SCRAPE-JOB] Saved ${ratingsToSave.length} ratings`);

    logJobRun('daily_scrape', 'success', movies.length);

    console.log('[SCRAPE-JOB] ========================================\n');

    return {
      success: true,
      moviesProcessed: movies.length,
      ratingsSaved: ratingsToSave.length,
      duration,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SCRAPE-JOB] ✗ Failed:', errorMsg);
    console.error('[SCRAPE-JOB] Stack:', error instanceof Error ? error.stack : 'N/A');

    logJobRun('daily_scrape', 'failed', 0, errorMsg);

    console.log('[SCRAPE-JOB] ========================================\n');

    return {
      success: false,
      error: errorMsg,
    };
  }
}
