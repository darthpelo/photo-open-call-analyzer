/**
 * Photo Group Resolver (FR-4.8)
 *
 * Resolves photo group definitions against available (already-analyzed) photos
 * using glob patterns. Groups partition photos into named series/collections
 * for set-level analysis.
 *
 * Uses fs.globSync with cwd option for filesystem-based glob matching,
 * then intersects with the available photos array to produce group assignments.
 */

import { globSync } from 'fs';

/**
 * Resolve photo group definitions against available photos using glob patterns.
 * Uses fs.globSync with cwd option for filesystem-based glob matching.
 *
 * @param {Array<{name: string, pattern: string}>} photoGroups - Group definitions from config
 * @param {Object[]} availablePhotos - Photos with at least a `filename` property (from batch results)
 * @param {string} photosDir - Absolute path to photos/ directory (for globSync resolution)
 * @returns {{ success: boolean, groups: Map<string, Object[]>, warnings: string[], error: string|null }}
 */
export function resolvePhotoGroups(photoGroups, availablePhotos, photosDir) {
  // 1. Input validation: photoGroups
  if (!photoGroups || !Array.isArray(photoGroups) || photoGroups.length === 0) {
    return {
      success: false,
      groups: new Map(),
      warnings: [],
      error: 'photoGroups must be a non-empty array',
    };
  }

  // 2. Input validation: availablePhotos
  if (!availablePhotos || !Array.isArray(availablePhotos) || availablePhotos.length === 0) {
    return {
      success: false,
      groups: new Map(),
      warnings: [],
      error: 'availablePhotos must be a non-empty array',
    };
  }

  // 3. Validate each group has required fields
  for (const group of photoGroups) {
    if (!group.name) {
      return {
        success: false,
        groups: new Map(),
        warnings: [],
        error: 'Each group must have a name',
      };
    }
    if (!group.pattern) {
      return {
        success: false,
        groups: new Map(),
        warnings: [],
        error: 'Each group must have a pattern',
      };
    }
  }

  // 4. Check for duplicate group names
  const names = photoGroups.map(g => g.name);
  if (new Set(names).size !== names.length) {
    return {
      success: false,
      groups: new Map(),
      warnings: [],
      error: 'Duplicate group names found',
    };
  }

  // 5. Build lookup of available photos by filename
  const photosByFilename = new Map();
  for (const photo of availablePhotos) {
    photosByFilename.set(photo.filename, photo);
  }

  // 6. Resolve each group using globSync
  const groups = new Map();
  const assignedFilenames = new Set();
  const matchCounts = new Map(); // filename -> number of groups it matched

  for (const group of photoGroups) {
    const matchedFiles = globSync(group.pattern, { cwd: photosDir });

    // Intersect glob results with available (analyzed) photos
    const matchedPhotos = [];
    for (const filename of matchedFiles) {
      if (photosByFilename.has(filename)) {
        matchedPhotos.push(photosByFilename.get(filename));
        assignedFilenames.add(filename);
        matchCounts.set(filename, (matchCounts.get(filename) || 0) + 1);
      }
    }

    if (matchedPhotos.length === 0) {
      return {
        success: false,
        groups: new Map(),
        warnings: [],
        error: `Group "${group.name}" pattern "${group.pattern}" matched 0 photos`,
      };
    }

    groups.set(group.name, matchedPhotos);
  }

  // 7. Build warnings
  const warnings = [];

  // Orphan photos: present in availablePhotos but not assigned to any group
  const unmatched = availablePhotos.filter(p => !assignedFilenames.has(p.filename));
  if (unmatched.length > 0) {
    const orphanNames = unmatched.map(p => p.filename).join(', ');
    warnings.push(`${unmatched.length} photo(s) not in any group: ${orphanNames}`);
  }

  // Overlapping assignments: a photo matched more than one group
  for (const [filename, count] of matchCounts) {
    if (count > 1) {
      warnings.push(`Photo "${filename}" matches multiple groups`);
    }
  }

  return { success: true, groups, warnings, error: null };
}
