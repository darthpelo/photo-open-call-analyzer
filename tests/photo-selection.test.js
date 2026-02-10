import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolvePhotoSelection } from '../src/utils/file-utils.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'heic'];

describe('resolvePhotoSelection (FR-3.13)', () => {
  const testBase = join(tmpdir(), `photo-selection-test-${process.pid}`);
  const photosDir = join(testBase, 'photos');

  function createPhoto(name) {
    writeFileSync(join(photosDir, name), 'fake-photo-data');
  }

  beforeEach(() => {
    mkdirSync(photosDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testBase)) {
      rmSync(testBase, { recursive: true, force: true });
    }
  });

  describe('Smart Default mode (no --photos)', () => {
    it('should auto-select all photos when count equals setSize', () => {
      createPhoto('photo1.jpg');
      createPhoto('photo2.jpg');
      createPhoto('photo3.jpg');
      createPhoto('photo4.jpg');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: undefined,
        setSize: 4,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('smart-default');
      expect(result.filenames).toHaveLength(4);
      expect(result.photos).toHaveLength(4);
      expect(result.error).toBeNull();
    });

    it('should fail when photo count does not match setSize', () => {
      createPhoto('photo1.jpg');
      createPhoto('photo2.jpg');
      createPhoto('photo3.jpg');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: undefined,
        setSize: 4,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(false);
      expect(result.mode).toBe('smart-default');
      expect(result.error).toContain('found 3');
      expect(result.error).toContain('photo1.jpg');
    });

    it('should fail when photos directory is empty', () => {
      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: undefined,
        setSize: 4,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No supported photo files');
    });

    it('should fail when photos directory does not exist', () => {
      const result = resolvePhotoSelection({
        photosDir: join(testBase, 'nonexistent'),
        photoArgs: undefined,
        setSize: 4,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should ignore non-photo files when counting', () => {
      createPhoto('photo1.jpg');
      createPhoto('photo2.jpg');
      createPhoto('photo3.jpg');
      createPhoto('photo4.jpg');
      writeFileSync(join(photosDir, 'readme.txt'), 'not a photo');
      writeFileSync(join(photosDir, '.DS_Store'), 'system file');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: undefined,
        setSize: 4,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(true);
      expect(result.filenames).toHaveLength(4);
    });

    it('should return filenames sorted alphabetically', () => {
      createPhoto('charlie.jpg');
      createPhoto('alpha.jpg');
      createPhoto('bravo.jpg');
      createPhoto('delta.jpg');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: undefined,
        setSize: 4,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.filenames).toEqual(['alpha.jpg', 'bravo.jpg', 'charlie.jpg', 'delta.jpg']);
    });
  });

  describe('Glob Pattern mode', () => {
    it('should expand wildcard pattern', () => {
      createPhoto('urban-01.jpg');
      createPhoto('urban-02.jpg');
      createPhoto('urban-03.jpg');
      createPhoto('urban-04.jpg');
      createPhoto('nature-01.jpg');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: ['urban-*.jpg'],
        setSize: 4,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('glob');
      expect(result.filenames).toHaveLength(4);
      expect(result.filenames.every(f => f.startsWith('urban-'))).toBe(true);
    });

    it('should expand *.jpg to all jpg files', () => {
      createPhoto('photo1.jpg');
      createPhoto('photo2.jpg');
      createPhoto('photo3.png');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: ['*.jpg'],
        setSize: 2,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(true);
      expect(result.filenames).toEqual(['photo1.jpg', 'photo2.jpg']);
    });

    it('should support mixed globs and literal filenames', () => {
      createPhoto('set1-a.jpg');
      createPhoto('set1-b.jpg');
      createPhoto('extra.jpg');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: ['set1-*.jpg', 'extra.jpg'],
        setSize: 3,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(true);
      expect(result.filenames).toHaveLength(3);
      expect(result.filenames).toContain('extra.jpg');
    });

    it('should deduplicate when glob and literal overlap', () => {
      createPhoto('photo1.jpg');
      createPhoto('photo2.jpg');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: ['*.jpg', 'photo1.jpg'],
        setSize: 2,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(true);
      expect(result.filenames).toHaveLength(2);
    });

    it('should fail when glob matches zero files', () => {
      createPhoto('photo1.jpg');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: ['urban-*.jpg'],
        setSize: 4,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('matched 0 files');
    });

    it('should filter out non-supported formats from glob results', () => {
      createPhoto('photo1.jpg');
      writeFileSync(join(photosDir, 'photo2.txt'), 'not a photo');
      writeFileSync(join(photosDir, 'photo3.bmp'), 'unsupported');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: ['photo*.*'],
        setSize: 1,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(true);
      expect(result.filenames).toEqual(['photo1.jpg']);
    });
  });

  describe('Explicit Filename mode (backward compatible)', () => {
    it('should resolve explicit filenames', () => {
      createPhoto('a.jpg');
      createPhoto('b.jpg');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: ['a.jpg', 'b.jpg'],
        setSize: 2,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('explicit');
      expect(result.filenames).toEqual(['a.jpg', 'b.jpg']);
      expect(result.photos.every(p => p.startsWith(photosDir))).toBe(true);
    });

    it('should fail when a file does not exist', () => {
      createPhoto('a.jpg');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: ['a.jpg', 'missing.jpg'],
        setSize: 2,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing.jpg');
    });

    it('should deduplicate repeated filenames', () => {
      createPhoto('a.jpg');

      const result = resolvePhotoSelection({
        photosDir,
        photoArgs: ['a.jpg', 'a.jpg'],
        setSize: 1,
        supportedFormats: SUPPORTED_FORMATS
      });

      expect(result.success).toBe(true);
      expect(result.filenames).toHaveLength(1);
    });
  });
});
