import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger } from '../src/utils/logger.js';

describe('logger transports', () => {
  let mockStream;

  beforeEach(() => {
    mockStream = { write: vi.fn() };
  });

  afterEach(() => {
    logger.removeTransport(mockStream);
  });

  it('should have addTransport and removeTransport methods', () => {
    expect(typeof logger.addTransport).toBe('function');
    expect(typeof logger.removeTransport).toBe('function');
  });

  it('should write info messages to transport', () => {
    logger.addTransport(mockStream);
    logger.info('test message');
    expect(mockStream.write).toHaveBeenCalledWith('[INFO] test message\n');
  });

  it('should write success messages to transport', () => {
    logger.addTransport(mockStream);
    logger.success('done');
    expect(mockStream.write).toHaveBeenCalledWith('[SUCCESS] done\n');
  });

  it('should write warn messages to transport', () => {
    logger.addTransport(mockStream);
    logger.warn('caution');
    expect(mockStream.write).toHaveBeenCalledWith('[WARN] caution\n');
  });

  it('should write error messages to transport', () => {
    logger.addTransport(mockStream);
    logger.error('fail');
    expect(mockStream.write).toHaveBeenCalledWith('[ERROR] fail\n');
  });

  it('should write section headers to transport', () => {
    logger.addTransport(mockStream);
    logger.section('My Section');
    expect(mockStream.write).toHaveBeenCalledWith('\n=== My Section ===\n');
  });

  it('should write debug messages to transport only when isDev', () => {
    const origEnv = process.env.NODE_ENV;
    // debug uses a module-level isDev check, so we test that transport
    // respects the same condition. Since isDev is captured at import time,
    // we just verify the transport write call pattern.
    logger.addTransport(mockStream);
    logger.debug('dbg');
    // isDev is false in test env, so no write expected
    expect(mockStream.write).not.toHaveBeenCalled();
    process.env.NODE_ENV = origEnv;
  });

  it('should stop writing after removeTransport', () => {
    logger.addTransport(mockStream);
    logger.info('before');
    expect(mockStream.write).toHaveBeenCalledTimes(1);

    logger.removeTransport(mockStream);
    logger.info('after');
    expect(mockStream.write).toHaveBeenCalledTimes(1);
  });

  it('should support multiple transports', () => {
    const stream2 = { write: vi.fn() };
    logger.addTransport(mockStream);
    logger.addTransport(stream2);
    logger.info('multi');
    expect(mockStream.write).toHaveBeenCalledWith('[INFO] multi\n');
    expect(stream2.write).toHaveBeenCalledWith('[INFO] multi\n');
    logger.removeTransport(stream2);
  });

  it('should handle removeTransport for non-added stream gracefully', () => {
    const unknown = { write: vi.fn() };
    expect(() => logger.removeTransport(unknown)).not.toThrow();
  });
});
