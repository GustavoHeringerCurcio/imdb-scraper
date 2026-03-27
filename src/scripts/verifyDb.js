#!/usr/bin/env node

/**
 * Verification script for the movie scraper database implementation.
 */

import { db } from '../lib/db/init.js';
import { getAllMovies, getLatestRatings, getLastJobLog } from '../lib/db/queries.js';

console.log('\n===========================================');
console.log('DATABASE VERIFICATION SCRIPT');
console.log('===========================================\n');

try {
  console.log('1. Checking tables...');
  const tables = db
    .prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN ('movies', 'ratings', 'job_logs')
    `)
    .all();

  console.log(`   Found ${tables.length} tables:`);
  tables.forEach((t) => console.log(`   - ${t.name}`));

  console.log('\n2. Checking movies...');
  const movies = getAllMovies();
  console.log(`   Found ${movies.length} movies in database`);

  if (movies.length > 0) {
    movies.forEach((m) => {
      console.log(`   - [${m.id}] ${m.title} (IMDb: ${m.imdbId})`);
    });
  } else {
    console.warn('   No movies found. Run seed script or sync via dashboard.');
  }

  console.log('\n3. Checking ratings...');
  if (movies.length > 0) {
    const ratings = getLatestRatings(movies.map((m) => m.id));
    console.log(`   Found ${ratings.length} rating entries`);
  }

  console.log('\n4. Checking job logs...');
  const lastLog = getLastJobLog();
  if (lastLog) {
    console.log('   Last job run:');
    console.log(`   - Time: ${lastLog.startedAt}`);
    console.log(`   - Status: ${lastLog.status}`);
    console.log(`   - Movies processed: ${lastLog.movieCount}`);
    if (lastLog.errorMessage) {
      console.log(`   - Error: ${lastLog.errorMessage}`);
    }
  } else {
    console.log('   No job logs yet.');
  }

  console.log('\n===========================================\n');
} catch (error) {
  console.error('Verification failed:', error.message);
  process.exit(1);
}
