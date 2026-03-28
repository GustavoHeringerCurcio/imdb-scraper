
'use client';
import { useEffect, useState } from 'react';
import MovieCard from './components/MovieCard';
import { fetchMoviesByTitles } from '@/lib/services/omdb.js';

const NOW_PLAYING_LANGUAGE = 'en-US';
const MIN_DASHBOARD_POPULARITY = 30.000;

async function fetchNowPlayingMovies() {
  const response = await fetch(
    `/api/movies/now-playing?language=${encodeURIComponent(NOW_PLAYING_LANGUAGE)}`,
    {
      method: 'GET',
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'TMDB now-playing request failed');
  }

  const payload = await response.json();
  return Array.isArray(payload?.movies) ? payload.movies : [];
}

function logTmdbSignalsForEveryMovie(movies) {
  movies.forEach((movie) => {
    console.log(`[TMDB-MOVIE-JSON] ${JSON.stringify(movie, null, 2)}`);
    console.debug(
      `[TMDB-SIGNALS] ${movie.title} | popularity: ${movie.popularity ?? 'not-found'} | vote_average: ${movie.voteAverage ?? 'not-found'} | vote_count: ${movie.voteCount ?? 'not-found'}`
    );
  });
}

export default function MovieDashboard() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emptyMessage, setEmptyMessage] = useState('');

  const loadMovies = async () => {
    setLoading(true);
    setError('');
    setEmptyMessage('');

    try {
      const nowPlayingMovies = await fetchNowPlayingMovies();
      logTmdbSignalsForEveryMovie(nowPlayingMovies);

      if (nowPlayingMovies.length === 0) {
        setMovies([]);
        setEmptyMessage('No now-playing movies returned by TMDB for Brazil.');
        return;
      }

      const popularNowPlayingMovies = nowPlayingMovies.filter(
        (movie) => Number(movie?.popularity ?? 0) >= MIN_DASHBOARD_POPULARITY
      );

      if (popularNowPlayingMovies.length === 0) {
        setMovies([]);
        setEmptyMessage(
          `No now-playing movies reached popularity ${MIN_DASHBOARD_POPULARITY}+ on TMDB.`
        );
        return;
      }

      const fallbackByTitle = Object.fromEntries(
        popularNowPlayingMovies.map((movie) => [movie.title, movie])
      );

      const movieTitles = popularNowPlayingMovies.map((movie) => movie.title);
      let baseMovies;

      try {
        baseMovies = await fetchMoviesByTitles(movieTitles, {
          fallbackByTitle,
        });
      } catch {
        baseMovies = popularNowPlayingMovies.map((movie) => ({
          id: movie.id,
          tmdbId: movie.tmdbId,
          releaseDate: movie.releaseDate,
          title: movie.title,
          imdbID: null,
          rottenTomatoesSlug: null,
          poster: movie.poster,
          imdbRating: 'not-found',
          imdbStatus: 'omdb-request-failed',
          rottenTomatoes: 'not-found',
          rottenTomatoesStatus: 'omdb-request-failed',
          metascore: 'not-found',
          metascoreStatus: 'omdb-request-failed',
        }));
      }

      setMovies(baseMovies);
    } catch {
      setError('Could not load movie data from TMDB/OMDb.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Movie Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing now-playing movies in Brazil from TMDB with OMDb ratings.
            </p>
          </div>
        </div>

        {loading && <p className="text-sm text-blue-700">Loading movies...</p>}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && emptyMessage && (
          <p className="text-sm text-amber-700">{emptyMessage}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
