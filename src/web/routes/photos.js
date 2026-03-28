/**
 * Photos API Routes
 *
 * Serves photo files and thumbnails from open-call projects.
 * Includes security: path validation, containment, symlink checks.
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { generateThumbnail, validateWidth } from '../thumbnails.js';

const SAFE_PARAM = /^[a-zA-Z0-9._-]+$/;

function isValidParam(param) {
  return SAFE_PARAM.test(param);
}

function isContained(resolvedPath, base) {
  const realBase = path.resolve(base);
  const realPath = path.resolve(resolvedPath);
  return realPath === realBase || realPath.startsWith(realBase + path.sep);
}

/**
 * Check containment using realpathSync for both paths (handles symlinks like /var -> /private/var).
 */
function isRealContained(resolvedPath, base) {
  try {
    const realBase = fs.realpathSync(base);
    const realPath = fs.realpathSync(resolvedPath);
    return realPath === realBase || realPath.startsWith(realBase + path.sep);
  } catch {
    return false;
  }
}

/**
 * Create photos router.
 * @param {string} dataDir - Absolute path to data directory
 * @returns {Router}
 */
export function createPhotosRouter(dataDir) {
  const router = Router();

  // Param validation
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

  router.param('filename', (req, res, next, filename) => {
    if (!isValidParam(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    next();
  });

  /**
   * Resolve and validate a photo path with security checks.
   */
  function resolvePhotoPath(projectDir, filename, res) {
    const photosDir = path.join(projectDir, 'photos');
    const photoPath = path.resolve(photosDir, filename);

    // Containment check
    if (!isContained(photoPath, photosDir)) {
      res.status(400).json({ error: 'Invalid filename' });
      return null;
    }

    if (!fs.existsSync(photoPath)) {
      res.status(404).json({ error: 'Photo not found' });
      return null;
    }

    // Symlink check - resolve real path and verify containment
    try {
      if (!isRealContained(photoPath, photosDir)) {
        res.status(400).json({ error: 'Invalid filename' });
        return null;
      }
    } catch {
      res.status(404).json({ error: 'Photo not found' });
      return null;
    }

    return photoPath;
  }

  // GET /api/projects/:name/photos/:filename - serve full-size photo
  router.get('/:name/photos/:filename', (req, res) => {
    try {
      const photoPath = resolvePhotoPath(req.projectDir, req.params.filename, res);
      if (!photoPath) return;
      const ext = path.extname(photoPath).toLowerCase();
      const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.tif': 'image/tiff', '.tiff': 'image/tiff' };
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      fs.createReadStream(photoPath).pipe(res);
    } catch {
      res.status(500).json({ error: 'Failed to serve photo' });
    }
  });

  // GET /api/projects/:name/photos/:filename/thumb - serve thumbnail
  router.get('/:name/photos/:filename/thumb', async (req, res) => {
    try {
      let width;
      try {
        width = validateWidth(req.query.w);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }

      const photoPath = resolvePhotoPath(req.projectDir, req.params.filename, res);
      if (!photoPath) return;

      const photosDir = path.join(req.projectDir, 'photos');
      const thumbPath = await generateThumbnail(photoPath, width, photosDir);
      const realThumbPath = fs.realpathSync(thumbPath);
      const stream = fs.createReadStream(realThumbPath);
      res.setHeader('Content-Type', 'image/jpeg');
      stream.pipe(res);
    } catch {
      res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
  });

  return router;
}
