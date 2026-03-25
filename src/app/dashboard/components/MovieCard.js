export default function MovieCard({ movie }) {
  return (
    <article className="bg-white rounded-xl shadow-md overflow-hidden">
      <img
        src={movie.poster}
        alt={`${movie.title} poster`}
        className="w-full h-80 object-cover"
      />
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-lg leading-tight">{movie.title}</h3>
        
        <div className="space-y-1 text-sm">
          <p className="text-gray-600">
            IMDb: <span className="font-medium">{movie.imdbRating}</span>
            {movie.imdbStatus && movie.imdbStatus !== 'ok' && (
              <span className="text-xs text-gray-400 ml-1">({movie.imdbStatus})</span>
            )}
          </p>
          
          <p className="text-gray-700">
            Rotten Tomatoes: <span className="font-medium">{movie.rottenTomatoes}</span>
            {movie.rottenTomatoesStatus && movie.rottenTomatoesStatus !== 'ok' && (
              <span className="text-xs text-gray-400 ml-1">({movie.rottenTomatoesStatus})</span>
            )}
          </p>

          <p className="text-gray-700">
            Metascore: <span className="font-medium">{movie.metascore}</span>
            {movie.metascoreStatus && movie.metascoreStatus !== 'ok' && (
              <span className="text-xs text-gray-400 ml-1">({movie.metascoreStatus})</span>
            )}
          </p>
        </div>

        {movie.liveFetchedAt && (
          <p className="text-xs text-gray-500 mt-2">
            Updated: {new Date(movie.liveFetchedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </article>
  );
}
