/**
 * Discovery Orchestrator — Scaffolding and validation for the discover command.
 * Handles URL validation (F1), project name sanitization (F2), and project setup.
 * Part of Conversational Discovery Layer, Cycle 1 (T6).
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^169\.254\./
];

/**
 * Sanitize a project name to a safe filesystem-friendly slug.
 * Security mitigation F2: prevents path traversal.
 *
 * @param {string|null} name - User-provided name (or null to derive from URL)
 * @param {string} [url] - URL to derive name from if name is null
 * @returns {string} Sanitized project name ([a-z0-9-])
 */
export function sanitizeProjectName(name, url) {
  let raw = name;

  if (!raw && url) {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      raw = pathParts[pathParts.length - 1] || null;
    } catch {
      // ignore
    }
  }

  if (!raw) return 'discovery';

  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[./\\]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '') || 'discovery';
}

/**
 * Validate a URL for the discover command.
 * Security mitigation F1: rejects non-HTTPS, localhost, and private IPs.
 *
 * @param {string} url - URL to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDiscoverUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS URLs are supported' };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname === '[::1]') {
    return { valid: false, error: 'Localhost URLs are not allowed' };
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: 'Private network URLs are not allowed' };
    }
  }

  return { valid: true };
}

/**
 * Create the project directory structure for a discovery flow.
 *
 * @param {string} projectDir - Full path to the project directory
 * @param {string} url - Open call URL (stored for reference)
 * @returns {{ success: boolean, error?: string }}
 */
export function scaffoldDiscoverProject(projectDir, url) {
  if (existsSync(projectDir)) {
    return { success: false, error: `Project directory already exists: ${projectDir}` };
  }

  mkdirSync(join(projectDir, 'strategic'), { recursive: true });
  mkdirSync(join(projectDir, 'photos'), { recursive: true });

  logger.success(`Project scaffolded: ${projectDir}`);
  return { success: true };
}
