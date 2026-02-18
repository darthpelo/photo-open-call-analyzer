/**
 * Concurrency Manager (FR-3.8 / ADR-018)
 *
 * Slot-based concurrency control with optional auto-scaling
 * for batch photo processing. Replaces fixed chunk-based
 * Promise.all() with adaptive throughput management.
 *
 * Key Features:
 * - Semaphore-style slot acquisition (blocks when full)
 * - Auto-scaling based on latency feedback
 * - Memory guard to prevent OOM on large batches
 * - Stats reporting for performance dashboard
 *
 * @module concurrency-manager
 */

import os from 'os';
import { logger } from '../utils/logger.js';

const BASELINE_WINDOW = 3;
const LATENCY_SCALE_UP_FACTOR = 1.2;
const LATENCY_SCALE_DOWN_FACTOR = 2.0;
const DEFAULT_MEMORY_THRESHOLD_MB = 400;
const DEFAULT_MAX_CEILING = 6;

/**
 * Slot-based concurrency manager with optional auto-scaling.
 */
export class ConcurrencyManager {
  /**
   * @param {Object} options
   * @param {number} [options.maxSlots] - Maximum concurrent slots (default: auto-detected)
   * @param {boolean} [options.autoScale=false] - Enable latency-based auto-scaling
   * @param {number} [options.memoryThresholdMB=400] - Memory threshold for guard
   */
  constructor(options = {}) {
    const { autoScale = false, memoryThresholdMB = DEFAULT_MEMORY_THRESHOLD_MB } = options;

    this._autoScale = autoScale;
    this._memoryThresholdMB = memoryThresholdMB;

    // Determine initial max slots
    if (options.maxSlots !== undefined && !autoScale) {
      this._maxSlots = options.maxSlots;
    } else if (autoScale && options.maxSlots === undefined) {
      this._maxSlots = Math.min(os.cpus().length - 1, 4);
      this._maxSlots = Math.max(1, this._maxSlots);
    } else {
      this._maxSlots = options.maxSlots || 3;
    }

    this._activeSlots = 0;
    this._nextSlotId = 1;
    this._releasedSlotIds = new Set();
    this._waitQueue = [];

    // Latency tracking
    this._latencies = [];
    this._baselineLatency = null;
    this._photosProcessed = 0;
    this._startTime = performance.now();
  }

  /**
   * Acquire a processing slot. Blocks (via promise) if all slots are busy.
   * @returns {Promise<Object>} Slot handle with `id` property
   */
  async acquireSlot() {
    if (this._activeSlots < this._maxSlots) {
      this._activeSlots++;
      const slot = { id: this._nextSlotId++ };
      return slot;
    }

    // All slots busy - wait for a release
    return new Promise((resolve) => {
      this._waitQueue.push(resolve);
    });
  }

  /**
   * Release a processing slot, allowing a waiting task to proceed.
   * @param {Object} slot - Slot handle from acquireSlot()
   */
  releaseSlot(slot) {
    // Guard against double-release
    if (this._releasedSlotIds.has(slot.id)) {
      return;
    }
    this._releasedSlotIds.add(slot.id);

    if (this._waitQueue.length > 0) {
      const next = this._waitQueue.shift();
      const newSlot = { id: this._nextSlotId++ };
      next(newSlot);
    } else {
      this._activeSlots = Math.max(0, this._activeSlots - 1);
    }
  }

  /**
   * Report latency for a completed photo analysis.
   * Feeds the auto-scaling algorithm.
   * @param {Object} slot - Slot handle
   * @param {number} latencyMs - Analysis duration in milliseconds
   */
  reportLatency(slot, latencyMs) {
    this._latencies.push(latencyMs);
    this._photosProcessed++;

    // Establish baseline from first N photos
    if (this._latencies.length === BASELINE_WINDOW && this._baselineLatency === null) {
      this._baselineLatency = this._latencies.reduce((a, b) => a + b, 0) / BASELINE_WINDOW;
    }

    if (this._autoScale && this._baselineLatency !== null) {
      this._adjustConcurrency();
    }
  }

  /**
   * Get current performance statistics.
   * @returns {Object} Stats object
   */
  getStats() {
    const heapUsedBytes = process.memoryUsage().heapUsed;
    const memoryMB = Math.round(heapUsedBytes / (1024 * 1024));

    const avgLatencyMs = this._latencies.length > 0
      ? Math.round(this._latencies.reduce((a, b) => a + b, 0) / this._latencies.length)
      : 0;

    const elapsedSec = (performance.now() - this._startTime) / 1000;
    const photosPerSec = elapsedSec > 0
      ? Math.round((this._photosProcessed / elapsedSec) * 100) / 100
      : 0;

    return {
      active: this._activeSlots,
      max: this._maxSlots,
      memoryMB,
      avgLatencyMs,
      photosProcessed: this._photosProcessed,
      photosPerSec
    };
  }

  /**
   * Internal: adjust concurrency based on recent latency and memory.
   */
  _adjustConcurrency() {
    // Memory guard: if over threshold, force down to 1
    const memoryMB = Math.round(process.memoryUsage().heapUsed / (1024 * 1024));
    if (memoryMB > this._memoryThresholdMB) {
      if (this._maxSlots > 1) {
        this._maxSlots = 1;
        logger.debug(`[CONCURRENCY] Memory guard triggered (${memoryMB}MB > ${this._memoryThresholdMB}MB), reduced to 1 slot`);
      }
      return;
    }

    // Recent latency (last 3 measurements)
    const recentWindow = this._latencies.slice(-BASELINE_WINDOW);
    const recentAvg = recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length;

    // Scale down if latency > 2x baseline
    if (recentAvg > this._baselineLatency * LATENCY_SCALE_DOWN_FACTOR) {
      if (this._maxSlots > 1) {
        this._maxSlots--;
        logger.debug(`[CONCURRENCY] Scaled down to ${this._maxSlots} slots (latency ${Math.round(recentAvg)}ms > ${Math.round(this._baselineLatency * LATENCY_SCALE_DOWN_FACTOR)}ms)`);
      }
    }
    // Scale up if latency < 1.2x baseline and below ceiling
    else if (recentAvg < this._baselineLatency * LATENCY_SCALE_UP_FACTOR) {
      if (this._maxSlots < DEFAULT_MAX_CEILING) {
        this._maxSlots++;
        logger.debug(`[CONCURRENCY] Scaled up to ${this._maxSlots} slots (latency ${Math.round(recentAvg)}ms < ${Math.round(this._baselineLatency * LATENCY_SCALE_UP_FACTOR)}ms)`);
      }
    }
  }
}
