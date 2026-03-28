import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProjectResults } from '../api/client.js';
import { PhotoGrid } from '../components/PhotoGrid.jsx';
import { PhotoDetail } from '../components/PhotoDetail.jsx';
import { SortControls } from '../components/SortControls.jsx';
import { CompareDrawer } from '../components/CompareDrawer.jsx';
import { SetCard } from '../components/SetCard.jsx';
import { useCompare } from '../context/CompareContext.jsx';

const EXPORT_FORMATS = ['md', 'json', 'csv'];

/**
 * ProjectResults page: loads and displays ranked photo results
 * for a given project.
 */
export function ProjectResults() {
  const { name } = useParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('overall');
  const [detailPhoto, setDetailPhoto] = useState(null);
  const { selectedPhotos, togglePhoto, clearSelection } = useCompare();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchProjectResults(name).then((data) => {
      if (cancelled) return;
      if (!data) {
        setError('Failed to load results');
      } else {
        setResults(data);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [name]);

  // Detect if results are set-analysis (Polaroid mode) vs single-photo
  const isSetMode = useMemo(() => {
    if (!results?.ranking?.length) return false;
    return !!results.ranking[0].compositeScore;
  }, [results]);

  // Extract criterion names from the first photo that has them
  const criteriaNames = useMemo(() => {
    if (!results?.ranking?.length || isSetMode) return [];
    for (const photo of results.ranking) {
      if (photo.individual_scores && Object.keys(photo.individual_scores).length > 0) {
        return Object.keys(photo.individual_scores);
      }
    }
    return [];
  }, [results, isSetMode]);

  // Sort photos based on current sort selection
  const sortedPhotos = useMemo(() => {
    if (!results?.ranking) return [];
    const photos = [...results.ranking];
    if (sortBy === 'overall') {
      photos.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
    } else {
      photos.sort((a, b) => {
        const scoreA = a.individual_scores?.[sortBy]?.score || 0;
        const scoreB = b.individual_scores?.[sortBy]?.score || 0;
        return scoreB - scoreA;
      });
    }
    return photos;
  }, [results, sortBy]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading results...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500 dark:text-red-400">{error}</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="Back to dashboard"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{name}</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {results?.total_photos || 0} photos
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!isSetMode && <SortControls
            criteria={criteriaNames}
            onSort={setSortBy}
            currentSort={sortBy}
          />}
          <div className="flex items-center gap-1">
            {EXPORT_FORMATS.map((fmt) => (
              <a
                key={fmt}
                href={`/api/projects/${name}/results/latest/export/${fmt}`}
                download
                className="px-3 py-1 text-xs font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {fmt.toUpperCase()}
              </a>
            ))}
          </div>
        </div>
      </div>

      {isSetMode ? (
        <div className="space-y-4">
          {(results.ranking || []).map((set, i) => (
            <SetCard key={set.setId || i} set={set} projectName={name} rank={i + 1} />
          ))}
        </div>
      ) : (
        <>
          <PhotoGrid
            photos={sortedPhotos}
            projectName={name}
            onPhotoClick={setDetailPhoto}
            selectable
            selectedPhotos={selectedPhotos}
            onToggleSelect={togglePhoto}
          />

          <PhotoDetail
            photo={detailPhoto}
            projectName={name}
            onClose={() => setDetailPhoto(null)}
          />

          <CompareDrawer
            photos={selectedPhotos}
            projectName={name}
            onClear={clearSelection}
          />
        </>
      )}
    </div>
  );
}
