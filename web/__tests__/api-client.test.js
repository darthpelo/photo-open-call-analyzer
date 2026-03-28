import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchProjects, fetchProjectResults, fetchProject } from '../src/api/client.js';

describe('API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchProjects', () => {
    it('returns projects array on success', async () => {
      const mockData = { projects: [{ name: 'test-oc', title: 'Test OC' }] };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchProjects();
      expect(result).toEqual(mockData.projects);
      expect(fetch).toHaveBeenCalledWith('/api/projects');
    });

    it('returns empty array on fetch failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      const result = await fetchProjects();
      expect(result).toEqual([]);
    });

    it('returns empty array on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const result = await fetchProjects();
      expect(result).toEqual([]);
    });
  });

  describe('fetchProject', () => {
    it('returns project detail on success', async () => {
      const mockData = { name: 'test-oc', config: {}, photos: [], results: [] };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchProject('test-oc');
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/api/projects/test-oc');
    });

    it('returns null on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
      const result = await fetchProject('missing');
      expect(result).toBeNull();
    });
  });

  describe('fetchProjectResults', () => {
    it('returns ranking data on success', async () => {
      const mockData = {
        ranking: [{ photo: 'img1.jpg', overall_score: 8.5, rank: 1 }],
        total_photos: 1,
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchProjectResults('test-oc');
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/api/projects/test-oc/results/latest');
    });

    it('returns null on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
      const result = await fetchProjectResults('missing');
      expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const result = await fetchProjectResults('test');
      expect(result).toBeNull();
    });
  });
});
