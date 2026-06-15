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
