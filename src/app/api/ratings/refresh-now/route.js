import { NextResponse } from 'next/server';
import { runDailyScrapeJob } from '@/jobs/scrapeDaily.js';

export const runtime = 'nodejs';

/**
 * POST /api/ratings/refresh-now
 * Manually trigger the scraping job immediately (bypasses cron schedule)
 *
 * Response: { status: 'success'|'failed', message/error, ... }
 */
export async function POST(request) {
  try {
    console.log('\n[API-REFRESH] POST /api/ratings/refresh-now called');
    console.log('[API-REFRESH] Manual refresh triggered by user');

    // Run scraper job
    const result = await runDailyScrapeJob();

    if (result.success) {
      console.log('[API-REFRESH] ✓ Manual refresh completed successfully');
      return NextResponse.json({
        status: 'success',
        message: `Scrape completed: ${result.moviesProcessed} movies processed, ${result.ratingsSaved} ratings saved`,
        moviesProcessed: result.moviesProcessed,
        ratingsSaved: result.ratingsSaved,
        duration: result.duration,
      });
    } else {
      console.error('[API-REFRESH] ✗ Manual refresh failed:', result.error);
      return NextResponse.json(
        {
          status: 'failed',
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API-REFRESH] ✗ Unexpected error:', errorMsg);
    console.error('[API-REFRESH] Stack:', error instanceof Error ? error.stack : 'N/A');

    return NextResponse.json(
      { error: 'Failed to refresh ratings.' },
      { status: 500 }
    );
  }
}
