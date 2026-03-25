import { scrapeImdbRating } from '../scrapers/imdb';
import { scrapeRottenTomatoesRating } from '../scrapers/rottenTomatoes';
import { scrapeMetacriticRating } from '../scrapers/metacritic';

export async function getLiveRatingsForMovie(movie) {
  console.log(`[SCRAPER-INPUT] Movie: ${movie.id}`, {
    title: movie.title,
    imdbID: movie.imdbID || '⚠️ NULL (will fail)',
    rottenTomatoesSlug: movie.rottenTomatoesSlug || '⚠️ NULL (will fail)',
  });

  const imdb = await scrapeImdbRating(movie.imdbID);
  const rottenTomatoes = await scrapeRottenTomatoesRating(movie.rottenTomatoesSlug);
  const metascore = await scrapeMetacriticRating(movie.title);

  console.log(`[SCRAPER-OUTPUT] ${movie.id}:`, {
    imdb: { value: imdb.value, status: imdb.status },
    rottenTomatoes: { value: rottenTomatoes.value, status: rottenTomatoes.status },
    metascore: { value: metascore.value, status: metascore.status },
  });

  return {
    id: movie.id,
    imdb,
    rottenTomatoes,
    metascore,
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
