import { NextResponse } from 'next/server';
import { getNowPlayingMovies } from '@/lib/services/tmdb.js';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'en-US';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);

    const payload = await getNowPlayingMovies({
      region: 'BR',
      language,
      page,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API-MOVIES-NOW-PLAYING] Error:', errorMsg);

    return NextResponse.json(
      { error: 'Failed to fetch now playing movies from TMDB.', details: errorMsg },
      { status: 500 }
    );
  }
}
