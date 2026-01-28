import { getApiClient, resetApiClient } from '../src/utils/api-client.js';

describe('API Client', () => {
  beforeEach(() => {
    resetApiClient();
  });

  test('should initialize Ollama client', () => {
    const client = getApiClient();
    expect(client).toBeDefined();
    expect(client).not.toBeNull();
  });

  test('should use default Ollama host if not specified', () => {
    delete process.env.OLLAMA_HOST;
    resetApiClient();
    const client = getApiClient();
    expect(client).toBeDefined();
  });

  test('should return same client instance on multiple calls', () => {
    const client1 = getApiClient();
    const client2 = getApiClient();
    expect(client1).toBe(client2);
  });

  afterEach(() => {
    resetApiClient();
  });
});
