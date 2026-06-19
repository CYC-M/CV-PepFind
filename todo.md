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

## 待改进项（后续迭代）
- [ ] 实现真实多肽资料库检索/召回链路（当前为LLM模拟，需要外部数据源支持）
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
- [ ] P1-2: 会话历史首次打开显示空 - 添加 loading 状态，乐观更新
- [ ] P1-3: 所有会话均为 Untitled Session - 支持重命名，自动提取标题，添加搜索

### P2 - 中优先级
- [ ] P2-1: 可视化页面功能卡片不可交互 - 添加 role/tabindex/click 事件或"Coming Soon"标识
- [ ] P2-2: AI 回复无加载/流式指示器 - 实现 SSE 流式输出，显示加载提示
- [x] P2-3: 时间戳格式不规范 - 用 Intl.DateTimeFormat 统一格式
- [x] P2-4: Account 标签页仅显示"Coming soon" - 添加功能说明和邮箱订阅
- [ ] P2-5: Logo 和 favicon 加载失败 - 检查 CDN 配置，添加本地 fallback

### P3 - 低优先级
- [x] P3-1: viewport 设 maximum-scale=1 阻止缩放 - 移除该限制，添加 favicon 和 apple-touch-icon
- [x] P3-2: 6 个按钮缺少 aria-label - 为所有图标按钮添加 aria-label
- [x] P3-3: 会话删除无确认对话框 - 删除确认对话已实现
