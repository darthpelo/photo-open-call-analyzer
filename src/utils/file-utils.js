import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, symlinkSync, lstatSync, globSync } from 'fs';
import { dirname, resolve, join, isAbsolute } from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the directory of the current module
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @returns {string} The directory path
 */
export function getDirname(importMetaUrl) {
  return dirname(fileURLToPath(importMetaUrl));
}

/**
 * Read a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Object} Parsed JSON object
 */
export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

/**
 * Write a JSON file
 * @param {string} filePath - Path to write to
 * @param {Object} data - Data to write
 * @param {boolean} pretty - Whether to pretty-print (default: true)
 */
export function writeJson(filePath, data, pretty = true) {
  ensureDir(filePath);
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  writeFileSync(filePath, content, 'utf-8');
}

/**
 * Read a text file
 * @param {string} filePath - Path to the file
 * @returns {string} File contents
 */
export function readText(filePath) {
  return readFileSync(filePath, 'utf-8');
}

/**
 * Write a text file
 * @param {string} filePath - Path to write to
 * @param {string} content - Content to write
 */
export function writeText(filePath, content) {
  ensureDir(filePath);
  writeFileSync(filePath, content, 'utf-8');
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {boolean} Whether file exists
 */
export function fileExists(filePath) {
  return existsSync(filePath);
}

/**
 * Ensure directory exists, creating it if necessary
 * @param {string} filePath - File path (directory will be extracted)
 */
export function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Resolve a path relative to project root
 * @param {string} relPath - Relative path from project root
 * @returns {string} Absolute path
 */
export function projectPath(...parts) {
  return resolve(process.cwd(), ...parts);
}

/**
 * Resolve output directory with timestamped subdirectory and latest symlink.
 * Creates {baseDir}/{ISO-timestamp}/ and a 'latest' symlink pointing to it.
 * @param {string} projectDir - Base project directory
 * @param {string} outputPath - Output path (relative to projectDir, or absolute)
 * @returns {string} Absolute path to the timestamped output directory
 */
export function resolveOutputDir(projectDir, outputPath) {
  const baseDir = isAbsolute(outputPath) ? outputPath : join(projectDir, outputPath);
  const timestamp = new Date().toISOString().split('.')[0].replace(/:/g, '-');
  const timestampedDir = join(baseDir, timestamp);

  mkdirSync(timestampedDir, { recursive: true });

  const latestLink = join(baseDir, 'latest');
  try {
    if (existsSync(latestLink)) {
      const stat = lstatSync(latestLink);
      if (stat.isSymbolicLink() || stat.isFile()) {
        unlinkSync(latestLink);
      }
    }
    symlinkSync(timestamp, latestLink, 'dir');
  } catch {
    writeFileSync(join(baseDir, 'latest.txt'), timestamp, 'utf-8');
  }

  return timestampedDir;
}

/**
 * Resolve photo selection for set analysis.
 * Supports three modes:
 *   1. Smart Default: --photos not provided, auto-select all if count matches setSize
 *   2. Glob patterns: expand patterns like "urban-*.jpg" relative to photosDir
 *   3. Literal filenames: direct file references (backward-compatible)
 *
 * @param {Object} options
 * @param {string} options.photosDir - Absolute path to photos directory
 * @param {string[]|undefined} options.photoArgs - Raw --photos arguments (undefined if not provided)
 * @param {number} options.setSize - Expected set size from config
 * @param {string[]} options.supportedFormats - Supported image extensions (lowercase, no dot)
 * @returns {{ success: boolean, photos: string[], filenames: string[], mode: string, error: string|null }}
 */
export function resolvePhotoSelection({ photosDir, photoArgs, setSize, supportedFormats }) {
  if (!photoArgs) {
    return resolveSmartDefault(photosDir, setSize, supportedFormats);
  }

  const GLOB_CHARS = /[*?[\]{}]/;
  const hasGlobs = photoArgs.some(arg => GLOB_CHARS.test(arg));

  if (hasGlobs) {
    return resolveGlobPatterns(photosDir, photoArgs, supportedFormats);
  }

  return resolveExplicitFiles(photosDir, photoArgs);
}

function listSupportedPhotos(directory, supportedFormats) {
  const pattern = `*.{${supportedFormats.join(',')}}`;
  const matches = globSync(pattern, { cwd: directory });
  const unique = [...new Set(matches)].sort();
  return unique.map(name => ({ name, path: join(directory, name) }));
}

function resolveSmartDefault(photosDir, setSize, supportedFormats) {
  if (!existsSync(photosDir)) {
    return {
      success: false, photos: [], filenames: [], mode: 'smart-default',
      error: `Photos directory not found: ${photosDir}`
    };
  }

  const files = listSupportedPhotos(photosDir, supportedFormats);

  if (files.length === 0) {
    return {
      success: false, photos: [], filenames: [], mode: 'smart-default',
      error: 'No supported photo files found in photos directory'
    };
  }

  if (files.length !== setSize) {
    return {
      success: false, photos: [], filenames: [], mode: 'smart-default',
      error: `Smart default requires exactly ${setSize} photos in directory, found ${files.length}. ` +
        `Use --photos to select specific files.\n` +
        `Available photos (${files.length}): ${files.map(f => f.name).join(', ')}`
    };
  }

  return {
    success: true,
    photos: files.map(f => f.path),
    filenames: files.map(f => f.name),
    mode: 'smart-default',
    error: null
  };
}

function resolveGlobPatterns(photosDir, photoArgs, supportedFormats) {
  const GLOB_CHARS = /[*?[\]{}]/;
  const resolvedNames = new Set();

  for (const arg of photoArgs) {
    if (GLOB_CHARS.test(arg)) {
      const matches = globSync(arg, { cwd: photosDir });

      if (matches.length === 0) {
        return {
          success: false, photos: [], filenames: [], mode: 'glob',
          error: `Glob pattern "${arg}" matched 0 files in photos directory`
        };
      }

      for (const match of matches) {
        const ext = match.split('.').pop().toLowerCase();
        if (supportedFormats.includes(ext)) {
          resolvedNames.add(match);
        }
      }
    } else {
      resolvedNames.add(arg);
    }
  }

  const filenames = [...resolvedNames].sort();
  const missingFiles = [];
  const photos = [];

  for (const name of filenames) {
    const fullPath = join(photosDir, name);
    if (!existsSync(fullPath)) {
      missingFiles.push(name);
    } else {
      photos.push(fullPath);
    }
  }

  if (missingFiles.length > 0) {
    return {
      success: false, photos: [], filenames: [], mode: 'glob',
      error: `Photo(s) not found: ${missingFiles.join(', ')}`
    };
  }

  if (photos.length === 0) {
    return {
      success: false, photos: [], filenames: [], mode: 'glob',
      error: 'No supported photo files matched the provided patterns'
    };
  }

  return { success: true, photos, filenames, mode: 'glob', error: null };
}

function resolveExplicitFiles(photosDir, photoArgs) {
  const filenames = [...new Set(photoArgs)].sort();
  const photos = [];
  const missingFiles = [];

  for (const name of filenames) {
    const fullPath = join(photosDir, name);
    if (!existsSync(fullPath)) {
      missingFiles.push(name);
    } else {
      photos.push(fullPath);
    }
  }

  if (missingFiles.length > 0) {
    return {
      success: false, photos: [], filenames: [], mode: 'explicit',
      error: `Photo(s) not found: ${missingFiles.join(', ')}`
    };
  }

  return { success: true, photos, filenames, mode: 'explicit', error: null };
}
