import { db } from './init.js';
import { insertMovie } from './queries.js';

/**
 * Seed database with initial movie data
 * This should be called once to populate the movies table
 */
export function seedMovies() {
  const movies = [
    {
      imdbId: 'tt12042730',
      title: 'Project Hail Mary',
      poster: 'https://m.media-amazon.com/images/M/MV5BYzc2ODcyYTItODI2YS00ZjM1LWI4YjItMjE4MzBiOTQwNWFmXkEyXkFqcGdeQXVyMjkwOTAyMDU@._V1_SX300.jpg',
      rottenTomatoesSlug: 'project_hail_mary',
    },
    {
      imdbId: 'tt22821434',
      title: 'Marty Supreme',
      poster: 'https://m.media-amazon.com/images/M/MV5BNWZmY2U3ZTItNjU4OS00ZDUwLTg2MjItNWNhMzY1MGNkYTUwXkEyXkFqcGdeQXVyMzQ0ODE3NQ@@._V1_SX300.jpg',
      rottenTomatoesSlug: 'marty_supreme',
    },
    {
      imdbId: 'tt11871428',
      title: 'Sinners',
      poster: 'https://m.media-amazon.com/images/M/MV5BMzA2OGQ3YzctYmE3ZC00Nzc1LWE3NzItM2FlYTAwMzJkMGMzXkEyXkFqcGdeQXVyODk2NzAyMTA@._V1_SX300.jpg',
      rottenTomatoesSlug: 'sinners_2023',
    },
    {
      imdbId: 'tt27456085',
      title: 'Scream 7',
      poster: 'https://placehold.co/400x600?text=Scream+VII',
      rottenTomatoesSlug: 'scream_vii',
    },
  ];

  console.log('[SEED] Seeding database with initial movies...');

  try {
    for (const movie of movies) {
      insertMovie(movie);
      console.log(`[SEED] ✓ Inserted: ${movie.title}`);
    }
    console.log(`[SEED] ✓ Successfully seeded ${movies.length} movies`);
  } catch (error) {
    console.error('[SEED] ✗ Error seeding database:', error.message);
  }
}

/**
 * Check if database has any movies; if not, seed with placeholder data
 * NOTE: This is optional. In production, movies are synced from OMDb API.
 */
export function ensureMoviesSeeded() {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM movies').get();
    if (count.count === 0) {
      console.log('[SEED] Database is empty, seeding with placeholder data...');
      console.log('[SEED] NOTE: Real movie data will be synced from OMDb API on first dashboard load');
      seedMovies();
    } else {
      console.log(`[SEED] Database already has ${count.count} movies, skipping seed`);
      console.log('[SEED] Movies are synced from OMDb API dynamically');
    }
  } catch (error) {
    console.error('[SEED] Error checking movies:', error.message);
  }
}
