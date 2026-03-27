#!/usr/bin/env node

import { db } from '../lib/db/init.js';

function getDuplicateTitles() {
  return db.prepare(`
    SELECT title, COUNT(*) AS count
    FROM movies
    GROUP BY title
    HAVING COUNT(*) > 1
    ORDER BY title
  `).all();
}

function getMoviesByTitle(title) {
  return db.prepare(`
    SELECT id, imdbId, title, poster, rottenTomatoesSlug, createdAt
    FROM movies
    WHERE title = ?
    ORDER BY datetime(createdAt) DESC, id DESC
  `).all(title);
}

function mergeRatingsIntoKeeper(keeperId, oldId) {
  const oldRatings = db.prepare(`
    SELECT source, value, status, url, scrapedAt
    FROM ratings
    WHERE movieId = ?
  `).all(oldId);

  for (const row of oldRatings) {
    db.prepare(`
      INSERT INTO ratings (movieId, source, value, status, url, scrapedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(movieId, source) DO UPDATE SET
        value = CASE WHEN excluded.scrapedAt > ratings.scrapedAt THEN excluded.value ELSE ratings.value END,
        status = CASE WHEN excluded.scrapedAt > ratings.scrapedAt THEN excluded.status ELSE ratings.status END,
        url = CASE WHEN excluded.scrapedAt > ratings.scrapedAt THEN excluded.url ELSE ratings.url END,
        scrapedAt = CASE WHEN excluded.scrapedAt > ratings.scrapedAt THEN excluded.scrapedAt ELSE ratings.scrapedAt END
    `).run(keeperId, row.source, row.value, row.status, row.url, row.scrapedAt);
  }

  db.prepare('DELETE FROM ratings WHERE movieId = ?').run(oldId);
}

function normalizeDuplicateTitles() {
  const duplicates = getDuplicateTitles();

  if (duplicates.length === 0) {
    console.log('[NORMALIZE-DB] No duplicate movie titles found.');
    return { titlesProcessed: 0, removedMovies: 0 };
  }

  let removedMovies = 0;

  const tx = db.transaction(() => {
    for (const dup of duplicates) {
      const rows = getMoviesByTitle(dup.title);
      const keeper = rows[0];
      const oldRows = rows.slice(1);

      console.log(`[NORMALIZE-DB] Title: ${dup.title}`);
      console.log(`[NORMALIZE-DB] Keeping ID ${keeper.id} (IMDb: ${keeper.imdbId})`);

      for (const oldRow of oldRows) {
        console.log(`[NORMALIZE-DB] Merging old ID ${oldRow.id} (IMDb: ${oldRow.imdbId}) into ID ${keeper.id}`);
        mergeRatingsIntoKeeper(keeper.id, oldRow.id);
        db.prepare('DELETE FROM movies WHERE id = ?').run(oldRow.id);
        removedMovies++;
      }
    }
  });

  tx();

  return {
    titlesProcessed: duplicates.length,
    removedMovies,
  };
}

function printSummary() {
  const totals = {
    movies: db.prepare('SELECT COUNT(*) AS c FROM movies').get().c,
    ratings: db.prepare('SELECT COUNT(*) AS c FROM ratings').get().c,
    jobs: db.prepare('SELECT COUNT(*) AS c FROM job_logs').get().c,
  };

  const movies = db.prepare(`
    SELECT id, imdbId, title, rottenTomatoesSlug, createdAt
    FROM movies
    ORDER BY id
  `).all();

  console.log('\n[NORMALIZE-DB] Final counts:', totals);
  console.table(movies);
}

try {
  console.log('\n[NORMALIZE-DB] Starting movie normalization...');
  const before = db.prepare('SELECT COUNT(*) AS c FROM movies').get().c;
  const result = normalizeDuplicateTitles();
  const after = db.prepare('SELECT COUNT(*) AS c FROM movies').get().c;

  console.log('[NORMALIZE-DB] Done:', {
    beforeMovies: before,
    afterMovies: after,
    titlesProcessed: result.titlesProcessed,
    removedMovies: result.removedMovies,
  });

  printSummary();
} catch (error) {
  console.error('[NORMALIZE-DB] Failed:', error.message);
  process.exit(1);
}
