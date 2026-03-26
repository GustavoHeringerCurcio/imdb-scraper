import { NextResponse } from 'next/server';
import { getLatestRatings, getAllMovies } from '@/lib/db/queries.js';

export const runtime = 'nodejs';

/**
 * POST /api/ratings/cached
 * Fetch cached ratings from database for given movies
 *
 * Request body: { movies: [{ id, title, imdbID, rottenTomatoesSlug }, ...] }
 * Response: { ratings: [{ movieId, imdb, rottenTomatoes, metascore }, ...] }
 */
export async function POST(request) {
  try {
    console.log('[API-CACHED] POST /api/ratings/cached called');

    const body = await request.json();
    const movies = Array.isArray(body?.movies) ? body.movies : [];

    console.log(`[API-CACHED] Received ${movies.length} movies to rate`);

    if (movies.length === 0) {
      return NextResponse.json(
        { error: 'The request body must include a non-empty movies array.' },
        { status: 400 }
      );
    }

    // Get all movies from database to match with request movies
    const dbMovies = getAllMovies();
    
    if (dbMovies.length === 0) {
      return NextResponse.json(
        { liveRatings: [], count: 0, source: 'database', message: 'No movies in database yet' }
      );
    }

    // Extract movie IDs from database based on IMDb IDs from request
    const imdbIds = movies.map((m) => m.imdbID).filter((id) => id);
    const matchingDbMovies = dbMovies.filter((m) => imdbIds.includes(m.imdbId));
    const movieIds = matchingDbMovies.map((m) => m.id);

    if (movieIds.length === 0) {
      console.log('[API-CACHED] No matching movies found in database for IMDb IDs:', imdbIds);
      return NextResponse.json({
        liveRatings: [],
        count: 0,
        source: 'database',
        message: 'No matching movies found in database',
      });
    }

    // Fetch ratings from database
    const dbRatings = getLatestRatings(movieIds);

    // Format response: group ratings by movieId and source
    const ratingsById = {};

    for (const rating of dbRatings) {
      if (!ratingsById[rating.movieId]) {
        ratingsById[rating.movieId] = {
          imdb: { value: 'N/A', status: 'no-data' },
          rottenTomatoes: { value: 'N/A', status: 'no-data' },
          metascore: { value: 'N/A', status: 'no-data' },
        };
      }

      const sourceKey =
        rating.source === 'rottenTomatoes'
          ? 'rottenTomatoes'
          : rating.source;

      ratingsById[rating.movieId][sourceKey] = {
        value: rating.value,
        status: rating.status,
        url: rating.url,
        scrapedAt: rating.scrapedAt,
      };
    }

    // Format as array with one entry per requested movie
    // Map database results back to client IDs
    const liveRatings = movies
      .map((movie) => {
        const dbMovie = matchingDbMovies.find((m) => m.imdbId === movie.imdbID);
        if (!dbMovie || !ratingsById[dbMovie.id]) {
          return null;
        }
        return {
          id: movie.id, // Use client-side ID
          ...ratingsById[dbMovie.id],
        };
      })
      .filter(Boolean);

    console.log(`[API-CACHED] ✓ Returning cached ratings for ${liveRatings.length} movies`);

    return NextResponse.json({
      liveRatings,
      count: liveRatings.length,
      source: 'database',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API-CACHED] ✗ Error:', errorMsg);
    console.error('[API-CACHED] Stack:', error instanceof Error ? error.stack : 'N/A');

    return NextResponse.json(
      { error: 'Failed to fetch cached ratings.' },
      { status: 500 }
    );
  }
}
