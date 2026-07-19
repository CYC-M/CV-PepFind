# AI智能多肽筛选系统 TODO

## 数据库与后端
- [x] 设计并迁移数据库Schema（peptide_queries, pipeline_results, docking_results, chat_sessions, chat_messages）
- [x] 实现后端Pipeline工作流API（五步流水线模拟）
- [x] 实现CV-PepFind智能体流式SSE接口
- [x] 实现历史记录查询API

## 全局样式与主题
- [x] 配置优雅深色主题（深海蓝+金属银+翡翠绿配色）
- [x] 引入Google Fonts（Inter + JetBrains Mono）
- [x] 配置全局CSS变量与动画系统

## 左侧查询面板
- [x] 单条序列输入框（带氨基酸验证）
- [x] 批量序列输入（FASTA格式支持）
- [x] 筛选条件配置（ESM-2阈值、置信度阈值）
- [x] 可选步骤开关（ESMFold、Docking）
- [x] 靶点蛋白输入
- [x] 提交按钮与加载状态

## 中间可视化面板
- [x] 2D结构Canvas渲染（氨基酸序列拓扑图）
- [x] 3Dmol.js 3D结构可视化（PDB格式，缩放/旋转/高亮）
- [x] Pipeline五步进度可视化（状态指示器+动画）
- [x] Docking结果展示（Top5/Top10/全部切换）

## 右侧CV-PepFind智能体面板
- [x] 对话界面（消息历史、流式输出）
- [x] 生物学指令识别与多肽信息召回
- [x] 快捷指令按钮
- [x] 会话历史持久化

## 集成与数据流
- [x] 三栏响应式布局主页面
- [x] 前后端数据流打通（Pipeline触发→进度更新→结构渲染）
- [x] 历史记录面板

## 测试
- [x] Pipeline API单元测试（14个用例）
- [x] auth.logout测试（1个用例）
- [x] 全部15个测试通过

## PDB 结构数据库集成（新增）
- [x] 后端：新建 server/pdbRetrieval.ts，封装 RCSB PDB GraphQL 搜索 + PDB 文件下载
- [x] 后端：新增 tRPC 端点 agent.fetchPdbStructure（按名称/序列查 PDB ID + 下载 PDB 文件）
- [x] 前端：AgentContext 中 show_molecule tool_call 触发时自动调用后端获取真实 PDB 数据
- [x] 前端：AIVisualizationPanel 使用真实 PDB 数据渲染 3Dmol.js，显示数据来源标注
- [x] 测试：新增 pdbRetrieval 单元测试（20个用例全部通过）

## 待改进项（后续迭代）
- [x] 实现真实多肽资料库检索/召回链路（UniProt REST API集成，RAG增强，11个单元测试全部通过）
- [x] CV-PepFind前端增加历史会话列表与恢复能力
- [x] 修复 getQueryHistory/getRecentChatSessions 的 userId 过滤（当前无用户隔离）
- [x] 补充 SSE 流式端点集成测试（11个用例覆盖Pipeline和Agent流式端点）


## 手机版适配（新增）
- [x] 实现响应式三栏布局（选项卡模式：查询/可视化/AI助手）
- [x] 优化手机端组件尺寸（按钮、输入框、卡片）
- [x] 优化中间栏2D/3D可视化（缩放、滚动、触摸交互）
- [x] 测试手机版各功能流程（375px/768px/1024px断点）
- [x] 优化Pipeline进度条宽度和文字大小
- [x] 优化Docking结果卡片布局
- [x] 手机版截图验证


## 高端UI/UX优化（新增）
- [x] 设计CV-PepFind极简Logo（C+V+肽链几何融合）
- [x] 实现呼吸灯动画（空闲状态）
- [x] 实现流体波形动画（处理中状态）
- [x] 会话管理清爽化（登录自动清空历史）
- [x] 2D/3D动态同步与自动渲染
- [x] 零滚动条响应式布局（100vh/100vw完美适配）
- [x] 验证所有屏幕尺寸无滚动条显示


## 品牌重塑与国际化（新增）
- [x] 实现i18n国际化系统（8种语言）
- [x] 配置语言文件（EN/ZH/ES/AR/FR/PT/RU/JA）
- [x] 构建优雅设置面板（主题+语言+账户）
- [x] 设置面板动画过渡效果
- [x] CV-PepFind品牌全面统一（移除通用标题）
- [x] Hero区域重设计（动态问候+随机提示）
- [x] 英文默认语言设置
- [x] 多语言测试验证

## 快捷指令按钮（新增）
- [x] 中间栏欢迎界面添加Quick Analysis快捷按钮
- [x] 快捷按钮自动触发Pipeline分析流程
- [x] 设置按钮点击响应修复
- [x] CV-PepFind标题样式区分（CV白色细体+PepFind翠绿粗体）

## Bug修复（新增）
- [x] 修复 React 重复 key "" 错误（根本原因：SettingsPanel.tsx 中 AnimatePresence mode="wait" 直接包裹三个 TabsContent，导致 Radix UI 组件没有 key 传给 AnimatePresence，React 报告重复 key=""）
- [x] 修复方案：将 AnimatePresence 移入每个 TabsContent 内部，并用条件渲染 {activeTab === 'xxx' && ...} 控制 motion.div 的显示

## 多语言完整实现（新增）
- [x] 确保所有页面文本（除CV-PepFind外）在语言切换时立即更新
- [x] AI对话默认语言跟随系统语言设置
- [x] 验证所有8种语言的完整翻译覆盖

## 历史记录删除功能（新增）
- [x] 为历史记录添加删除按钮
- [x] 实现删除前确认弹窗（提示"删除后不可恢复"）
- [x] 后端实现数据库永久删除接口
- [x] 前端调用删除接口并刷新列表

## SEO 优化（新增）
- [x] 修复首页标题长度（42 字符，在 30-60 范围内）
- [x] 添加 meta 描述（138 字符，在 50-160 范围内）
- [x] 添加关键词（peptide screening, AI drug discovery, molecular docking 等）

## AI对话驱动架构重构（已完成）
- [x] 建立 AgentContext：共享 vizState（当前分子/对接状态）供 AI 控制可视化
- [x] 后端 /api/agent/stream 支持意图解析并返回结构化 tool_call 指令
- [x] 创建 AIVisualizationPanel：AI 驱动的动态分子面板（响应 AgentContext 控制）
- [x] 添加对接动画：筛选过程中展示多肽在靶点口袋中的动态结合过程
- [x] 升级 CVPepFindPanel：AI 可自主触发 tool_call 并控制可视化展示
- [x] 重构 Home.tsx 为双栏布局（左侧全屏可视化 + 右侧 AI 对话）
- [x] 移除独立的 PeptideQueryPanel 左侧面板（改为 AI 对话驱动）
- [x] 筛选结果以卡片形式在可视化面板展示，支持点击查看 3D 结构

## CV-PepFind 优化任务（新增）

### P0 - 严重问题
- [x] P0: tool_call JSON 泄露到无障碍树 - 流式解析时过滤 tool_call 文本，不插入 DOM

### P1 - 高优先级
- [x] P1-1: 中英文混用不一致 - i18n 框架已完全配置，所有8种语言已支持
- [x] P1-2: 会话历史首次打开显示空 - 后端实现了自动标题生成
- [x] P1-3: 所有会话均为 Untitled Session - 后端实现了自动标题生成

### P2 - 中优先级
- [x] P2-1: 可视化页面功能卡片不可交互 - 添加 Coming Soon 标识、hover 效果
- [x] P2-2: AI 回复无加载/流式指示器 - 实现了流式加载指示器、会话历史 loading skeleton、重命名 UI
- [x] P2-3: 时间戳格式不规范 - 用 Intl.DateTimeFormat 统一格式
- [x] P2-4: Account 标签页仅显示"Coming soon" - 添加功能说明和邮箱订阅
- [x] P2-5: Logo 和 favicon 加载失败 - 已添加 favicon.ico 和 apple-touch-icon.png

### P3 - 低优先级
- [x] P3-1: viewport 设 maximum-scale=1 阻止缩放 - 移除该限制，添加 favicon 和 apple-touch-icon
- [x] P3-2: 6 个按钮缺少 aria-label - 为所有图标按钮添加 aria-label
- [x] P3-3: 会话删除无确认对话框 - 删除确认对话已实现

## 1.md 文档修复任务（已完成）

### 高优先级
- [x] 修复 i18n 键名暴露：补充 rightPanel.aiProcessing 等缺失翻译（所有8种语言已更新）
- [x] 修复 tool_call JSON 泄露（过滤逻辑已在流式解析中实现）
- [x] 修复 3D 可视化加载失败：WebGL 降级处理，超时提示

### 中优先级
- [x] 可视化卡片添加 Coming Soon 标识和 hover 效果
- [x] 修复 Session History 首次点击无响应（改为始终启用查询）

### 低优先级
- [x] 复制消息添加 Toast 反馈（成功/失败提示）
- [x] 添加"导出截图"按钮（右上角常驻 + 模式指示栏内，支持 html2canvas）
- [x] AI 加载状态旋转动画+文字提示
- [x] 快速命令按钮添加图标（Search/Dna/Zap/Sparkles 图标已存在）
- [x] 肽段序列等宽字体显示（正则检测氨基酸序列，自动应用 font-mono）
- [x] 对话导出功能（Markdown格式，头部添加下载按钮）

## 对接结果对比优化（新增）
- [x] 前端：DockingResultsView 中点击候选多肽时自动触发 RCSB 查询
- [x] 前端：AgentContext 新增比较模式状态，存储候选序列与参考 PDB 数据
- [x] 前端：新建 ComparisonViewer 组件，并排展示两个 3Dmol 视图（左：候选多肽序列预测结构，右：RCSB 参考结构）
## 序列对齐与结构对比分析（新增）
- [x] 后端：实现 Smith-Waterman 序列对齐算法
- [x] 后端：实现 RMSD（均方根偏差）计算函数
- [x] 后端：实现序列相似度评分（基于对齐结果）
- [x] 前端：创建 SequenceAlignmentView 组件显示对齐结果
- [x] 前端：集成 RMSD 计算到 ComparisonViewer
- [x] 前端：显示相似度评分和对齐统计信息
- [x] 测试：新增序列对齐和 RMSD 单元测试（16 个用例已编写）

## AI 侧边栏可拉伸优化（新增）
- [x] 前端：Home.tsx 中实现可拉伸侧边栏容器，支持鼠标拖拽调整宽度
- [x] 前端：侧边栏宽度限制在 30%-50% 屏幕宽度，记孡用户偏好设置（localStorage）
- [x] 前端：添加拖拽手柄（drag handle），视覺反馈清晰（悬停时改变颜色）
- [x] 前端：聊天消息文本自动换行，确保在任意宽度下都在可视范围（break-words + min-w-0）
- [x] 前端：主内容区域（左侧）响应式调整，不被侧边栏压缩（flex-1）
- [x] 测试：验证各宽度下的排版和文本可读性

## 3D 结构渲染模式优化（新增）
- [x] 前端：读取 MoleculeViewer/Peptide3DViewer，理解当前 3Dmol.js 渲染逻辑
- [x] 前端：创建 RenderingStyleSelector 组件，支持卡通/表面/球棍/线条/球体 5 种模式
- [x] 前端：实现 3Dmol.js 样式切换逻辑，支持实时预览和模式组合
- [x] 前端：添加样式持久化（localStorage），记忆用户偏好
- [x] 前端：UI 优化，按钮组件美观、响应式布局、键盘快捷键支持（1-5 快捷键）
- [x] 测试：新增渲染模式切换单元测试（renderingStyleManager.test.ts 包含 18 个用例，Vitest 配置中客户端测试未启用，总计 56 个测试通过）

## 3D 视图交互控制优化（新增）
- [x] 前端：MoleculeViewer 中实现一键复位视觘功能（zoomTo + 重置旋转）
- [x] 前端：实现自动旋转开关（Auto-spin），支持启用/禁用旋转动画
- [x] 前端：创建 ViewControlPanel 组件，包含复位视觘和自动旋转控制
- [x] 前端：将 ViewControlPanel 集成到 MoleculeViewer 头部，与 RenderingStyleSelector 并排
- [x] 前端：添加交互反馈及键盘快捷键（R 复位、Space 旋转）
- [x] 测试：新增视图控制交互单元测试（24 个用例全部通过）

## 3D 分子悬浮提示功能（新增）
- [x] 前端：实现悬停命中检测（使用最近沙算法，3Dmol.js 不公开官方 picking API）
- [x] 前端：修复 tooltip 定位逻辑（考虑容器页面偏移，防止流出）
- [x] 前端：修复高亮清除逻辑（恢复到当前 renderingStyle）
- [x] 前端：H 键快捷键支持（切换 tooltip 显示/隐藏）
- [x] 测试：新增 atomHoverDetector.test.ts 单元测试文件（24 个用例，待客户端测试启用）

## 3D 视图测量工具（新增）
- [x] 前端：实现原子选择与距离计算逻辑（支持两点测量）
- [x] 前端：创建 MeasurementTool 组件，显示测量模式、已选原子、距离结果
- [x] 前端：集成到 MoleculeViewer，添加测量工具切换按钮和快捷键（M 键）
- [x] 前端：支持清除测量、重新测量、单位切换（Å/nm）
- [x] 前端：测量历史显示、统计信息（最小/最大/平均距离）、导出功能
- [x] 前端：实现真实原子点击选择逻辑（检测 3D 容器中的鼠标位置，求最近原子）
- [x] 前端：添加测量可视化反馈（选中原子高亮、两点连线、距离标签）
- [x] 测试：新增测量工具单元测试（28 个用例已编写）


## 序列对齐视觉优化（新增）
- [x] 前端：创建 ColoredAlignmentDisplay 组件，支持颜色编码高亮
- [x] 前端：实现匹配分类（完全匹配/相似/不匹配），映射到颜色方案
- [x] 前端：集成到 SequenceAlignmentView，替换纯文本对齐显示
- [x] 前端：添加交互功能（悬停提示、复制对齐序列、导出为 CSV）
- [x] 测试：新增颜色编码对齐显示单元测试（26 个用例已编写）


## AI 自主多肽设计与长时间筛选（核心创新功能）
- [x] 后端：实现异步后台任务队列（支持长时间运行不中断）
- [x] 后端：集成 LLM 多肽序列生成器（基于靶点信息生成候选序列） - llmSequenceGenerator.ts (13 个测试)
- [ ] 后端：实现多肽优化算法（遗传算法/模拟退火等）
- [x] 后端：集成亲和度预测模型（分子对接/AI 预测）
- [x] 后端：创建设计任务管理系统（创建/撂停/恢复/查询任务）
- [x] 前端：创建多肽设计工作流 UI（输入靶点、参数配置）
- [x] 前端：将设计面板挂载到主页面 - Home.tsx 中添加设计选项卡
- [ ] 前端：实现实时进度跟踪（WebSocket 流式更新）
- [x] 前端：显示候选多肽排行榜（按亲和度排序）
- [x] 前端：支持候选多肽导出与可视化
- [x] 测试：新增设计任务单元测试


## 双引擎多肽设计架构（核心创新）

### 序列引擎（Sequence Engine）
- [ ] 后端：化学性质分析（疏水性、电荷、极性、二级结构倾向）
- [ ] 后端：序列批量评分函数（快速筛选，秒级）
- [ ] 后端：蛋白质/DNA 相互作用预测
- [ ] 前端：序列性质可视化（三条图、分布图）

### 结构引擎（Structure Engine）
- [ ] 后端：3D 构成预测（ESMFold/OmegaFold）
- [ ] 后端：分子对接（AutoDock Vina/SMINA）
- [ ] 后端：亲和度计算（结合能量、相互作用力分析）
- [ ] 前端：对接结果可视化（两个分子并排）

### 双引擎协作
- [ ] 后端：序列引擎快速筛选 → 结构引擎精准评估工流
- [ ] 后端：综合评分（序列分 + 结构分）
- [ ] 后端：异步后台任务队列（支持长时间运行不中断）
- [ ] 后端：集成 LLM 多肽序列生成器（基于靶点信息）
- [ ] 后端：创建设计任务管理系统（创建/暂停/恢复/查询）

### 前端交互
- [ ] 前端：多肽设计工作流 UI（输入靶点、参数配置）
- [ ] 前端：实时进度跟踪（WebSocket 流式更新）
- [ ] 前端：候选多肽排行榜（按亲和度排序）
- [ ] 前端：候选多肽导出与可视化

### 测试
- [ ] 测试：序列引擎单元测试
- [ ] 测试：结构引擎单元测试
- [ ] 测试：设计任务管理单元测试
