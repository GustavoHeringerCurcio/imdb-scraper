import { NextResponse } from 'next/server';
import { upsertMovie } from '@/lib/db/queries.js';

export const runtime = 'nodejs';

/**
 * POST /api/movies/sync
 * Sync OMDb movie data to database
 * This ensures IMDb IDs, titles, and posters are always up-to-date
 *
 * Request body: { movies: [{ id, title, imdbID, poster, rottenTomatoesSlug }, ...] }
 * Response: { synced: number, movies: [...] }
 */
export async function POST(request) {
  try {
    console.log('[API-MOVIES-SYNC] POST /api/movies/sync called');

    const body = await request.json();
    const movies = Array.isArray(body?.movies) ? body.movies : [];

    if (movies.length === 0) {
      return NextResponse.json({
        synced: 0,
        message: 'No movies to sync',
      });
    }

    console.log(`[API-MOVIES-SYNC] Syncing ${movies.length} movies from OMDb to database`);

    let syncedCount = 0;
    const results = [];

    // Sync each movie to database
    for (const movie of movies) {
      try {
        if (!movie.imdbID) {
          console.warn(`[API-MOVIES-SYNC] ⚠️  Movie "${movie.title}" has no imdbID, skipping`);
          continue;
        }

        // Upsert movie with OMDb data
        const movieId = upsertMovie({
          imdbId: movie.imdbID,
          title: movie.title,
          poster: movie.poster || null,
          rottenTomatoesSlug: movie.rottenTomatoesSlug || null,
        });

        syncedCount++;
        results.push({
          title: movie.title,
          imdbID: movie.imdbID,
          movieId,
          status: 'synced',
        });

        console.log(`[API-MOVIES-SYNC] ✓ Synced: ${movie.title} (IMDb: ${movie.imdbID})`);
      } catch (error) {
        console.error(`[API-MOVIES-SYNC] Error syncing ${movie.title}:`, error.message);
        results.push({
          title: movie.title,
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log(`[API-MOVIES-SYNC] ✓ Synced ${syncedCount}/${movies.length} movies to database`);

    return NextResponse.json({
      synced: syncedCount,
      total: movies.length,
      movies: results,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API-MOVIES-SYNC] ✗ Error:', errorMsg);

    return NextResponse.json(
      { error: 'Failed to sync movies.' },
      { status: 500 }
    );
  }
}
