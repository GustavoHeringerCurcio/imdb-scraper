import { db } from './init.js';

/**
 * Fetch latest ratings for given movie IDs
 * @param {number[]} movieIds - Array of movie IDs
 * @returns {object[]} Rating records grouped by movieId and source
 */
export function getLatestRatings(movieIds) {
  if (!movieIds || movieIds.length === 0) {
    return [];
  }

  const placeholders = movieIds.map(() => '?').join(',');
  const query = `
    SELECT 
      r.id,
      r.movieId,
      r.source,
      r.value,
      r.status,
      r.url,
      r.scrapedAt
    FROM ratings r
    WHERE r.movieId IN (${placeholders})
    ORDER BY r.movieId, r.source
  `;

  try {
    return db.prepare(query).all(...movieIds);
  } catch (error) {
    console.error('[DB-QUERY] Error fetching ratings:', error.message);
    return [];
  }
}

/**
 * Get all movies from database
 * @returns {object[]} All movie records
 */
export function getAllMovies() {
  try {
    return db.prepare('SELECT * FROM movies ORDER BY id').all();
  } catch (error) {
    console.error('[DB-QUERY] Error fetching movies:', error.message);
    return [];
  }
}

/**
 * Insert multiple ratings using transaction
 * Uses INSERT OR REPLACE to update existing ratings
 * @param {object[]} ratings - Array of rating objects {movieId, source, value, status, url}
 */
export function saveRatings(ratings) {
  if (!ratings || ratings.length === 0) {
    return;
  }

  try {
    const insert = db.prepare(`
      INSERT OR REPLACE INTO ratings 
      (movieId, source, value, status, url, scrapedAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    const transaction = db.transaction((ratingsToInsert) => {
      for (const rating of ratingsToInsert) {
        insert.run(
          rating.movieId,
          rating.source,
          rating.value,
          rating.status,
          rating.url
        );
      }
    });

    transaction(ratings);
    console.log('[DB-QUERY] ✓ Saved', ratings.length, 'ratings to database');
  } catch (error) {
    console.error('[DB-QUERY] Error saving ratings:', error.message);
    throw error;
  }
}

/**
 * Log a job run to job_logs table
 * @param {string} jobType - Type of job (e.g., 'daily_scrape')
 * @param {string} status - Status of job ('success' or 'failed')
 * @param {number} movieCount - Number of movies processed
 * @param {string} errorMessage - Error message if job failed
 */
export function logJobRun(jobType, status, movieCount, errorMessage = null) {
  try {
    db.prepare(`
      INSERT INTO job_logs (jobType, status, movieCount, completedAt, errorMessage)
      VALUES (?, ?, ?, datetime('now'), ?)
    `).run(jobType, status, movieCount, errorMessage);

    const logMsg = errorMessage
      ? `[DB-LOG] ✗ ${jobType} - ${status}: ${errorMessage}`
      : `[DB-LOG] ✓ ${jobType} - ${status} (${movieCount} movies)`;
    console.log(logMsg);
  } catch (error) {
    console.error('[DB-LOG] Error logging job:', error.message);
  }
}

/**
 * Insert a movie into the database
 * @param {object} movie - Movie object {imdbId, title, poster, rottenTomatoesSlug}
 * @returns {number} ID of inserted movie
 */
export function insertMovie(movie) {
  try {
    const result = db.prepare(`
      INSERT OR IGNORE INTO movies (imdbId, title, poster, rottenTomatoesSlug)
      VALUES (?, ?, ?, ?)
    `).run(movie.imdbId, movie.title, movie.poster, movie.rottenTomatoesSlug);

    return result.lastInsertRowid;
  } catch (error) {
    console.error('[DB-QUERY] Error inserting movie:', error.message);
    throw error;
  }
}

/**
 * Upsert a movie into the database (insert or update)
 * Used to sync OMDb data automatically
 * @param {object} movie - Movie object {imdbId, title, poster, rottenTomatoesSlug}
 * @returns {number} ID of movie
 */
export function upsertMovie(movie) {
  try {
    // First try to insert
    try {
      const result = db.prepare(`
        INSERT INTO movies (imdbId, title, poster, rottenTomatoesSlug)
        VALUES (?, ?, ?, ?)
      `).run(movie.imdbId, movie.title, movie.poster, movie.rottenTomatoesSlug);
      
      console.log(`[DB-QUERY] ✓ Inserted movie: ${movie.title} (IMDb: ${movie.imdbId})`);
      return result.lastInsertRowid;
    } catch (insertError) {
      // If unique constraint fails, update the existing record
      if (insertError.message.includes('UNIQUE')) {
        db.prepare(`
          UPDATE movies 
          SET title = ?, poster = ?, rottenTomatoesSlug = ?
          WHERE imdbId = ?
        `).run(movie.title, movie.poster, movie.rottenTomatoesSlug, movie.imdbId);
        
        const existing = db.prepare('SELECT id FROM movies WHERE imdbId = ?').get(movie.imdbId);
        console.log(`[DB-QUERY] ✓ Updated movie: ${movie.title} (IMDb: ${movie.imdbId})`);
        return existing.id;
      }
      throw insertError;
    }
  } catch (error) {
    console.error('[DB-QUERY] Error upserting movie:', error.message);
    throw error;
  }
}

/**
 * Get the latest job log entry
 * @returns {object|null} Last job log record or null
 */
export function getLastJobLog() {
  try {
    return db.prepare(`
      SELECT * FROM job_logs 
      ORDER BY startedAt DESC 
      LIMIT 1
    `).get();
  } catch (error) {
    console.error('[DB-QUERY] Error fetching last job log:', error.message);
    return null;
  }
}

/**
 * Get ratings for a specific movie
 * @param {number} movieId - Movie ID
 * @returns {object} Ratings object with imdb, rottenTomatoes, metascore
 */
export function getMovieRatings(movieId) {
  try {
    const ratings = db.prepare(`
      SELECT source, value, status, url, scrapedAt FROM ratings
      WHERE movieId = ?
    `).all(movieId);

    const result = {};
    for (const r of ratings) {
      result[r.source] = {
        value: r.value,
        status: r.status,
        url: r.url,
        scrapedAt: r.scrapedAt,
      };
    }
    return result;
  } catch (error) {
    console.error('[DB-QUERY] Error fetching movie ratings:', error.message);
    return {};
  }
}
