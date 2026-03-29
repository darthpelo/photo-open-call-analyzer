/**
 * API client for the Photo Open Call Analyzer backend.
 * All functions return graceful defaults (null or empty array) on failure.
 */

/**
 * Fetch all projects.
 * @returns {Promise<Array>} Array of project objects, or empty array on error.
 */
export async function fetchProjects() {
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) return [];
    const data = await res.json();
    return data.projects || [];
  } catch {
    return [];
  }
}

/**
 * Fetch a single project's detail.
 * @param {string} name - Project name
 * @returns {Promise<Object|null>} Project detail or null on error.
 */
export async function fetchProject(name) {
  try {
    const res = await fetch(`/api/projects/${name}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch latest results (ranking) for a project.
 * @param {string} name - Project name
 * @returns {Promise<Object|null>} Ranking data or null on error.
 */
export async function fetchProjectResults(name) {
  try {
    const res = await fetch(`/api/projects/${name}/results/latest`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Build thumbnail URL for a photo.
 * @param {string} projectName
 * @param {string} filename
 * @param {number} [width=300]
 * @returns {string}
 */
export function thumbnailUrl(projectName, filename, width = 300) {
  return `/api/projects/${projectName}/photos/${filename}/thumb?w=${width}`;
}

/**
 * Build full-size photo URL.
 * @param {string} projectName
 * @param {string} filename
 * @returns {string}
 */
export function photoUrl(projectName, filename) {
  return `/api/projects/${projectName}/photos/${filename}`;
}
