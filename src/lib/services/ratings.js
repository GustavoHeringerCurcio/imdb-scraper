import { scrapeImdbRating } from '@/lib/scrapers/imdb.js';
import { scrapeRottenTomatoesRating } from '@/lib/scrapers/rottenTomatoes.js';

export async function getLiveRatingsForMovie(movie) {
  console.log(`[SCRAPER-INPUT] Movie: ${movie.id}`, {
    title: movie.title,
    imdbID: movie.imdbID || 'NULL (will fail)',
    rottenTomatoesSlug: movie.rottenTomatoesSlug || 'NULL (will fail)',
  });

  const imdbResponse = await scrapeImdbRating(movie.imdbID);

  let imdb;
  let metascore;

  if (imdbResponse.imdbRating) {
    imdb = imdbResponse.imdbRating;
  } else {
    imdb = imdbResponse.source === 'IMDb' ? imdbResponse : { value: 'N/A', status: 'error' };
  }

  if (imdbResponse.metascore) {
    metascore = imdbResponse.metascore;
  } else {
    metascore = { value: 'N/A', status: 'parse-error', url: imdbResponse.imdbRating?.url };
  }

  const rottenTomatoes = await scrapeRottenTomatoesRating(movie.rottenTomatoesSlug);

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
