const OMDB_API_KEY = process.env.NEXT_PUBLIC_OMDB_API_KEY || 'd81d197';
const ROTTEN_TOMATOES_SLUG_OVERRIDES = {};
const FALLBACK_POSTER = 'https://placehold.co/400x600?text=No+Poster';

function parseRottenTomatoesFromRatings(ratings) {
  if (!Array.isArray(ratings)) {
    return null;
  }

  const rt = ratings.find((entry) => entry?.Source === 'Rotten Tomatoes');
  return rt?.Value || null;
}

function toOmdbRating(value, isMatch) {
  if (!isMatch) {
    return {
      value: null,
      status: 'omdb-no-match',
    };
  }

  if (!value || value === 'N/A') {
    return {
      value: null,
      status: 'omdb-not-rated-yet',
    };
  }

  return {
    value,
    status: 'omdb',
  };
}

function buildRottenTomatoesSlug(title, releaseYear) {
  if (!title) {
    return null;
  }

  const normalized = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  if (!normalized) {
    return null;
  }

  return releaseYear ? `${normalized}_${releaseYear}` : normalized;
}

function mapMovieResponse(movie, title, index, fallbackMovie = null) {
  const isValid = movie?.Response === 'True';
  const effectiveTitle = isValid ? movie.Title : title;
  const parsedYear = movie?.Year ? Number.parseInt(movie.Year, 10) : Number.NaN;
  const releaseYear = Number.isFinite(parsedYear) ? parsedYear : null;
  const rtSlug =
    ROTTEN_TOMATOES_SLUG_OVERRIDES[effectiveTitle] ||
    buildRottenTomatoesSlug(effectiveTitle, releaseYear);


  const imdb = toOmdbRating(movie?.imdbRating, isValid);
  const metascore = toOmdbRating(movie?.Metascore, isValid);
  const rottenTomatoes = toOmdbRating(parseRottenTomatoesFromRatings(movie?.Ratings), isValid);

  return {
    id: fallbackMovie?.id || `${title}-${index}`,
    tmdbId: fallbackMovie?.tmdbId || null,
    releaseDate: fallbackMovie?.releaseDate || null,
    title: effectiveTitle,
    imdbID: isValid ? movie.imdbID : null,
    rottenTomatoesSlug: rtSlug,
    poster:
      isValid && movie.Poster !== 'N/A'
        ? movie.Poster
        : fallbackMovie?.poster || FALLBACK_POSTER,
    imdbRating: imdb.value,
    imdbStatus: imdb.status,
    rottenTomatoes: rottenTomatoes.value,
    rottenTomatoesStatus: rottenTomatoes.status,
    metascore: metascore.value,
    metascoreStatus: metascore.status,
  };
}

export async function fetchMoviesByTitles(movieTitles, options = {}) {
  if (!Array.isArray(movieTitles) || movieTitles.length === 0) {
    return [];
  }

  const fallbackByTitle = options?.fallbackByTitle || {};


  const requests = movieTitles.map((title) => {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`;
    return fetch(url).then((response) => response.json());
  });

  const results = await Promise.all(requests);
  const mapped = results.map((movie, index) => {
    const title = movieTitles[index];
    return mapMovieResponse(movie, title, index, fallbackByTitle[title] || null);
  });


  return mapped;
}
