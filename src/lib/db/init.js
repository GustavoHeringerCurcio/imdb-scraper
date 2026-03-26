import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(process.cwd(), 'ratings.db');

export const db = new Database(dbPath);

/**
 * Initialize database tables on startup.
 * Creates movies, ratings, and job_logs tables if they don't exist.
 */
export function initializeDatabase() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imdbId TEXT UNIQUE,
        title TEXT NOT NULL,
        poster TEXT,
        rottenTomatoesSlug TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movieId INTEGER NOT NULL,
        source TEXT NOT NULL,
        value TEXT,
        status TEXT,
        url TEXT,
        scrapedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(movieId, source),
        FOREIGN KEY(movieId) REFERENCES movies(id)
      );

      CREATE TABLE IF NOT EXISTS job_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobType TEXT NOT NULL,
        status TEXT NOT NULL,
        movieCount INTEGER,
        startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        completedAt DATETIME,
        errorMessage TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_ratings_movieId ON ratings(movieId);
      CREATE INDEX IF NOT EXISTS idx_ratings_source ON ratings(source);
      CREATE INDEX IF NOT EXISTS idx_job_logs_startedAt ON job_logs(startedAt DESC);
    `);

    console.log('[DB-INIT] ✓ Database initialized at:', dbPath);
    return true;
  } catch (error) {
    console.error('[DB-INIT] ✗ Database initialization failed:', error.message);
    throw error;
  }
}

// Initialize on module load
initializeDatabase();

// Seed movies if table is empty
import('./seed.js').then(({ ensureMoviesSeeded }) => {
  ensureMoviesSeeded();
}).catch(err => {
  console.error('[DB-SEED] Error importing seed module:', err);
});
