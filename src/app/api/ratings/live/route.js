import { NextResponse } from 'next/server';
import { getLiveRatingsForMovies } from '@/lib/ratings/getLiveRatings';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    console.log('[API-RATINGS] POST /api/ratings/live called');
    const body = await request.json();
    const movies = Array.isArray(body?.movies) ? body.movies : [];

    console.log(`[API-RATINGS] Received ${movies.length} movies to rate`);

    if (movies.length === 0) {
      return NextResponse.json(
        { error: 'The request body must include a non-empty movies array.' },
        { status: 400 }
      );
    }

    const liveRatings = await getLiveRatingsForMovies(movies);
    console.log(`[API-RATINGS] ✓ Got ratings for ${liveRatings.length} movies`);

    return NextResponse.json({
      liveRatings,
      count: liveRatings.length,
    });
  } catch (error) {
    console.error('[API-RATINGS] ✗ Error:', error instanceof Error ? error.message : error);
    console.error('[API-RATINGS] Full error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live ratings.' },
      { status: 500 }
    );
  }
}
