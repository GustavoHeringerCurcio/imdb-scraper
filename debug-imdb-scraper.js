#!/usr/bin/env node

/**
 * Debug script to test IMDb scraping for each movie individually
 */

import { scrapeImdbRating } from './src/lib/scrapers/imdb.js';

const movies = [
  { title: 'Project Hail Mary', imdbId: 'tt12042730' },
  { title: 'Marty Supreme', imdbId: 'tt22821434' },
  { title: 'Sinners', imdbId: 'tt11871428' },
  { title: 'Scream 7', imdbId: 'tt27456085' },
];

console.log('\n===========================================');
console.log('IMDb SCRAPER DEBUG TEST');
console.log('===========================================\n');

async function testMovie(movie) {
  console.log(`Testing: ${movie.title} (${movie.imdbId})`);
  console.log(`URL: https://www.imdb.com/title/${movie.imdbId}/`);

  try {
    const result = await scrapeImdbRating(movie.imdbId);
    console.log('Result:', result);
    console.log('---\n');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('---\n');
  }
}

async function runTests() {
  for (const movie of movies) {
    await testMovie(movie);
    // Wait 2 seconds between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('===========================================');
  console.log('TEST COMPLETE');
  console.log('===========================================\n');
  process.exit(0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
