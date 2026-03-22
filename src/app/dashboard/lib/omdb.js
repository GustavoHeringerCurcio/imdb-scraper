import {
  FALLBACK_POSTER,
  OMDB_API_KEY,
  ROTTEN_TOMATOES_SLUG_BY_TITLE,
} from '../constants';

function mapMovieResponse(movie, title, index) {
  const isValid = movie?.Response === 'True';
  const rtSlug = ROTTEN_TOMATOES_SLUG_BY_TITLE[title];

  return {
    id: `${title}-${index}`,
    title: isValid ? movie.Title : title,
    imdbID: isValid ? movie.imdbID : null,
    rottenTomatoesSlug: rtSlug || null,
    poster: isValid && movie.Poster !== 'N/A' ? movie.Poster : FALLBACK_POSTER,
    // Initialize with N/A; scrapers will fill these
    imdbRating: 'N/A',
    rottenTomatoes: 'N/A',
  };
}

export async function fetchMoviesByTitles(movieTitles) {
  const requests = movieTitles.map((title) => {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`;
    return fetch(url).then((response) => response.json());
  });

  const results = await Promise.all(requests);

  return results.map((movie, index) =>
    mapMovieResponse(movie, movieTitles[index], index)
  );
}
