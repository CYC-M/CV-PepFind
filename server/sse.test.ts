/**
 * SSE Endpoint Integration Tests
 * Tests for /api/pipeline/run and /api/agent/stream endpoints
 * Uses supertest to avoid fetch mock conflicts
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import type { Express } from "express";
import request from "supertest";

// Mock DB helpers before importing routers
vi.mock("./db", () => ({
  createPeptideQuery: vi.fn().mockResolvedValue(42),
  initPipelineSteps: vi.fn().mockResolvedValue(undefined),
  getPipelineSteps: vi.fn().mockResolvedValue([]),
  getDockingResults: vi.fn().mockResolvedValue([]),
  getStructurePredictions: vi.fn().mockResolvedValue([]),
  getQueryHistory: vi.fn().mockResolvedValue([]),
  getPeptideQuery: vi.fn().mockResolvedValue({ id: 42, sequences: ['ACDEFGHIK'], status: 'pending' }),
  updateQueryStatus: vi.fn().mockResolvedValue(undefined),
  updatePipelineStep: vi.fn().mockResolvedValue(undefined),
  saveEsmScores: vi.fn().mockResolvedValue(undefined),
  getEsmScores: vi.fn().mockResolvedValue([]),
  saveStructurePrediction: vi.fn().mockResolvedValue(undefined),
  saveDockingResults: vi.fn().mockResolvedValue(undefined),
  upsertChatSession: vi.fn().mockResolvedValue(undefined),
  updateSessionTitleIfEmpty: vi.fn().mockResolvedValue(undefined),
  saveChatMessage: vi.fn().mockResolvedValue(undefined),
  getChatHistory: vi.fn().mockResolvedValue([]),
  getRecentChatSessions: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
}));

// Mock pipeline runner to emit events quickly via onEvent option
vi.mock("./pipeline", () => ({
  runPipeline: vi.fn().mockImplementation(async (
    _queryId: number,
    _sequences: string[],
    opts: { onEvent: (data: unknown) => void },
  ) => {
    const { onEvent } = opts;
    onEvent({ type: 'step_start', stepIndex: 0, stepName: 'ESM-2 打分' });
    onEvent({ type: 'step_progress', stepIndex: 0, progress: 50 });
    onEvent({ type: 'step_complete', stepIndex: 0, data: { scores: [] } });
    onEvent({ type: 'step_start', stepIndex: 1, stepName: '序列过滤' });
    onEvent({ type: 'step_complete', stepIndex: 1, data: { passed: ['ACDEFGHIK'] } });
    onEvent({ type: 'pipeline_complete' });
  }),
}));

// Mock LLM streaming fetch
const createMockLLMStream = () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
    'data: [DONE]\n\n',
  ];
  let idx = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: vi.fn().mockImplementation(async () => {
          if (idx < chunks.length) {
            return { done: false, value: Buffer.from(chunks[idx++]) };
          }
          return { done: true, value: undefined };
        }),
        releaseLock: vi.fn(),
      }),
    },
  };
};

// Helper: parse SSE events from a text buffer
function parseSSEEvents(text: string): Array<{ type?: string; data: unknown }> {
  const events: Array<{ type?: string; data: unknown }> = [];
  const lines = text.split('\n');
  let currentData = '';

  for (const line of lines) {
    if (line.startsWith('data:')) {
      currentData = line.slice(5).trim();
    } else if (line === '' && currentData) {
      try {
        events.push(JSON.parse(currentData));
      } catch { /* skip non-JSON */ }
      currentData = '';
    }
  }
  return events;
}

describe("Pipeline SSE endpoint (/api/pipeline/run)", () => {
  let app: Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    const { registerPipelineSSE } = await import("./routers");
    registerPipelineSSE(app);
  });

  it("should return 400 when queryId is missing", async () => {
    const res = await request(app)
      .post('/api/pipeline/run')
      .send({ sequences: ['ACDEFGHIK'] });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it("should return 400 when sequences is missing", async () => {
    const res = await request(app)
      .post('/api/pipeline/run')
      .send({ queryId: 42 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it("should set SSE response headers", async () => {
    const res = await request(app)
      .post('/api/pipeline/run')
      .send({ queryId: 42, sequences: ['ACDEFGHIK'] })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.headers['cache-control']).toContain('no-cache');
  });

  it("should emit pipeline events in SSE data: format", async () => {
    const res = await request(app)
      .post('/api/pipeline/run')
      .send({ queryId: 42, sequences: ['ACDEFGHIK'] })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    const body = res.body as string;
    expect(body).toContain('data:');

    const events = parseSSEEvents(body);
    expect(events.length).toBeGreaterThan(0);

    // Should have step_start events
    const stepStartEvents = events.filter(e => (e as { type?: string }).type === 'step_start');
    expect(stepStartEvents.length).toBeGreaterThan(0);
  });

  it("should emit pipeline_complete as the final event", async () => {
    const res = await request(app)
      .post('/api/pipeline/run')
      .send({ queryId: 42, sequences: ['ACDEFGHIK'] })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    const events = parseSSEEvents(res.body as string);
    const completeEvents = events.filter(e => (e as { type?: string }).type === 'pipeline_complete');
    expect(completeEvents.length).toBeGreaterThan(0);
  });

  it("should include step names matching pipeline spec", async () => {
    const res = await request(app)
      .post('/api/pipeline/run')
      .send({ queryId: 42, sequences: ['ACDEFGHIK'] })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    const events = parseSSEEvents(res.body as string);
    const stepNames = events
      .filter(e => (e as { type?: string }).type === 'step_start')
      .map(e => (e as { stepName?: string }).stepName);

    expect(stepNames).toContain('ESM-2 打分');
    expect(stepNames).toContain('序列过滤');
  });
});

describe("Agent SSE endpoint (/api/agent/stream)", () => {
  let app: Express;

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: unknown) => {
      if (String(input).includes('rest.uniprot.org')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ results: [] }) });
      }
      return Promise.resolve(createMockLLMStream());
    }));
    app = express();
    app.use(express.json());
    const { registerAgentSSE } = await import("./routers");
    registerAgentSSE(app);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return 400 when sessionId is missing", async () => {
    const res = await request(app)
      .post('/api/agent/stream')
      .send({ message: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it("should return 400 when message is missing", async () => {
    const res = await request(app)
      .post('/api/agent/stream')
      .send({ sessionId: 'test-session' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it("should set SSE response headers for agent stream", async () => {
    const res = await request(app)
      .post('/api/agent/stream')
      .send({ sessionId: 'test-session', message: 'hello' })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.headers['cache-control']).toContain('no-cache');
  });

  it("should emit SSE data events for agent response", async () => {
    const res = await request(app)
      .post('/api/agent/stream')
      .send({ sessionId: 'test-session-2', message: 'What is a peptide?' })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    const body = res.body as string;
    expect(body).toContain('data:');
    const events = parseSSEEvents(body);
    expect(events.length).toBeGreaterThan(0);
  });

  it("should emit done event at end of agent stream", async () => {
    const res = await request(app)
      .post('/api/agent/stream')
      .send({ sessionId: 'test-session-3', message: 'Tell me about antimicrobial peptides' })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    const events = parseSSEEvents(res.body as string);
    const doneEvents = events.filter(e => (e as { type?: string }).type === 'done');
    expect(doneEvents.length).toBeGreaterThan(0);
  });
});
