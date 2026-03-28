import { useState, useEffect, useMemo } from 'react';
import { fetchProjects } from '../api/client.js';
import { ProjectCard } from '../components/ProjectCard.jsx';
import { SearchBar } from '../components/SearchBar.jsx';

/**
 * Dashboard page listing all open-call projects with search filtering.
 */
export function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchProjects().then((data) => {
      if (cancelled) return;
      setProjects(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, search]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Loading projects...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 max-w-md">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No projects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
