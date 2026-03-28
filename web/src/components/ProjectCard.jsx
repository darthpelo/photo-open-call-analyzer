import { Link } from 'react-router-dom';

/**
 * ProjectCard displays a summary card for an open-call project.
 */
export function ProjectCard({ project }) {
  const { name, photoCount, lastAnalysis } = project;

  const formattedDate = lastAnalysis
    ? new Date(lastAnalysis).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Link
      to={`/projects/${name}`}
      className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-gray-800 dark:border-gray-700"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
        {name}
      </h3>
      <div className="mt-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{photoCount} photos</span>
        <span>{formattedDate || 'No analysis yet'}</span>
      </div>
    </Link>
  );
}
