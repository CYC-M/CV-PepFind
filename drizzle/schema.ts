import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 多肽查询记录
export const peptideQueries = mysqlTable("peptide_queries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  sequences: json("sequences").notNull(), // string[]
  targetProtein: varchar("targetProtein", { length: 256 }),
  esmThreshold: float("esmThreshold").default(0.5),
  confidenceThreshold: float("confidenceThreshold").default(0.7),
  enableEsmfold: boolean("enableEsmfold").default(true),
  enableDocking: boolean("enableDocking").default(true),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PeptideQuery = typeof peptideQueries.$inferSelect;
export type InsertPeptideQuery = typeof peptideQueries.$inferInsert;

// Pipeline步骤结果
export const pipelineSteps = mysqlTable("pipeline_steps", {
  id: int("id").autoincrement().primaryKey(),
  queryId: int("queryId").notNull(),
  stepIndex: int("stepIndex").notNull(), // 0-4
  stepName: varchar("stepName", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["waiting", "running", "completed", "failed"]).default("waiting").notNull(),
  progress: int("progress").default(0), // 0-100
  resultData: json("resultData"), // step-specific result
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PipelineStep = typeof pipelineSteps.$inferSelect;

// ESM-2打分结果
export const esmScores = mysqlTable("esm_scores", {
  id: int("id").autoincrement().primaryKey(),
  queryId: int("queryId").notNull(),
  sequence: varchar("sequence", { length: 2048 }).notNull(),
  score: float("score").notNull(),
  perplexity: float("perplexity"),
  passed: boolean("passed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EsmScore = typeof esmScores.$inferSelect;

// ESMFold结构预测结果
export const structurePredictions = mysqlTable("structure_predictions", {
  id: int("id").autoincrement().primaryKey(),
  queryId: int("queryId").notNull(),
  sequence: varchar("sequence", { length: 2048 }).notNull(),
  pdbData: text("pdbData"), // PDB格式结构数据
  plddt: float("plddt"), // 置信度分数
  ptm: float("ptm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StructurePrediction = typeof structurePredictions.$inferSelect;

// Docking对接结果
export const dockingResults = mysqlTable("docking_results", {
  id: int("id").autoincrement().primaryKey(),
  queryId: int("queryId").notNull(),
  rank: int("rank").notNull(), // 排名 1-N
  sequence: varchar("sequence", { length: 2048 }).notNull(),
  bindingScore: float("bindingScore").notNull(), // 结合分数 (kcal/mol)
  confidence: float("confidence").notNull(), // 置信度 0-1
  interactionResidues: json("interactionResidues"), // 相互作用残基
  pdbData: text("pdbData"), // 对接后PDB数据
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DockingResult = typeof dockingResults.$inferSelect;

// CV-PepFind对话会话
export const chatSessions = mysqlTable("chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;

// 对话消息
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"), // 额外信息（多肽召回结果等）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
