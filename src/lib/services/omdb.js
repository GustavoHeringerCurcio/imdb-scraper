import {
  FALLBACK_POSTER,
  ROTTEN_TOMATOES_SLUG_BY_TITLE,
} from '@/lib/config/movies.js';

const OMDB_API_KEY = process.env.NEXT_PUBLIC_OMDB_API_KEY || 'd81d197';
const ENABLE_OMDB_DEBUG_LOGS = process.env.NEXT_PUBLIC_OMDB_DEBUG === 'true';

function mapMovieResponse(movie, title, index) {
  const isValid = movie?.Response === 'True';
  const rtSlug = ROTTEN_TOMATOES_SLUG_BY_TITLE[title] || null;

  if (ENABLE_OMDB_DEBUG_LOGS) {
    console.log(`[OMDb-MAPPER] ${title}:`, {
      Response: movie?.Response,
      imdbID: movie?.imdbID || 'MISSING',
      Title: movie?.Title,
      Poster: movie?.Poster ? 'present' : 'missing',
      RTSlug: rtSlug || 'MISSING',
    });
  }

  return {
    id: `${title}-${index}`,
    title: isValid ? movie.Title : title,
    imdbID: isValid ? movie.imdbID : null,
    rottenTomatoesSlug: rtSlug,
    poster: isValid && movie.Poster !== 'N/A' ? movie.Poster : FALLBACK_POSTER,
    imdbRating: 'N/A',
    rottenTomatoes: 'N/A',
  };
}

export async function fetchMoviesByTitles(movieTitles) {
  if (!Array.isArray(movieTitles) || movieTitles.length === 0) {
    return [];
  }

  if (ENABLE_OMDB_DEBUG_LOGS) {
    console.log(`[OMDb-FETCH] Fetching ${movieTitles.length} movies from OMDb API`);
  }

  const requests = movieTitles.map((title) => {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`;
    return fetch(url).then((response) => response.json());
  });

  const results = await Promise.all(requests);
  const mapped = results.map((movie, index) => mapMovieResponse(movie, movieTitles[index], index));

  if (ENABLE_OMDB_DEBUG_LOGS) {
    console.log(
      '[OMDb-MAPPED] Processed movies:',
      mapped.map((movie) => ({
        id: movie.id,
        imdbID: movie.imdbID,
        rottenTomatoesSlug: movie.rottenTomatoesSlug,
      }))
    );
  }

  return mapped;
}
