import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  peptideQueries, InsertPeptideQuery,
  pipelineSteps,
  esmScores,
  structurePredictions,
  dockingResults,
  chatSessions,
  chatMessages,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Peptide Query helpers ────────────────────────────────────────────────────

export async function createPeptideQuery(data: InsertPeptideQuery) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(peptideQueries).values(data);
  return result[0].insertId as number;
}

export async function updateQueryStatus(queryId: number, status: "pending" | "running" | "completed" | "failed") {
  const db = await getDb();
  if (!db) return;
  await db.update(peptideQueries).set({ status }).where(eq(peptideQueries.id, queryId));
}

export async function getPeptideQuery(queryId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(peptideQueries).where(eq(peptideQueries.id, queryId)).limit(1);
  return result[0] ?? null;
}

export async function getQueryHistory(userId?: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(peptideQueries)
    .orderBy(desc(peptideQueries.createdAt))
    .limit(limit);
  return rows;
}

// ─── Pipeline Step helpers ────────────────────────────────────────────────────

export async function initPipelineSteps(queryId: number, enableEsmfold: boolean, enableDocking: boolean) {
  const db = await getDb();
  if (!db) return;
  const steps = [
    { queryId, stepIndex: 0, stepName: "ESM-2 打分", status: "waiting" as const },
    { queryId, stepIndex: 1, stepName: "序列过滤", status: "waiting" as const },
    { queryId, stepIndex: 2, stepName: "ESMFold 结构预测", status: enableEsmfold ? "waiting" as const : "waiting" as const },
    { queryId, stepIndex: 3, stepName: "结构输出", status: "waiting" as const },
    { queryId, stepIndex: 4, stepName: "Binding 评分 / Docking 对接", status: enableDocking ? "waiting" as const : "waiting" as const },
  ];
  await db.insert(pipelineSteps).values(steps);
}

export async function updatePipelineStep(queryId: number, stepIndex: number, update: {
  status?: "waiting" | "running" | "completed" | "failed";
  progress?: number;
  resultData?: unknown;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(pipelineSteps)
    .set(update as Record<string, unknown>)
    .where(and(eq(pipelineSteps.queryId, queryId), eq(pipelineSteps.stepIndex, stepIndex)));
}

export async function getPipelineSteps(queryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pipelineSteps)
    .where(eq(pipelineSteps.queryId, queryId))
    .orderBy(pipelineSteps.stepIndex);
}

// ─── ESM Score helpers ────────────────────────────────────────────────────────

export async function saveEsmScores(queryId: number, scores: Array<{ sequence: string; score: number; perplexity: number; passed: boolean }>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(esmScores).values(scores.map(s => ({ ...s, queryId })));
}

export async function getEsmScores(queryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(esmScores).where(eq(esmScores.queryId, queryId));
}

// ─── Structure Prediction helpers ─────────────────────────────────────────────

export async function saveStructurePrediction(data: { queryId: number; sequence: string; pdbData: string; plddt: number; ptm: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(structurePredictions).values(data);
}

export async function getStructurePredictions(queryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(structurePredictions).where(eq(structurePredictions.queryId, queryId));
}

// ─── Docking Result helpers ───────────────────────────────────────────────────

export async function saveDockingResults(queryId: number, results: Array<{
  rank: number; sequence: string; bindingScore: number; confidence: number;
  interactionResidues: string[]; pdbData?: string;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(dockingResults).values(results.map(r => ({ ...r, queryId })));
}

export async function getDockingResults(queryId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(dockingResults)
    .where(eq(dockingResults.queryId, queryId))
    .orderBy(dockingResults.rank);
  if (limit) return (await query).slice(0, limit);
  return query;
}

// ─── Chat helpers ─────────────────────────────────────────────────────────────

export async function upsertChatSession(sessionId: string, userId?: number, title?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatSessions)
    .values({ sessionId, userId, title })
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
}

export async function saveChatMessage(data: { sessionId: string; role: "user" | "assistant"; content: string; metadata?: unknown }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values(data as { sessionId: string; role: "user" | "assistant"; content: string; metadata?: unknown });
}

export async function getChatHistory(sessionId: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt)
    .limit(limit);
}

export async function getRecentChatSessions(userId?: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatSessions)
    .orderBy(desc(chatSessions.updatedAt))
    .limit(limit);
}
