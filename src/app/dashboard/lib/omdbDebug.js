import {
  FALLBACK_POSTER,
  OMDB_API_KEY,
  ROTTEN_TOMATOES_SLUG_BY_TITLE,
} from '../constants';

function mapMovieResponse(movie, title, index) {
  const isValid = movie?.Response === 'True';
  const rtSlug = ROTTEN_TOMATOES_SLUG_BY_TITLE[title];

  // DEBUG: Log what OMDb is actually returning
  console.log(`[OMDb-MAPPER] ${title}:`, {
    Response: movie?.Response,
    imdbID: movie?.imdbID || '⚠️ MISSING',
    Title: movie?.Title,
    Poster: movie?.Poster ? '✓' : '✗',
    RTSlug: rtSlug || '⚠️ MISSING',
  });

  return {
    id: `${title}-${index}`,
    title: isValid ? movie.Title : title,
    imdbID: isValid ? movie.imdbID : null,
    rottenTomatoesSlug: rtSlug || null,
    poster: isValid && movie.Poster !== 'N/A' ? movie.Poster : FALLBACK_POSTER,
    imdbRating: 'N/A',
    rottenTomatoes: 'N/A',
  };
}

export async function fetchMoviesByTitles(movieTitles) {
  console.log(`[OMDb-FETCH] Fetching ${movieTitles.length} movies from OMDb API`);
  
  const requests = movieTitles.map((title) => {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`;
    return fetch(url).then((response) => response.json());
  });

  const results = await Promise.all(requests);

  const mapped = results.map((movie, index) =>
    mapMovieResponse(movie, movieTitles[index], index)
  );

  console.log(`[OMDb-MAPPED] Processed movies:`, 
    mapped.map(m => ({
      id: m.id,
      imdbID: m.imdbID,
      rottenTomatoesSlug: m.rottenTomatoesSlug
    }))
  );

  return mapped;
}
