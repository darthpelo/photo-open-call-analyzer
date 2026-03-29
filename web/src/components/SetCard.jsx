import { thumbnailUrl } from '../api/client.js';

/**
 * SetCard displays a ranked set of photos (Polaroid mode) with composite score.
 */
export function SetCard({ set, projectName, rank }) {
  return (
    <div className="rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-800 dark:shadow-gray-900/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Set #{rank}</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{set.compositeScore?.toFixed(1)}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">/10</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {(set.photos || []).map((photo, i) => (
          <div key={photo.filename || i} className="relative">
            <img
              src={thumbnailUrl(projectName, photo.filename)}
              alt={`Set photo: ${photo.filename}`}
              loading="lazy"
              className="w-full h-32 object-cover rounded"
            />
            <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
              {photo.individualScore?.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>Individual avg: {set.individualAverage?.toFixed(1)}</span>
        <span>Set score: {set.setWeightedAverage?.toFixed(1)}</span>
      </div>
      {set.recommendation && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{set.recommendation}</p>
      )}
    </div>
  );
}
