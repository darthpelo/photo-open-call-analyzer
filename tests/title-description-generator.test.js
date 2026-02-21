import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock Ollama client before importing the module
vi.mock('../src/utils/api-client.js', () => ({
  getApiClient: vi.fn(),
  getModelName: vi.fn(() => 'llava:7b')
}));

const { getApiClient, getModelName } = await import('../src/utils/api-client.js');

describe('Title/Description Generator (FR-4.1)', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-tdg-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // Helper: create a minimal open call config
  function makeConfig(overrides = {}) {
    return {
      title: 'Urban Perspectives 2026',
      theme: 'City life and urban transformation',
      jury: [
        { name: 'Jane Doe', style: 'documentary', focus: 'street photography' }
      ],
      ...overrides
    };
  }

  // Helper: create a minimal photo analysis result
  function makePhotoAnalysis(overrides = {}) {
    return {
      photo: 'sunset-01.jpg',
      scores: {
        individual: {
          'Theme Fit': { score: 8, weight: 25 },
          'Technical Quality': { score: 7, weight: 20 },
          'Originality': { score: 9, weight: 20 },
          'Narrative Strength': { score: 7, weight: 20 },
          'Jury Fit': { score: 6, weight: 15 }
        },
        summary: {
          weighted_average: 7.5,
          average: 7.4,
          recommendation: 'Submit',
          keyStrength: 'Strong thematic connection',
          mainConcern: 'Slightly conventional framing'
        },
        full_analysis: 'The photo shows a powerful urban sunset scene...'
      },
      ...overrides
    };
  }

  describe('buildTextPrompt', () => {

  describe('buildTextPrompt - edge cases', () => {
    it('should handle missing scores gracefully', async () => {
      const { buildTextPrompt } = await import('../src/output/title-description-generator.js');
      const photoWithoutScores = { photo: 'test.jpg' };
      const prompt = buildTextPrompt(photoWithoutScores, makeConfig());
      expect(prompt).toContain('Photo Analysis');
    });

    it('should handle empty jury array', async () => {
      const { buildTextPrompt } = await import('../src/output/title-description-generator.js');
      const configNoJury = { ...makeConfig(), jury: [] };
      const prompt = buildTextPrompt(makePhotoAnalysis(), configNoJury);
      expect(prompt).toContain('Jury Profile:');
    });

    it('should use recommendation field when keyStrength is missing', async () => {
      const { buildTextPrompt } = await import('../src/output/title-description-generator.js');
      const photoWithoutStrength = makePhotoAnalysis();
      delete photoWithoutStrength.scores.summary.keyStrength;
      const prompt = buildTextPrompt(photoWithoutStrength, makeConfig());
      expect(prompt).toContain('Submit');
    });
  });
    it('should include the open call theme in the prompt', async () => {
      const { buildTextPrompt } = await import('../src/output/title-description-generator.js');
      const prompt = buildTextPrompt(makePhotoAnalysis(), makeConfig());
      expect(prompt).toContain('City life and urban transformation');
    });

    it('should include jury profile in the prompt', async () => {
      const { buildTextPrompt } = await import('../src/output/title-description-generator.js');
      const prompt = buildTextPrompt(makePhotoAnalysis(), makeConfig());
      expect(prompt).toContain('Jane Doe');
    });

    it('should include the photo overall score', async () => {
      const { buildTextPrompt } = await import('../src/output/title-description-generator.js');
      const prompt = buildTextPrompt(makePhotoAnalysis(), makeConfig());
      expect(prompt).toContain('7.5');
    });

    it('should include top scoring criteria', async () => {
      const { buildTextPrompt } = await import('../src/output/title-description-generator.js');
      const prompt = buildTextPrompt(makePhotoAnalysis(), makeConfig());
      expect(prompt).toContain('Originality');
    });

    it('should include the analysis summary/key strength', async () => {
      const { buildTextPrompt } = await import('../src/output/title-description-generator.js');
      const prompt = buildTextPrompt(makePhotoAnalysis(), makeConfig());
      expect(prompt).toContain('Strong thematic connection');
    });

    it('should request JSON output format', async () => {
      const { buildTextPrompt } = await import('../src/output/title-description-generator.js');
      const prompt = buildTextPrompt(makePhotoAnalysis(), makeConfig());
      expect(prompt).toContain('JSON');
    });

    it('should mention title and description length constraints', async () => {
      const { buildTextPrompt } = await import('../src/output/title-description-generator.js');
      const prompt = buildTextPrompt(makePhotoAnalysis(), makeConfig());
      expect(prompt).toMatch(/100/);
      expect(prompt).toMatch(/500/);
    });
  });

  describe('generateTexts', () => {
    it('should call Ollama chat API and return title + description', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { content: '{"title": "Urban Twilight", "description": "A striking capture of city transformation at dusk."}' }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      const result = await generateTexts(makePhotoAnalysis(), makeConfig());

      expect(result.title).toBe('Urban Twilight');
      expect(result.description).toBe('A striking capture of city transformation at dusk.');
      expect(mockChat).toHaveBeenCalledOnce();
    });

    it('should use textModel from options if provided', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { content: '{"title": "Test", "description": "Test desc"}' }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      await generateTexts(makePhotoAnalysis(), makeConfig(), { textModel: 'llama3:8b' });

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'llama3:8b' })
      );
    });

    it('should use config textModel as fallback', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { content: '{"title": "Test", "description": "Test desc"}' }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      await generateTexts(makePhotoAnalysis(), makeConfig({ textModel: 'mistral:7b' }));

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'mistral:7b' })
      );
    });

    it('should handle Ollama API errors gracefully', async () => {
      const mockChat = vi.fn().mockRejectedValue(new Error('connection refused'));
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      const result = await generateTexts(makePhotoAnalysis(), makeConfig());

      expect(result.error).toBeDefined();
      expect(result.title).toBeUndefined();
    });

    it('should handle malformed JSON response', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { content: 'Here is the title: Urban Twilight. And the description: A city at dusk.' }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      const result = await generateTexts(makePhotoAnalysis(), makeConfig());

      expect(result.error).toBeDefined();
    });

    it('should truncate title to 100 characters', async () => {
      const longTitle = 'A'.repeat(150);
      const mockChat = vi.fn().mockResolvedValue({
        message: { content: JSON.stringify({ title: longTitle, description: 'Short desc' }) }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      const result = await generateTexts(makePhotoAnalysis(), makeConfig());

      expect(result.title.length).toBeLessThanOrEqual(100);
    });

    it('should truncate description to 500 characters', async () => {
      const longDesc = 'B'.repeat(600);
      const mockChat = vi.fn().mockResolvedValue({
        message: { content: JSON.stringify({ title: 'Short', description: longDesc }) }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      const result = await generateTexts(makePhotoAnalysis(), makeConfig());

      expect(result.description.length).toBeLessThanOrEqual(500);
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { 
          content: '```json\n{"title": "Code Block Title", "description": "In markdown"}\n```' 
        }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      const result = await generateTexts(makePhotoAnalysis(), makeConfig());

      expect(result.title).toBe('Code Block Title');
      expect(result.description).toBe('In markdown');
    });

    it('should handle JSON wrapped in markdown code blocks without json label', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { 
          content: '```\n{"title": "Block Title", "description": "No Label"}\n```' 
        }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      const result = await generateTexts(makePhotoAnalysis(), makeConfig());

      expect(result.title).toBe('Block Title');
      expect(result.description).toBe('No Label');
    });

    it('should extract JSON from text with object pattern match', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { 
          content: 'Here is the JSON: {"title": "Pattern Match", "description": "Extracted from text"} and some more text' 
        }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      const result = await generateTexts(makePhotoAnalysis(), makeConfig());

      expect(result.title).toBe('Pattern Match');
      expect(result.description).toBe('Extracted from text');
    });

    it('should return error when markdown block contains invalid JSON', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { 
          content: '```json\n{invalid json content}\n```' 
        }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      const result = await generateTexts(makePhotoAnalysis(), makeConfig());

      expect(result.error).toBeDefined();
    });

    it('should return error when object pattern match fails to parse', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { 
          content: '{"title": "unclosed", "description": incomplete json' 
        }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      const result = await generateTexts(makePhotoAnalysis(), makeConfig());

      expect(result.error).toBeDefined();
    });

    it('should return error when pattern-matched JSON is invalid', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { 
          content: 'Text {"title": "Valid", "description": invalid} more' 
        }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      const result = await generateTexts(makePhotoAnalysis(), makeConfig());

      expect(result.error).toBeDefined();
    });

    it('should include retry prompt suffix in request', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { content: '{"title": "Retry", "description": "Second attempt"}' }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateTexts } = await import('../src/output/title-description-generator.js');
      await generateTexts(makePhotoAnalysis(), makeConfig(), {
        retryPromptSuffix: 'Be more creative'
      });

      expect(mockChat).toHaveBeenCalledOnce();
      const callArgs = mockChat.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('Be more creative');
    });
  });

  describe('jaccardSimilarity', () => {
    it('should return 1.0 for identical strings', async () => {
      const { jaccardSimilarity } = await import('../src/output/title-description-generator.js');
      expect(jaccardSimilarity('hello world', 'hello world')).toBe(1.0);
    });

    it('should return 0.0 for completely different strings', async () => {
      const { jaccardSimilarity } = await import('../src/output/title-description-generator.js');
      expect(jaccardSimilarity('hello world', 'foo bar')).toBe(0.0);
    });

    it('should return a value between 0 and 1 for partial overlap', async () => {
      const { jaccardSimilarity } = await import('../src/output/title-description-generator.js');
      const sim = jaccardSimilarity('urban twilight scene', 'urban dawn scene');
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });
  });

  describe('generateBatchTexts', () => {
    it('should generate texts for all analyzed photos in results', async () => {
      // Setup project directory with config and results
      const projectDir = testDir;
      const resultsDir = path.join(projectDir, 'results', 'latest');
      fs.mkdirSync(resultsDir, { recursive: true });

      // Write open-call.json
      fs.writeFileSync(path.join(projectDir, 'open-call.json'), JSON.stringify(makeConfig()));

      // Write batch results with 2 photos
      fs.writeFileSync(path.join(resultsDir, 'batch-results.json'), JSON.stringify({
        results: [
          { photo: 'photo1.jpg', success: true, scores: makePhotoAnalysis().scores },
          { photo: 'photo2.jpg', success: true, scores: makePhotoAnalysis({ photo: 'photo2.jpg' }).scores }
        ]
      }));

      const mockChat = vi.fn()
        .mockResolvedValueOnce({
          message: { content: '{"title": "Title One", "description": "Desc one"}' }
        })
        .mockResolvedValueOnce({
          message: { content: '{"title": "Title Two", "description": "Desc two"}' }
        });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateBatchTexts } = await import('../src/output/title-description-generator.js');
      const results = await generateBatchTexts(projectDir);

      expect(results).toHaveLength(2);
      expect(results[0].photo).toBe('photo1.jpg');
      expect(results[0].title).toBe('Title One');
      expect(results[1].photo).toBe('photo2.jpg');
      expect(results[1].title).toBe('Title Two');
    });

    it('should skip failed photos in batch results', async () => {
      const projectDir = testDir;
      const resultsDir = path.join(projectDir, 'results', 'latest');
      fs.mkdirSync(resultsDir, { recursive: true });

      fs.writeFileSync(path.join(projectDir, 'open-call.json'), JSON.stringify(makeConfig()));
      fs.writeFileSync(path.join(resultsDir, 'batch-results.json'), JSON.stringify({
        results: [
          { photo: 'photo1.jpg', success: true, scores: makePhotoAnalysis().scores },
          { photo: 'photo2.jpg', success: false, error: 'timeout' }
        ]
      }));

      const mockChat = vi.fn().mockResolvedValue({
        message: { content: '{"title": "Title One", "description": "Desc one"}' }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateBatchTexts } = await import('../src/output/title-description-generator.js');
      const results = await generateBatchTexts(projectDir);

      expect(results).toHaveLength(1);
      expect(mockChat).toHaveBeenCalledOnce();
    });

    it('should save generated-texts.json to results directory', async () => {
      const projectDir = testDir;
      const resultsDir = path.join(projectDir, 'results', 'latest');
      fs.mkdirSync(resultsDir, { recursive: true });

      fs.writeFileSync(path.join(projectDir, 'open-call.json'), JSON.stringify(makeConfig()));
      fs.writeFileSync(path.join(resultsDir, 'batch-results.json'), JSON.stringify({
        results: [
          { photo: 'photo1.jpg', success: true, scores: makePhotoAnalysis().scores }
        ]
      }));

      const mockChat = vi.fn().mockResolvedValue({
        message: { content: '{"title": "Saved Title", "description": "Saved desc"}' }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateBatchTexts } = await import('../src/output/title-description-generator.js');
      await generateBatchTexts(projectDir);

      const outputPath = path.join(resultsDir, 'generated-texts.json');
      expect(fs.existsSync(outputPath)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(saved).toHaveLength(1);
      expect(saved[0].title).toBe('Saved Title');
    });

    it('should retry with creative prompt when title is too similar (Jaccard > 0.7)', async () => {
      const projectDir = testDir;
      const resultsDir = path.join(projectDir, 'results', 'latest');
      fs.mkdirSync(resultsDir, { recursive: true });

      fs.writeFileSync(path.join(projectDir, 'open-call.json'), JSON.stringify(makeConfig()));
      fs.writeFileSync(path.join(resultsDir, 'batch-results.json'), JSON.stringify({
        results: [
          { photo: 'photo1.jpg', success: true, scores: makePhotoAnalysis().scores },
          { photo: 'photo2.jpg', success: true, scores: makePhotoAnalysis().scores }
        ]
      }));

      const mockChat = vi.fn()
        // First photo: original title
        .mockResolvedValueOnce({
          message: { content: '{"title": "Urban Sunset Glow", "description": "Desc one"}' }
        })
        // Second photo: too similar title
        .mockResolvedValueOnce({
          message: { content: '{"title": "Urban Sunset Glow", "description": "Desc two"}' }
        })
        // Retry: different title
        .mockResolvedValueOnce({
          message: { content: '{"title": "Metropolitan Dawn", "description": "Desc two revised"}' }
        });
      getApiClient.mockReturnValue({ chat: mockChat });

      const { generateBatchTexts } = await import('../src/output/title-description-generator.js');
      const results = await generateBatchTexts(projectDir);

      expect(results).toHaveLength(2);
      expect(results[1].title).toBe('Metropolitan Dawn');
      // 3 calls: 1st photo, 2nd photo (similar), retry for 2nd photo
      expect(mockChat).toHaveBeenCalledTimes(3);
    });

    it('should throw if batch-results.json is missing', async () => {
      const projectDir = testDir;
      fs.mkdirSync(path.join(projectDir, 'results', 'latest'), { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'open-call.json'), JSON.stringify(makeConfig()));

      const { generateBatchTexts } = await import('../src/output/title-description-generator.js');

      await expect(generateBatchTexts(projectDir)).rejects.toThrow(/batch results/i);
    });

    it('should throw if open-call.json is missing', async () => {
      const projectDir = testDir;
      const resultsDir = path.join(projectDir, 'results', 'latest');
      fs.mkdirSync(resultsDir, { recursive: true });
      fs.writeFileSync(path.join(resultsDir, 'batch-results.json'), JSON.stringify({ results: [] }));

      const { generateBatchTexts } = await import('../src/output/title-description-generator.js');

      await expect(generateBatchTexts(projectDir)).rejects.toThrow(/open-call\.json/i);
    });
  });
});
