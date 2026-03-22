
'use client';
import { useEffect, useState } from 'react';
import MovieCard from './components/MovieCard';
import { MOVIE_TITLES } from './constants';
import { fetchMoviesByTitles } from './lib/omdbDebug';

async function fetchLiveRatings(movies) {
  console.log(`[DASHBOARD] Calling /api/ratings/live with ${movies.length} movies`);
  const response = await fetch('/api/ratings/live', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      movies: movies.map((movie) => ({
        id: movie.id,
        imdbID: movie.imdbID,
        rottenTomatoesSlug: movie.rottenTomatoesSlug,
      })),
    }),
  });

  console.log(`[DASHBOARD] API response status: ${response.status}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Live ratings endpoint returned ${response.status}: ${errorData.error}`);
  }

  const data = await response.json();
  console.log(`[DASHBOARD] ✓ Received live ratings for ${data.liveRatings?.length || 0} movies`);
  return data;
}

function mergeWithLiveRatings(movies, liveRatings) {
  const ratingsById = new Map(liveRatings.map((entry) => [entry.id, entry]));

  return movies.map((movie) => {
    const live = ratingsById.get(movie.id);

    return {
      ...movie,
      // Always use scraped value if available, else 'N/A'
      imdbRating: live?.imdb?.value && live.imdb.value !== 'N/A' 
        ? live.imdb.value 
        : 'N/A',
      rottenTomatoes: live?.rottenTomatoes?.value && live.rottenTomatoes.value !== 'N/A'
        ? live.rottenTomatoes.value
        : 'N/A',
      // Track source/status for debugging
      imdbStatus: live?.imdb?.status || 'no-data',
      rottenTomatoesStatus: live?.rottenTomatoes?.status || 'no-data',
      liveFetchedAt: live?.fetchedAt || null,
    };
  });
}

export default function MovieDashboard() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMovies = async () => {
    setLoading(true);
    setError('');

    try {
      const baseMovies = await fetchMoviesByTitles(MOVIE_TITLES);

      try {
        const liveRatingsPayload = await fetchLiveRatings(baseMovies);
        const withLiveRatings = mergeWithLiveRatings(baseMovies, liveRatingsPayload.liveRatings || []);
        console.log('[DASHBOARD] ✓ Merged live ratings, setting movies state');
        setMovies(withLiveRatings);
      } catch (liveError) {
        console.error('[DASHBOARD] ✗ Live ratings fetch failed:', liveError.message);
        console.warn('[DASHBOARD] Showing base OMDb data only (no live ratings)');
        setMovies(baseMovies); // Fallback to OMDb-only data
      }
    } catch (fetchError) {
      console.error('[DASHBOARD] Failed to fetch movies:', fetchError);
      setError('Could not load movie data from OMDb.');
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
        <h2 className="text-2xl font-bold">Simple Movie Dashboard</h2>
        <p className="text-sm text-gray-600">
          Your fixed 4-movie list is fetched automatically when the page renders.
        </p>

        {loading && <p className="text-sm text-blue-700">Loading movies...</p>}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}