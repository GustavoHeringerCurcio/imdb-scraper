#!/usr/bin/env node

/**
 * Verification script for the movie scraper database implementation
 * Run this to check if the database is properly initialized and seeded
 */

import { db } from './src/lib/db/init.js';
import { getAllMovies, getLatestRatings, getLastJobLog } from './src/lib/db/queries.js';

console.log('\n===========================================');
console.log('DATABASE VERIFICATION SCRIPT');
console.log('===========================================\n');

try {
  // Check tables exist
  console.log('1️⃣  Checking tables...');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('movies', 'ratings', 'job_logs')
  `).all();

  console.log(`   ✓ Found ${tables.length} tables:`);
  tables.forEach(t => console.log(`     - ${t.name}`));

  // Check movies
  console.log('\n2️⃣  Checking movies...');
  const movies = getAllMovies();
  console.log(`   ✓ Found ${movies.length} movies in database`);
  if (movies.length > 0) {
    movies.forEach(m => {
      console.log(`     - [${m.id}] ${m.title} (IMDb: ${m.imdbId})`);
    });
  } else {
    console.warn('   ⚠️  No movies found! Run seeding or click "Refresh Ratings Now" to populate.');
  }

  // Check ratings
  console.log('\n3️⃣  Checking ratings...');
  if (movies.length > 0) {
    const ratings = getLatestRatings(movies.map(m => m.id));
    console.log(`   ✓ Found ${ratings.length} rating entries`);
    if (ratings.length > 0) {
      const grouped = {};
      ratings.forEach(r => {
        if (!grouped[r.movieId]) grouped[r.movieId] = [];
        grouped[r.movieId].push(r.source);
      });
      Object.entries(grouped).forEach(([movieId, sources]) => {
        const movie = movies.find(m => m.id == movieId);
        console.log(`     - ${movie.title}: ${sources.join(', ')}`);
      });
    } else {
      console.warn('   ⚠️  No ratings in database yet. They will be populated on first scrape.');
    }
  }

  // Check job logs
  console.log('\n4️⃣  Checking job logs...');
  const lastLog = getLastJobLog();
  if (lastLog) {
    console.log(`   ✓ Last job run:`);
    console.log(`     - Time: ${lastLog.startedAt}`);
    console.log(`     - Status: ${lastLog.status}`);
    console.log(`     - Movies processed: ${lastLog.movieCount}`);
    if (lastLog.errorMessage) {
      console.log(`     - Error: ${lastLog.errorMessage}`);
    }
  } else {
    console.log('   ℹ️  No job logs yet (jobs run at 2 AM or on manual refresh)');
  }

  console.log('\n===========================================');
  console.log('NEXT STEPS:');
  console.log('===========================================');
  console.log('1. Start the dev server:');
  console.log('   npm run dev');
  console.log('\n2. Open dashboard:');
  console.log('   http://localhost:3000/dashboard');
  console.log('\n3. Click "Refresh Ratings Now" button to test scraping');
  console.log('\n4. Check console logs for [SCRAPE-JOB], [CRON], [API-*] prefixes');
  console.log('\n5. Open http://localhost:3000/dashboard again to see cached ratings');
  console.log('\nNote: Cron job runs daily at 2 AM. Uncomment the dev schedule');
  console.log('in cronServer.js to test every minute during development.');
  console.log('\n===========================================\n');
} catch (error) {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
}
