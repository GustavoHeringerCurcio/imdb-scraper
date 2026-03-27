export const MOVIES = [
  {
    title: 'Project Hail Mary',
    rottenTomatoesSlug: 'project_hail_mary',
  },
  {
    title: 'Marty Supreme',
    rottenTomatoesSlug: 'marty_supreme',
  },
  {
    title: 'Sinners',
    rottenTomatoesSlug: 'sinners',
  },
  {
    title: 'Scream 7',
    rottenTomatoesSlug: 'scream_7',
  },
];

export const MOVIE_TITLES = MOVIES.map((movie) => movie.title);

export const ROTTEN_TOMATOES_SLUG_BY_TITLE = Object.fromEntries(
  MOVIES.map((movie) => [movie.title, movie.rottenTomatoesSlug])
);

export const FALLBACK_POSTER = 'https://placehold.co/400x600?text=No+Poster';
