import { PhotoCard } from './PhotoCard.jsx';

/**
 * PhotoGrid renders a responsive grid of PhotoCards.
 */
export function PhotoGrid({
  photos,
  projectName,
  onPhotoClick,
  selectable,
  selectedPhotos = [],
  onToggleSelect,
}) {
  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No photos to display.
      </div>
    );
  }

  const selectedSet = new Set(selectedPhotos.map((p) => p.photo));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.photo}
          photo={photo}
          projectName={projectName}
          onClick={onPhotoClick}
          selectable={selectable}
          selected={selectedSet.has(photo.photo)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
