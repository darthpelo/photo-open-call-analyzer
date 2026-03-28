/**
 * Integration Tests for Web API Server
 *
 * NOTE: This file lives in root tests/ intentionally. The Express server (src/web/)
 * is a backend component tested by the root vitest configuration. The web/ directory
 * contains only the React frontend and its own test suite (cd web && npm test).
 * API route tests belong here, not in web/.
 *
 * TDD: Tests written before implementation.
 *
 * Tests all API endpoints:
 * - GET /api/projects
 * - GET /api/projects/:name
 * - GET /api/projects/:name/results/latest
 * - GET /api/projects/:name/results/:timestamp
 * - GET /api/projects/:name/photos/:filename
 * - GET /api/projects/:name/photos/:filename/thumb?w=300
 * - GET /api/projects/:name/results/latest/export/:format
 *
 * Security tests:
 * - Path traversal prevention
 * - Parameter validation
 * - Error response sanitization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { createApp } from '../src/web/server.js';

// Helper to make requests against the Express app without starting a real server
async function request(app, urlPath) {
  return new Promise((resolve, reject) => {
    // Use Node's built-in http to test against the app
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      import('http').then(http => {
        http.get(`http://127.0.0.1:${port}${urlPath}`, (res) => {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => {
            server.close();
            resolve({ status: res.statusCode, headers: res.headers, body, json: () => { try { return JSON.parse(body); } catch { return null; } } });
          });
        }).on('error', (err) => { server.close(); reject(err); });
      });
    });
  });
}

describe('Web API Server - Integration Tests', () => {
  let testDataDir;
  let app;

  beforeEach(async () => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-test-'));

    // Create a fake project structure
    const projectDir = path.join(testDataDir, 'test-project');
    const photosDir = path.join(projectDir, 'photos');
    const resultsDir = path.join(projectDir, 'results');
    const timestampDir = path.join(resultsDir, '2026-03-01T10-00-00');

    fs.mkdirSync(photosDir, { recursive: true });
    fs.mkdirSync(timestampDir, { recursive: true });

    // Create open-call.json
    fs.writeFileSync(path.join(projectDir, 'open-call.json'), JSON.stringify({
      title: 'Test Competition',
      theme: 'Nature',
      jury: ['Judge A']
    }));

    // Create a real tiny photo
    await sharp({
      create: { width: 200, height: 150, channels: 3, background: { r: 0, g: 128, b: 255 } }
    }).jpeg().toFile(path.join(photosDir, 'landscape.jpg'));

    // Create results files
    fs.writeFileSync(path.join(timestampDir, 'photo-analysis.json'), JSON.stringify({
      ranking: [{ photo: 'landscape.jpg', score: 8.5 }]
    }));
    fs.writeFileSync(path.join(timestampDir, 'photo-analysis.md'), '# Test Report\n\nSome content.');
    fs.writeFileSync(path.join(timestampDir, 'photo-analysis.csv'), 'photo,score\nlandscape.jpg,8.5');

    // Create latest symlink
    fs.symlinkSync('2026-03-01T10-00-00', path.join(resultsDir, 'latest'), 'dir');

    // Create the app with custom data dir
    app = createApp({ dataDir: testDataDir });
  });

  afterEach(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  // ============================================
  // GET /api/projects
  // ============================================

  describe('GET /api/projects', () => {
    it('should list all projects', async () => {
      const res = await request(app, '/api/projects');
      expect(res.status).toBe(200);
      const data = res.json();
      expect(data.projects).toBeInstanceOf(Array);
      expect(data.projects.length).toBe(1);
      expect(data.projects[0].name).toBe('test-project');
    });

    it('should include project title from open-call.json', async () => {
      const res = await request(app, '/api/projects');
      const data = res.json();
      expect(data.projects[0].title).toBe('Test Competition');
    });

    it('should return empty array when no projects exist', async () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-empty-'));
      const emptyApp = createApp({ dataDir: emptyDir });
      const res = await request(emptyApp, '/api/projects');
      const data = res.json();
      expect(data.projects).toEqual([]);
      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });

  // ============================================
  // GET /api/projects/:name
  // ============================================

  describe('GET /api/projects/:name', () => {
    it('should return project detail', async () => {
      const res = await request(app, '/api/projects/test-project');
      expect(res.status).toBe(200);
      const data = res.json();
      expect(data.name).toBe('test-project');
      expect(data.config.title).toBe('Test Competition');
    });

    it('should include results history', async () => {
      const res = await request(app, '/api/projects/test-project');
      const data = res.json();
      expect(data.results).toBeInstanceOf(Array);
      expect(data.results).toContain('2026-03-01T10-00-00');
    });

    it('should include photo list', async () => {
      const res = await request(app, '/api/projects/test-project');
      const data = res.json();
      expect(data.photos).toBeInstanceOf(Array);
      expect(data.photos).toContain('landscape.jpg');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app, '/api/projects/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should reject path traversal in project name', async () => {
      const res = await request(app, '/api/projects/..%2F..%2Fetc');
      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // GET /api/projects/:name/results/latest
  // ============================================

  describe('GET /api/projects/:name/results/latest', () => {
    it('should return latest ranking results', async () => {
      const res = await request(app, '/api/projects/test-project/results/latest');
      expect(res.status).toBe(200);
      const data = res.json();
      expect(data.ranking).toBeInstanceOf(Array);
      expect(data.ranking[0].score).toBe(8.5);
    });

    it('should return 404 when no results exist', async () => {
      // Create project without results
      const noResultsDir = path.join(testDataDir, 'no-results');
      fs.mkdirSync(path.join(noResultsDir, 'photos'), { recursive: true });
      fs.writeFileSync(path.join(noResultsDir, 'open-call.json'), '{}');
      const res = await request(app, '/api/projects/no-results/results/latest');
      expect(res.status).toBe(404);
    });

    it('should fall back to set-analysis.json when photo-analysis.json is missing', async () => {
      // Create a project with only set-analysis.json
      const setProjectDir = path.join(testDataDir, 'set-project');
      const setResultsDir = path.join(setProjectDir, 'results', '2026-03-02T10-00-00');
      fs.mkdirSync(path.join(setProjectDir, 'photos'), { recursive: true });
      fs.mkdirSync(setResultsDir, { recursive: true });
      fs.writeFileSync(path.join(setProjectDir, 'open-call.json'), '{"title":"Set Project"}');
      fs.writeFileSync(path.join(setResultsDir, 'set-analysis.json'), JSON.stringify({
        sets: [{ photos: ['a.jpg', 'b.jpg'], score: 9.0 }]
      }));
      fs.symlinkSync('2026-03-02T10-00-00', path.join(setProjectDir, 'results', 'latest'), 'dir');

      const res = await request(app, '/api/projects/set-project/results/latest');
      expect(res.status).toBe(200);
      const data = res.json();
      expect(data.sets).toBeDefined();
      expect(data.sets[0].score).toBe(9.0);
    });

    it('should return 404 when latest symlink is broken', async () => {
      const brokenDir = path.join(testDataDir, 'broken-link');
      fs.mkdirSync(path.join(brokenDir, 'photos'), { recursive: true });
      fs.mkdirSync(path.join(brokenDir, 'results'), { recursive: true });
      fs.writeFileSync(path.join(brokenDir, 'open-call.json'), '{}');
      fs.symlinkSync('nonexistent-timestamp', path.join(brokenDir, 'results', 'latest'), 'dir');

      const res = await request(app, '/api/projects/broken-link/results/latest');
      expect(res.status).toBe(404);
    });

    it('should return 404 when latest dir has no ranking files', async () => {
      const emptyResultDir = path.join(testDataDir, 'empty-results');
      const tsDir = path.join(emptyResultDir, 'results', '2026-03-03T10-00-00');
      fs.mkdirSync(path.join(emptyResultDir, 'photos'), { recursive: true });
      fs.mkdirSync(tsDir, { recursive: true });
      fs.writeFileSync(path.join(emptyResultDir, 'open-call.json'), '{}');
      // Only write a non-ranking file
      fs.writeFileSync(path.join(tsDir, 'notes.txt'), 'hello');
      fs.symlinkSync('2026-03-03T10-00-00', path.join(emptyResultDir, 'results', 'latest'), 'dir');

      const res = await request(app, '/api/projects/empty-results/results/latest');
      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // GET /api/projects/:name/results/:timestamp
  // ============================================

  describe('GET /api/projects/:name/results/:timestamp', () => {
    it('should return results for a specific timestamp', async () => {
      const res = await request(app, '/api/projects/test-project/results/2026-03-01T10-00-00');
      expect(res.status).toBe(200);
      const data = res.json();
      expect(data.ranking).toBeDefined();
    });

    it('should return 404 for non-existent timestamp', async () => {
      const res = await request(app, '/api/projects/test-project/results/2099-01-01T00-00-00');
      expect(res.status).toBe(404);
    });

    it('should reject invalid timestamp format', async () => {
      const res = await request(app, '/api/projects/test-project/results/bad%20stamp');
      expect(res.status).toBe(400);
    });

    it('should fall back to set-analysis.json for specific timestamp', async () => {
      // Create a timestamp dir with only set-analysis.json
      const setTsDir = path.join(testDataDir, 'test-project', 'results', '2026-03-05T10-00-00');
      fs.mkdirSync(setTsDir, { recursive: true });
      fs.writeFileSync(path.join(setTsDir, 'set-analysis.json'), JSON.stringify({
        sets: [{ photos: ['x.jpg'], score: 7.5 }]
      }));

      const res = await request(app, '/api/projects/test-project/results/2026-03-05T10-00-00');
      expect(res.status).toBe(200);
      const data = res.json();
      expect(data.sets).toBeDefined();
    });

    it('should return 404 when timestamp dir has no ranking files', async () => {
      const emptyTsDir = path.join(testDataDir, 'test-project', 'results', '2026-03-06T10-00-00');
      fs.mkdirSync(emptyTsDir, { recursive: true });
      fs.writeFileSync(path.join(emptyTsDir, 'notes.txt'), 'nothing here');

      const res = await request(app, '/api/projects/test-project/results/2026-03-06T10-00-00');
      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // GET /api/projects/:name/photos/:filename
  // ============================================

  describe('GET /api/projects/:name/photos/:filename', () => {
    it('should serve a photo file', async () => {
      const res = await request(app, '/api/projects/test-project/photos/landscape.jpg');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/image/);
    });

    it('should return 404 for non-existent photo', async () => {
      const res = await request(app, '/api/projects/test-project/photos/nope.jpg');
      expect(res.status).toBe(404);
    });

    it('should reject path traversal in filename', async () => {
      const res = await request(app, '/api/projects/test-project/photos/..%2F..%2Fetc%2Fpasswd');
      expect(res.status).toBe(400);
    });

    it('should reject filenames with invalid characters', async () => {
      const res = await request(app, '/api/projects/test-project/photos/photo%20name.jpg');
      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // GET /api/projects/:name/photos/:filename/thumb
  // ============================================

  describe('GET /api/projects/:name/photos/:filename/thumb', () => {
    it('should return a thumbnail with default width', async () => {
      const res = await request(app, '/api/projects/test-project/photos/landscape.jpg/thumb');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/image/);
    });

    it('should return a thumbnail with custom width', async () => {
      const res = await request(app, '/api/projects/test-project/photos/landscape.jpg/thumb?w=100');
      expect(res.status).toBe(200);
    });

    it('should reject invalid width', async () => {
      const res = await request(app, '/api/projects/test-project/photos/landscape.jpg/thumb?w=9999');
      expect(res.status).toBe(400);
    });

    it('should reject non-integer width', async () => {
      const res = await request(app, '/api/projects/test-project/photos/landscape.jpg/thumb?w=abc');
      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // GET /api/projects/:name/results/latest/export/:format
  // ============================================

  describe('GET /api/projects/:name/results/latest/export/:format', () => {
    it('should export markdown report', async () => {
      const res = await request(app, '/api/projects/test-project/results/latest/export/md');
      expect(res.status).toBe(200);
      expect(res.body).toContain('# Test Report');
    });

    it('should export CSV results', async () => {
      const res = await request(app, '/api/projects/test-project/results/latest/export/csv');
      expect(res.status).toBe(200);
      expect(res.body).toContain('landscape.jpg');
    });

    it('should export JSON ranking', async () => {
      const res = await request(app, '/api/projects/test-project/results/latest/export/json');
      expect(res.status).toBe(200);
      const data = res.json();
      expect(data.ranking).toBeDefined();
    });

    it('should return 400 for unsupported format', async () => {
      const res = await request(app, '/api/projects/test-project/results/latest/export/xml');
      expect(res.status).toBe(400);
    });

    it('should fall back to set-analysis files for export', async () => {
      // Create a project with only set-analysis files
      const setExpDir = path.join(testDataDir, 'set-export');
      const setTsDir = path.join(setExpDir, 'results', '2026-03-07T10-00-00');
      fs.mkdirSync(path.join(setExpDir, 'photos'), { recursive: true });
      fs.mkdirSync(setTsDir, { recursive: true });
      fs.writeFileSync(path.join(setExpDir, 'open-call.json'), '{"title":"Set Export"}');
      fs.writeFileSync(path.join(setTsDir, 'set-analysis.json'), JSON.stringify({ sets: [] }));
      fs.writeFileSync(path.join(setTsDir, 'set-analysis.md'), '# Set Report');
      fs.writeFileSync(path.join(setTsDir, 'set-analysis.csv'), 'set,score');
      fs.symlinkSync('2026-03-07T10-00-00', path.join(setExpDir, 'results', 'latest'), 'dir');

      const jsonRes = await request(app, '/api/projects/set-export/results/latest/export/json');
      expect(jsonRes.status).toBe(200);
      expect(jsonRes.json().sets).toBeDefined();

      const mdRes = await request(app, '/api/projects/set-export/results/latest/export/md');
      expect(mdRes.status).toBe(200);
      expect(mdRes.body).toContain('# Set Report');

      const csvRes = await request(app, '/api/projects/set-export/results/latest/export/csv');
      expect(csvRes.status).toBe(200);
      expect(csvRes.body).toContain('set,score');
    });

    it('should return 404 when export file not found', async () => {
      // Create project with only JSON, no MD or CSV
      const partialDir = path.join(testDataDir, 'partial-export');
      const partialTsDir = path.join(partialDir, 'results', '2026-03-08T10-00-00');
      fs.mkdirSync(path.join(partialDir, 'photos'), { recursive: true });
      fs.mkdirSync(partialTsDir, { recursive: true });
      fs.writeFileSync(path.join(partialDir, 'open-call.json'), '{}');
      fs.writeFileSync(path.join(partialTsDir, 'photo-analysis.json'), '{}');
      fs.symlinkSync('2026-03-08T10-00-00', path.join(partialDir, 'results', 'latest'), 'dir');

      const res = await request(app, '/api/projects/partial-export/results/latest/export/csv');
      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // Security Tests
  // ============================================

  // ============================================
  // GET /api/health and 404 handler
  // ============================================

  describe('Server endpoints', () => {
    it('should return health check', async () => {
      const res = await request(app, '/api/health');
      expect(res.status).toBe(200);
      const data = res.json();
      expect(data.status).toBe('ok');
    });

    it('should return 404 for unknown routes', async () => {
      const res = await request(app, '/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // Security Tests
  // ============================================

  describe('Security', () => {
    it('should not leak filesystem paths in error responses', async () => {
      const res = await request(app, '/api/projects/nonexistent');
      const body = res.body;
      expect(body).not.toContain(testDataDir);
      expect(body).not.toContain('/tmp/');
      expect(body).not.toContain(os.tmpdir());
    });

    it('should include security headers from helmet', async () => {
      const res = await request(app, '/api/projects');
      // Helmet sets various headers
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should validate project name parameter', async () => {
      const res = await request(app, '/api/projects/test%20project');
      expect(res.status).toBe(400);
    });
  });
});
