/**
 * Database Seed Script
 * Populates the database with initial movie data from dashboard constants
 *
 * Usage: node src/scripts/seedDatabase.js
 */

import { db } from '../lib/db/init.js';
import { insertMovie } from '../lib/db/queries.js';

const MOVIES = [
  {
    imdbId: 'tt12042730',
    title: 'Project Hail Mary',
    rottenTomatoesSlug: 'project_hail_mary',
    poster: 'https://placehold.co/400x600?text=Project+Hail+Mary',
  },
  {
    imdbId: 'tt22821434',
    title: 'Marty Supreme',
    rottenTomatoesSlug: 'marty_supreme',
    poster: 'https://placehold.co/400x600?text=Marty+Supreme',
  },
  {
    imdbId: 'tt11871428',
    title: 'Sinners',
    rottenTomatoesSlug: 'sinners',
    poster: 'https://placehold.co/400x600?text=Sinners',
  },
  {
    imdbId: 'tt27456085',
    title: 'Scream 7',
    rottenTomatoesSlug: 'scream_7',
    poster: 'https://placehold.co/400x600?text=Scream+7',
  },
];

async function seedDatabase() {
  console.log('\n[SEED] ======================================');
  console.log('[SEED] Starting database seed script...');
  console.log('[SEED] ======================================');

  try {
    const existing = db.prepare('SELECT COUNT(*) as count FROM movies').get();
    console.log(`[SEED] Current movies in DB: ${existing.count}`);

    if (existing.count > 0) {
      console.log('[SEED] ⚠️  Database already has movies. Skipping insert.');
      console.log('[SEED] To reset: delete ratings.db and run this script again.');
    } else {
      console.log(`[SEED] Inserting ${MOVIES.length} movies...`);

      for (const movie of MOVIES) {
        try {
          const id = insertMovie(movie);
          console.log(`[SEED] ✓ Inserted: ${movie.title} (ID: ${id})`);
        } catch (error) {
          console.error(`[SEED] ✗ Failed to insert ${movie.title}:`, error.message);
        }
      }

      const newCount = db.prepare('SELECT COUNT(*) as count FROM movies').get();
      console.log(`[SEED] ✓ Seed complete. Total movies: ${newCount.count}`);
    }
  } catch (error) {
    console.error('[SEED] ✗ Seed failed:', error.message);
    process.exit(1);
  }

  console.log('[SEED] ======================================\n');
}

// Run seed
seedDatabase().catch(console.error);
