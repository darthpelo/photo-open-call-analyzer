import { describe, it, expect } from 'vitest';
import { calculateProbeTimeout, parsePhotoTimeoutOption } from '../src/processing/batch-processor.js';

describe('calculateProbeTimeout (ADR-023)', () => {
  it('returns 90s minimum for fast probes (10s)', () => {
    expect(calculateProbeTimeout(10000)).toBe(90000);
  });

  it('returns 3x probe time when above minimum (40s probe)', () => {
    expect(calculateProbeTimeout(40000)).toBe(120000);
  });

  it('returns 3x probe time for 80s probe', () => {
    expect(calculateProbeTimeout(80000)).toBe(240000);
  });

  it('caps at 300s maximum (150s probe)', () => {
    expect(calculateProbeTimeout(150000)).toBe(300000);
  });

  it('caps at 300s for very slow probes (200s)', () => {
    expect(calculateProbeTimeout(200000)).toBe(300000);
  });

  it('returns 90s floor for zero-duration probe', () => {
    expect(calculateProbeTimeout(0)).toBe(90000);
  });

  it('returns 90s floor for sub-second probe', () => {
    expect(calculateProbeTimeout(500)).toBe(90000);
  });
});

describe('parsePhotoTimeoutOption (ADR-023)', () => {
  it('returns null timeout and explicitTimeout=false for "auto"', () => {
    const result = parsePhotoTimeoutOption('auto');
    expect(result.photoTimeout).toBeNull();
    expect(result.explicitTimeout).toBe(false);
  });

  it('parses numeric string to milliseconds', () => {
    const result = parsePhotoTimeoutOption('60');
    expect(result.photoTimeout).toBe(60000);
    expect(result.explicitTimeout).toBe(true);
  });

  it('returns error for value below 30', () => {
    const result = parsePhotoTimeoutOption('10');
    expect(result.error).toBeTruthy();
  });

  it('returns error for value above 300', () => {
    const result = parsePhotoTimeoutOption('500');
    expect(result.error).toBeTruthy();
  });

  it('returns error for non-numeric string', () => {
    const result = parsePhotoTimeoutOption('abc');
    expect(result.error).toBeTruthy();
  });

  it('accepts boundary value 30', () => {
    const result = parsePhotoTimeoutOption('30');
    expect(result.photoTimeout).toBe(30000);
    expect(result.explicitTimeout).toBe(true);
  });

  it('accepts boundary value 300', () => {
    const result = parsePhotoTimeoutOption('300');
    expect(result.photoTimeout).toBe(300000);
    expect(result.explicitTimeout).toBe(true);
  });
});
