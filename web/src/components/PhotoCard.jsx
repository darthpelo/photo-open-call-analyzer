import { thumbnailUrl } from '../api/client.js';

/**
 * Extract filename from a photo path.
 * @param {string} photoPath - e.g. "photos/sunset.jpg" or "sunset.jpg"
 * @returns {string}
 */
function getFilename(photoPath) {
  return photoPath.split('/').pop();
}

const TIER_COLORS = {
  top: 'bg-green-600',
  mid: 'bg-yellow-500',
  low: 'bg-red-500',
};

/**
 * PhotoCard displays a photo thumbnail with score, rank, and tier badge.
 */
export function PhotoCard({ photo, projectName, onClick, selectable, selected, onToggleSelect }) {
  const filename = getFilename(photo.photo);
  const thumbSrc = thumbnailUrl(projectName, filename);

  return (
    <div className="relative rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-800 dark:shadow-gray-900/30 focus-within:ring-2 focus-within:ring-blue-500">
      {selectable && (
        <input
          type="checkbox"
          className="absolute top-2 left-2 z-10 w-5 h-5 accent-blue-600"
          checked={selected || false}
          onChange={() => onToggleSelect?.(photo)}
          aria-label={`Select ${filename} for comparison`}
        />
      )}
      <img
        src={thumbSrc}
        alt={`Photo: ${filename}`}
        loading="lazy"
        className="w-full h-48 object-cover cursor-pointer"
        onClick={() => onClick?.(photo)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(photo); } }}
        tabIndex={0}
      />
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{filename}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">#{photo.rank}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{photo.overall_score}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">/10</span>
          {photo.tier && (
            <span className={`text-xs text-white px-2 py-0.5 rounded-full ${TIER_COLORS[photo.tier] || 'bg-gray-400'}`}>
              {photo.tier}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
