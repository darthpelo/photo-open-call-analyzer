/**
 * Unit Tests for ConcurrencyManager (FR-3.8 / ADR-018)
 *
 * TDD: Tests written BEFORE implementation (RED phase).
 *
 * Tests:
 * - Slot acquire/release mechanics
 * - Max concurrency enforcement
 * - Auto-scaling based on latency feedback
 * - Memory guard
 * - Stats reporting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConcurrencyManager } from '../src/processing/concurrency-manager.js';

describe('ConcurrencyManager - Unit Tests', () => {

  // ============================================
  // Constructor & defaults
  // ============================================

  describe('constructor', () => {
    it('should create with explicit maxSlots', () => {
      const mgr = new ConcurrencyManager({ maxSlots: 5 });
      const stats = mgr.getStats();
      expect(stats.max).toBe(5);
      expect(stats.active).toBe(0);
    });

    it('should default maxSlots to min(cpus-1, 4) in auto mode', () => {
      const mgr = new ConcurrencyManager({ autoScale: true });
      const stats = mgr.getStats();
      expect(stats.max).toBeGreaterThanOrEqual(1);
      expect(stats.max).toBeLessThanOrEqual(4);
    });

    it('should accept memoryThresholdMB option', () => {
      const mgr = new ConcurrencyManager({ maxSlots: 2, memoryThresholdMB: 300 });
      expect(mgr).toBeDefined();
    });
  });

  // ============================================
  // acquireSlot / releaseSlot
  // ============================================

  describe('acquireSlot() and releaseSlot()', () => {
    it('should acquire a slot immediately when slots available', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 2 });
      const slot = await mgr.acquireSlot();
      expect(slot).toBeDefined();
      expect(slot.id).toBeDefined();
      expect(mgr.getStats().active).toBe(1);
    });

    it('should release a slot', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 2 });
      const slot = await mgr.acquireSlot();
      mgr.releaseSlot(slot);
      expect(mgr.getStats().active).toBe(0);
    });

    it('should allow acquiring up to maxSlots concurrently', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 3 });
      const s1 = await mgr.acquireSlot();
      const s2 = await mgr.acquireSlot();
      const s3 = await mgr.acquireSlot();
      expect(mgr.getStats().active).toBe(3);
      mgr.releaseSlot(s1);
      mgr.releaseSlot(s2);
      mgr.releaseSlot(s3);
    });

    it('should block when all slots are busy, then unblock on release', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 1 });
      const slot1 = await mgr.acquireSlot();

      let acquired = false;
      const pendingAcquire = mgr.acquireSlot().then(s => {
        acquired = true;
        return s;
      });

      // Should still be blocked
      await new Promise(r => setTimeout(r, 50));
      expect(acquired).toBe(false);

      // Release slot1, pendingAcquire should resolve
      mgr.releaseSlot(slot1);
      const slot2 = await pendingAcquire;
      expect(acquired).toBe(true);
      expect(slot2).toBeDefined();
      mgr.releaseSlot(slot2);
    });

    it('should enforce max concurrency with parallel tasks', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 2 });
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const tasks = Array.from({ length: 6 }, (_, i) => async () => {
        const slot = await mgr.acquireSlot();
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(r => setTimeout(r, 30));
        currentConcurrent--;
        mgr.releaseSlot(slot);
      });

      await Promise.all(tasks.map(t => t()));
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should not fail when releasing an already-released slot', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 2 });
      const slot = await mgr.acquireSlot();
      mgr.releaseSlot(slot);
      // Double release should not throw or go negative
      mgr.releaseSlot(slot);
      expect(mgr.getStats().active).toBe(0);
    });
  });

  // ============================================
  // reportLatency & auto-scaling
  // ============================================

  describe('reportLatency() and auto-scaling', () => {
    it('should accept latency reports without error', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 3, autoScale: true });
      const slot = await mgr.acquireSlot();
      mgr.reportLatency(slot, 5000);
      mgr.releaseSlot(slot);
    });

    it('should track average latency in stats', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 3, autoScale: true });

      const slot1 = await mgr.acquireSlot();
      mgr.reportLatency(slot1, 1000);
      mgr.releaseSlot(slot1);

      const slot2 = await mgr.acquireSlot();
      mgr.reportLatency(slot2, 3000);
      mgr.releaseSlot(slot2);

      const stats = mgr.getStats();
      expect(stats.avgLatencyMs).toBe(2000);
    });

    it('should scale down when latency exceeds 2x baseline', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 4, autoScale: true });

      // Establish baseline with first 3 photos at 1000ms
      for (let i = 0; i < 3; i++) {
        const s = await mgr.acquireSlot();
        mgr.reportLatency(s, 1000);
        mgr.releaseSlot(s);
      }

      const maxBefore = mgr.getStats().max;

      // Report high latency (> 2x baseline)
      for (let i = 0; i < 3; i++) {
        const s = await mgr.acquireSlot();
        mgr.reportLatency(s, 3000);
        mgr.releaseSlot(s);
      }

      expect(mgr.getStats().max).toBeLessThan(maxBefore);
    });

    it('should not scale below 1 slot', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 2, autoScale: true });

      // Establish baseline
      for (let i = 0; i < 3; i++) {
        const s = await mgr.acquireSlot();
        mgr.reportLatency(s, 100);
        mgr.releaseSlot(s);
      }

      // Report extremely high latency many times
      for (let i = 0; i < 10; i++) {
        const s = await mgr.acquireSlot();
        mgr.reportLatency(s, 10000);
        mgr.releaseSlot(s);
      }

      expect(mgr.getStats().max).toBeGreaterThanOrEqual(1);
    });

    it('should not auto-scale when autoScale is false', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 3, autoScale: false });

      for (let i = 0; i < 5; i++) {
        const s = await mgr.acquireSlot();
        mgr.reportLatency(s, 10000);
        mgr.releaseSlot(s);
      }

      expect(mgr.getStats().max).toBe(3);
    });
  });

  // ============================================
  // getStats()
  // ============================================

  describe('getStats()', () => {
    it('should return all required fields', () => {
      const mgr = new ConcurrencyManager({ maxSlots: 2 });
      const stats = mgr.getStats();
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('max');
      expect(stats).toHaveProperty('memoryMB');
      expect(stats).toHaveProperty('avgLatencyMs');
      expect(stats).toHaveProperty('photosProcessed');
      expect(stats).toHaveProperty('photosPerSec');
    });

    it('should report memoryMB as a positive number', () => {
      const mgr = new ConcurrencyManager({ maxSlots: 2 });
      expect(mgr.getStats().memoryMB).toBeGreaterThan(0);
    });

    it('should increment photosProcessed after slot cycle', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 2 });
      const slot = await mgr.acquireSlot();
      mgr.reportLatency(slot, 1000);
      mgr.releaseSlot(slot);

      expect(mgr.getStats().photosProcessed).toBe(1);
    });

    it('should calculate photosPerSec correctly', async () => {
      const mgr = new ConcurrencyManager({ maxSlots: 2 });

      const slot1 = await mgr.acquireSlot();
      mgr.reportLatency(slot1, 500);
      mgr.releaseSlot(slot1);

      const slot2 = await mgr.acquireSlot();
      mgr.reportLatency(slot2, 500);
      mgr.releaseSlot(slot2);

      // 2 photos with avg 500ms latency → ~2 photos/sec effective throughput
      const stats = mgr.getStats();
      expect(stats.photosProcessed).toBe(2);
      expect(stats.photosPerSec).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Memory guard
  // ============================================

  describe('memory guard', () => {
    it('should reduce maxSlots when memory exceeds threshold', async () => {
      // Use a very low threshold to trigger the guard in tests
      const mgr = new ConcurrencyManager({
        maxSlots: 4,
        autoScale: true,
        memoryThresholdMB: 1 // 1MB - will always be exceeded
      });

      // Establish baseline
      for (let i = 0; i < 3; i++) {
        const s = await mgr.acquireSlot();
        mgr.reportLatency(s, 1000);
        mgr.releaseSlot(s);
      }

      // After processing with memory over threshold, should have reduced slots
      expect(mgr.getStats().max).toBeLessThanOrEqual(1);
    });
  });
});
