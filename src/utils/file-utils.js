import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
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
