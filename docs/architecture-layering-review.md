# 分层核对：设计器 / 渲染组件 / 填充

> 生成日期：**2026-09-02**
> 目的：按用户给定的目标功能结构核对当前实现，列出**不符合点**，作为后续调整清单的依据。
> 本文只做核对与结论，**不含已执行的代码改动**；调整动作落地后另在 `execution-log.md` 记录。

---

## 0. 目标结构（基准）

```text
设计器（Designer）  ──引用──▶  渲染组件（Renderer）
  · 结构编辑（增删 / 拖拽 / 排序）        · 只做渲染：schema + data → 版式 DOM
  · 节点选中与 Inspector 配置             · 不认识「设计态 / 预览态 / 填充态」
  · 撤销重做 / 导入导出 / 校验            · 不含拖拽代码、不含配置面板
  · 非设计态一律「禁用」而非「实现」       · 不承担数据归属，值变更以事件外抛

填充（Fill） = 渲染组件 + 一份数据
  · 没有独立的填充态渲染分支
  · 数据来自外部，写回由容器（使用方）决定
```

判定口径：**渲染组件里不应出现任何"只有设计器才需要"的能力**；拖拽与配置在渲染组件里应当是**不存在**，而不是"被禁用"。

---

## 1. 核对范围与局限

| 对象 | 核对方式 |
|---|---|
| `src/components/renderer-v2/GridFormRenderer.vue` | 全文读（当前工作区版本） |
| `src/components/renderer-v2/GridSchemaNode.vue` | 全文读（当前工作区版本） |
| `src/components/renderer-v2/HtmlBlock.vue` / `index.ts` | 全文读 |
| `src/App.vue` / `src/dev/demoData.ts` / `package.json` | 全文读 |
| `src/components/designer/DesignerApp.vue` | ⚠️ **工作区文件当前被磁盘加密软件加壳（文件头 `%TSD-Header`，86016 字节），无法读取明文**（同目录其余源码均正常；`.workbuddy/memory/2026-09-02.md` 记录该文件当日早些时候仍可读、79265 字节 → 加密发生在最近一次保存之后）。本次以 `git HEAD`（2026-08-31 提交，2497 行）+ 当前版 `DesignerApp.test.ts`（562 行，28 例）交叉核对 |
| `src/components/preview/`、`src/engine/` | 目录为空（`engine` 仅有空的 `__tests__`） |

> 结论可信度判定：`DesignerApp.vue` 相关的 B/C 类结论基于 HEAD + 当前测试，若工作区有后续改动需复核；A 类（渲染组件）结论基于当前源码，**可直接采信**。

---

## 2. 符合项（已对齐，无需调整）

| # | 符合点 | 证据 |
|---|---|---|
| ✅1 | 设计器确实**引用**渲染组件，没有 fork 一份"设计态专用渲染" | `DesignerApp` 内 `<GridSchemaRenderer :schema :selected-node-id :data :readonly>` 单一引用点 |
| ✅2 | 拖拽与配置的**实现**都在设计器层 | palette `draggable`/`startPaletteDrag`、canvas `dragover`/`drop`、`onCanvasDrop` 定位、Inspector 全部配置控件；渲染组件内无拖拽代码、无配置面板 |
| ✅3 | 非设计态的禁用有效且有测试护栏 | palette 按钮 `:disabled="previewMode"`；`addRootGrid`/`addGrid`/`addNodeToSelectedCell`/`selectNode`/`selectNodeById` 均有 `if (previewMode.value) return`；测试「预览态绕过 UI 直接调用添加函数也不改结构」 |
| ✅4 | 打印样式归属渲染组件 | `@media print` 全部写在 `GridFormRenderer.vue` / `GridSchemaNode.vue` |
| ✅5 | 表格行数按数据推导（填充正例） | `resolveTableRowCount(node, data)` 渲染期推导，schema 不写死行数 |

---

## 3. 不符合项清单

> 优先级：**P1** = 决定分层成败，先做；**P2** = 结构性问题；**P3** = 工程/一致性；**P4** = 清理。

### A 类｜渲染组件不纯（设计态与交互逻辑内嵌）

| 编号 | 不符合点 | 位置 | 现状 | 目标 | 优先级 |
|---|---|---|---|---|---|
| **A1** | 渲染组件 props 契约里内嵌「三态」概念，靠 `data != null` 推断模式 | `GridFormRenderer.vue` props 注释「data 为空时进入设计态（字段可编辑）」；`GridSchemaNode.vue` `fillMode = props.data != null`、`canFill = fillMode && props.readonly !== true`、`isEditable()` 用 `!fillMode` 判设计态 | 渲染组件自己把「有没有 data」解释成「是不是填充态」，把「设计态」写进对外契约 | 渲染组件只认识 `(schema, data, options)`；模式由调用方**显式传入**（如 `mode: "design" \| "preview" \| "fill"` 或 `editable` 开关），`data` 只用于取值与表格行数推导 | **P1** |
| **A2** | 渲染组件内置设计态就地编辑（contenteditable） | `<p :contenteditable="canFill ? undefined : isEditable(node)">`；复合字段 `.layout-p__input :contenteditable="props.readonly ? undefined : 'true'"`；`readEditableText()` 同时处理 contenteditable 与控件；`.layout-p :deep(div)` 是为 contenteditable 运行时插入的 div 兜底 | 设计器的"编辑字段内容"能力长在渲染组件里，且**不回写 schema**（已知行为） | 设计态字段只渲染（`default` / 字段占位），改内容走 Inspector；contenteditable 相关逻辑与 CSS 随之下线 | **P2**（需拍板，见 §4） |
| **A3** | 填充态与预览态是**两套 DOM 分支**，"填充"不是"渲染组件 + 数据" | `canFill` 决定渲染 `<textarea class="layout-p__control">` 还是静态文本 / 逐行 `<div class="layout-p__line">`（innerBorder 特例） | 同一组件内两条渲染路径，取值、换行、内部边框在两条路径各实现一遍 | 统一渲染路径：值渲染 + 可选控件；`editable` 决定控件是否可输入，只读态复用同一结构 | **P1** |
| **A4** | 数据回写走渲染组件内部 `inject("formFill")`，反向依赖设计器 | `const formFill = inject<(f,v)=>void>("formFill", ()=>{})`；`onFillInput` 内部判 `canFill` 后回写 | 渲染组件依赖一个**只有 DesignerApp 提供**的字符串 key；脱离设计器使用时静默失效（默认空函数） | 渲染组件 emit 字段变更（如 `field-change(field, value)` 或 `update:data`），由使用方决定写哪里 | **P1** |
| **A5** | 渲染组件持有选中态并输出设计器高亮样式 | `GridSchemaNode` / `HtmlBlock` / `GridFormRenderer` 均接收 `selectedNodeId` 并输出 `.layout-node--selected`；`@media print` 里还要清除该高亮 | 「选中」是设计器交互，却进入渲染组件 props 与样式 | 渲染组件不认识 `selectedNodeId`；高亮由设计器通过 wrapper class / 插槽 / 外层样式注入 | **P2** |
| **A6** | ⚠️ **进行中冲突**：今天正在实施的「拖拽重排已有节点」方案把拖拽能力放进渲染组件 | 当日规划（`.workbuddy/memory/2026-09-02.md`）P2 = `GridSchemaNode.vue` 加 `draggable` + `@dragstart` 并由 `GridFormRenderer` emit 透传到 `DesignerApp`；P4 = 渲染组件内渲染 `.v2-insertion-line` 插入指示 | 若按该方案落地，渲染组件将**主动承担拖拽源与插入指示**，与「渲染组件不做拖拽」直接冲突，且会让 A5 的 `selectedNodeId` 更难拆 | 拖拽只在设计器壳层：由 `DesignerApp` 在画布层用事件委托 + `data-node-id` 找源节点，插入指示由设计器 overlay 层绘制（或渲染组件仅提供**可选**的插槽/事件钩子，不内置交互） | **P1（先于拖拽实施定案）** |

### B 类｜分层缺失（渲染组件不是可独立使用的一层）

| 编号 | 不符合点 | 位置 | 现状 | 目标 | 优先级 |
|---|---|---|---|---|---|
| **B1** | 没有独立于设计器的渲染入口，"渲染组件是一层"无法验证 | `App.vue` 只挂 `DesignerApp`；`src/components/preview/` 为空目录；`GridFormRenderer.test.ts` 仅 1 例 | 渲染组件只能在设计器里被看到 | 提供「预览页 / 填充页」或独立 demo 入口，证明渲染组件可脱离设计器运行 | **P2** |
| **B2** | 填充数据硬编码，无数据入口也无填写结果出口 | `toggleViewMode()` 内 `previewFormData.value = { ...demoData }`；切换模式即重置 | "填充 = 数据 + 渲染组件"中的**数据侧完全缺失**，只能用内置 demoData | 数据可导入（JSON/表单）、可导出填写结果；数据生命周期独立于设计器状态 | **P2** |
| **B3** | 设计器直接依赖 `dev` 样例，初始 schema 写死 | `DesignerApp.vue` import `@/dev/yunlv-second-ticket-first-five-rows`、`@/dev/yunlv-second-ticket-full`、`@/dev/demoData`；`schema = ref(make...Schema())` | 运行时依赖开发样例目录 | ✅ 2026-09-03 已解耦：`DesignerApp` 不再 import `@/dev`，样例集与预览数据改由 `src/App.vue`（dev 入口）经 `samples`/`previewData` props 注入；`src/samples/types.ts` 定义 `SampleEntry` 注册表契约（设计器仅依赖 `@/samples/types`，不依赖 dev 目录）。`preview/App.vue` 为消费页演示仍引用样例属预期 | **P3（已解耦）** |
| **B4** | 渲染期领域逻辑落在 `@/types`，`src/engine/` 是空壳 | 渲染组件 import `@/types` 的 `bindTableRowCell` / `resolveCellBoxV2` / `resolveTableRowCount`；`src/engine/` 只有空的 `__tests__` | ✅ 2026-09-03 已解耦：`bindTableRowCell` / `resolveCellBoxV2` / `resolveTableRowCount` / `buildTableRowField` / `collectSchemaFields` 整体迁至新建 `src/engine-v2/derivation.ts`（`@/types` 仅留依赖无关的 `collectFieldKeys`）；渲染组件（`GridSchemaNode` / `DesignerApp`）与 `pagination` 改从 `derivation` 取，渲染组件只做视图映射 | 渲染期派生/布局/取值计算归 `engine`，渲染组件只做视图映射 | **P3（已解耦）** |

### C 类｜"仅禁止拖拽 / 配置"靠逐处手工守卫

| 编号 | 不符合点 | 位置 | 现状 | 目标 | 优先级 |
|---|---|---|---|---|---|
| **C1** | 非设计态的禁用靠每个函数各写一遍守卫 | `addRootGrid` / `addGrid` / `addNodeToSelectedCell` / `startPaletteDrag` / `onCanvasDragOver` / `onCanvasDrop` / `selectNode` / `selectNodeById` 各自 `if (previewMode.value) return` | 易漏：新增任何编辑操作若忘记加守卫，预览/填充态就能改结构 | 收敛为统一闸门（编辑动作集中到 editable action 层，非设计态整体不可用） | **P3** |
| **C2** | 设计器与渲染组件靠**隐式 DOM 契约**双向耦合 | 设计器用渲染组件输出的 `data-node-id` / `data-layout-id` + `closest()` 反查节点与所属格；渲染组件为非渲染目的输出这些属性 | 契约无类型、无文档，任一侧改名即静默失效 | 契约显式化（渲染组件 emit 节点事件，或设计器用 slot/wrapper 注入钩子）并写入 `engine.md` | **P3** |
| **C3** | 非设计态下设计器面板仍然占位 | 右侧 Inspector 在 preview/fill 仍渲染（只是无选中内容）；`toggleViewMode` 把"再次点击回设计态"耦合在同一按钮 | 预览/填充形态仍带着设计器外壳 | 预览/填充形态不渲染配置面板，或由独立页面承载 | **P3** |

### D 类｜清理项

| 编号 | 不符合点 | 位置 | 说明 | 优先级 |
|---|---|---|---|---|
| **D1** | 渲染组件死代码 | `useTextarea(_node)` 恒 `true`、`inputElType(_node)` 恒 `"text"`，`component :is` 的 `input` 分支永不命中 | 字段统一为字符串类型后遗留（**已解决**：八续/九续 删除 `useTextarea`/`inputElType`，grep 确认 `src` 内无残留） | **P4** |
| **D2** | 打印责任分散 | `window.print()` 在设计器工具栏，`@media print` 样式在渲染组件 | 触发与呈现分处两层 | **P4** |
| **D3** | 渲染组件内为设计态服务的样式分支 | `@media print .layout-node--selected{...}`、`.layout-p--underline` 打印移除等 | 随 A5 一并清理（**暂缓**：A5 移除渲染组件 `selectedNodeId` 尚未获批，孤立清理会改变打印行为，待 A5 落地后处理） | **P4** |

---

## 4. 待拍板（影响 A2 调整方向）

| 议题 | 现状 | 选项 |
|---|---|---|
| 设计态字段 P 是否保留就地输入 | 当前 `contenteditable` 可输入但**不回写 schema**（§0.3 记录为"已知行为，用户确认维持"） | ① 维持现状（保留 contenteditable，接受 A2 不整改）；② 设计态只读、改内容走 Inspector（与本文目标结构一致，推荐）；③ 就地输入即回写 schema（成本高，与"设计态编辑 schema 走 Inspector"的既有约定冲突） |

---

## 5. 建议调整顺序（已被 §6.5 取代，保留作历史）

> §6 定案「内核 + 设计表面」后，批次顺序已重排，以 **§6.5 为准**。

0. **第零批（先定案，A6）**：**在做拖拽重排之前**先定「拖拽归属」——设计器壳层委托 vs 渲染组件内置 dragstart。这条不定，A1/A4/A5 的整改都会被后续拖拽代码再度污染。
1. **第一批（契约与数据流，A1 + A4 + B1 测试侧）**：渲染组件新增显式 `mode`/`editable`，删除 `data != null` 推断；`inject("formFill")` 改为 emit；同步补渲染组件独立测试。
2. **第二批（统一渲染路径，A3 + A2）**：填充/预览走同一渲染分支；A2 视 §4 拍板结果决定是否下线 contenteditable。
3. **第三批（解耦选中态，A5 + C2）**：移除渲染组件的 `selectedNodeId`，高亮改由设计器注入；把 `data-node-id` / `data-layout-id` 契约写进 `engine.md`。
4. **第四批（外壳与数据，B1 + B2 + C1 + C3）**：独立预览/填充入口、数据导入导出、编辑动作统一闸门、非设计态不渲染配置面板。
5. **第五批（清理，B3 + B4 + D1–D3）**：样例外置、`engine` 归位、删除死代码与打印分支整理。

> 每批做完需回归：`vue-tsc --noEmit` + `vitest run`（当前基线 **159/159**，2026-09-02 样例对齐后实测）。

---

## 6. 决策：是否需要分化出第二个渲染组件（2026-09-02）

### 6.1 结论

**不分化第二个渲染组件，改为分化第二层——「设计表面（Canvas Surface）」。**

- 渲染**内核只有一份**：`renderer-v2`（`GridFormRenderer` + `GridSchemaNode` + `HtmlBlock`），同时服务设计器、预览、填充、打印。
- 设计相关的一切（选中、拖拽源/落点、插入指示、就地编辑、节点命中）收敛到**设计表面层**：设计器壳层的一个包裹组件 + 一组 composable + overlay 绘制，**引用内核而不是复制内核**。

一句话理由：分化第二个渲染组件意味着**两份 DOM + 两份 CSS**，而边框规则、打印适配、表格派生字段、行高算法这些"最容易出错也最常改"的部分必须两边同步——当前「设计器引用渲染组件」换来的最大收益（所见即所得一致）会被直接抵消。

### 6.2 判据：什么必须在内核，什么可以外挂

| 能力 | 归属 | 理由 |
|---|---|---|
| 布局（Grid/Row/Cell、共享列轨、colspan、行高倍数） | **内核** | 交付态必须一致 |
| 边框规则（`all/outer/inner/none`、相邻去重、Table 边框） | **内核** | 打印一致性的核心，不可分叉 |
| 文本/字段样式、下划线、内部边框逐行 | **内核** | 同上 |
| 表格字段派生（`列key_行号`）与按 data 推导行数 | **内核**（计算可归 `engine`） | 交付态必须一致 |
| 纸张尺寸与 `@media print` | **内核** | 打印是交付侧能力 |
| 选中高亮 | **表面层** | overlay / 外层 outline 即可，内核无需感知 |
| 拖拽源、落点判定、插入指示线 | **表面层** | 事件委托 + `data-node-id` 命中 |
| 节点命中与所属格反查 | **表面层** | 用内核输出的 `data-node-id` / `data-layout-id` + `buildEditorNodeIndexV2` |
| 空容器占位提示、吸附辅助线 | **表面层** | overlay 绘制 |
| 就地编辑（设计态改字段内容） | **表面层**（建议直接取消，见 A2） | 若保留，应由表面层在字段位置覆盖临时输入框，而不是让内核 DOM 带 `contenteditable` |

内核唯一需要"让渡"的是**稳定的地址**：`data-node-id` / `data-layout-id` 这类定位属性。内核暴露地址、表面层负责交互——这是可接受的边界（对应 C2：把隐式契约升级为显式契约）。

### 6.3 什么情况下才真的需要第二个渲染组件

满足任一条件才考虑分化，目前**三条都不成立**：

1. 设计态与交付态的 **DOM 结构本质不同**（不只是属性差异），例如设计态 cell 必须是弹性可放置容器、交付态压平成真实 `<table>`；
2. 两侧 CSS 需要**独立演进且互不复用**；
3. 设计器与交付端由**不同团队**维护、发布节奏解耦。

即便将来命中第 1 条，优先方案也是内核内 `mode` 分支（同一组件内两条渲染路径），而不是复制一个组件——后者才是真正的维护陷阱。

### 6.4 与 A6（拖拽重排）的关系

今天正在实施的「拖拽重排已有节点」原规划把 `draggable` + `@dragstart` 与 `.v2-insertion-line` 放进 `GridSchemaNode.vue`。按本决策改为：

- **拖拽源**：`CanvasSurface` 在画布层用事件委托（捕获 `dragstart`，从 event target 向上找 `[data-node-id]`），**内核零改动**；
- **落点判定**：复用现有 `closest('[data-layout-id]')` 命中目标 cell + 计算插入 index；
- **插入指示**：`CanvasSurface` 的 overlay 层绘制（绝对定位覆盖画布），不进内核模板。

这样 A6 与 A1/A4/A5 在同一批整改里收敛，且此后**所有设计交互都只落在表面层**，内核不再被反复污染。

### 6.5 调整顺序（取代 §5，已按本决策重排）

0. **定契约（C2）**：`data-node-id` / `data-layout-id` 显式化、类型化并写入 `engine.md`——这是表面层能外挂的前提。
1. **内核瘦身（A1 + A4 + A5 + D1）**：显式 `mode`、`inject("formFill")` 改 emit、移除 `selectedNodeId` 与选中样式、清死代码。
2. **新建设计表面层**：`designer/CanvasSurface.vue` 接管 `selectNode` / `dragover` / `drop` / 插入指示 / 选中 overlay（从 `DesignerApp.vue` **搬迁**而非重写）。
3. **按新结构实施拖拽重排（A6）**：dragstart 走画布委托；移除旧的「上/下排序按钮 + 目标格下拉」（原规划 P3/P5）。
4. **统一渲染路径（A3 + A2）**：填充/预览同构；contenteditable 按 §4 拍板结果处理。
5. **外壳与数据（B1 + B2 + C1 + C3）**：独立预览/填充入口、数据导入导出、编辑动作统一闸门、非设计态不渲染 Inspector。
6. **清理（B3 + B4 + D2 + D3）**：样例外置、`engine` 归位、打印责任与样式分支整理。
