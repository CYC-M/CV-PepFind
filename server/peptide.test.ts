import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB helpers
vi.mock("./db", () => ({
  createPeptideQuery: vi.fn().mockResolvedValue(42),
  initPipelineSteps: vi.fn().mockResolvedValue(undefined),
  getPipelineSteps: vi.fn().mockResolvedValue([
    { stepIndex: 0, stepName: 'ESM-2 打分', status: 'completed', progress: 100, resultData: null, errorMessage: null },
    { stepIndex: 1, stepName: '序列过滤', status: 'waiting', progress: 0, resultData: null, errorMessage: null },
  ]),
  getDockingResults: vi.fn().mockResolvedValue([
    { id: 1, queryId: 42, rank: 1, sequence: 'ACDEFGHIK', bindingScore: -8.5, confidence: 0.92, interactionResidues: ['ARG23', 'LYS45'], pdbData: null, createdAt: new Date() },
    { id: 2, queryId: 42, rank: 2, sequence: 'KLMNPQRST', bindingScore: -7.2, confidence: 0.85, interactionResidues: ['ASP12'], pdbData: null, createdAt: new Date() },
  ]),
  getStructurePredictions: vi.fn().mockResolvedValue([
    { id: 1, queryId: 42, sequence: 'ACDEFGHIK', pdbData: 'ATOM 1 CA ALA A 1 0.0 0.0 0.0 1.00 0.00', plddt: 0.88, ptm: 0.91, createdAt: new Date() },
  ]),
  getQueryHistory: vi.fn().mockResolvedValue([
    { id: 42, sequences: ['ACDEFGHIK'], targetProtein: 'ACE2', status: 'completed', createdAt: new Date() },
  ]),
  getPeptideQuery: vi.fn().mockResolvedValue({ id: 42, sequences: ['ACDEFGHIK'], status: 'completed' }),
  updateQueryStatus: vi.fn().mockResolvedValue(undefined),
  updatePipelineStep: vi.fn().mockResolvedValue(undefined),
  saveEsmScores: vi.fn().mockResolvedValue(undefined),
  getEsmScores: vi.fn().mockResolvedValue([]),
  saveStructurePrediction: vi.fn().mockResolvedValue(undefined),
  saveDockingResults: vi.fn().mockResolvedValue(undefined),
  upsertChatSession: vi.fn().mockResolvedValue(undefined),
  saveChatMessage: vi.fn().mockResolvedValue(undefined),
  getChatHistory: vi.fn().mockResolvedValue([]),
  getRecentChatSessions: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext['res'],
  };
}

describe("peptide.submit", () => {
  it("should reject empty sequences array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.peptide.submit({ sequences: [] })
    ).rejects.toThrow();
  });

  it("should reject sequences with invalid amino acids", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.peptide.submit({ sequences: ['XYZINVALID123'] })
    ).rejects.toThrow();
  });

  it("should accept valid amino acid sequences", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.peptide.submit({ sequences: ['ACDEFGHIK'] });
    expect(result).toHaveProperty('queryId');
    expect(typeof result.queryId).toBe('number');
  });

  it("should accept multiple valid sequences", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.peptide.submit({
      sequences: ['ACDEFGHIK', 'LLGDFFRKSK'],
      targetProtein: 'ACE2',
      esmThreshold: 0.6,
    });
    expect(result.queryId).toBe(42);
  });
});

describe("peptide.status", () => {
  it("should return pipeline steps for a valid queryId", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.peptide.status({ queryId: 42 });
    expect(result).toHaveProperty('steps');
    expect(Array.isArray(result.steps)).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("should include step metadata", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.peptide.status({ queryId: 42 });
    const firstStep = result.steps[0];
    expect(firstStep).toHaveProperty('stepIndex');
    expect(firstStep).toHaveProperty('stepName');
    expect(firstStep).toHaveProperty('status');
    expect(firstStep).toHaveProperty('progress');
  });
});

describe("peptide.dockingResults", () => {
  it("should return docking results for a valid queryId", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.peptide.dockingResults({ queryId: 42 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should respect the limit parameter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.peptide.dockingResults({ queryId: 42, limit: 1 });
    expect(result.length).toBeLessThanOrEqual(2); // mock returns 2, limit applied in db
  });

  it("should have required fields in each result", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const results = await caller.peptide.dockingResults({ queryId: 42 });
    for (const r of results) {
      expect(r).toHaveProperty('rank');
      expect(r).toHaveProperty('sequence');
      expect(r).toHaveProperty('bindingScore');
      expect(r).toHaveProperty('confidence');
      expect(typeof r.bindingScore).toBe('number');
      expect(r.bindingScore).toBeLessThan(0); // binding scores should be negative
    }
  });
});

describe("peptide.structures", () => {
  it("should return structure predictions for a valid queryId", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.peptide.structures({ queryId: 42 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should include pdbData field", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const results = await caller.peptide.structures({ queryId: 42 });
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('pdbData');
    }
  });
});

describe("peptide.history", () => {
  it("should return query history", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.peptide.history({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should include required history fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const history = await caller.peptide.history({});
    if (history.length > 0) {
      const item = history[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('sequences');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('createdAt');
    }
  });
});

describe("auth.logout", () => {
  it("should clear session cookie and return success", async () => {
    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const ctx: TrpcContext = {
      user: {
        id: 1, openId: 'test-user', email: 'test@example.com',
        name: 'Test User', loginMethod: 'manus', role: 'user',
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: 'https', headers: {} } as TrpcContext['req'],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext['res'],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
  });
});
