# Work 双栏重构调试记录

## 当前已确认

- `Home.tsx` 的桌面端和移动端均直接挂载 `WorkLayout`，避免 Chat 的旧可视化/可调整侧栏嵌套。
- `WorkLayout.tsx` 使用 `section: flex h-full min-h-0 flex-col overflow-hidden`，顶部 header 固定，主体 `grid min-h-0 flex-1`，左右列各自使用 `min-h-0 overflow-y-auto`。
- 左侧包含任务进程、当前步骤、靶点/需求摘要和服务端状态记录；右侧包含输入、任务控制和候选结果。
- 日志文案已经明确为服务端生成的过程摘要与指标，不将模型隐藏推理链当作事实。
- TypeScript 检查 `pnpm exec tsc --noEmit` 已通过。

## 当前测试失败

- `designTaskQueue.test.ts` 的真实设计执行路径在 5 秒测试超时内未完成；这不是 Work 布局类型错误，而是队列测试没有隔离 LLM/对接执行器。
- `llmSequenceGenerator.test.ts` 的 refineSequences 过滤期望失败，收到的序列为 `YPWMKGGGS` 而不是原始 `YPWMK`。
- `sequenceAlignment.test.ts` 的不同坐标 RMSD 为 0，属于既有算法问题。
- `sse.test.ts` 的 Agent SSE done 事件缺失，属于既有 SSE 测试问题。

## 需要继续验证

- 在浏览器中检查 Work 空态和运行态是否有视觉重叠、横向溢出或滚动锁定。
- 检查 WorkLayout 的真实任务状态轮询与日志字段是否完整映射。
- 为 Work 状态映射/布局增加不依赖外部 LLM 的单元测试。
- 不应把与本次 Work 重构无关的既有测试失败误报为已修复。


## 2026-08-22 运行态验证

- Work 空态可填写 `IL-6` 与自然语言设计需求，并成功创建任务。
- 启动后服务端立即返回任务并进入运行态；左侧显示 8 步流程、当前步骤与 Agent 思考过程。
- 轮询期间状态推进到第 2 步，左侧显示 18 条服务端生成记录；候选序列可点击进入可视化。
- 右侧运行状态、暂停/停止控制与候选结果均可见；当前桌面截图未发现明显重叠或穿模。
- 当前思考区域展示的是系统生成的阶段摘要、指标和日志，不应解释为模型私有思维链。
- 尚需完成移动端截图、Vitest 回归、浏览器控制台/网络日志检查与 checkpoint。
