# 执行日志（近期滚动）

> 仅保留最近约 6 轮（**2026-09-02 十六续 起**）的详细过程，作为本轮/上轮连续记录。
> 更早轮次已归档至 [archive/execution-log-2026-09-early.md](./archive/execution-log-2026-09-early.md)。
> 每轮『做了什么』的完整连续记录以**自动注入上下文**的 `.workbuddy/memory/YYYY-MM-DD.md` 为准；本文件与 `development-plan.md` 只留结论/状态，**不再每轮追加**。

---

## 2026-09-02 十六续：分页引擎（内容超高自动换页）

### 背景 / 诉求
纸张当前用 `min-height` 渲染，内容超过纸张高时只是在单页内继续向下撑开，看不到「超高出页 → 换页」的效果。用户要求实现分页引擎：超高内容流向下一页。建议用 50 行 Grid 验证。提示 `src/engine` 为旧 v1 分页引擎（基于 DOM 测量 + 旧 `FormSchema`/`Component` 模型），可参考可不参考。

### 决策：DOM 无关 + 确定性切分（而非 v1 的 DOM 测量）
- v1 引擎（`src/engine/paginate.ts`）靠 `DomMeasure` 把组件写进 off-screen 容器测 `offsetHeight`，再按组件粒度切页。它对接的是**旧 Schema 模型**，且依赖运行时 DOM 测量（jsdom 下不准、测试需 mock）。
- Schema V2 的 Grid 行高是**确定性**的：`row.height × baseRowHeight`（mm），cell 的 `rowHeight` 可覆盖所在行高；再叠加 `gap` 行间距与（all/outer 的）外框 1px 边框。因此无需渲染即可精确算出每行高度——分页引擎做成**纯函数、可测试、无 DOM 依赖**，远比测量稳健。
- 故新建 `src/engine-v2/pagination.ts`（与旧 `src/engine` 平行、互不干扰），不改动旧参考代码。

### 算法（`paginatePage(page, opts)` → `PhysicalPage[]` + `warnings`）
- 遍历逻辑页 `children`，按节点类型分流：
  - **Grid**：先试整 Grid 能否放进当前页剩余空间；放不下则 `splitGrid` 按**行边界**切分——首片段保留上框、末片段保留下框、中间片段用 `suppressBorders:{top,bottom}` 抑制上/下框，多页连起来像被「拆开」的连续表格。首片段优先填当前页剩余空间（标题 + 前几行可在同一页，不浪费空间）。单行比整页还高时强制放入并告警。
  - **Text/Image/Table/Html**：原子块。当前页放得下就放，放不下（且本页已有内容）换页；比整页还高则强制放入 + 告警。高度用启发式估算（Text 按内容宽度折行、Image 用给定尺寸、Html 回退一行基准高），并支持注入 `measureNode` DOM 测量回调提精度。
- 行高计算 `gridRowHeightMm` = `max(row.height, 本行任意 cell.rowHeight) × baseRowHeight`；片段高 `gridFragmentHeightMm` = 各行 + 行 `gap` +（未抑制的）上下外框 1px（1px≈0.2646mm @96dpi）。

### 接入 `GridFormRenderer`
- 新增 `paginate?: boolean`（默认 `true`）。新增计算属性 `renderedPages`：分页开启时对每个逻辑页跑 `paginatePage` 得物理页；关闭时每个逻辑页原样作为一页（设计态用）。
- 模板由 `v-for="page in schema.pages"` 改为 `v-for="pp in renderedPages"`，逐物理页渲染 `<main class="grid-form-paper">`，子项直接用片段节点（裁剪了 rows 的 `GridNodeV2`）喂 `GridSchemaNode`，边框抑制经 `suppressFor` 合并「兄弟去重 + 跨页连续」两侧。
- **设计态关分页**：`DesignerApp` 传入 `:paginate="false"`，整页连续渲染便于编辑（避免同一 Grid 出现在多页导致选中态歧义）。预览/填写/打印走默认分页。
- 物理页 `data-node-id`：每个逻辑页的**首个**物理页复用逻辑页 id（保证单页场景下与旧结构逐字节一致、兼容存量快照/选择）；后续片段用合成 id。空逻辑页也保证至少一张物理纸（`@page` 注入元素始终存在）。

### 演示与验证
- 新增 `src/dev/gridPaginationDemo.ts`：`makeFiftyRowGridSchema()` 生成「标题 + 50 行 Grid（A4/边距10/baseRowHeight8 → 正文可用 277mm，50×8=400mm 必换页）」。
- `preview/App.vue` 增加下拉：可选「云铝工作票（单行，单页）」或「50 行 Grid 分页演示」。运行 `npm run dev` 打开 `/preview.html` 即可肉眼验证换页。
- 单测：`engine-v2/__tests__/pagination.test.ts`（6 例：50行→2页且行数不丢、各页不超高、连续外观 suppressBorders、短内容单页不切分、超高单节点告警、多逻辑页拼接编号）；`GridFormRenderer.pagination.test.ts`（3 例：渲染 2 张纸且 50 行不丢、跨页边框类正确、paginate=false 单张纸）。
- 回归：`GridFormRenderer.test.ts` / `PaperSizePrint.test.ts` / `FirstFiveRowsSnapshot.test.ts` 等全部通过（`data-node-id` 复用逻辑页 id 避免破坏快照）。

### 旧 `src/engine`（v1 参考）处理
该目录对接旧 Schema 类型（`Component`/`FormSchema`/`PaperSize` 等当前不存在），`vue-tsc` 会报一堆 TS2305/2724；且其测试 `src/engine/__tests__/*` 亦依赖旧类型。经验证**无任何应用代码 import `src/engine`**（纯参考残留）。为不污染当前基线，在 `tsconfig.json` 加 `"exclude":["src/engine"]`、`vitest.config.ts` 加 `exclude:['src/engine/**']`。⚠️ 若日后要启用 v1 代码，需先把它迁移到 Schema V2 类型，或删除。

### 结果
- `vue-tsc --noEmit` 干净；`vitest run` **194/194（22 文件）** 通过（原 185 + 新增 9）。未跑 `vite build`（本次无新外部依赖）；未提交 git。

### 2026-09-02 十七续 · 设计器默认空白 + 移除填充按钮 + 纸张边距配置
- 需求（用户指令）：`DesignerApp.vue` 页面初始化默认加载空白，不再默认挂载 `yunlv-second-ticket-first-five-rows` 样例；移除「填充」按钮及相关交互（不影响预览/其他按钮）；工具栏在「纸张」与「行高(mm)」之间新增「纸张边距(mm)」配置。
- 实现：
  - 默认空白：`schema` 初始值改为 `buildBlankSchema()`（空 page + 一个根 Grid，复用 `createEmptyFormSchemaV2`+`createGridNodeV2`+`insertRootGridV2`，与 `resetBlank()` 共用同一构造）；移除对 `yunlv-second-ticket-first-five-rows.ts` 的导入与默认依赖（该文件保留，仍被多处测试引用）。新增可选 prop `initialSchema?`，测试经它注入前五行样例以保住既有 fixture 节点（`unit-field`/`ticket-layout`/`work-task-table` 等）。
  - 移除填充：`ViewMode` 由 `"design"|"preview"|"fill"` 缩为 `"design"|"preview"`；`toggleViewMode` 签名简化为 `"preview"`；删除工具栏「填充」按钮；清理 `onCanvasFieldChange`/`collectFormValues`/`canvasEl`/`readonlyMode`/`@field-change`/`defineExpose({collectFormValues})`（字段值采集改由预览态 DOM 遍历 `collectFieldValues`，与渲染内核 fill 态解耦，不影响预览/打印）。图片 `objectFit:"fill"` 与字段 `action` 的 `fill` 值与视图态 fill 无关，保留。
  - 纸张边距：新增 `paperMargin` 计算属性（取首页 `margin.top`）与 `updatePaperMargin`（将统一值写入所有页 `margin` 四边）；工具栏 `.v2-toolbar__meta` 在「纸张」select 与「行高(mm)」input 之间插入「纸张边距(mm)」`number` 输入（min0/max99/step1）。
  - 测试同步：`DesignerApp.test.ts` 移除 2 个依赖 fill 按钮的用例（数据回写 / collectFormValues），其余用例经 `mountDesigner()` 注入 `initialSchema`；移除 `previewData`/`collectFormValues` 的 vm 访问。
- 验证：`vue-tsc --noEmit` 干净；`vitest run` **192/192（22 文件）** 通过（原 194 − 删除 2 个填充态用例）。未跑 `vite build`；未提交 git。

### 2026-09-02 十八续 · 分页收尾四项（删旧引擎 / Table 延后 / 设计器分页可见 / 纸张固定高）

用户四条指令：① 移除旧分页引擎；② Table 按行跨页切分延后；③ `DesignerApp` 传 `paginate=true` 还是没效果；④ 纸张不该用 `min-height`（会被无限撑开），应等于整纸高。

#### ① 删除旧 v1 分页引擎
- `src/engine/`（`geom.ts`/`measure.ts`/`paginate.ts`/`render-html.ts`/`index.ts` + `__tests__` 4 个测试）已删除。该目录未被 git 跟踪（用户确认早期已上传过，可直删）；删除前再次核对**无任何应用代码 import `src/engine`**（只有 `engine-v2` 在用）。
- 撤销十六续为绕开它而加的排除：`tsconfig.json` 删 `"exclude":["src/engine"]`、`vitest.config.ts` 删 `exclude:['src/engine/**']`。自此类型检查与测试覆盖全量源码，不再有「法外之地」。

#### ② Table 按行跨页切分
- 用户确认**延后**，保持现状：Table 作为原子块整体落页/换页（超高单节点强制放入并告警）。已在 `development-plan.md` §0.3 标注为「用户已确认延后」。

#### ③ `paginate=true`「没效果」的定位
- **先复现再下结论**：新增 `src/components/designer/__tests__/DesignerApp.pagination.test.ts`，用 `initialSchema` 注入 50 行 Grid 后断言 `.grid-form-paper` 数量 > 1 且 50 行不丢 —— **用例直接通过**，说明渲染链路（`GridSchemaRenderer` 就是 `GridFormRenderer` 的别名 import，`paginate` prop 声明完整、物理页正常产出）**本来就是通的**。
- 真正原因：**设计器自十七续起默认空白 Schema**（空 page + 一个根 Grid），内容远未超一页，分页引擎无事可做 → 视觉上「传了 true 也看不出变化」。属「没有可分页的内容」，不是「分页失效」。
- 交付的可验证手段：
  - 工具栏新增 **「分页演示(50 行)」** 按钮（`loadPaginationDemo()` → `resetHistory(makeFiftyRowGridSchema())`），一键载入超高 Schema 立即看到换页。
  - 工具栏新增 **「分页」复选框**（`paginate` ref，默认**开**）；绑定改为 `:paginate="previewMode || paginate"` —— **预览/打印强制分页**，设计态可关为整页连续渲染（关掉后同一 Grid 不会被切成两页，避免同一 `grid.id` 出现在两张纸上）。
  - 样式：新增 `.v2-toolbar__control--toggle`（覆盖 `.v2-toolbar__control input` 的 44px 定宽/居中，使复选框正常显示）。
- 未改动 `.v2-canvas { overflow:hidden }`：内层 `.grid-form-canvas` 是 `height:100%; overflow:auto`，多张纸可正常滚动，非阻塞点。

#### ④ 纸张高度 `min-height` → 固定 `height`
- `GridFormRenderer.paperStyle()`：`minHeight: ${heightMm}mm` 改为 `height: ${heightMm}mm`，并补充注释说明取舍。
- 理由（与用户判断一致）：`min-height` 只设下限，内容超高时纸张被无限撑开，永远看不出「已超出一张纸」；固定 `height` 后 —— 分页开启时分页引擎已保证每页内容 ≤ 正文可用高（`heightMm − margin.top − margin.bottom`，配合 `box-sizing:border-box` 内容盒口径一致），纸张恰好一张；分页关闭且内容超高时，超出部分溢出到纸张外的灰底，即「内容超出纸张」的可见反馈。
- 同步受影响断言：`PaperSizePrint.test.ts` 两处 `min-height: 297mm` → `height: 297mm`；`__snapshots__/FirstFiveRowsSnapshot.test.ts.snap` 纸张 style 同步（快照语义未变，仅高度属性名）。

#### 结果
- `vue-tsc --noEmit` 干净；`vitest run` **197/197（23 文件）** 通过（十七续基线 192 + 新增 5 例）。未跑 `vite build`；未提交 git。

### 2026-09-02 十九续 · 状态栏暴露分页结果（打印张数 + 超高告警）

- 动机：分页结果此前**只能靠肉眼在画布里找**，或点「分页演示」才看得到。更严重的是——单个节点比整页还高时引擎会「强制放入并告警」，而这条告警**没有任何出口**，用户打印前完全不知道内容会被裁。
- 实现：
  - `DesignerApp`：新增 `pagination = computed(() => paginateSchema(schema.value, { data: previewData.value }))`。关键取舍：调的是**与渲染内核同一个** `paginateSchema`，且入参口径完全一致（`data` 同取 `previewData`；正文高 / 内宽同由 `resolvePaperSizeV2` 派生），因此状态栏数字与画布物理页必然一致 —— 避免了「两处各算一套、日后参数改动而漂移」的隐患。始终按「分页开启」计算（工具栏开关只影响设计态画布，预览/打印永远分页），显示的即真实出纸张数。
  - `StatusBar`：新增可选 props `physicalPageCount?` / `paginateWarningCount?`。
    - 「打印：N 张」仅在 **N ≠ 逻辑页数**时显示（`data-physical-page-count`），不制造噪音；
    - 「分页告警：K」仅在 K > 0 时显示（`data-paginate-warning-count`），复用既有 `.warning-count.has-warning` 配色。
    - 原「警告」项语义不变，仍是结构校验（`validateFormSchemaV2`）的问题数，与分页告警分列。
- 测试（新增 4 例，均在 `DesignerApp.pagination.test.ts`）：超高 Schema 显示打印张数且与画布纸张数一致；空白 Schema 不显示打印张数；单行 800mm（100×8mm ≫ 277mm）触发并显示分页告警；50 行 Schema 无超高时不显示告警。

### 2026-09-03 二十续 · 自动分页真实高度校正（内容超高必换页、不溢出纸外）

用户澄清（最新消息）：① 不需要启动服务器；② 期望在**设计、渲染过程中，分页开启时自动分页**——目前内容超出纸张高度时仍然显示在纸张外；③ 跨页 Grid 选中两处高亮（同一 Grid 的两段都高亮）保持不动。

根因：确定性分页引擎按 `row.height × baseRowHeight` 估算行高，但**多行字段、换行文本、超大图片**等实际渲染高度往往更高；引擎据此认为「本页放得下」，实际渲染却超出纸张高度 → 溢出纸外。此外十八续把分页关闭态也改成固定 `height`，使设计态关分页且内容超高时也溢出纸外。

#### ① 浏览器内真实行高测量 + 二次分页
- `pagination.ts`：`PaginateContext` / `paginateSchema` 的 `extra` 新增 `measureRow?: (row: GridRowV2) => number | undefined`；`gridRowHeightMm` / `gridFragmentHeightMm` / `splitGrid` / `paginateGrid` 均透传 `measureRow`（真实值有限且 >0 时优先，否则回退确定性估算）。
- `GridFormRenderer.vue`：渲染确定性分页结果后，在 `onMounted` 与 `watch(renderedPages, flush:'post')` 里调 `correctPagination()`：用 `measureRowHeights()` 读 `.grid-form-paper .layout-grid__row` 的 `getBoundingClientRect().height / PX_PER_MM`（PX_PER_MM = 96/25.4），拿到真实高度后回灌 `paginateSchema(props.schema, { data, measureRow })` 重分页；`displayedPages = measuredPages ?? renderedPages`。设计态（`paginate=false`）或纯测试/SSR（getBBox=0）自动跳过测量、回退确定性分页，结果稳定可断言。
- 设计态与渲染态共用同一修正通道（都跑在 `GridFormRenderer` 内核内），故「设计、渲染过程自动分页」一致生效。

#### ② 分页关闭态纸张高度改回 min-height
- `GridFormRenderer.paperStyle()`：`paginate=true` 仍固定 `height=整纸高`（box-sizing:border-box，内容盒恰为正文可用高，与引擎 bodyHeightMm 同口径）；`paginate=false` 改回 `min-height`（纸张随内容长高、内容留在纸内，不溢出纸外）。关闭分页时超高内容长高可见，而非溢出灰底。
- 受影响断言同步：本续新增 `GridFormRenderer.pagination.test.ts`「paginate=false → 纸张 style 含 min-height:297mm 且不含独立 height:297mm」断言。

#### ③ 测试与验证
- 新增 `src/engine-v2/__tests__/pagination.test.ts` 用例：注入 `measureRow: () => 20`（远高于确定性估算）后分页按真实高度切分（页数 > 2、50 行不丢、每页 ≤ 正文高），验证「估算偏低 → 多换页、不溢出」。
- 新增 `GridFormRenderer.pagination.test.ts` 用例（paginate=false → min-height，见②）。
- `vue-tsc --noEmit` 干净；`vitest run` **203/203（23 文件）** 通过（基线 201 + 引擎 measureRow 1 例 + 本续 renderer min-height 1 例）。未跑 `vite build`；未启动服务器（用户要求）；未提交 git。

#### 未改动
- 跨页 Grid 选中两处高亮（同一 `grid.id` 的两段都加选中框）按用户要求**保持不动**。
- ~~Table 按行跨页切分仍延后（维持原子块整体落页/换页）~~ → **本续已实现（见下 廿一续）**。

### 2026-09-03 廿一续 · Table 按数据行跨页切分（修复设计态 50 行 Table 溢出纸外）

用户反馈：设计态加载 `grid-50-rows.json`（手动拖拽生成，结构为 Grid(1行)→Cell→Table(minRows:50)）后，50 行表格内容全部溢出到纸张外的灰色区域，没有分页切分。

#### 根因（三层嵌套障碍）
1. **第一层**：分页引擎在 Page 子节点循环中只看到 Grid 节点 → 调用 `paginateGrid`
2. **第二层**：`paginateGrid` 按 `row.height × baseRowHeight` 计算 Grid 高度 = 1×8 = 8mm ≪ 277mm（A4 正文区）→ 判定「放得下」→ 整个 Grid（含内部 Table）作为原子块放入，**不进入 splitGrid**
3. **第三层**：即使强制进入 `splitGrid`（通过 measureRow 校正测到单行实际 400+mm），单行 Grid 的 8mm 行高仍远小于 277mm 可用空间 → 正常放入 → **走不到 Table 切分分支**

核心缺陷：**Table 是原子块（paginateAtomic），不支持按数据行切分；且嵌套在 Grid 内部时，分页引擎的逐层检测机制无法穿透 Grid 行高估算看到 Table 的真实高度。**

#### 修复（四处联动）

**① 分页引擎 `pagination.ts`——新增三个能力：**

- **`paginateTable(table)`**：顶层 Table 直接按数据行跨页切分（与 `splitGrid` 对称）。每数据行高度 = baseRowHeight（均匀）；首片段保留表头；产出带 `_paginateMaxRows` 的 Table 片段节点。

- **`splitGrid` 提前检测**：在行放置循环**之前**，检查当前行是否包含「超高 Table」（Table 总高度 > 可用空间 - Grid 行自身占用）。若是且为最后/唯一行 → 跳过正常放置循环，直接进入 **Table 数据行切分路径**：
  - 计算所有 Table 的总数据行数
  - 按每页可用空间分配 chunk（= ⌊(可用空间 - Grid 占用) / baseRowHeight⌋）
  - 每页产出相同的 Grid（1 行）但内部 Table 通过 `mapTablesInNodeTree()` 携带递减的 `_paginateMaxRows`
  - 比例分配：多 Table 时按各 Table 行数占比分配 chunk

- **`paginateGrid` 超高 Table 检测**：计算 `fullH` 后额外扫描 cell 内 Table 高度。若任一 Table > 正文区 80% → 置 `hasTallTables=true`，强制进入 `splitGrid`（即使行高估算「放得下」）。

**② 辅助函数（均位于 `pagination.ts`）：**
- `collectTablesInRow(row)`：从 Grid 行的所有 cell.children 中收集 Table 节点
- `mapTablesInNodeTree(nodes, mapFn)`：深拷贝节点树，将每个 Table 按 mapFn 替换为 `_paginateMaxRows` 版本（递归处理嵌套 Grid）
- `totalTableDataRowsInRow(row, data)`：统计行内所有 Table 的数据行总数

**③ 类型扩展 `schema-v2.ts`：**
- `TableNodeV2` 新增 `_paginateMaxRows?: number`（内部分页字段，序列化/校验忽略）

**④ 渲染层 `GridSchemaNode.vue`：**
- 新增 `tablePaginatedRowCount(node, data)` 函数：返回 `Math.min(resolveTableRowCount(...), node._paginateMaxRows ?? Infinity)`
- Table `<tbody>` 的 `v-for` 从 `resolveTableRowCount(node, data)` 改为 `tablePaginatedRowCount(node, data)`
- `tableHeightMm()` 同步更新：尊重 `_paginateMaxRows`（片段高度与渲染一致）

#### 测试
- 新增引擎测试：「Table（50 行数据）in Grid（1 行）按数据行跨页切分」——验证 pages.length > 1、tableFragmentCount ≥ 2、totalDataRows = 50（一行不丢）、每页高度 ≤ 正文区。
- 全量 `vitest run` **204/204（23 文件）**；`vue-tsc --noEmit` 干净。未跑 `vite build`；未启动服务器；未提交 git。

---

### 2026-09-02 廿二续 · 删除 50 行分页演示 UI

用户确认分页功能正常（廿一续 Table 按数据行跨页切分已生效），要求**删除 50 行分页演示相关代码**，随后继续推进。

#### 删除范围（仅移除「用户可见演示入口」，保留测试夹具）
- `DesignerApp.vue`：删除 `import { makeFiftyRowGridSchema }`（line 5，唯一用途即演示）、`loadPaginationDemo()` 函数（`resetHistory(makeFiftyRowGridSchema())`）、工具栏「分页演示(50 行)」按钮（`data-load-pagination-demo="true"`）。
- `preview/App.vue`：删除 `makeFiftyRowGridSchema` 导入、下拉选项「50 行 Grid 分页演示（超高换页）」、`schemaSource.pagination` 条目；`DemoKey` 收窄为 `"yunlv"`，默认 `demoKey` 改 `"yunlv"`。
- `DesignerApp.pagination.test.ts`：删除「工具栏『分页演示(50 行)』可一键载入超高 Schema」用例（点击 `[data-load-pagination-demo="true"]`）；同步修订顶部 doc comment（不再提「一键载入超高演示」入口，改为「载入超高 Schema + 切换分页开关」）。

#### 保留项（刻意不动）
- `src/dev/gridPaginationDemo.ts` 与 `makeFiftyRowGridSchema()` 保留，作为**测试夹具**——引擎 `pagination.test.ts`(4 处)、`GridFormRenderer.pagination.test.ts`(4 处)、`DesignerApp.pagination.test.ts`(其余用例) 共 3 个测试文件仍依赖它生成超高 Schema。删除文件会迫使 9 处用例内联重写，风险高、收益低；用户诉求是「去掉手动演示按钮」，已满足。

#### 验证
- `vue-tsc --noEmit` 干净（exit 0）。
- `vitest run` **203/203（23 文件）**（基线由 204 因移除 1 个 demo 按钮用例 → 203）。
- 未跑 `vite build`（无新依赖）；未启动服务器；未提交 git。

#### 下一步
- 待用户指定「继续推进」方向。当前 P11 主线仅剩可选 **P11-2**（完整票快照基线）与 **P11-4**（推迟项并入：P9.1c 专用控件 / P9.2 / P12 清理）。详见 `development-plan.md` §0.1。

---

### 2026-09-02 廿三续 · P11-2 完整票快照基线

用户选定「继续推进」方向为 **P11-2 完整票快照基线**（P11 主线剩余项均为可选/推迟，此为其一）。

#### 背景
- `YunlvSecondTicketFull.test.ts` 已覆盖 P11-2 的全部**非快照**验收项（schema 校验无 error、边框分布 all×3/outer×9/none×4、全部业务字段可索引、工作任务表按列 key 派生 `工作地点_行号`/`工作内容_行号`、各段网格 id 存在）。
- 唯一未落地的是「可选」的整票 `toMatchSnapshot` 结构回归基线——用于防止后续重构无意破坏整票 DOM 结构/行高/嵌套。

#### 改动
- 在 `src/dev/__tests__/YunlvSecondTicketFull.test.ts` 的 describe 内新增 `it("DOM 结构快照与基线一致（整票结构回归基线…）")`：`mount(GridFormRenderer, { props: { schema: makeYunlvSecondTicketFullSchema() } })` 后 `expect(wrapper.html()).toMatchSnapshot()`。
- 沿用 `FirstFiveRowsSnapshot.test.ts` 约定：仅传 `schema`（不传 `data`，保持纯结构基线）、默认 `paginate`（jsdom 下 `measureRow` 返回 0 回退确定性分页，快照稳定可复现）。
- 首次运行自动生成 `src/dev/__tests__/__snapshots__/YunlvSecondTicketFull.test.ts.snap`（608 行，含 103 处 `layout-grid`、63 处 `data-field`、1 个 `grid-form-paper`，即完整 13 段网格整票结构）。

#### 验证
- `vitest run` **204/204（23 文件）**（203 + 本续 1 例快照）；`vue-tsc --noEmit` 干净。
- 未跑 `vite build`；未启动服务器；未提交 git。

#### 下一步
- P11 主线仅剩 **P11-4**（推迟项并入：P9.1c 专用控件 / P9.2 / P12 清理），或转 P12 清理等。待用户指定。

---

### 2026-09-02 廿四续 · P12 清理（安全项收尾）

用户选定「继续推进」方向为 **P11-4 · P12 清理**（技术债清理）。

#### 盘点（先厘清范围，不盲目动）
- D 类清理项（architecture-layering-review.md）：
  - **D1** `useTextarea`/`inputElType` 死代码：grep `src` 确认**已无残留**（八续/九续 删除），属已完成项。
  - **D2** 打印责任分散（`window.print()` 在设计器、`@media print` 在渲染组件）：属设计层归属问题，非纯清理，本轮不动。
  - **D3** 渲染组件内设计态打印样式分支（`@media print .layout-node--selected`）：文档明确「随 A5 一并清理」，而 A5（移除渲染组件 `selectedNodeId`）是未获批的结构重构——**孤立清理会改变打印行为**，暂缓。
- `src/dev` 无旧渲染器残留（`src/engine` 已于 十八续 删除）；`grid-50-rows.json` 为用户手拖复现样本、未被任何代码/测试引用，留作样本不删。
- 源码无死代码/TODO/console 残留（仅 `preview/App.vue` 一处 `console.log` 占位，属 demo，不动）。

#### 本轮实际清理（纯注释/文档，零行为变更）
1. `StatusBar.vue:8`：删除已失效的「或点『分页演示』才看得到」引用（demo 按钮已于廿二续移除）。
2. `src/dev/gridPaginationDemo.ts`：修正头部注释（预览页下拉已移除，现为纯测试夹具）+ 标题文本「分页演示：50 行 Grid」→「测试夹具：50 行 Grid」（仅测试数据，无断言依赖）。
3. `docs/architecture-layering-review.md` D 类：D1 标注「已解决」、D3 标注「暂缓（受 A5 门控）」。
4. `docs/development-plan.md` §16 P12 清单：两项勾选完成并补注（旧 renderer/schema 已删、D1 已解决）。

#### 验证
- `vue-tsc --noEmit` 干净；`vitest run` **204/204（23 文件）**（仅注释/字符串字面量改动，无回归）。
- 未跑 `vite build`；未启动服务器；未提交 git。

#### 结论
P12 中可安全独立收尾的清理项已全部完成；剩余 D2/D3 属设计层/结构重构（A5），需用户拍板后方可做，不孤立推进。

---

### 2026-09-02 廿五续 · 删除 `demo/` 下无引用的 demo 文件

用户要求核查 `E:\Project\ssh\TicketDesigner\demo` 下以 `demo` 开头的文件是否有引用，无引用则删除。

#### 核查
- 候选（5 个）：`demo copy.html`、`demo-table-flow.html`、`demo-v2.html`、`demo-word-flow.html`、`demo.html`。`云铝-第一种作业票.html` / `云铝-第二种作业票.html` 不以 `demo` 开头，不在本次范围。
- 全项目 grep（排除 `node_modules` 与 `demo/` 自身）：5 个文件名**零代码引用**（仅 `.git/index` 有历史跟踪记录，非活跃引用）；`index.html` / `vite.config.ts` 无 demo 入口；`public/` 目录不存在，无静态资源映射。

#### 改动
- 经用户授权（个人目录之外、项目内清理）删除上述 5 个 `demo*` 文件（`rm -f`），保留 2 个 `云铝-*` 作业票样例。

#### 验证
- `vue-tsc --noEmit` 干净；`vitest run` **204/204（23 文件）**（独立静态 HTML，无构建/测试依赖，零回归）。
- 未跑 `vite build`；未启动服务器；未提交 git。`git status` 将显示这 5 个文件为「未暂存删除」（按约定不经用户允许不提交）。

#### 下一步
- `demo/` 现仅含 2 个 `云铝-*` 作业票样例（用户手拖复现样本，不在本次清理范围）。主线已至 P11 收尾 / P12 安全清理完成，后续可转 P9.1c 专用控件 / P9.2 / 或推进 A5 分层重构。待用户指定。

- **本轮（2026-09-03 二十六续）执行 A5 分层重构（Batch 0–2：内核瘦身 + 表面层）**：
  1. **范围（用户拍板「内核瘦身+表面层」）**：仅做 architecture-layering-review.md §6.5 的 Batch 0（C2 地址契约）、Batch 1（内核瘦身 A1/A4/A5）、Batch 2（CanvasSurface 表面层）；P9.1c 专用控件 / P9.2 明确延后，不在本轮。
  2. **C2 节点地址契约**：新增 `src/engine-v2/node-address.ts`，导出 `NODE_ID_ATTR="data-node-id"` / `LAYOUT_ID_ATTR="data-layout-id"` + `nodeIdSelector()` / `layoutIdSelector()`；`docs/engine.md` 新增 §18 记载内核输出、表面层经 `closest([${ATTR}])` 反查的消费约定。DesignerApp 拖拽/选中处理器全部改用常量（不再硬编码字符串）。
  3. **A1 显式 mode**：`GridFormRenderer` / `GridSchemaNode` / `FormRenderer` 用 `mode?: "design"|"preview"|"fill"` 取代旧 `data != null` 三态推断；`resolvedMode` 未传 mode 时向后兼容旧 data+readonly 推断。DesignerApp 画布传 `:mode="previewMode ? 'preview' : 'design'"` + `:readonly="false"`（预览态=结构只读、字段仍按同一 `<p>` 路径可编辑，供 DOM 遍历采集，见十续）。
  4. **A4 已落地（无码改）**：内核 G15 已 `emit("field-change")`，无 `inject("formFill")` 残留。
  5. **A5 内核去选中态**：移除 `GridFormRenderer` / `GridSchemaNode` / `HtmlBlock` 的 `selectedNodeId` prop 与全部 `.layout-node--selected` 类绑定；删除内核 `@media print` 选中清除分支（D3 随之关闭）。选中高亮整体迁移到新建 `src/components/designer/CanvasSurface.vue` 表面层：包 `GridFormRenderer`，用 `MutationObserver` + `watch` 在渲染 DOM 上加/去 `.is-design-selected`（复刻原淡蓝底+内描边视觉），内核保持纯净。
  6. **DesignerApp 接线**：画布 `<main>` 改为 `<CanvasSurface>`，透传 schema/data/mode/readonly/paginate/拖拽落点；`selectedNodeId` 仅作 DesignerApp 自身内部状态，经 `:selected-node-id` 传给表面层（预览态传 null）。拖拽源 `node-drag-start`、字段 `field-change` 由表面层透传。
  7. **测试对齐**：`GridSchemaNode.test.ts` 用例 1 改写为内核纯净断言（data-node-id + 文本，无选中类）；`DesignerApp.test.ts` 两处 `.layout-node--selected` 断言改为 `.is-design-selected` 并补 double-flush（高亮在嵌套 nextTick 落地）；新增 `CanvasSurface.test.ts`（4 例）覆盖表面层选中高亮（含切换/清空）；`GridSchemaNode.fill.test.ts` 的 `data+readonly` 真·只读路径保持不变。
  8. **回归修复**：初版曾把 preview 渲染成静态（canFill 仅 fill 态），导致 `DesignerApp.test.ts` 预览字段可编辑断言与 `GridSchemaNode.fill.test.ts` 只读断言双双失败。修正为 `canFill = resolvedMode !== "design" && !props.readonly`（等价于旧 `data!=null && !readonly`），并让 DesignerApp 预览传 `:readonly="false"`，两套断言同时转绿。
  9. 验证：全量 **vitest 208/208（24 文件）**、`vue-tsc --noEmit` 干净（新增 CanvasSurface.test.ts 4 例，基线由 204 升至 208）。

---

## 二十七续 — A6 分层重构（Batch 3：拖拽落点侧下沉至 CanvasSurface 表面层）

用户「继续」指令授权在 A5 验证报告后推进 Batch 3+（A6）。本轮按 architecture-layering-review.md §6.5 Batch 3 只做**落点侧**：把拖拽落点逻辑从 `DesignerApp` 下沉到新建 `CanvasSurface` 表面层，使 `DesignerApp` 退化为「薄壳 schema 提交代理」。拖拽**源**（内核 `GridSchemaNode` 的 `draggable`/`@dragstart`）按 §6.4/§6.5 留作独立子步骤，本轮不做（原因见下）。

1. **C2 契约补强**：`src/engine-v2/node-address.ts` 新增 `PALETTE_DRAG_MIME = "application/x-ticket-node-kind"`（模板面板→画布拖拽 MIME），与内核 `NODE_MOVE_MIME`（节点重排，来自 `@/types`）并列；`DesignerApp` 拖拽源 `startPaletteDrag` 改用 `setData(PALETTE_DRAG_MIME, kind)`，删除旧局部常量 `DRAG_MIME`。
2. **CanvasSurface.vue 全量重写接管落点**：内部状态 `dragOverCellId`/`dragOverIndex`/`legalDropCellIds`/`dragTargetEl`；新增根 `<div @dragover @dragleave @drop @dragend>` 监听 + `setDropHighlight`/`clearDropHighlight`/`computeInsertionIndex`/`onNodeDragStart`(经 `buildEditorNodeIndexV2` 算合法落点 cell 集、emit `node-drag-start`)/`onDragOver`/`onDragLeave`/`resetDragState`/`onDrop`(dataTransfer 含 `NODE_MOVE_MIME`→emit `drop-node`；含 `PALETTE_DRAG_MIME`→emit `drop-palette`)/`onDragEnd`。`.v2-drop-target` 高亮 CSS 迁此（含 `@media print` 清除）。emits 新增 `drop-node`/`drop-palette`/`drag-end`（保留 `node-drag-start`/`field-change`）。
3. **内核契约不变**：`GridFormRenderer` 仍保留 `dragOverCellId`/`dragOverIndex` props（仅驱动 `.v2-insertion-line` 插入指示，由 CanvasSurface 内部状态供给）；`GridSchemaNode` 拖拽源不动（源下沉留待后续）。
4. **DesignerApp.vue 退化为薄壳**：删除 `DRAG_MIME`/`draggedNodeId`/`dragOverCellId`/`dragOverIndex`/`legalDropCellIds`/`dragTargetEl`/`setDropHighlight`/`clearDropHighlight`/`onCanvasDragOver`/`computeInsertionIndex`/`onCanvasDragLeave`/`onCanvasDrop`；`onCanvasNodeDragStart` 简化为仅 `selectedNodeId = id`；新增 `onDropNode`（`moveNodeToIndexV2` 提交，原引用返回跳过、`selectedNodeId` 指向被移动节点）与 `onDropPalette`（`appendNodeToCellV2` 提交、`selectedNodeId` 指向新节点）。模板 `<main>` 去 `@dragover/@dragleave/@drop/@dragend` 保留 `@click`；`<CanvasSurface>` 去 `:drag-over-cell-id/:drag-over-index`、加 `@drop-node/@drop-palette`；删 `.v2-canvas :deep(.v2-drop-target)` CSS。
5. **残留注释修正**：`DesignerApp` 两处过时引用（`onCanvasDrop` / `legalDropCellIds`）改指向 `CanvasSurface` / `onDropPalette`，并保留「已整体下沉至 CanvasSurface（A6，§6.5 Batch 3）」说明注释。Grep 确认无残留坏符号引用。
6. **测试不变**：`CanvasSurface.test.ts` 仍 4 例（选中高亮）；`DesignerApp.test.ts` 拖拽两用例（跨格移动 / 同格内排序）经事件冒泡到新 `CanvasSurface` 根仍应绿。未新增 A6 落点单测（表面层↔内核协同已由 DesignerApp 端到端覆盖）。
7. 验证：全量 **vitest 208/208（24 文件）**（与二十六续持平，A6 为纯抽取零回归）、**vue-tsc --noEmit** 干净（EXIT=0）。

文档：本续记 execution-log；development-plan §0（最后更新 / §0.3 分层状态 A6 / §0.4 表）同步；MEMORY.md 加 A6 单行并更新拖拽重排条目；.workbuddy/memory/2026-09-03.md 补 二十七续。

> 推迟（非本轮）：A6 拖拽**源**下沉（把 `draggable`/`@dragstart` 从内核 `GridSchemaNode` 移出、改由 CanvasSurface 画布级事件委托；因快照 `YunlvSecondTicketFull.test.ts.snap` / `FirstFiveRowsSnapshot.test.ts.snap` 硬编码每个节点 `draggable="true"`，移除需重生成快照，改动面更大，故单列子步骤）。Batch 4–6（A3/A2 统一渲染路径、B/C 类、D2/D3 清理）与 P9.1c/P9.2 维持延后。

---

## 二十七续（补正）— A6 拖拽源下沉至 CanvasSurface（Batch 3 收尾）

用户「继续」指令推进原 二十七续 单列推迟的 A6 拖拽**源**子步骤。经代码核对，发现上一轮担心的「移除 `draggable` 需重生成快照」可**完全规避**：浏览器要求 `draggable` 必须是被拖元素自身的属性，故 `:draggable` 属性**保留在内核**（仅设计态为 true，快照 `draggable="true"` 不变），只把 `@dragstart` 的**处理逻辑**上移到表面层事件委托——既达成「内核不处理拖拽」的分层目标，又零快照改动。

1. **内核 `GridSchemaNode.vue` 去拖拽源**：删除 `onNodeDragStart(node, event)` 函数（含 `stopPropagation` / 表格内部拦截 / 字段 p 需 Alt 拦截 / 写 `NODE_MOVE_MIME` / emit `node-drag-start`）；删除 `NODE_MOVE_MIME` 导入；`defineEmits` 移除 `node-drag-start`（仅留 `field-change`）；删除全部 6 处 `@dragstart="onNodeDragStart(node, $event)"` 与递归子节点 2 处 `@node-drag-start` 转发绑定。保留 `:draggable="nodeDraggable"`（`nodeDraggable = isDesign`）与 `isEditable`（仍用于 `contenteditable` 绑定，非死代码）。
2. **`GridFormRenderer.vue` 去死链路**：`defineEmits` 移除 `node-drag-start`；删除 `<GridSchemaNode>` 上的 `@node-drag-start` 转发。内核自此彻底不再 emit `node-drag-start`。
3. **`CanvasSurface.vue` 接管拖拽源（事件委托）**：根 `<div>` 新增 `@dragstart="onSurfaceDragStart"`；`onSurfaceDragStart(event)` 逻辑——`dragEnabled` 守卫 → `event.target.closest("[data-node-id]")` 取被拖节点 → 表格内部节点（`closest(".layout-table")` 且非自身）`preventDefault` 拦截 → 设计态字段 p（非复合、无 Alt）`preventDefault` 放行文本编辑 → 写 `NODE_MOVE_MIME` + `text/plain` + `effectAllowed="move"` → 复用既有 `onNodeDragStart(id)`（计算 `legalDropCellIds` 并向上 emit `node-drag-start` 给 DesignerApp）。移除 `<GridFormRenderer>` 上的 `@node-drag-start` 监听（内核已不再 emit）。
4. **关键取舍**：`draggable` 属性留在内核而非表面层，是浏览器 DOM 约束（拖拽必须由被拖元素自身 `draggable="true"` 触发，表面层无法用单一委托给子元素加该属性）→ 分层目标（内核无拖拽*逻辑*）已达，且快照零改动。
5. **测试承接**：`DesignerApp.test.ts` 两例拖拽（跨格移动 / 同格内排序）创建单个 `MockDataTransfer` 跨 `dragstart→dragover→drop` 复用，`dragstart` 现由表面层根委托处理并写入 `NODE_MOVE_MIME`，`dragover/drop` 仍按既有逻辑命中 → 两例经新路径转绿。未新增单测（端到端已覆盖）。
6. 验证：全量 **vitest 208/208（24 文件）**（与 二十七续 持平，A6 源下沉零回归）、**vue-tsc --noEmit** 干净（EXIT=0）。`git status` 显示本回合改动：`GridSchemaNode.vue` / `GridFormRenderer.vue` / `CanvasSurface.vue` + 文档。
7. 文档：development-plan §0（最后更新 二十七续 标注「+源下沉」/ §0.3 分层 A6 标注源亦完成 / §0.4 表行更新）、MEMORY.md A6 单行、2026-09-03.md 补本补正。
8. **至此 A6（Batch 3）整体完成**：DesignerApp 与 GridFormRenderer 均不再持有拖拽源/落点逻辑，全部交互（选中高亮 + 拖拽源/落点 + 插入指示驱动）收敛于 CanvasSurface 表面层，渲染内核（GridFormRenderer/GridSchemaNode/HtmlBlock）保持纯净。

---

## 二十八续 — C1 统一编辑闸门（Batch 5 启动）

§6.5 Batch 5 = B1+B2+C1+C3；B1 已由九续 `FormRenderer` + 独立 preview 页落地，故本回合启动 **C1**。

- C1 原问题：非设计态的禁用靠每个编辑函数各写 `if (previewMode.value) return`，易漏——新增任何编辑操作若忘记加守卫，预览/填充态就能改结构。
- 做法：`DesignerApp.vue` 新增单一 `editable = computed(() => !previewMode.value)`（仅设计态可改结构）作为统一闸门；原 6 处 `if (previewMode.value) return`（`addRootGrid` / `addGrid` / `addNodeToSelectedCell` / `startPaletteDrag` / `selectNode` / `selectNodeById`）改为 `if (!editable.value) return`；左侧模板区 6 个模板按钮 `:disabled="previewMode"` 改为 `:disabled="!editable"`，使「是否可编辑」单一来源。`previewMode` 仍保留用于画布 class / mode 透传 / 选中态置空 / 分页等**展示语义**，不被删除。
- 范围：本回合仅收敛既有守卫为单一闸门（行为完全等价：`editable === !previewMode`），未新增编辑动作、未改变任何禁用语义；`addTableColumn` 等个别函数若仍缺守卫属既有缺口，未在本回合补（避免扩大范围，留待后续统一核查）。
- 验证：全量 **vitest 208/208（24 文件）**（与 二十七续 持平，C1 纯收敛零回归）、**vue-tsc --noEmit** 干净（EXIT=0）。
- 文档：development-plan §0（最后更新 / §0.3 分层 C1 / §0.4 表）同步；MEMORY.md 加 C1 单行；2026-09-03.md 补 二十八续。
- 下一步可选（Batch 5 续 / Batch 6）：C3（非设计态隐藏右侧 Inspector 面板，纯 UI 低风险）、B2（填充数据导入导出——工具栏已有 保存/读取/导出/导入 按钮，需确认覆盖 schema 还是 fill data）、B3（设计器解耦 dev 样例）、B4（渲染期领域逻辑归 engine）、D2（打印责任分散）。

---

## 二十九续 — C3 非设计态隐藏配置面板（Batch 5 续）

§6.5 Batch 5 = B1+B2+C1+C3；B1（九续）、C1（二十八续）已落地，本回合完成 **C3**。

- C3 原问题：非设计态（预览 / 填充）下，右侧「节点检查」Inspector 配置面板仍渲染（只是无选中内容），预览/填充形态仍带着设计器外壳。
- 做法：`DesignerApp.vue` 右侧 `<aside class="v2-sidebar v2-sidebar--right">`（纯节点配置：删除 / 面包屑路径 / 网格行列数·边框·列宽·单元格默认 / Schema 版本等）加 `v-if="editable"`，仅设计态可见；预览/填充态该面板从布局移除、画布随之占满，形成干净的「只看表单」形态。左侧模板/结构面板保持（其按钮已 `:disabled="!editable"` 在非设计态禁用，未在本回合改动）。
- 范围：仅隐藏右侧配置面板；未引入独立预览/填充页面（文档 C3 备选项「或由独立页面承载」属更大改造，未做），也未动左侧面板。预览/填充态字段填写仍走画布内可编辑 `<p>`（canFill）。
- 验证：全量 **vitest 208/208（24 文件）**（与二十八续持平，C3 纯 UI 零回归）、**vue-tsc --noEmit** 干净（EXIT=0）。
- 文档：development-plan §0（最后更新 / §0.3 分层 C3 / §0.4 表）同步；MEMORY.md 加 C3 单行；2026-09-03.md 补 二十九续。
- 至此 **Batch 5 已完成**（B1+C1+C3；B2 数据导入导出因工具栏已有按钮、需先确认覆盖范围而单列）。下一步：**B2**（确认并补完填充数据导入/导出）、**B3**（设计器解耦 dev 样例）、**B4**（渲染期领域逻辑归 engine）、**D2**（打印责任分散），以及延后的 P9.1c/P9.2。

---

## 三十续 — B2 填充数据导入/导出（Batch 6 启动/完成）

§6.5 Batch 5 = B1+C1+C3（已落地）；本回合完成 **B2**：工具栏早有 保存/读取/导出/导入 四个按钮，但此前只覆盖 `schema`（`serializeFormSchemaV2`/`parseFormSchemaV2`）。表单的**填写数据（FormDataV2）** 与 schema 是完全独立的两类状态，须有独立的数据入口与结果出口。

1. **独立存储键隔离**：新增 `DATA_STORAGE_KEY = "ticket-designer-fill-data-v2"`，与既有 schema 的 `STORAGE_KEY` 完全隔离；填充数据生命周期不污染 schema，也不被 schema 的读写牵连。
2. **DesignerApp.vue 改造**：
   - 引入 `collectFieldValues`（来自 `@/components/renderer-v2`）——遍历渲染 DOM 的 `[data-field]` 采集当前填写值。因 `data-field` 在设计/预览/填充三态均存在，导出须门控到预览态，避免采到设计态占位文本。
   - 新增 `fillDataFileInput` / `canvasEl` 两个 ref（`<main ref="canvasEl">` 即画布挂载根，供采集）。
   - 五个函数（与 schema 完全解耦）：`importFillDataFile(event)`（解析 FormDataV2 JSON → `previewFormData.value` 且 `viewMode="preview"`）、`triggerImportFillData()`（`fillDataFileInput.value?.click()`）、`exportFillDataFile()`（`collectFieldValues(canvasEl.value)` 仅在 `previewMode` 时下载 JSON）、`saveFillDataToLocal()`（同上采集 → `localStorage.setItem(DATA_STORAGE_KEY, …)`，仅 `previewMode`）、`loadFillDataFromLocal()`（读 `DATA_STORAGE_KEY` → `previewFormData` + `viewMode="preview"`）。
   - 工具栏新增 `<div class="v2-toolbar__group">`「填充数据」组（导入/导出/读取/保存；导出/保存 `:disabled="!previewMode"`）；新增隐藏 `<input ref="fillDataFileInput" type="file" @change="importFillDataFile">`；`<main ref="canvasEl">`；新增 CSS `.v2-toolbar__label`。
3. **测试对齐（新增 `DesignerApp.fillData.test.ts` 2 例）**：断言「填充数据」组含 导入/导出/读取/保存 四按钮；设计态下 导出/保存 `disabled`、导入/读取 `enabled`；预览态下 导出/保存 `enabled`。类型坑：首版误从 `@vue/test-utils` 导入 `nextTick`（未导出）且把查找结果类型写成 `ReturnType<typeof mount>`（实应为 `DOMWrapper`），`vue-tsc` 报 TS2740；修正为从 `vue` 导入 `nextTick` 并显式 `DOMWrapper<Element>` / `DOMWrapper<HTMLButtonElement>`，复跑干净。
4. 验证：全量 **vitest 210/210（25 文件）**（新增 2 例，基线由 208 升至 210）、**vue-tsc --noEmit** 干净（EXIT=0）。
5. 文档：development-plan §0（最后更新 / §0.3 分层 / §0.4 表）同步；MEMORY.md 加 B2 单行；2026-09-03.md 补 三十续。
6. 至此 **Batch 5 + B2 完成**。下一步：**B3**（设计器解耦 dev 样例）/ **B4**（渲染期领域逻辑归 engine）/ **D2**（打印责任分散），以及延后的 P9.1c/P9.2 / A2（设计态 contenteditable 用户确认维持）。

---

## 三十一续 — A6 拖拽源 `:draggable` 属性彻底移出内核（分层收尾）

用户「推进 A6」指令，经 AskUserQuestion 确认选择 **「A6 残留：移除 :draggable」**——把 二十七续补正 为规避快照重生成而**保留在内核**的 `:draggable` 属性也彻底下沉到表面层，使渲染内核（`GridFormRenderer`/`GridSchemaNode`/`HtmlBlock`）对拖拽的「属性 + 逻辑」完全零持有。

1. **内核 `GridSchemaNode.vue` 去 `:draggable`**：删除 `const nodeDraggable = computed(() => isDesign.value)` 及其注释块；删除全部 6 处 `:draggable="nodeDraggable"` 绑定（`layout-grid`/`layout-text`/`layout-p`/`layout-table`/`HtmlBlock` 透传/`layout-image`）。内核自此对拖拽**零属性、零逻辑**（二十七续补正 已移走 `@dragstart` 与 `node-drag-start` emit）。
2. **表面层 `CanvasSurface.vue` 接管 `draggable` 属性**：在既有 `scheduleApply`（MutationObserver 驱动的选择高亮周期）内新增 `applyNodeDraggable()`：
   ```ts
   function applyNodeDraggable(): void {
     const el = root.value;
     if (!el) return;
     const design = dragEnabled.value;
     el
       .querySelectorAll<HTMLElement>("[data-node-id]:not(.layout-grid__cell)")
       .forEach((n) => {
         if (design) n.setAttribute("draggable", "true");
         else n.removeAttribute("draggable");
       });
   }
   ```
   `scheduleApply()` 在重新 observe 前依次调用 `applySelectionHighlight(); applyNodeDraggable();`。选择器用 `[data-node-id]:not(.layout-grid__cell)`——`data-node-id` 同时挂在节点与 cell 上，cell 不可拖，故排除（盲选会把 cell 也标 draggable 并扰动快照）。
3. **浏览器约束的内在原因**：`draggable` 必须是被拖元素**自身属性**，父级事件委托无法代子元素挂该属性。故表面层在 MutationObserver 周期里对每个节点根元素 `setAttribute("draggable","true")`（design 态）/ `removeAttribute`（非 design 态），行为与 二十七续补正「内核 `:draggable="isDesign"`」完全等价，但属性归属归到了正确的层。
4. **快照更新（必然）**：移除内核 `:draggable` 后，直接 mount `GridFormRenderer` 的两个快照测试 `FirstFiveRowsSnapshot` / `YunlvSecondTicketFull` 不再含 `draggable="true"`，按预期失败 2 例；`vitest run -u` 重生成两处快照（`src/components/renderer-v2/__tests__/__snapshots__/FirstFiveRowsSnapshot.test.ts.snap` 与 `src/dev/__tests__/__snapshots__/YunlvSecondTicketFull.test.ts.snap`），唯一改动是节点元素去掉 `draggable="true"`。
5. **行为等价验证**：`DesignerApp` 拖拽两用例（跨格移动 / 同格内排序）仍通过，证明表面层 `draggable` 与内核版本行为等价、无回归。全量 **vitest 210/210（25 文件）**（仅 2 快照更新、无用例增删）、**vue-tsc --noEmit** 干净（EXIT=0）。
6. 文档：development-plan §0（最后更新 / §0.3 分层 A6 / §0.4 表）同步；MEMORY.md A6 单行更新（内核已无 `:draggable`）；2026-09-03.md 补 三十一续。
7. **至此 A6（Batch 3）彻底收尾**：内核 `GridSchemaNode` 不再有 `:draggable`、`@dragstart`、`node-drag-start`——拖拽「属性 + 源逻辑 + 落点」全部收敛于 `CanvasSurface` 表面层，渲染内核保持纯净。
