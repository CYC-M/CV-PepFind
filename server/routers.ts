import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  createPeptideQuery, updateQueryStatus,
  initPipelineSteps, getPipelineSteps, getQueryHistory,
  getPeptideQuery, getDockingResults, getStructurePredictions, getEsmScores,
  upsertChatSession, saveChatMessage, getChatHistory, getRecentChatSessions,
} from "./db";
import { runPipeline, validateSequence } from "./pipeline";
import { invokeLLM } from "./_core/llm";
import type { Request, Response } from "express";
import type { Express } from "express";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Peptide Pipeline ──────────────────────────────────────────────────────
  peptide: router({
    // Submit a new pipeline job
    submit: publicProcedure
      .input(z.object({
        sequences: z.array(z.string().min(3).max(50)).min(1).max(20),
        targetProtein: z.string().optional(),
        esmThreshold: z.number().min(0).max(1).default(0.5),
        confidenceThreshold: z.number().min(0).max(1).default(0.7),
        enableEsmfold: z.boolean().default(true),
        enableDocking: z.boolean().default(true),
        sessionId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        const sessionId = input.sessionId ?? nanoid();

        // Validate sequences
        const invalidSeqs = input.sequences.filter(s => !validateSequence(s));
        if (invalidSeqs.length > 0) {
          throw new Error(`无效序列: ${invalidSeqs.join(', ')} - 仅支持标准氨基酸字母(A-Y)，长度3-50`);
        }

        const queryId = await createPeptideQuery({
          userId,
          sessionId,
          sequences: input.sequences,
          targetProtein: input.targetProtein,
          esmThreshold: input.esmThreshold,
          confidenceThreshold: input.confidenceThreshold,
          enableEsmfold: input.enableEsmfold,
          enableDocking: input.enableDocking,
          status: "pending",
        });

        await initPipelineSteps(queryId, input.enableEsmfold, input.enableDocking);

        return { queryId, sessionId };
      }),

    // Get pipeline status
    status: publicProcedure
      .input(z.object({ queryId: z.number() }))
      .query(async ({ input }) => {
        const query = await getPeptideQuery(input.queryId);
        const steps = await getPipelineSteps(input.queryId);
        return { query, steps };
      }),

    // Get docking results
    dockingResults: publicProcedure
      .input(z.object({ queryId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getDockingResults(input.queryId, input.limit);
      }),

    // Get structure predictions
    structures: publicProcedure
      .input(z.object({ queryId: z.number() }))
      .query(async ({ input }) => {
        return getStructurePredictions(input.queryId);
      }),

    // Get ESM scores
    esmScores: publicProcedure
      .input(z.object({ queryId: z.number() }))
      .query(async ({ input }) => {
        return getEsmScores(input.queryId);
      }),

    // Query history
    history: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return getQueryHistory(ctx.user?.id, input.limit);
      }),
  }),

  // ── CV-PepFind Agent ──────────────────────────────────────────────────────
  agent: router({
    // Get chat history
    history: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return getChatHistory(input.sessionId);
      }),

    // Get recent sessions
    sessions: publicProcedure.query(async ({ ctx }) => {
      return getRecentChatSessions(ctx.user?.id);
    }),

    // Non-streaming chat (fallback)
    chat: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        message: z.string().min(1).max(2000),
      }))
      .mutation(async ({ input, ctx }) => {
        await upsertChatSession(input.sessionId, ctx.user?.id);
        await saveChatMessage({ sessionId: input.sessionId, role: "user", content: input.message });

        const history = await getChatHistory(input.sessionId, 20);
        const messages = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

        const response = await invokeLLM({
          messages: [
            { role: "system" as const, content: CV_PЕПFIND_SYSTEM_PROMPT },
            ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : (Array.isArray(rawContent) ? rawContent.map(p => (p as { type: string; text?: string }).text ?? '').join('') : '抱歉，我暂时无法处理您的请求。');
        await saveChatMessage({ sessionId: input.sessionId, role: "assistant", content });
        return { content };
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ─── CV-PepFind System Prompt ─────────────────────────────────────────────────
const CV_PЕПFIND_SYSTEM_PROMPT = `你是 CV-PepFind，一个专业的AI多肽筛选智能体，由先进的生物信息学模型驱动。

## 你的核心能力：

1. **多肽功能与结构查询**
   - 解析氨基酸序列，分析其物化性质（疏水性、电荷分布、二级结构倾向）
   - 预测多肽的生物活性（抗菌、抗病毒、细胞穿透、靶向递药等）
   - 解释ESM-2打分、pLDDT置信度、Binding Score等专业指标

2. **多肽召回与筛选**
   - 从已知多肽数据库（APD3、CAMP、PepBDB）中召回相似功能多肽
   - 根据用户描述的生物学功能需求推荐候选序列
   - 分析序列-活性关系（SAR）

3. **自然语言生物学指令理解**
   - 理解复杂的生物学术语和实验需求
   - 将自然语言描述转化为具体的筛选参数建议
   - 提供多肽优化改造建议

## 回答风格：
- 专业、精准、有条理
- 对复杂概念提供清晰解释
- 在适当时候提供具体的序列示例
- 使用Markdown格式组织回答

## 示例多肽数据库知识：
- 抗菌肽：LL-37 (LLGDFFRKSKEKIGKEFKRIVQRIKDFLRNLVPRTES)、Magainin-2
- 细胞穿透肽：TAT (YGRKKRRQRRR)、Penetratin
- 靶向肽：RGD (精氨酸-甘氨酸-天冬氨酸)、NGR序列
- 抗病毒肽：Enfuvirtide (T-20)

请始终以专业、友好的态度协助用户完成多肽研究任务。`;

// ─── Express SSE route for Pipeline ──────────────────────────────────────────
export function registerPipelineSSE(app: Express) {
  app.post('/api/pipeline/run', async (req: Request, res: Response) => {
    const { queryId, sequences, esmThreshold, confidenceThreshold, enableEsmfold, enableDocking } = req.body;

    if (!queryId || !sequences) {
      res.status(400).json({ error: 'Missing queryId or sequences' });
      return;
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    let finished = false;

    const sendEvent = (data: unknown) => {
      if (!finished && !res.writableEnded) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    res.on('close', () => { finished = true; });

    try {
      await runPipeline(queryId, sequences, {
        esmThreshold: esmThreshold ?? 0.5,
        confidenceThreshold: confidenceThreshold ?? 0.7,
        enableEsmfold: enableEsmfold ?? true,
        enableDocking: enableDocking ?? true,
        onEvent: sendEvent,
      });
    } catch (err) {
      sendEvent({ type: 'pipeline_failed', error: String(err) });
    } finally {
      if (!finished && !res.writableEnded) {
        res.write('data: {"type":"done"}\n\n');
        res.end();
      }
    }
  });
}

// ─── Express SSE route for CV-PepFind streaming chat ─────────────────────────
export function registerAgentSSE(app: Express) {
  app.post('/api/agent/stream', async (req: Request, res: Response) => {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) {
      res.status(400).json({ error: 'Missing sessionId or message' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    let finished = false;
    res.on('close', () => { finished = true; });

    try {
      await upsertChatSession(sessionId);
      await saveChatMessage({ sessionId, role: "user", content: message });

      const history = await getChatHistory(sessionId, 20);
      const messages = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

      // Call LLM with streaming
      const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
      const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

      const llmRes = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          stream: true,
          messages: [
            { role: 'system', content: CV_PЕПFIND_SYSTEM_PROMPT },
            ...messages,
          ],
        }),
      });

      let fullContent = '';
      const reader = llmRes.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                if (!finished && !res.writableEnded) {
                  res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
                }
              }
            } catch { /* skip malformed chunks */ }
          }
        }
      }

      // Save complete message
      if (fullContent) {
        await saveChatMessage({ sessionId, role: "assistant", content: fullContent });
      }

      if (!finished && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      }
    } catch (err) {
      console.error('[Agent SSE] Error:', err);
      if (!finished && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: String(err) })}\n\n`);
        res.end();
      }
    }
  });
}
