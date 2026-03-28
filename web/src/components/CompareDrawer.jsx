import { thumbnailUrl } from '../api/client.js';

function getFilename(photoPath) {
  return photoPath.split('/').pop();
}

/**
 * CompareDrawer shows 2-3 selected photos side-by-side for comparison.
 * Slides in from the bottom when photos are selected.
 */
export function CompareDrawer({ photos, projectName, onClear }) {
  if (!photos || photos.length < 2) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          Comparing {photos.length} photos
        </h3>
        <button
          onClick={onClear}
          className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Clear
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto">
        {photos.map((photo) => {
          const filename = getFilename(photo.photo);
          const scores = photo.individual_scores || {};
          return (
            <div key={photo.photo} className="flex-shrink-0 w-64">
              <img
                src={thumbnailUrl(projectName, filename)}
                alt={`Photo: ${filename}`}
                loading="lazy"
                className="w-full h-32 object-cover rounded"
              />
              <div className="mt-2">
                <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{filename}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{photo.overall_score}/10</div>
                {Object.entries(scores).map(([name, data]) => (
                  <div key={name} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>{name}</span>
                    <span>{data.score}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
