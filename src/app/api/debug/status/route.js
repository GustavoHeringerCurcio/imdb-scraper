import { NextResponse } from 'next/server';
import { db } from '@/lib/db/init.js';
import { getLastJobLog } from '@/lib/db/queries.js';

export const runtime = 'nodejs';

/**
 * GET /api/debug/status
 * View database status, recent job logs, and movie/rating counts
 */
export async function GET() {
  try {
    console.log('[API-DEBUG] GET /api/debug/status called');

    // Get counts
    const movieCount = db.prepare('SELECT COUNT(*) as count FROM movies').get();
    const ratingCount = db.prepare('SELECT COUNT(*) as count FROM ratings').get();
    const jobLogCount = db.prepare('SELECT COUNT(*) as count FROM job_logs').get();

    // Get last job log
    const lastJob = getLastJobLog();

    // Get recent 5 job logs
    const recentJobs = db.prepare(`
      SELECT * FROM job_logs 
      ORDER BY startedAt DESC 
      LIMIT 5
    `).all();

    // Get sample ratings (latest for each source)
    const latestRatings = db.prepare(`
      SELECT r.source, r.value, r.status, r.scrapedAt
      FROM ratings r
      INNER JOIN (
        SELECT source, MAX(scrapedAt) AS maxScrapedAt
        FROM ratings
        GROUP BY source
      ) latest
      ON latest.source = r.source
      AND latest.maxScrapedAt = r.scrapedAt
      ORDER BY r.source
      LIMIT 3
    `).all();

    return NextResponse.json({
      status: 'ok',
      database: {
        movies: movieCount.count,
        ratings: ratingCount.count,
        jobLogs: jobLogCount.count,
      },
      lastJob,
      recentJobs,
      latestRatings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API-DEBUG] ✗ Error:', errorMsg);

    return NextResponse.json(
      {
        status: 'error',
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
