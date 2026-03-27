#!/usr/bin/env node

/**
 * Debug: Test IMDb scraping for each movie sequentially.
 */

import { scrapeImdbRating } from '../lib/scrapers/imdb.js';

const movies = [
  { title: 'Project Hail Mary', imdbId: 'tt12042730' },
  { title: 'Marty Supreme', imdbId: 'tt22821434' },
  { title: 'Sinners', imdbId: 'tt11871428' },
  { title: 'Scream 7', imdbId: 'tt27456085' },
];

console.log('\n===========================================');
console.log('IMDb SEQUENTIAL SCRAPER TEST');
console.log('Testing each movie one at a time');
console.log('===========================================\n');

async function testMovieSequentially(movie) {
  console.log(`\n>>> Testing: ${movie.title}`);
  console.log(`    URL: https://www.imdb.com/title/${movie.imdbId}/`);

  try {
    const result = await scrapeImdbRating(movie.imdbId);
    console.log('    Result:', {
      imdbRating: result.imdbRating?.value || 'N/A',
      metascore: result.metascore?.value || 'N/A',
      status: result.status || 'error',
    });
  } catch (error) {
    console.error('    ERROR:', error.message);
  }

  console.log('    (waiting 3s before next movie)');
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

async function runTests() {
  for (const movie of movies) {
    await testMovieSequentially(movie);
  }

  console.log('\n===========================================');
  console.log('TEST COMPLETE - All movies tested sequentially');
  console.log('===========================================\n');
  process.exit(0);
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
