import { photoUrl } from '../api/client.js';

function getFilename(photoPath) {
  return photoPath.split('/').pop();
}

/**
 * PhotoDetail shows an expanded overlay with full-size photo,
 * all criterion scores, and feedback text.
 */
export function PhotoDetail({ photo, projectName, onClose }) {
  if (!photo) return null;

  const filename = getFilename(photo.photo);
  const fullSrc = photoUrl(projectName, filename);
  const scores = photo.individual_scores || {};

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-label={`Photo detail: ${filename}`}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{filename}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="md:flex">
          <div className="md:w-2/3">
            <img
              src={fullSrc}
              alt={`Full size photo: ${filename}`}
              loading="lazy"
              className="w-full object-contain"
            />
          </div>
          <div className="md:w-1/3 p-4">
            <div className="mb-4">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{photo.overall_score}</span>
              <span className="text-gray-400 dark:text-gray-500 text-lg">/10</span>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Rank #{photo.rank}</span>
            </div>

            {Object.keys(scores).length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Criterion Scores</h3>
                <div className="space-y-2">
                  {Object.entries(scores).map(([name, data]) => (
                    <div key={name} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{name}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{data.score}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {photo.recommendation && (
              <div className="mb-4">
                <h3 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Recommendation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{photo.recommendation}</p>
              </div>
            )}

            {photo.feedback && (
              <div>
                <h3 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Feedback</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{photo.feedback}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
