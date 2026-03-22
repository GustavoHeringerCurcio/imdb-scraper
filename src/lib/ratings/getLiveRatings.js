import { scrapeImdbRating } from '../scrapers/imdb';
import { scrapeRottenTomatoesRating } from '../scrapers/rottenTomatoes';

export async function getLiveRatingsForMovie(movie) {
  console.log(`[SCRAPER-INPUT] Movie: ${movie.id}`, {
    title: movie.title,
    imdbID: movie.imdbID || '⚠️ NULL (will fail)',
    rottenTomatoesSlug: movie.rottenTomatoesSlug || '⚠️ NULL (will fail)',
  });

  const imdb = await scrapeImdbRating(movie.imdbID);
  const rottenTomatoes = await scrapeRottenTomatoesRating(movie.rottenTomatoesSlug);

  console.log(`[SCRAPER-OUTPUT] ${movie.id}:`, {
    imdb: { value: imdb.value, status: imdb.status },
    rottenTomatoes: { value: rottenTomatoes.value, status: rottenTomatoes.status },
  });

  return {
    id: movie.id,
    imdb,
    rottenTomatoes,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getLiveRatingsForMovies(movies) {
  console.log(`[SCRAPER-BATCH] Processing ${movies.length} movies`);
  const requests = movies.map((movie) => getLiveRatingsForMovie(movie));
  const results = await Promise.all(requests);
  console.log(`[SCRAPER-BATCH-DONE] Results received for ${results.length} movies`);
  return results;
}
