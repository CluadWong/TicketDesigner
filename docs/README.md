# 文档索引

> 最后整理：**2026-08-31**（按 P11 阶段进度整理：拆分 `development-plan.md`，把 P0–P8 阶段规格、历史状态快照、早期讨论稿与已完成项方案移入 `archive/`）。
> 本文是文档的**唯一入口**；不确定看哪份时，先从这里开始。

> **新会话 / 新任务从哪里开始**：`docs/` 下的文档**不会被自动读取**，需按序打开——
> ① 最近一次 `.workbuddy/memory/YYYY-MM-DD.md`（续做近期工作）→ ② `development-plan.md` §0（当前状态 / 缺口 / 下一步）
> → ③ `execution-log.md` 末尾 1–2 条（上一轮具体做了什么）→ ④ 按任务命中下表对应的 spec（**不要全读**）。
> 说明：`.workbuddy/memory/MEMORY.md` 每次会话**自动注入**上下文，无需打开，且已置顶同样的阅读顺序提示。

## 一、活跃文档

| 文档 | 用途 | 维护方式 |
|---|---|---|
| [development-plan.md](./development-plan.md) | 开发计划与执行追踪：§0 概览（当前状态/缺口/最近执行）、§1 最终目标、§2 当前状态与 MVP 范围、§3 已锁定决策、**§13–§18（P9–P12 阶段与风险控制）** | **每次执行前后更新 §0** |
| [execution-log.md](./execution-log.md) | 每轮执行的**详细过程**（「本轮 N 续」流水），从 development-plan.md §0.1 拆出 | **每次执行后追加一条** |
| [design.md](./design.md) | 统一设计契约：Schema 结构、Grid / P / Table / HTML / Image 模型、边框模型 | 设计变更时更新 |
| [design-biz.md](./design-biz.md) | 业务与交互设计：设计器界面、节点选择、拖拽规则、配置面板、数据与权限 | 设计变更时更新 |
| [engine.md](./engine.md) | 渲染引擎契约：运行时索引、Schema 校验、递归渲染、尺寸与边框算法、结构操作 | 设计变更时更新 |
| [acceptance-row-spec.md](./acceptance-row-spec.md) | 前五行**字段/边框规格表**，是样例 Schema 与验收测试的对齐依据 | **生效中**（被代码注释引用，勿移动/改名） |
| [prd.md](./prd.md) | 表单打印纸张尺寸说明 | 稳定 |
| [table-column-config-overview.md](./table-column-config-overview.md) | Table 列配置能力改动概览 | 参考 |
| [architecture-layering-review.md](./architecture-layering-review.md) | **分层核对（设计器 / 渲染组件 / 填充）**：目标结构、符合项、**不符合项清单 A1–A6 / B1–B4 / C1–C3 / D1–D3**；**§6 决策：不分化第二个渲染组件，改为「渲染内核 + 设计表面」两层**，§6.5 为最新调整顺序 | 调整后回写结论 |
| [delivery-scenario-gap.md](./delivery-scenario-gap.md) | **交付场景差距分析**（定稿范围：本应用只含设计器+渲染器，服务器/消费页为外部）：链路 `设计器导出JSON→(服务器透明存储)→消费页引用渲染器+json+data→打印`，**G1–G19 按 ◆本应用须补 / ◇外部实现 标注**（P0：解析即崩 / 未知类型崩 / 无字段清单 / 不可独立消费 / 两套DOM / 空值回退缺陷）、最小落地路径 | 调整后回写结论 |

## 二、归档区 `archive/`

> 归档文档**仅作决策与过程留档**，不再是当前方案依据。原始章节编号保留，便于历史引用追溯。

| 文档 | 来源 | 归档原因 |
|---|---|---|
| [phase-specs-p0-p8.md](./archive/phase-specs-p0-p8.md) | `development-plan.md` 原 §4–§12 | P0–P8 各阶段均已实现并通过，拆出以精简主线文档 |
| [status-history.md](./archive/status-history.md) | `development-plan.md` 原 §2 | 2026-08-27/28 代码核对的状态快照，已被现行 §2.1 取代 |
| [discussion-form-designer.md](./archive/discussion-form-designer.md) | 原 `docs/(1) 讨论表单设计器实现方案.md` | 早期方案讨论的对话记录（Schema 渲染 vs 直接生成 HTML 等），结论已并入 design.md / engine.md |
| [p6.2b-implementation-plan.md](./archive/p6.2b-implementation-plan.md) | 原 `docs/` 根目录 | P6.2b 已实现并通过验收 |
| [p10-acceptance-checklist.md](./archive/p10-acceptance-checklist.md) | 原 `docs/` 根目录 | P10 前五行闭环八项指标已全部通过，§14 闸门已解除 |

## 三、每次执行后的文档更新约定

1. **追加过程**：在 [execution-log.md](./execution-log.md) 末尾追加一条「本轮（YYYY-MM-DD N续）」，记录做了什么、验证结果。
2. **更新状态**：回到 [development-plan.md](./development-plan.md) §0，更新「最后更新」一行、§0.2「任务节点状态」、§0.3「已知缺口」，并在 §0.4「最近执行记录」表补一行。
3. **只留结论**：`development-plan.md` 只保留状态与指针，详细过程一律放 `execution-log.md`，避免该文件再次膨胀。

## 四、当前进度速览

- **主线：P11 完整工作票**（P10 前五行闭环已全部验收通过，§14 闸门已解除）。
- 已完成：P11-1 full 样例 1-Grid 对齐（消除段间 2px 双边框）、P11-3 A4 整票打印真机核验 + 打印方向由尺寸派生 + Table 边框配置。
- 下一步：P11-2 完整票快照基线（可选）、P11-4 并入推迟项（P7.2d/e/f、P9.1c-d、P9.2、P6.3 拖拽形式、P12 清理）。
- 验证基线：`vitest` **124/124** 通过，`vue-tsc --noEmit` 干净。
