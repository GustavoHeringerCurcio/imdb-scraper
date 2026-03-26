
'use client';
import { useEffect, useState } from 'react';
import MovieCard from './components/MovieCard';
import { MOVIE_TITLES } from './constants';
import { fetchMoviesByTitles } from './lib/omdbDebug';

// Sync OMDb movies to database (auto-updates IMDb IDs, posters, titles)
async function syncMoviesToDatabase(movies) {
  console.log(`[DASHBOARD] Syncing ${movies.length} movies to database...`);
  try {
    const response = await fetch('/api/movies/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ movies }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[DASHBOARD] ✓ Synced ${data.synced} movies to database`);
    } else {
      console.warn('[DASHBOARD] ⚠️ Database sync failed, but continuing anyway');
    }
  } catch (error) {
    console.warn('[DASHBOARD] ⚠️ Could not sync to database:', error.message);
  }
}

async function fetchCachedRatings(movies) {
  console.log(`[DASHBOARD] Calling /api/ratings/cached with ${movies.length} movies`);
  const response = await fetch('/api/ratings/cached', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      movies: movies.map((movie) => ({
        id: movie.id,
        title: movie.title,
        imdbID: movie.imdbID,
        rottenTomatoesSlug: movie.rottenTomatoesSlug,
      })),
    }),
  });

  console.log(`[DASHBOARD] API response status: ${response.status}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Cached ratings endpoint returned ${response.status}: ${errorData.error}`);
  }

  const data = await response.json();
  console.log(`[DASHBOARD] ✓ Received cached ratings for ${data.liveRatings?.length || 0} movies`);
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
      metascore: live?.metascore?.value && live.metascore.value !== 'N/A'
        ? live.metascore.value
        : 'N/A',
      // Track source/status for debugging
      imdbStatus: live?.imdb?.status || 'no-data',
      rottenTomatoesStatus: live?.rottenTomatoes?.status || 'no-data',
      metascoreStatus: live?.metascore?.status || 'no-data',
      liveFetchedAt: live?.imdb?.scrapedAt || null,
    };
  });
}

export default function MovieDashboard() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadMovies = async () => {
    setLoading(true);
    setError('');

    try {
      const baseMovies = await fetchMoviesByTitles(MOVIE_TITLES);

      // IMPORTANT: Sync OMDb data to database (updates IMDb IDs, posters, etc)
      await syncMoviesToDatabase(baseMovies);

      try {
        const cachedRatingsPayload = await fetchCachedRatings(baseMovies);
        const withCachedRatings = mergeWithLiveRatings(baseMovies, cachedRatingsPayload.liveRatings || []);
        console.log('[DASHBOARD] ✓ Merged cached ratings, setting movies state');
        setMovies(withCachedRatings);
      } catch (cachedError) {
        console.error('[DASHBOARD] ✗ Cached ratings fetch failed:', cachedError.message);
        console.warn('[DASHBOARD] Showing base OMDb data only (no ratings in database yet)');
        setMovies(baseMovies); // Fallback to OMDb-only data
      }
    } catch (fetchError) {
      console.error('[DASHBOARD] Failed to fetch movies:', fetchError);
      setError('Could not load movie data from OMDb.');
    } finally {
      setLoading(false);
    }
  };

  const refreshRatingsNow = async () => {
    setRefreshing(true);
    console.log('[DASHBOARD] Starting manual refresh...');

    try {
      const response = await fetch('/api/ratings/refresh-now', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[DASHBOARD] ✓ Refresh completed:', data.message);
        // Reload movies from cache
        await loadMovies();
      } else {
        const error = await response.json();
        console.error('[DASHBOARD] ✗ Refresh failed:', error.error);
        setError('Failed to refresh ratings');
      }
    } catch (error) {
      console.error('[DASHBOARD] ✗ Refresh error:', error.message);
      setError('Error refreshing ratings');
    } finally {
      setRefreshing(false);
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
              Ratings updated daily at 2 AM. Showing cached data from database.
            </p>
          </div>
          <button
            onClick={refreshRatingsNow}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {refreshing ? '⏳ Refreshing...' : '🔄 Refresh Ratings Now'}
          </button>
        </div>

        {loading && <p className="text-sm text-blue-700">⏳ Loading movies...</p>}

        {error && <p className="text-sm text-red-600">❌ {error}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}