/**
 * Projects API Routes
 *
 * Read-only endpoints for listing and querying open-call projects.
 * All data is read from the filesystem (data/open-calls/).
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const SAFE_PARAM = /^[a-zA-Z0-9._-]+$/;
const RESULT_FILENAMES = ['photo-analysis.json', 'set-analysis.json'];
const EXPORT_FILENAMES = {
  json: ['photo-analysis.json', 'set-analysis.json'],
  csv: ['photo-analysis.csv', 'set-analysis.csv'],
  md: ['photo-analysis.md', 'set-analysis.md']
};

/**
 * Find the first existing file from a list of candidates in a directory.
 * @param {string} dir
 * @param {string[]} candidates
 * @returns {string|null} Full path or null
 */
function findFirst(dir, candidates) {
  for (const name of candidates) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Validate a route parameter against safe character set.
 * @param {string} param - Parameter value
 * @returns {boolean}
 */
function isValidParam(param) {
  return SAFE_PARAM.test(param);
}

/**
 * Validate path containment: resolved path must be within base.
 * @param {string} resolvedPath
 * @param {string} base
 * @returns {boolean}
 */
function isContained(resolvedPath, base) {
  const realBase = path.resolve(base);
  const realPath = path.resolve(resolvedPath);
  return realPath === realBase || realPath.startsWith(realBase + path.sep);
}

/**
 * Create projects router.
 * @param {string} dataDir - Absolute path to data directory containing project folders
 * @returns {Router}
 */
export function createProjectsRouter(dataDir) {
  const router = Router();

  // Param validation middleware
  router.param('name', (req, res, next, name) => {
    if (!isValidParam(name)) {
      return res.status(400).json({ error: 'Invalid project name' });
    }
    const projectDir = path.resolve(dataDir, name);
    if (!isContained(projectDir, dataDir)) {
      return res.status(400).json({ error: 'Invalid project name' });
    }
    req.projectDir = projectDir;
    next();
  });

  router.param('timestamp', (req, res, next, timestamp) => {
    if (!isValidParam(timestamp)) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }
    next();
  });

  router.param('format', (req, res, next, format) => {
    if (!isValidParam(format)) {
      return res.status(400).json({ error: 'Invalid format' });
    }
    next();
  });

  // GET /api/projects - list all projects
  router.get('/', (req, res) => {
    try {
      if (!fs.existsSync(dataDir)) {
        return res.json({ projects: [] });
      }
      const entries = fs.readdirSync(dataDir, { withFileTypes: true });
      const projects = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const configPath = path.join(dataDir, entry.name, 'open-call.json');
        let config = {};
        try {
          config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch {
          // Skip projects without valid config
          continue;
        }
        projects.push({
          name: entry.name,
          title: config.title || entry.name,
          theme: config.theme || null
        });
      }

      res.json({ projects });
    } catch {
      res.status(500).json({ error: 'Failed to list projects' });
    }
  });

  // GET /api/projects/:name - project detail
  router.get('/:name', (req, res) => {
    try {
      const configPath = path.join(req.projectDir, 'open-call.json');
      if (!fs.existsSync(configPath)) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // List photos
      const photosDir = path.join(req.projectDir, 'photos');
      let photos = [];
      if (fs.existsSync(photosDir)) {
        photos = fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg|png|tiff?|webp)$/i.test(f));
      }

      // List results timestamps
      const resultsDir = path.join(req.projectDir, 'results');
      let results = [];
      if (fs.existsSync(resultsDir)) {
        results = fs.readdirSync(resultsDir, { withFileTypes: true })
          .filter(e => e.isDirectory() && e.name !== 'latest')
          .map(e => e.name)
          .sort()
          .reverse();
      }

      res.json({ name: req.params.name, config, photos, results });
    } catch {
      res.status(500).json({ error: 'Failed to get project details' });
    }
  });

  // GET /api/projects/:name/results/latest
  router.get('/:name/results/latest', (req, res) => {
    try {
      const latestDir = path.join(req.projectDir, 'results', 'latest');
      if (!fs.existsSync(latestDir)) {
        return res.status(404).json({ error: 'No results found' });
      }

      // Resolve symlink
      let realDir;
      try {
        realDir = fs.realpathSync(latestDir);
      } catch {
        return res.status(404).json({ error: 'No results found' });
      }

      const rankingPath = findFirst(realDir, RESULT_FILENAMES);
      if (!rankingPath) {
        return res.status(404).json({ error: 'No ranking found' });
      }

      const ranking = JSON.parse(fs.readFileSync(rankingPath, 'utf-8'));
      res.json(ranking);
    } catch {
      res.status(500).json({ error: 'Failed to get results' });
    }
  });

  // GET /api/projects/:name/results/latest/export/:format
  router.get('/:name/results/latest/export/:format', (req, res) => {
    try {
      const format = req.params.format;
      const candidates = EXPORT_FILENAMES[format];
      if (!candidates) {
        return res.status(400).json({ error: `Unsupported export format: ${format}. Supported: ${Object.keys(EXPORT_FILENAMES).join(', ')}` });
      }

      const latestDir = path.join(req.projectDir, 'results', 'latest');
      let realDir;
      try {
        realDir = fs.realpathSync(latestDir);
      } catch {
        return res.status(404).json({ error: 'No results found' });
      }

      const filePath = findFirst(realDir, candidates);
      if (!filePath) {
        return res.status(404).json({ error: `Export file not found for format: ${format}` });
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      const contentTypes = { json: 'application/json', csv: 'text/csv', md: 'text/markdown' };
      res.setHeader('Content-Type', contentTypes[format] || 'application/octet-stream');
      res.send(content);
    } catch {
      res.status(500).json({ error: 'Failed to export results' });
    }
  });

  // GET /api/projects/:name/results/:timestamp
  router.get('/:name/results/:timestamp', (req, res) => {
    try {
      const timestamp = req.params.timestamp;
      const timestampDir = path.resolve(req.projectDir, 'results', timestamp);

      // Containment check
      const resultsBase = path.join(req.projectDir, 'results');
      if (!isContained(timestampDir, resultsBase)) {
        return res.status(400).json({ error: 'Invalid timestamp' });
      }

      if (!fs.existsSync(timestampDir)) {
        return res.status(404).json({ error: 'Results not found for this timestamp' });
      }

      const rankingPath = findFirst(timestampDir, RESULT_FILENAMES);
      if (!rankingPath) {
        return res.status(404).json({ error: 'No ranking found for this timestamp' });
      }

      const ranking = JSON.parse(fs.readFileSync(rankingPath, 'utf-8'));
      res.json(ranking);
    } catch {
      res.status(500).json({ error: 'Failed to get results' });
    }
  });

  return router;
}
