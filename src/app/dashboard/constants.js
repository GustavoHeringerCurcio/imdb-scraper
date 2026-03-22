export const MOVIE_TITLES = [
  'Project Hail Mary',
  'Marty Supreme',
  'Sinners',
  'Scream 7',
];

// IMDb ID and Rotten Tomatoes slug mappings for live scraping
export const MOVIE_IDENTIFIERS = {
  'Project Hail Mary': { imdbID: 'tt12042730', rtSlug: 'project_hail_mary' },
  'Marty Supreme': { imdbID: 'tt22821434', rtSlug: 'marty_supreme' },
  'Sinners': { imdbID: 'tt11871428', rtSlug: 'sinners_2023' },
  'Scream 7': { imdbID: 'tt27456085', rtSlug: 'scream_vii' },
};

// CRITICAL: These slugs MUST match actual Rotten Tomatoes URLs
// Search each movie on RT and extract from URL: rottentomatoes.com/m/{SLUG}
export const ROTTEN_TOMATOES_SLUG_BY_TITLE = {
  'Project Hail Mary': 'project_hail_mary',
  'Marty Supreme': 'marty_supreme',
  Sinners: 'sinners',  // Verify: might be 'sinners_2023'
  'Scream 7': 'scream_7',  // Verify: might not exist if unreleased
};

export const FALLBACK_POSTER = 'https://placehold.co/400x600?text=No+Poster';
export const FALLBACK_RATING = 'Not rated';
export const OMDB_API_KEY = process.env.NEXT_PUBLIC_OMDB_API_KEY || 'd81d197';
