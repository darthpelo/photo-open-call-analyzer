import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChat = vi.fn();
const mockClient = { chat: mockChat };
vi.mock('../src/utils/api-client.js', () => ({
  getApiClient: vi.fn(() => mockClient),
  getModelName: vi.fn(() => 'llava:7b')
}));

vi.mock('../src/utils/model-manager.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    resolveTextModel: vi.fn(() => 'phi3:medium'),
    ensureModelAvailable: vi.fn(async () => true)
  };
});

import { analyzeStrategically } from '../src/analysis/strategic-analyzer.js';
import { getApiClient } from '../src/utils/api-client.js';
import { resolveTextModel, ensureModelAvailable } from '../src/utils/model-manager.js';

describe('strategic-analyzer', () => {
  const mockOpenCallData = {
    title: 'Lyricalmyrical Books Open Call 2026',
    theme: 'Urban Narratives',
    jury: ['Ian Willms', 'Silvia Clo Di Gregorio'],
    pastWinners: 'Documentary and intimate storytelling favored',
    context: 'Independent photobook publisher, Italy'
  };

  const mockOllamaResponse = {
    message: {
      content: `## Open Call Positioning

This call targets emerging photographers with documentary sensibility.

## Strategic Assessment

Strong alignment with urban architecture language.

## Risks

- Heavy documentary competition

## Recommendation

Submit architectural series.

\`\`\`json
{
  "call_alignment_score": 7.8,
  "overall_competitiveness": "high",
  "strategic_positioning": "distinctive technique advantage",
  "key_risks": ["heavy documentary competition"],
  "recommended_approach": "architectural series",
  "scoring": {
    "visual_impact_fit": 8,
    "conceptual_coherence_fit": 7,
    "editorial_fit": 8,
    "distinctiveness_potential": 9,
    "dialogue_potential": 6,
    "risk_level": "medium"
  }
}
\`\`\``
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockResolvedValue(mockOllamaResponse);
  });

  it('should return an object with markdown and json', async () => {
    const result = await analyzeStrategically(mockOpenCallData, { _client: mockClient });
    expect(result).toHaveProperty('markdown');
    expect(result).toHaveProperty('json');
    expect(result).toHaveProperty('model');
  });

  it('should resolve text model via resolveTextModel', async () => {
    await analyzeStrategically(mockOpenCallData, { _client: mockClient });
    expect(resolveTextModel).toHaveBeenCalled();
  });

  it('should ensure model is available', async () => {
    await analyzeStrategically(mockOpenCallData, { _client: mockClient });
    expect(ensureModelAvailable).toHaveBeenCalledWith('phi3:medium');
  });

  it('should call Ollama chat with text model (no images)', async () => {
    await analyzeStrategically(mockOpenCallData, { _client: mockClient });

    expect(mockChat).toHaveBeenCalledTimes(1);
    const callArgs = mockChat.mock.calls[0][0];
    expect(callArgs.model).toBe('phi3:medium');
    expect(callArgs.messages).toBeDefined();
    expect(callArgs.messages.length).toBeGreaterThanOrEqual(1);

    // No images in any message
    for (const msg of callArgs.messages) {
      expect(msg).not.toHaveProperty('images');
    }
  });

  it('should include open call data in the prompt', async () => {
    await analyzeStrategically(mockOpenCallData, { _client: mockClient });

    const callArgs = mockChat.mock.calls[0][0];
    const allContent = callArgs.messages.map(m => m.content).join(' ');
    expect(allContent).toContain('Lyricalmyrical Books Open Call 2026');
    expect(allContent).toContain('Urban Narratives');
  });

  it('should parse markdown from response', async () => {
    const result = await analyzeStrategically(mockOpenCallData, { _client: mockClient });
    expect(result.markdown).toContain('## Open Call Positioning');
    expect(result.markdown).toContain('## Strategic Assessment');
  });

  it('should parse JSON from response', async () => {
    const result = await analyzeStrategically(mockOpenCallData, { _client: mockClient });
    expect(result.json).not.toBeNull();
    expect(result.json.call_alignment_score).toBe(7.8);
    expect(result.json.overall_competitiveness).toBe('high');
  });

  it('should return model name used', async () => {
    const result = await analyzeStrategically(mockOpenCallData, { _client: mockClient });
    expect(result.model).toBe('phi3:medium');
  });

  it('should accept textModel override', async () => {
    resolveTextModel.mockReturnValue('llama3:8b');
    await analyzeStrategically(mockOpenCallData, { textModel: 'llama3:8b', _client: mockClient });

    const callArgs = mockChat.mock.calls[0][0];
    expect(callArgs.model).toBe('llama3:8b');
  });

  it('should handle Ollama error gracefully', async () => {
    mockChat.mockRejectedValue(new Error('Ollama connection refused'));

    await expect(analyzeStrategically(mockOpenCallData, { _client: mockClient })).rejects.toThrow('Ollama connection refused');
  });

  it('should accept research context', async () => {
    const researchContext = { juryDetails: 'Ian Willms is a documentary photographer' };
    await analyzeStrategically(mockOpenCallData, { researchContext, _client: mockClient });

    const callArgs = mockChat.mock.calls[0][0];
    const allContent = callArgs.messages.map(m => m.content).join(' ');
    expect(allContent).toContain('documentary photographer');
  });

  it('should accept memory context', async () => {
    const memoryContext = 'Past analysis shows jury prefers conceptual work';
    await analyzeStrategically(mockOpenCallData, { memoryContext, _client: mockClient });

    const callArgs = mockChat.mock.calls[0][0];
    const allContent = callArgs.messages.map(m => m.content).join(' ');
    expect(allContent).toContain('conceptual work');
  });
});
