# 开发计划

> 本计划配套 [design.md](./design.md)、[design-biz.md](./design-biz.md) 和 [engine.md](./engine.md)。
> 当前唯一主线是嵌套 Grid Schema V2；旧流式实现只作为迁移参考，最终需要移除。
> 文档索引见 [README.md](./README.md)；每轮详细过程见 [execution-log.md](./execution-log.md)。
> P0–P8 已完成的阶段详细规格已存档至 [archive/phase-specs-p0-p8.md](./archive/phase-specs-p0-p8.md)。

## 0. 概览（执行追踪）

> 本节点随执行更新：只记录当前任务节点状态与已知缺口（最近执行见 memory 日log）。
> 每轮的**详细过程已归档**，连续性以 `.workbuddy/memory/YYYY-MM-DD.md` 为准；本文件只保留结论、状态与指针。
> 最后更新：**2026-09-03 D2 打印责任收口（分层清理收尾）：新增 `src/components/renderer-v2/print-form.ts` 导出 `printForm()`，使打印的「呈现」（`@page` 注入 + `@media print`）与「触发」同归渲染内核；`FormRenderer` 以 `defineExpose({ print })` 向消费页暴露打印能力；`DesignerApp.printDocument()` 与 preview 演示页改调同一入口，宿主不再各自 `window.print()`；全量 vitest 217/217（26 文件）、vue-tsc 干净**；**2026-09-03 B4 渲染期领域逻辑归 engine（分层清理收尾）：`bindTableRowCell`/`resolveCellBoxV2`/`resolveTableRowCount`/`buildTableRowField`/`collectSchemaFields` 由 `@/types` 整体迁至新建 `src/engine-v2/derivation.ts`，`@/types` 仅留 `collectFieldKeys`；`GridSchemaNode`/`DesignerApp`/`pagination` 及两处测试改从 `derivation` 引入，全量 vitest 210/210、vue-tsc 干净**；**2026-09-03 三十一续 A6 拖拽 `:draggable` 彻底移出内核（分层收尾）：`GridSchemaNode` 删除 6 处 `:draggable="nodeDraggable"` 与 `nodeDraggable` 计算属性，渲染内核零属性零逻辑；`CanvasSurface` 在 MutationObserver 周期 `applyNodeDraggable()` 对 `[data-node-id]:not(.layout-grid__cell)` 设 `draggable="true"`（仅 design 态），行为与 二十七续补正等价；两处快照重生成去 `draggable="true"`，全量 vitest 210/210、vue-tsc 干净**；**2026-09-03 三十续 B2 填充数据导入/导出（Batch 6 启动）：工具栏新增「填充数据」组（导入/导出/读取/保存），与 schema 存储键隔离；`previewData` 自此有独立数据入口（导入 JSON 进预览态）与结果出口（DOM 遍历 collectFieldValues 导出 JSON），全量 vitest 210/210、vue-tsc 干净**；**2026-09-03 二十九续 C3 非设计态隐藏配置面板（Batch 5 续）：右侧 Inspector `<aside>` 加 `v-if="editable"`，预览/填充态移出布局、画布占满，形成干净「只看表单」形态；**2026-09-03 二十八续 C1 统一编辑闸门（Batch 5 启动）：DesignerApp 单一 `editable` 闸门收敛 6 处 `previewMode` 守卫 + 模板按钮禁用，行为等价零回归；**2026-09-03 二十七续 A6 分层重构（Batch 3 落点侧 + 源下沉）：拖拽落点 `@dragover/@dragleave/@drop/@dragend` + `computeInsertionIndex` + `dragOverCellId/dragOverIndex/legalDropCellIds` 状态整体由 DesignerApp 下沉至新建 CanvasSurface 表面层，DesignerApp 退化为薄壳（仅经 `moveNodeToIndexV2`/`appendNodeToCellV2` 提交 schema）；`node-address.ts` 新增 `PALETTE_DRAG_MIME` 契约；全量 vitest 208/208、vue-tsc 干净**；**2026-09-03 二十六续 A5 分层重构（Batch 0–2：内核瘦身+表面层，P9.1c/P9.2 延后）：C2 节点地址契约（node-address.ts + engine.md §18）、A1 显式 mode 取代 data!=null 推断、A5 内核移除 selectedNodeId/.layout-node--selected（D3 关闭）、选中高亮迁至新建 CanvasSurface 表面层（MutationObserver）；全量 vitest 208/208、vue-tsc 干净**；2026-09-02 廿五续 删除 demo/ 下无引用 demo 文件（详见 execution-log）：grep 确认 5 个 `demo*.html` 零代码引用、已从 `demo/` 删除，仅留 2 个 `云铝-*` 样例；全量 vitest 204/204、vue-tsc 干净**；2026-09-02 廿四续 P12 清理（详见 execution-log）：收尾安全项——D1 死代码确证已删、StatusBar/gridPaginationDemo 过期注释修正、架构分层审查 D 类标注实际状态；D3 受 A5 门控/D2 属设计层均不孤立动；全量 vitest 204/204、vue-tsc 干净**；2026-09-02 廿三续 P11-2 完整票快照基线（详见 execution-log）：新增 `YunlvSecondTicketFull.test.ts` 整票 `toMatchSnapshot` 结构回归，全量 vitest 204/204、vue-tsc 干净**；2026-09-02 廿二续 删除 50 行分页演示 UI（详见 execution-log）：移除 DesignerApp「分页演示(50 行)」按钮+`loadPaginationDemo()`、preview 下拉选项，仅留 `src/dev/gridPaginationDemo.ts` 作测试夹具；全量 vitest 203/203、vue-tsc 干净**；2026-09-03 廿一续 Table 按数据行跨页切分（详见 execution-log）：分页引擎新增 Table 按行切分能力——`paginateTable()`（顶层 Table 直接切分）+ `splitGrid` 内嵌套检测（Grid 单行内含超高 Table 时递归按 Table 数据行切分，每页产出相同 Grid 行但 Table 携带递减的 `_paginateMaxRows`）；渲染层 `GridSchemaNode.vue` 新增 `tablePaginatedRowCount()` 限制片段行数；`TableNodeV2` 新增 `_paginateMaxRows?` 内部分页字段；`paginateGrid` 新增 cell 内 Table 超高检测（`hasTallTables`）绕过「Grid 行高估算放得下」误判；新增引擎测试「Table(50行) in Grid(1行) → 多物理页、总行数 50 不丢」；全量 vitest **204/204**、vue-tsc 干净**；2026-09-03 二十续 自动分页真实高度校正（详见 execution-log）：渲染内核 `GridFormRenderer` 新增浏览器内真实行高测量（与渲染内核同一纯函数、同入参口径，不会两处各算一套而漂移）——内容超高换页时显示「打印：N 张」（与逻辑页数不同才显示），单节点比整页还高、被强制放入而可能裁切时显示「分页告警：K」（此前这类超高是静默发生的）；新增 `DesignerApp.pagination.test.ts` 4 例，全量 vitest **201/201**、vue-tsc 干净**；2026-09-02 十八续 分页收尾四项（详见 execution-log）：① **删除旧 v1 分页引擎 `src/engine/`**（含其 `__tests__`），并撤销 `tsconfig.json`/`vitest.config.ts` 中为绕开它而加的 `exclude`；② **Table 按行跨页切分按用户要求延后**（维持原子块整体落页/换页）；③ `DesignerApp`「`paginate` 传 true 却没效果」定位为**设计器默认空白 Schema、内容远未超页**（渲染链路本就通，新增 `DesignerApp.pagination.test.ts` 5 例固化证据），并新增工具栏**「分页演示(50 行)」一键入口**＋**「分页」开关**（默认开；预览/打印强制分页）；④ **纸张高度由 `min-height` 改为固定 `height`＝整纸高**（`min-height` 只设下限，内容超高时纸张被无限撑开、反而看不出超限），同步 `PaperSizePrint.test.ts` 断言与 `FirstFiveRowsSnapshot` 快照；全量 vitest **197/197**、vue-tsc 干净**；2026-09-02 十七续 设计器默认空白（不再挂载前五行样例）+ 移除填充按钮及相关交互 + 工具栏新增纸张边距配置（详见 execution-log）；2026-09-02（⑯ 十五续 修复 gap 下内部边框归属：`GridSchemaNode.vue` 内部线由「非首列 left / 非首行 top」翻转归属为「非末列 right / 非末行 bottom」，线落拥有它的 cell 自身边缘，gap 下不再与留白融成一体、gap=0 观感不变，全量 185/185、vue-tsc 干净；⑮ 十四续 新增 Grid `gap` 单元格间距配置：Schema `GridNodeV2.gap?:number` + `resolveGridGapV2`/`updateGridGapV2` + 渲染层 `.layout-grid` rowGap / `.layout-grid__row` columnGap + 设计器「单元格间距(mm)」输入；新增 GridGap.test.ts 等 7 例，全量 184/184、vue-tsc 干净；⑭ 十三续 修复「选 A3 横向却仍按 A4 打印、内容被裁」：`@page` 从设计器硬编码 `size:A4` 改为由**渲染内核**按 `schema.paper` 运行时注入（新增 `renderer-v2/page-size-style.ts` + 共享 `resolvePaperSizeV2`/`PAPER_SIDE_MM`，渲染尺寸 / 打印 `@page` / 溢出校验三处统一），新增 `PaperSizePrint.test.ts` 4 例，全量 177/177、vue-tsc 干净；⑬ 十二续 修复空值字段 P 塌缩成「一条居中直线 + 光标落在直线下方」（`.layout-p__value` 新增 `min-height:1.35em`、`.layout-p__input` `1em`→`1.35em`），全量 173/173、vue-tsc 干净；⑫ 十一续 修复非复合字段 contenteditable `<p>` 文本不渲染、全量 173/173、vue-tsc 干净；⑪ G8 渲染组件可独立运行：公共入口 `FormRenderer` + 预览页 multi-page + `bare` 无外壳 + `FormRenderer.test.ts` 5 例，vitest 170/170、vue-tsc 干净；① P7.2d/P9.1d 动态行：确认「可重复」不是 schema 属性，改为渲染期按 data 推导行数 = `max(minRows, data 中出现的最大行号)`，`repeatable` 属性已从 schema/序列化/样例/测试移除；新增 `schema-v2-table-rows.ts` +15 例；② 字段 P 设计态光标居中 + 移除「默认值/多行」配置：设计态空字段经 `::before` 零宽空格行盒垂直居中，默认即 `pre-wrap` 自动换行，仅 number/date 渲染单行 input；`FieldPNodeV2` 删 `default?`/`multiline?`，Inspector 删「多行」「默认值」；P9.1c 专用控件用户确认延后、P7.2f cell 内可放子 Grid 已确认；vitest 138/138；③ 2026-09-01 再续 用户四条指令全部完成（含图形安措）：空白初始化默认根 Grid、相邻 Grid 外框去重（suppressBorders，仅抑制后一个引导侧 top/left）、字段全字符串类型移除输入类型配置（inputType 删除、填充态一律 textarea）、外部组件「图形安措」（action=safetyGraphic + actionParams.matchField），vitest 140/140；④ 2026-09-01 三续 Inspector 布局统一：组件配置标签+输入控件一律上下结构，长文本 textarea 独占整行、其余短控件一行两列（`.v2-control--inline` 改竖 + 新增 `.v2-control--full` / `.v2-grid-dimensions .v2-control{margin:0}`，各节点检查分支按组包进 2 列网格），vue-tsc 干净、vitest 140/140；⑤ 2026-09-01 四续 行高倍数从 table 移到 grid-cell：`TableNodeV2` 删 `headerHeight`/`rowHeight`（表头固定 1× 基准）、`GridCellV2` 加 `rowHeight?:number`（单元格覆盖 Grid 行高）、vue-tsc 干净、vitest 139/139）**；⑥ 2026-09-01 五续 字段 P 设计态无前标签/空字段也能回车换行（`.layout-p` 加 `flex-wrap:wrap` + `.layout-p :deep(div){flex:1 1 100%;width:100%}` 命中 contenteditable 运行时插入的 div、占满整行换行堆叠，vue-tsc 干净、vitest 139/139）；⑦ 2026-09-01 六续 字段组件新增「宽度 / 默认内容 / 内部边框」三项配置（`FieldPNodeV2` 加 `width?:string`/`default?:string`/`innerBorder?:boolean`；渲染层 `pStyle` 写 width、`fieldValue` 回退 default、`.layout-p--inner-border :deep(div)` 画底边框且设计/预览/打印均显示；检查器加文本域「默认内容」+「宽度」+「内部边框」复选，新增 13 例测试，vue-tsc 干净、vitest 152/152）；⑧ 2026-09-01 六续补正 宽度仅作用于可输入区域（无前/后标签→整个 `<p>` 宽度；有前/后标签则只挂内层 `.layout-p__input`/`.layout-p__control` 且 `flexGrow:0` 防拉伸、前缀/后缀不计入宽度），新增 1 例、vitest 153/153）；⑨ 2026-09-01 七续 内部边框(innerBorder)打印不生效修复：根因为静态/预览/打印渲染字段值为纯文本（无 `<div>` 子元素），`.layout-p--inner-border :deep(div)` 匹配不到→无边框；改为静态(非填充)渲染按 `\n` 拆成逐行 `<div class="layout-p__line">`（空值至少一行、min-height 保行高），真实边框打印必然显示，新增 1 例、vitest 154/154）**；⑩ 2026-09-01 八续 表格字段按列配置自动派生（替换原 {row} 占位符方案）：行模板字段 P 的 field 留空，渲染期由 `bindTableRowCell` 按「列key_行号」自动生成（列 location 第 r 行即 `location_r`，与 demoData 的 8 键逐字对应）；表格内字段 P 不可单独选中/配置（点击回退选中所属 Table、结构树不展开 table 子节点、校验跳过表格内字段命名检查），增删列即增删字段；样例/测试/快照/设计器提示全部同步（yunlv 两样例、demoData、P10Acceptance、YunlvSecondTicketFull、TableDynamicRows、FirstFiveRowsSnapshot、DesignerApp、schema-v2-operations），vue-tsc 干净、vitest 154/154**；⑪ **2026-09-02 分层核对（设计器 / 渲染组件 / 填充）**：按用户给定目标结构（设计器引用渲染组件、渲染组件只渲染不拖拽不配置、填充=渲染组件+数据）逐项核对，产出 [architecture-layering-review.md](./architecture-layering-review.md)——列出符合项 5 条与**不符合项 A1–A5（渲染组件不纯：三态内嵌契约 / 设计态 contenteditable / 填充与预览两套 DOM 分支 / inject("formFill") 反向依赖 / selectedNodeId 内嵌）、B1–B4（分层缺失：无独立渲染入口 / 填充数据硬编码 demoData / 设计器依赖 dev 样例 / engine 空壳）、C1–C3（禁用靠逐处守卫 / 隐式 data-node-id 契约 / 非设计态仍渲染面板）、D1–D3（清理项）** 与五批调整顺序；本轮**只核对不改码**。**；⑫ **2026-09-02 G11 统一渲染路径（A3）：预览/填写复用同一控件，仅 readonly/contenteditable 差异，浏览/填写/打印版式一致；设计态 contenteditable 维持不变（A2 延后）；修复 Vue 3.5 编译器 v-once/动态组件崩溃（改直接 textarea + v-show 切换）；同步 5 个测试，vitest 170/170、vue-tsc 干净**）；⑰ **2026-09-02 十六续 分页引擎**：纸张 `min-height` 无法呈现「内容超高换页」，新增 `src/engine-v2/pagination.ts` —— DOM 无关的**确定性**分页引擎（Grid 行高 = `row.height × baseRowHeight` mm 可直接算出，无需渲染后测量）：每个逻辑 `PageSchemaV2` 切为若干物理页，Grid 按行边界切分（首片段保留上框、末片段保留下框、中间片段用 `suppressBorders` 抑制上/下框形成连续外观），Text/Image/Table/Html 作为原子块整块落页或换页，超高单节点强制放入并告警；`GridFormRenderer` 新增 `paginate` 属性（默认 true，预览/填写/打印分页，设计态传 false 整页编辑）；新增 `src/dev/gridPaginationDemo.ts`（50 行 Grid 演示）+ 预览页下拉切换；旧 `src/engine`（v1 参考、对接旧 Schema 类型、不编译于 V2 类型）从 tsconfig/vitest 排除；新增 `engine-v2/__tests__/pagination.test.ts`(6) 与 `GridFormRenderer.pagination.test.ts`(3)，全量 **194/194**、vue-tsc 干净**

### 0.1 当前主线位置

- **主线：P11「完整工作票」**（P10 前五行闭环已全部验收通过，§14 闸门已解除）。
  - P0–P9 功能闭环；P10 八项验收指标中可自动化部分由 `P10Acceptance.test.ts`（11 例）全覆盖，#7「打印尺寸误差 ≤ 0.5mm」与 #8「结构与参考图一致」经用户真机人工核验通过。
  - **P11-1 已完成**：full 样例对齐为**扁平 13 个独立段 grid**（与设计器导出 `ticket-schema-v2-1788315240965.json` 对齐；border 分布 all×3 / outer×9 / none×4，带 `columns`），消除段间 2px 双边框；前五行样例（P10 验收）字段键已同步到同一 JSON 键集（工作负责人（监护人）/ 电站设备 / 工作地点_* / 工作内容_*）。
  - **P11-3 已完成**：A4 整票打印真机核验通过；打印方向改为由纸张尺寸派生（A4 纵向 / A3 横向）；Table 新增边框配置（all/outer/inner/none，与 Grid 对齐）。（**2026-09-02 十三续补正**：打印纸张尺寸 `@page` 曾硬编码 `A4`，选 A3 时渲染正常但打印仍按 A4 出页致内容被裁；现由渲染内核按 `schema.paper` 运行时注入，设计器与消费页均生效。）
  - **下一步**：P11-2（完整票快照基线，可选）、P11-4（并入推迟项：P9.1c 专用控件、P9.2、P12 清理）。（P7.2e 完整编辑 UI 经用户澄清=「设计器人工编排符合参考图结构的整票模板」，已由导出 JSON `ticket-schema-v2-1788315240965.json` + 同步 `yunlv-second-ticket-full.ts` 完成；P7.2d/P7.2f/P9.1d 已于 2026-09-01 完成。）
- 当前测试基线 **vitest 235/235（29 文件）**，`vue-tsc --noEmit` 干净；每轮详细过程见 **[execution-log.md](./execution-log.md)**。

### 0.2 任务节点状态（2026-08-31 十续执行后）

- **已完成（文档勾选）**：P0 ~ P9 全部；P4.5 快照、P5 节点树；P6.2b 单元格 padding/对齐（方向 1）；P4.3 边框单边归属；**P6.2c colspan（共享列轨）**；**P6.2d 合并/拆分相邻格**；**P6.3b 格内排序（配置面板版）**；**P6.3c 跨格移动（配置面板版）**；**P10 收尾 = 规范样例 4-Grid → 1-Grid 对齐（消除接缝 2px 双边框）**；**P7.2e 子集 = 表格行模板逐行字段绑定 `{row}`**；**P10 实现侧 harness（11 例，覆盖全部可自动化验收指标）**。
- **已完成（本轮新增，非文档勾选节点）**：**P6.3c 目标过滤**（`listDropTargetsV2(schema, moveNodeId?)` 跳过自身所在格与自身后代容器；`moveNodeV2` 遇自身所在格原样返回）；**预览态只读**（三态 `design` / `preview` / `fill` + 渲染层 `readonly`）；**Grid `border="outer"` 仅外框**（内部线只由 `all`/`inner` 绘制）；**隐藏 text/p 的「排列方向」(writingMode) 配置**；**字段 P 控件化（八续 → 2026-09-01 续修订）**：填充态用真实 `textarea`(文本/自动换行 `pre-wrap`)/`input`(number/date 单行) 替换 contenteditable `<p>`，设计/预览/打印静态渲染不变；「多行」「默认值」配置经用户反馈于 2026-09-01 续移除（默认即 `pre-wrap` 自动换行，无需开关；设计态空字段经 `::before` 零宽空格行盒使光标垂直居中）；**允许把 Grid 拖进 cell（九续）**：`createNodeByKind`/`addNodeToSelectedCell`/`startPaletteDrag` 的 `kind` 扩为含 `"grid"`，「添加 Grid」按钮改为可拖拽 + 点击把 Grid 嵌进选中格（无选中格则退化为根追加）；**P11-1 full 样例 1-Grid 对齐**：`yunlv-second-ticket-full.ts` 由 8 个并排 `all` 网格重构为「1 外层 `ticket-layout`(`all`,`columns:["1fr"]`) + 标题行 + 7 段行（每段单行单格嵌一段 `inner` 网格，沿用原各段行数组，段行高=该段内部行高之和）」，`reloadSample()` 直接受益，消除段间 2px 双边框；**P11-3 打印方向派生 + Table 边框配置（十续）**：删除独立 `orientation` 选择（纸张尺寸派生：A4→纵向、A3→横向，`GridFormRenderer`/`schema-v2-validation`/`DesignerApp` 三处同步）；`TableNodeV2` 新增 `border?: BorderModeV2`（默认 `all`）、`updateTableBorderV2`、渲染层 `layout-table--{mode}` 单边绘制（外框仅 all/outer、内部线仅 all/inner，与 Grid 同机制）、设计器 Table 检查器加「边框」select。
- **本轮新增（2026-09-01 再续，用户四条指令前三项）**：**① 空白初始化默认根 Grid**——`DesignerApp.resetBlank()` 从空 page 起算后插入 `createGridNodeV2()`+`insertRootGridV2` 并选中该 Grid（`createEmptyFormSchemaV2` 本身不变，测试依赖空 page）；**② 相邻 Grid 外框去重**——新增 `GridSchemaNode` 的 `suppressBorders` prop + `GridFormRenderer.pageSiblingSuppressBorders`（页面竖向堆叠抑制后一个 `top`）/`GridSchemaNode.cellSiblingSuppressBorders`（单元格横向排布抑制后一个 `left`），仅隐藏「后一个」引导侧保留单线，CSS `layout-grid--no-*` 置于 `--all/--outer` 之后同级特异度胜出；**③ 字段全字符串类型、移除输入类型**——`FieldPNodeV2.inputType` 删除，`useTextarea`/`inputElType` 恒为 `true`/`"text"`，填充态一律 `<textarea>`，Inspector 删「输入类型」select，样例 `dateField` 去 `inputType`。**④ 外部组件「图形安措」落地（2026-09-01 再续 Item 4，按用户澄清）**：`FieldPNodeV2.action` 新增 `"safetyGraphic"`、`actionParams?: Record<string,string>`（通用外部组件参数，图形安措用 `matchField` 指定匹配字段）；Inspector「外部组件(action)」下拉加「图形安措」、选中后显「安措匹配字段」输入框（写 `actionParams.matchField`，清空移除该键）；实际弹窗调用与 data 回写为宿主行为，设计器内不实现。
- **本轮落地**：人工核验反馈修复 —— ①跨格移动跳过自身所在格；②预览态禁止添加组件与字段输入（五续）；③`outer` 仅外框不画内线 + 隐藏「排列方向」配置（六续，详见 [execution-log.md](./execution-log.md)）。
- **字段 P 渲染现状（2026-09-02 十续/十一续 修正，覆盖八续 textarea 方案）**：预览/填充态字段 P 已统一渲染为**可编辑 `<p>`**（八续的 `<textarea>` 分支已回退，因 textarea 撑开 `<p>` 行高、版式不符）；与设计态同结构、行高一致。值经 `fieldValue` 注入：非复合直接进 `<p>` 内层 `<span class="layout-p__value">`、复合进 `.layout-p__input`、innerBorder 进 `.layout-p__lines`（v-once 逐行 div）。用户输入失焦一次 `emit("field-change", field, value)`（不逐键回写），另提供 `collectFieldValues(root)` 遍历渲染 DOM 的 `[data-field]` 采值（DesignerApp `collectFormValues()` `defineExpose` 暴露，预览态 `readonly=false` 使字段可采集）。**注意**：contenteditable `<p>` 的**直接文本子节点**在 data 晚于挂载到达时不被 Vue patch，须把值放进内层 `<span>`（十一续已据此压平结构）。
- **人工核验反馈（2026-08-30，用户侧）**：
  - ✅ 拖拽模板组件到纸张、落入指定格子 —— 功能正常；
  - ✅ 打印 —— 正常（P10 指标 #7「打印尺寸误差 ≤ 0.5mm」人工侧通过）；
  - ✅ P10 指标 #8「主要结构与参考图一致」 —— 2026-08-31 用户确认通过（与参考图基本一致）。
  - ✅ P11-3 A4 整票打印核验 —— 2026-08-31 用户确认「正常」（尺寸与段线与参考图一致）；同期完成打印方向由尺寸派生 + Table 边框配置。
- **推迟（按 §2.2，未做，本次继续维持）**：P6.3b/c 的**拖拽**交互形式（已于 2026-09-02 五续以统一拖拽原语实现，并移除配置面板版上移/下移按钮 + 目标下拉；旧 P6.3b/c 配置面板版相应下线）、P9.1c（number/date/signature 专用控件，2026-09-01 确认延后）、P9.2 全部、P12 清理。（P7.2e 完整编辑 UI 经用户澄清=「设计器人工编排符合参考图结构的整票模板」，已由导出 JSON `ticket-schema-v2-1788315240965.json` + 同步 `yunlv-second-ticket-full.ts` 完成；P7.2d / P9.1d 已于 2026-09-01 以「按 data 动态行数」实现；P7.2f 已确认可行。P11 完整工作票已随 #8 确认解除 §14 闸门，转「可开工」，见下。）
- **P11 已解除 §14 闸门（2026-08-31）**：P10 八项指标 #7（打印）与 #8（结构一致）均经用户人工确认通过 → **完整工作票（含 full 样例 4-Grid 对齐）可开工**。
- **P11 排期（2026-08-31 起，九续后；用户指令「继续排 P11」）**：完整工作票对齐为「1 外层 Grid(`all`) + 各段以嵌套 Grid(`inner`) 放入 cell」，复用九续刚落地的 Grid-in-cell 能力，消除段间 2px 双边框（与首五行对齐同源）。拆分如下，当前先执行 **P11-1**：
  1. **P11-1 full 样例 1-Grid 对齐**：重写 `yunlv-second-ticket-full.ts`——外层 `ticket-layout`(`all`,`columns:["1fr"]`) 含「标题行 + 8 段行」；每段行单行单格嵌一段 `inner` 网格（沿用原 `basicInfoRows`/`workTaskRows`/`safetyRows`/`confirmRows`/`extensionRows`/`completionRows`/`remarkRows` 行数组，边框由 `all`→`inner`）；段行高 = 该段内部行高之和，总高与原 8×`all` 版本一致。`reloadSample()` 当前即载此样例，直接受益。
  2. **P11-2 full 样例验收/快照**：新增 `YunlvSecondTicketFull.test.ts`（`validateFormSchemaV2` 无 error、全部字段节点可索引、渲染出嵌套 Grid、段间仅单线）；可选对完整票出 `toMatchSnapshot` 基线。
  3. **P11-3 真实打印/浏览器核验 + 打印方向派生 + Table 边框配置（✅ 已完成，2026-08-31 十续）**：① 用户真机核验 A4 整票打印尺寸与段线正常；② 打印去掉独立方向选择，方向由纸张尺寸派生（A4→纵向、A3→横向）；③ Table 组件新增边框配置 all/outer/inner/none（与 Grid 对齐，单边绘制不重复外框）。
  4. **P11-4 推迟项并入**（按用户优先级）：P9.1c 专用控件、P9.2、P12 清理。（P7.2e 完整编辑 UI 经用户澄清=设计器人工编排整票模板，已由导出 JSON + 同步 .ts 完成；P7.2d/P7.2f/P9.1d 已于 2026-09-01 完成；P9.3f 打印验证事实已通过。）
- **源码**：位于 `E:\Project\ssh\TicketDesigner`（有 git；2026-08-31 全部改动已提交至本地 `dev` 分支，未推送远端）。

### 0.3 已知缺口 / 风险

- **嵌套边框变粗**：已解决（P4.3 单边归属规则，见 §17）。
- **colspan 后格线正确**：已解决（P6.2c 共享列轨，合并格跨任意列宽都能对齐；旧 fixture 无 `columns` 时回退逐格宽度）。
- **打印尺寸 0.5mm 门槛**：✅ 已由用户人工核验通过（2026-08-30，反馈「打印正常」）。
- **P10 放行 P11 的闸门（已解除，2026-08-31）**：§14「前五行闭环未通过前不扩展完整表单」八项指标中可自动化者已全覆盖；#7（打印）与 #8（结构一致）均经用户人工确认通过 → P11 完整工作票可开工。
- **设计态字段 P 仍 `contenteditable`（✅ 2026-09-03 用户拍板：正确行为，维持不改）**：设计态（无 `data`）下字段 P 与其复合输入区**允许且必须允许**就地输入——这是查看「输入时的交互效果」（换行/撑开/光标/多行表现）的手段，属设计态职责；**不回写 schema**（仅画布临时文本）同样是正确行为（要设默认值走 Inspector 改 `default`，而非在画布敲字）。⚠️ 曾提「后续统一为设计态只读」已被用户否决，勿再议。
- **分页引擎（2026-09-02 十六续 落地 / 十八续 收尾）**：`GridFormRenderer` 默认 `paginate=true` 按纸张正文高度切分物理页；设计态由工具栏「分页」开关控制（默认开，可关为整页连续渲染），**预览/打印始终强制分页**。旧 v1 `src/engine/`（DOM 测量 + 旧 Schema 类型）已删除，分页引擎唯一实现为 `src/engine-v2/pagination.ts`。已知边界：① ~~Table 节点作为原子块整体落页/换页，按行跨页切分用户已确认延后~~ → **2026-09-03 廿一续已实现**：顶层 Table 直接 `paginateTable()` 按数据行切分；嵌套 Grid 单行内超高 Table 由 `splitGrid` 递归检测并切分（`_paginateMaxRows` 限制渲染行数）；② Text/Image/Html 高度用启发式估算（Text 按内容宽度折行、Image 用给定尺寸、Html 回退一行基准高并可注入 `measureNode` DOM 测量回调提升精度），个别长文本可能与实测有出入，但 Grid（工作票主体）为确定性精确计算；③ 物理页纸张高度为**固定 `height`＝整纸高**（不再用 `min-height`）——`min-height` 只设下限，内容超高时纸张被无限撑开、反而看不出超限；设计态关掉分页且内容超高时，超出部分溢出到纸张外的灰底，即「内容超出一张纸」的可见反馈。`@page` 注入仍由渲染内核统一负责打印尺寸。④ 分页结果经状态栏暴露（十九续）：「打印：N 张」与「分页告警：K」由 `DesignerApp` 调 `paginateSchema` 得到——**与渲染内核同一纯函数、同一入参口径**（`data` 均取 `previewData`、正文高/内宽同由 `resolvePaperSizeV2` 派生），故状态栏数字与画布物理页必然一致，不会两处各算一套而漂移。**2026-09-03 二十续（自动分页真实高度校正）**：渲染内核 `GridFormRenderer` 在浏览器内测量每个 Grid 行真实渲染高度（`getBoundingClientRect().height/PX_PER_MM`），回灌 `paginateSchema({measureRow})` 二次分页（`displayedPages = measuredPages ?? renderedPages`），解决确定性估算低估实际行高导致「本应换页却溢出纸外」的误判；jsdom/SSR 下测量为 0 自动回退确定性分页（测试稳定）。另修正**分页关闭态纸张高度**：`paginate=false` 用 `min-height`（纸张随内容长高、内容留在纸内不溢出），`paginate=true` 仍固定 `height`＝整纸高。
- **分层不符合项（2026-09-02 核对，未整改）**：按「设计器 / 渲染组件 / 填充」三层目标结构核对，共 15 项不符合（A/B/C/D 四类），详见 [architecture-layering-review.md](./architecture-layering-review.md)。其中 **P1 三项**为分层成败关键：① 渲染组件用 `data != null` 推断三态；② 填充态与预览态是两套 DOM 分支；③ 值回写走 `inject("formFill")` 反向依赖设计器。**该待拍板项已拍板（2026-09-03）**：设计态 contenteditable **不下线**（选项① 维持现状，理由见上一条）。**2026-09-04 A3 统一渲染路径已落地并测试锁死**：字段统一为可编辑 `<p>`（十续已回退 G11 的 textarea 分支），preview 与 fill 渲染结果逐字符一致、只读只差 `contenteditable`；新增 `src/components/renderer-v2/__tests__/RenderPathIsomorphism.test.ts`（5 例）作闸门。同时订正内核 props 注释口径：真正的「不可输入」由 `readonly` 决定，`mode="preview"` 与 `fill` **同口径**（预览就是消费模板输入数据的地方，设计器预览态显式传 `:readonly="false"`；消费页只读回显由 `FormRenderer` 在非 fill 时补 `readonly`）。**2026-09-04 D3 设计态 DOM 分支收口**：内核不再渲染 `.v2-insertion-line`、不再持有 `dragOverCellId`/`dragOverIndex` props（A5 已移出 `selectedNodeId` 与 `@media print` 选中清除分支）；插入指示线改由表面层 `CanvasSurface` overlay 绝对定位绘制；新增 `src/components/renderer-v2/__tests__/RendererNoDesignState.test.ts`（3 例）锁死「任意模式不渲染设计态交互 DOM」。**2026-09-02 定案（该文档 §6）：不分化第二个渲染组件**，改为「渲染内核（`renderer-v2`，唯一）+ 设计表面层（选中/拖拽/落点/插入指示，引用内核而非复制）」两层，批次顺序以 §6.5 为准；拖拽重排（A6）的 `dragstart` 走画布事件委托、不进渲染内核。**2026-09-02 五续已按用户「合并为统一拖拽、拖拽实现后移除旧按钮」决策，把拖拽源落在 `GridSchemaNode`、落点判定放在 `DesignerApp`（统一走 `moveNodeToIndexV2`，功能已交付且 vitest 157/157 + vue-tsc 干净绿灯）；A6「表面层分化」列为推迟重构，不在本轮范围**。**2026-09-03 二十六续（A5 Batch 0–2 已落地）**：C2（地址契约）+ A1（显式 mode）+ A4（G15 已 emit field-change）+ A5（内核去选中态、选中高亮迁 CanvasSurface 表面层、D3 随之关闭）已完成；A6（Batch 3 落点侧）已完成——拖拽落点逻辑（`closest`/`computeInsertionIndex`/drop 高亮 + `dragOverCellId/dragOverIndex/legalDropCellIds` 状态）由 `DesignerApp` 下沉至 `CanvasSurface` 表面层，`DesignerApp` 退化为薄壳 schema 提交代理（仅 `@drop-node`/`@drop-palette` 提交 `moveNodeToIndexV2`/`appendNodeToCellV2`）；A6 拖拽**源**亦已完成（二十七续补）：内核 `GridSchemaNode` 的 `@dragstart` 处理器与 `node-drag-start` emit 全部移除，拖拽源逻辑（确定被拖节点 / 表格内部节点与字段 p 需 Alt 的拦截规则 / 写 NODE_MOVE_MIME）改由 `CanvasSurface` 经根节点 `@dragstart` 事件委托处理；`:draggable` 属性因浏览器要求必须是被拖元素自身属性，故由表面层 `CanvasSurface.applyNodeDraggable()` 在 MutationObserver 周期对 `[data-node-id]:not(.layout-grid__cell)` 设置（仅 design 态为 `true`）；**三十一续 已将其从内核彻底移除**（`GridSchemaNode` 删除 6 处 `:draggable="nodeDraggable"` 绑定与 `nodeDraggable` 计算属性，两处快照 `FirstFiveRowsSnapshot`/`YunlvSecondTicketFull` 同步去 `draggable="true"`）。至此 A6（Batch 3）整体完成，`DesignerApp` 与 `GridFormRenderer` 均不再持有任何拖拽源逻辑/属性。剩余 B/C 类与 A2/A3 属 Batch 4+，不在本轮（P9.1c/P9.2 用户确认延后）。**2026-09-03 二十八续（Batch 5 启动）**：C1 统一编辑闸门已落地（DesignerApp 单一 `editable` 闸门收敛 6 处 `previewMode` 守卫 + 模板按钮禁用）；**二十九续**：C3 非设计态隐藏右侧 Inspector 配置面板（`v-if="editable"`）已落地。**Batch 5 已完成**（B1+C1+C3）；**三十续 B2 已完成**：填充数据导入/导出独立生命周期（工具栏「填充数据」组 + `DATA_STORAGE_KEY` 与 schema 隔离 + 画布 DOM 遍历 `collectFieldValues` 导出）。剩余 D2 与 A2（设计态 contenteditable 用户确认维持）属后续批次（P9.1c/P9.2 用户确认延后）；**B3 解耦 dev 样例已于 2026-09-03 完成**（DesignerApp 不再 import `@/dev`，样例/预览数据经 `src/App.vue` props 注入）。
- **`DesignerApp.vue` 工作区文件曾被加密（2026-09-02 发现，2026-09-02 五续已解密）**：曾因 `%TSD-Header` 加壳导致非白名单进程读密文；用户已解密，工作区与 `HEAD` 一致（`git diff --stat` 为空），现可正常读写与编辑。
- **纸张区域缩放（浏览/移动端查看，2026-09-04 已落地，全模式启用）**：新增表面层 `PaperViewport.vue`（`viewport` 灰底裁剪窗包 `scaler` 包 `<slot/>` + 浮动缩放条），经 `@panzoom/panzoom`（timmywil v4.6.2）实现平移/滚轮缩放/触屏 pinch；`onMounted` 挂 `Panzoom(scaler,...)`，`MutationObserver` 给 `input/textarea/select/[contenteditable]/[draggable='true']` 打 `panzoom-exclude`（排除元素上的指针手势不触发平移 → 设计态拖节点、消费态编辑字段两不误），`wheel` 在控件上放行原生滚动；`defineExpose({zoomIn,zoomOut,reset,fitWidth,getScale})`；`@media print` 下 `transform:none!important` + 隐藏缩放条，走真实 mm 出页（缩放被忽略）。接入：`FormRenderer.options.zoom=true` → `PaperViewport` 包 `GridFormRenderer(bare)`；`DesignerApp` 画布区 `PaperViewport` 包 `CanvasSurface(bare)`。**`/preview` 消费页演示已默认开启缩放**（`src/preview/App.vue` 传 `{ zoom: true, fitOnMount: isNarrow }`，`isNarrow=matchMedia("(max-width:768px)")` 窄屏自动适应宽度、桌面端保持 100% 便于对照参考图）；`FormRendererOptions` 因此新增 `fitOnMount?: boolean` 透传至 `PaperViewport`。
- **预览态可数据输入（2026-09-04 用户诉求）**：原 `FormRenderer` 强制 `readonly = mode !== "fill"` 使预览态只读，与「`readonly` 与 `mode` 正交、`preview`/`fill` 同口径」架构冲突。现 `FormRendererOptions` 新增 `readonly?: boolean`，默认 `false` → **preview / fill 都可输入**（契合「预览即消费模板输入数据以配合流程流转」）；需「仅浏览详情」时显式传 `options.readonly=true` 强制只读回显。`GridFormRenderer.vue` 的 `readonly` 注释同步订正。回归：`FormRenderer.test.ts` 原「preview 只读」断言翻转为「preview 默认可编辑」，并新增 `readonly:true` 仍只读的例。全量 vitest **235/235（29 文件）**、vue-tsc 干净。
- **消费态契约重构：两正交轴 + 去 `FormRendererMode`（2026-09-04）**：用户澄清设计态与消费态用同一渲染内核，靠**两正交轴**区分——`isDesign`（内核 `mode="design"`，仅设计器：可编辑组件 + 字段就地输入看交互效果、不回写 schema）与 `readonly`（消费态闸门：消费页不编辑组件、字段可输入由 `readonly` 全局控制，**默认 true 只读回显**、传 `false` 进填写态）；并新增 `getFormData()` API 取整个表单输入数据。落地（聚焦改动，仅动 FormRenderer）：`FormRenderer` 删除 `mode` prop 与 `FormRendererMode` 类型（永远是消费态，对内固定传非设计 `mode="preview"`），`readonly` 默认改回 **true**，新增 `getFormData(): FormDataV2`（`defineExpose`，返回内部 data 快照、与 `update:data` 同口径）；`/preview` 演示页 `options` 加 `readonly:false` 仍可直接输入（缩放+输入并存）；`FormRenderer.test.ts` 重写为默认只读 / `readonly:false` 可编辑 / `readonly:true` 只读 / 填写触发 field-change+update:data / `getFormData()` 反映改动。`RenderPathIsomorphism.test.ts` 注释订正。全量 vitest **236/236（29 文件）**、vue-tsc 干净、`vite build` 成功。**内核 `mode` 类型已收拢为 `design|preview` 两值（`fill` 已删除，与 `preview` 行为完全等价、无人使用）；消费态契约彻底对齐两正交轴 + `readonly` 闸门（详见后条「内核 mode 收拢」）**。⚠️ 测试坑：真实包 `main` 是 UMD，`module.exports={default:fn,defaultOptions}` 无 `__esModule`，Vitest SSR/CJS 互操作下 `import Panzoom from` 得到命名空间对象而非函数（运行期 `default is not a function`）；已用 vitest `resolve.alias` 把 `@panzoom/panzoom` 指向 `src/test-utils/panzoom-stub.ts`（仅测试期，生产走 `module` 字段 ESM 不受影响）。新增 `PaperViewport.test.ts`（9 例）。全量 vitest **234/234（29 文件）**、vue-tsc 干净、`vite build` 成功。
- **内核 `mode` 收拢为 `design | preview` 两值（删 `fill`，2026-09-04 续）**：承接消费态契约重构的待确认项，渲染内核三态 `design|preview|fill` 收拢为两值 `design|preview`（`fill` 无人使用、与 `preview` 等价，全部分支同口径）。改动：`GridSchemaNode`（`RenderMode` 类型 + `resolvedMode` 推断 `data!=null→preview`、注释去 fill 措辞）、`GridFormRenderer`（`mode?` 类型删 fill）、`CanvasSurface`（`CanvasSurfaceMode` 删 fill；`hostClass--preview` 简化为 `mode!=="design"`、`dragEnabled` 简化为 `mode==="design"`）；`FieldPConfig.test.ts`/`RendererNoDesignState.test.ts` 的 `fill` 用例改 `preview`；`RenderPathIsomorphism.test.ts` 重写——原「preview ≡ fill」硬同构例无对象，改为锁「非设计态渲染只受 `readonly` 闸门影响、差异仅限 contenteditable」4 例（原 5 例）。验证：vue-tsc 干净；**vitest 235/235（29 文件）**（236→235 因删 1 个已无意义同构例）；`vite build` 成功。现状：内核 mode 干净两值，`FormRenderer` 固定传 `preview`、`DesignerApp` 透传 `previewMode ? 'preview' : 'design'`，与消费态契约（两正交轴 + `readonly` 闸门）彻底对齐。
- **交付场景差距范围已定稿（2026-09-02 第 7 轮澄清，仅核对不改码）**：本应用只含**设计器 + 渲染组件**两块，**服务器 / 消费页面为外部**。差距只落在两处：① 设计器导出的 JSON 是否自洽、可被消费；② 渲染组件能否独立于设计器消费 JSON+data 并正确渲染（含打印）。`delivery-scenario-gap.md` 已将 G1–G19 按 **◆ 本应用须补 / ◇ 外部实现** 标注；◆ 须补项 = G4 G5 G6 G7 G8 G9 G10 G11 G12 G13 G14 G15 G16 G17 G18（P0：G5/G6/G8/G11/G12/G16），◇ 外部实现 = G1 G2 G3 G18b G19（仅备案）。与分层整改 §6.5 第 1–4 批重合，建议合并推进。
- **交付差距整改已启动（2026-09-02 五续，解密后）**：◆ P0 中 **G16 / G12 / G5 / G6 已落地**——`fieldValue` 区分「键缺失回退 default」与「键为空串可清空」；新增 `collectSchemaFields(schema, data?)` 完整字段清单（含表格派生 `列key_行号` 与嵌套 Grid 字段）；新增 `parseTolerantFormSchemaV2` 容错解析（JSON/结构/校验 error 均不抛错，返回 `{schema,issues,ok}`，严格 `parseFormSchemaV2` 行为不变）；`normalizeNode` 未知类型放行 + `scanNode` 新增 `UNKNOWN_NODE_TYPE` 校验（严格解析仍抛错、容错解析收集后渲染端按未知类型跳过降级）。**G8 亦已落地（九续）**：公共入口 `FormRenderer`（props `schema/data/mode/options`、`v-model:data` + `@field-change`、桥接 `provide("formFill")`）+ 独立 `preview.html`/`src/preview/main.ts`（消费页演示：JSON→`parseTolerantFormSchemaV2`→`<FormRenderer>`）+ `vite.config.ts` 多页入口 + 内核 `bare` 无外壳 + `FormRenderer.test.ts` 5 例。全量 vitest **170/170**、vue-tsc 干净。**G15 ✅ 已落地（2026-09-02 九续）**：内核 `GridSchemaNode` 移除 `inject("formFill")`，改为 `emit("field-change")`；`GridFormRenderer` 同步 emits 并透传；`FormRenderer` 与 `DesignerApp` 均改为监听内核 `@field-change` 写回（不再 `provide`）。全量 170/170、vue-tsc 干净。当前 ◆ P0 已全部落地（G5/G6/G8/G11/G12/G15/G16）。详见 `delivery-scenario-gap.md` §5。

## 1. 最终目标

通过设计器 UI 实现云铝电气第二种工作票，而不是仅通过源码手写 Schema：

```text
空白 A4
  → UI 创建标题和 Grid
  → UI 配置 Grid 行列，并向格子放入 P 和 Table
  → 保存 Schema
  → 重新加载并继续编辑
  → 填入 data
  → 预览和打印
  → 与参考 HTML/图片对比
```

任一环节需要修改源码或手写 JSON，都不能视为设计器能力完成。

## 2. 当前状态

### 2.1 当前聚焦与缺口（P11 阶段）

主线已从「P10 前五行闭环」切换到 **P11 完整工作票**。P0–P10 的实现状态见 §0.2「任务节点状态」；各阶段原始验收门槛见 §13–§16。

| 关注点 | 状态 |
|---|---|
| 完整工作票 full 样例结构对齐 | ✅ P11-1：1 外层 `all` Grid + 7 段 `inner` 嵌套 Grid，段间仅单线 |
| 整票 A4 打印与参考图一致 | ✅ P11-3：用户真机核验正常 |
| 打印方向选择 | ✅ 已去除，方向由纸张尺寸派生（A4 纵向 / A3 横向） |
| Table 边框配置 | ✅ `border: all/outer/inner/none`，单边绘制不与外层 Grid 重复 |
| 完整票快照基线 | ⏳ P11-2（可选；现有 `YunlvSecondTicketFull.test.ts` 已做结构校验） |
| 推迟项（P9.1c 专用控件、P9.2、P12 清理） | ⏳ P11-4，按用户优先级并入（P7.2e 完整编辑 UI 经用户澄清=设计器人工编排整票模板，已完成；P7.2d/P7.2f/P9.1d 已完成） |

历史状态快照（2026-08-27/28 代码核对）与早期能力清单已移至 [archive/status-history.md](./archive/status-history.md)。

### 2.2 第一版 MVP 范围与里程碑

目标：以「快速迭代出第一版」为准，把前五行闭环（P10）裁剪为**最小可交付闭环**，将非必需项推迟，缩短关键路径。本小节是对 P0–P12 的**范围覆盖**，不改动各阶段本身的完成门槛；被推迟项仍按原阶段在 MVP 之后排期。

**第一版 MVP 定义（最小闭环）**

> 从空白 A4 页面通过 UI 构建云铝工作票前五行 → 保存并重新加载 → 填写测试数据 → 预览/打印与参考图对比一致；全程不修改源码或手写 JSON，节点 ID 稳定，数据正确回写。

满足该闭环即视为第一版成立，可作为对外演示 / 内部验收基线。

**第一版必须包含（关键路径）**

- **P2.3 ID 稳定**：保存/加载后保留原 ID，DOM `data-node-id` 与 Schema ID 一致。
- **P8 保存/加载（基础）**：V2 Schema 序列化为 JSON、导出/导入或 localStorage、加载后重建 `nodeIndex`、基础撤销（可先不做满 20 步）。
- **P6.2 列宽 `mm/fr/auto` + colspan、P6.3 拖拽投放与格子内排序**：使五行可纯 UI 构建。
- **P7 子集**：竖排、字号/字重/对齐、Table 列编辑（表头/列宽/行模板）。
- **P4.2 子集**：`box-sizing` 统一、fixed Page 可用区域计算（渲染层 `track()` 已支持 `mm/fr/auto`，重点在设计器侧暴露列宽）。
- **P9 子集**：data 绑定与回写、预览/打印 `@page` A4、溢出提示。
- **P10**：由非实现者按已对齐的验收清单 + [前五行字段/边框规格表](./acceptance-row-spec.md) 独立验收。
- **P4.5（尽早）**：前五行 DOM 结构快照 / 8mm·40mm 尺寸 / 长文本撑高测试，锁住视觉基线。

**第一版明确推迟（不在 MVP 范围）**

- 深撤销栈（≥20 步之外的历史 / 多分支）、版本迁移兼容。
- HTML / Image 富编辑（模板库、sanitize 报告增强）〔推迟〕；其基础版（Shadow DOM 隔离 + 固定 DOMPurify 清洗 + `{{field}}` 绑定、Image URL/base64）已前移为第一版 MVP，见 P7.3/P7.4。
- 填写权限 / 字段级校验规则（P9.2 之外）。
- 完整工作票其余区块（计划工作时间、工作条件、注意事项、签发，P11）与多页 / 大模板渲染性能（P12）。
- 跨浏览器打印引擎兜底（Safari / Firefox / 系统打印）：第一版以 Chrome / Edge 为验收目标引擎并注明即可，PDF 导出兜底延后。

**里程碑（建议节奏）**

- **M1**：P2.3 + P8 基础保存/加载打通——能在设计器内存下前五行并原样加载。
- **M2**：P6.2 / P6.3 + P7 子集——前五行可纯 UI 构建（含竖排、表格列）。
- **M3**：P4.2 子集 + P9 子集——填值并预览/打印与参考图一致。
- **M4**：P4.5 快照基线 + P10 独立验收通过 → 第一版基线锁定。

> **里程碑状态（2026-08-31）**：M1–M4 **均已达成**（P10 八项验收指标全部通过），第一版 MVP 基线锁定；后续主线为 P11 完整工作票与 P11-4 推迟项。

## 3. 已锁定决策

| 领域 | 决策 |
|---|---|
| 导出格式 | 嵌套 Schema，直接表达 pages/grid/rows/cells/children |
| 节点身份 | Page、Grid 和实际组件使用稳定组件 ID；GridRow/GridCell/TableCellTemplate 仅使用内部布局引用 ID |
| 编辑器查询 | 从嵌套树派生 `id → node/parent/path` 索引 |
| 静态布局 | Grid，禁止绝对定位 |
| 固定文字 / 字段 | 固定文字用独立 `text` 节点（不再用 P 的 static mode）；字段用 `p`（field mode） |
| 明细 | Table + rowTemplate |
| 高级扩展 | 受控 HTML |
| 图片 | 保留 Image |
| 尺寸 | mm + baseRowHeight 整数倍 |
| 页面 | 工作票使用 fixed，显式 pages[] |
| 验收 | UI 构建、保存加载、填值打印完整闭环 |


> P0–P8（原 §4–§12）的详细阶段规格已存档至 [archive/phase-specs-p0-p8.md](./archive/phase-specs-p0-p8.md)，以下从 P9 继续。

## 13. 阶段 P9：填写、权限和打印

> 经代码核对（2026-08-27）：`GridSchemaNode.vue` 已为 field P 渲染 `contenteditable` 编辑区并带 `data-field`，但**尚无“从 data 初始化填值”与“输入回写 data”**；打印侧已有多处 `@media print` 隐藏设计器 UI，但无独立 Preview、无 A3/A4 `@page`、无溢出提示；权限侧仅有工具栏按钮 `disabled`，无字段级 readonly/hidden/required 机制。下方按 MVP / 推迟 拆分。

### P9.1 数据

- [x] **P9.1a 从 data 初始化填值**〔MVP〕：预览态传入 `data` 后，field P / Image / HTML `{{field}}` 显示 `data[field]`（与渲染层同 in-place 模型）。DoD：预览态载入 `src/dev/demoData.ts`，所有 field 显示对应值（覆盖 P10 步骤 1–8 构建后进入填值的前提）。注：设计态 contenteditable 编辑的是 Schema 节点文本，预览态只读展示 data，二者分离。
- [x] **P9.1b 输入事件回写 data**〔MVP〕：field P 的 `contenteditable` 输入经事件更新 `data[field]`；Table 行内 field 回写对应数组项。DoD：编辑后 `data[field]` 实时更新，保存并重加载值不变。（覆盖 P10 步骤 9、指标“数据回写正确”）
- [ ] **P9.1c number/date/signature 内部控件**〔推迟，2026-09-01 用户确认继续延后〕：第一版前五行均为文本/数字文本，用 contenteditable 文本即可；日期选择器、签名板等专用控件后续补。
- [x] **P9.1d 表格按 data 动态行数**〔已完成 2026-09-01，与 P7.2d 合并〕：**不是 schema 属性，而是渲染期按 data 推导**——行数 = `max(minRows, data 中实际出现过的最大行号)`。行模板字段用 `{row}` 占位符（如 `工作内容_{row}_1`）；若 data 含 `工作内容_5_2`，说明曾录入第 5 行，即使 `minRows = 4` 也补渲染第 5 行，保证 data 能被完整看到，中间未填的行留空。实现见 `src/types/schema-v2-table-rows.ts`（`resolveTableRowCount` / `collectFieldKeys` / `bindRowPlaceholder`）；**原 `TableNodeV2.repeatable` 布尔属性已移除**。注：此为**数据驱动**（行数由 data 决定），不含交互式「增删行」按钮。

### P9.2 权限〔整体推迟，见 §2.2 MVP 范围〕

- [ ] **P9.2a readonly**（字段级）：推迟
- [ ] **P9.2b hidden 且默认保留固定空间**：推迟
- [ ] **P9.2c required 标记和提交校验**：推迟
- [ ] **P9.2d HTML 权限边界**：推迟（开发者专用 + 无 JS，无字段级权限需求；sanitizer 已固定为引擎级策略，见 engine.md §11）

### P9.3 打印

- [x] **P9.3a A3/A4 `@page`**〔MVP〕：CSS `@page { size: A4; margin: 0 }` 已加入打印样式，默认 A4，A3 可配置。DoD：打印预览纸张尺寸 = A4，无边距漂移。
- [x] **P9.3b 打印隐藏设计器 UI**〔MVP，已有基础〕：核对骨架、状态栏、选区高亮、设计器工具层在 `@media print` 下全部隐藏，仅保留业务 DOM。
- [x] **P9.3c 独立 Preview（复用 Preview DOM）**〔MVP〕：新增预览态切换，渲染同打印 DOM，不进入打印即可核对位置/尺寸。DoD：预览所见 ≈ 打印所得。
- [x] **P9.3d 不改变业务尺寸（共用 DOM，仅隐藏辅助 UI）**〔MVP〕：与 P9.3b 共用同一份 DOM，禁止打印态重新布局/缩放。DoD：设计态与打印态业务坐标一致。（覆盖完成门槛“打印与设计态位置一致”）
- [x] **P9.3e fixed Page 溢出提示**〔MVP，依赖 P3 校验器 + P4.2 fixed Page 可用区〕：内容超出可用区时 P3 `PAPER_OVERFLOW` 警告在节点检查面板定位到节点。DoD：构造超长文本触发警告并定位到节点。
- [x] **P9.3f 打印预览验证**〔MVP·人工，已于 2026-08-31 通过〕：用户真机核验 A4 前五行与**整票**打印均正常、尺寸与段线与参考图一致（覆盖「A4 尺寸误差 ≤0.5mm」口径）。目标引擎为 Chrome/Edge（见 §2.2）；Safari / Firefox / 系统打印与 PDF 导出兜底仍按 §2.2 推迟。

**完成门槛**：填写单位、负责人、班组和四行工作任务后，data 正确；打印与设计态位置一致。

## 14. 阶段 P10：前五行闭环验收

由非实现者按以下步骤验收。本清单为前五行闭环的**唯一权威验收步骤**；
[design.md](./design.md) §14 给出架构判定基线，[design-biz.md](./design-biz.md) §13 给出面向测试人员的同步骤细化，
二者以本清单为准，不得另立步骤或编号。

验收步骤：

1. 新建 A4 fixed 模板，基础行高设为 8mm。
2. 创建标题（static P）。
3. 创建外层 Grid，并设置 all 边框；按下表配置五个内部行（序号 1–5）的行列数、字段与边框：
   [前五行字段/边框规格表](./acceptance-row-spec.md)
4. 将工作任务行（规格表序号 5）设为 5 倍最小行高。
5. 配置全部 static/field P：字段清单见 [规格表](./acceptance-row-spec.md) 序号 0–5（含标题、各基本信息行输入格、工作任务内嵌表列）；工作任务左格的“工作任务”标签使用竖排 static P。
6. 在工作任务右格创建两列表格（规格表序号 5）：表头 1、行高 1、minRows 4。
7. 保存并关闭模板。
8. 重新加载模板，并修改任意列宽和标签，确认结构与样式保持正确。
9. 填写测试数据。
10. 打印并与参考 HTML/图片比较。

验收指标：

- [ ] 不修改源码或 JSON
- [ ] 无结构 error
- [ ] 无意外溢出
- [ ] 行高和边框稳定（工作任务行高度等于 5 个基础行高）
- [ ] 所有节点可再次选中、移动和配置
- [x] 数据回写正确
- [ ] 打印尺寸误差不超过 0.5mm
- [ ] 主要结构与参考图一致（不含左侧“工作任务”竖排、右侧表格表头与 4 行输入格）

实现侧 harness（`src/components/renderer-v2/__tests__/P10Acceptance.test.ts`，11 例）已自动化覆盖「无结构 error」「所有节点可再次选中、移动和配置（跨格移动组件 + 上移行 + 改行高/列宽/表格 minRows 后重建索引仍可定位）」「无 CONTENT_OVERFLOW / PAPER_OVERFLOW」「行高和边框稳定（40mm + all 边框 + cell 不内联 border）」「数据回写正确（含内嵌表逐行键）」「修改后保持正确」，验收时只需人工核验浏览器视觉与打印尺寸（指标 #7、#8）。

至此 P10 验收指标中**可自动化**的部分已全部覆盖；指标 #7（打印尺寸误差 ≤ 0.5mm）与 #8（主要结构与参考图一致）依赖真实浏览器与打印，无法在本环境自动化，须由非实现者人工核验 —— 这也是 §14「前五行闭环未通过前不扩展完整表单」闸门放行 P11 的唯一前置条件。

表格行模板字段名由渲染期按「列key_行号」自动派生（列 `工作地点` 第 r 行即 `工作地点_r`），行模板内字段留空、不写死；填写态按行独立回写，表格内字段不可单独选中/配置；详见 `src/types/schema-v2-table-rows.ts` 与 [archive/phase-specs-p0-p8.md](./archive/phase-specs-p0-p8.md) §11 P7.2e。

前五行闭环未通过前，不扩展完整表单。

## 15. 阶段 P11：完整工作票

- [ ] 计划工作时间
- [ ] 工作条件多行区
- [ ] 注意事项和安全措施
- [ ] 签发人和签发日期
- [ ] 补充安全措施
- [ ] 负责人/许可人确认
- [ ] 工作班成员签名
- [ ] 工作票延期
- [ ] 工作票终结
- [ ] 备注
- [ ] 多页 fixed Page 方案
- [ ] 完整字段清单
- [ ] 与参考图片截图对比

**完成门槛**：完整表单同样通过 UI 构建、保存加载、填值打印闭环，不能通过 HTML 整体替代。

## 16. 阶段 P12：迁移和清理

- [x] 移除旧流式 Renderer 和硬编码旧 Schema（旧 `src/engine` 及 `src/dev` 旧渲染器副本已于 十八续/前期删除，`vue-tsc`/`vitest` 全量纳入）
- [x] 清理所有旧实现残留（D1 死代码 `useTextarea`/`inputElType` 已于 八续/九续 删除；D2 打印责任分散、D3 设计态打印样式属设计层/随 A5，见架构分层审查；详见 execution-log 廿四续）
- [x] 清理 `src/dev` 旧渲染器副本：已删除 `src/dev/GridSchemaNode.vue`、`src/dev/GridSchemaRenderer.vue`（dev 测试 `GridSchemaNode.test.ts` / `GridSchemaHeight.test.ts` 已改指向 `src/components/renderer-v2`）；`demoData.ts` 仍被 DesignerApp 使用，保留；`yunlv-second-ticket-*.ts` 样例 schema 暂留 dev 目录。
- [ ] 更新组件开发文档和示例
- [ ] 补充性能和大模板测试

## 17. 风险控制

| 风险 | 控制 |
|---|---|
| Schema 嵌套修改复杂 | 统一节点索引和结构操作纯函数 |
| ID 索引引用过期 | Schema 结构变化后重建/增量更新索引 |
| 行高语义 | 使用 min-height；Table 内容可撑开父 GridRow，溢出检测另行提示 |
| 嵌套边框变粗 | 单边归属规则 + 截图测试〔已解决 2026-08-29：见 P4.3，像素级核验待 P9.3f 人工〕 |
| Table 模板与数据行混淆 | rowTemplate 和运行时 rows 分离 |
| HTML 破坏安全和布局 | sanitizer、scope、Cell overflow |
| 设计态与打印态漂移 | 共用 DOM，只隐藏辅助 UI |
| 只会手写 Schema、UI 不可构造 | P10 独立闭环验收 |
| 旧代码残留 | V2 闭环后删除旧 Renderer、旧类型和旧入口 |
| 开发范围过大 | 前五行闭环通过前禁止扩展完整表单 |
| 浏览器打印引擎差异 | 0.5mm 尺寸门槛在 Chrome/Edge 之外（Safari/Firefox/系统打印）未必成立；验收需注明目标引擎，必要时提供 PDF 导出兜底 |
| 大模板/多页渲染性能 | 多页 fixed Page 与深层嵌套 Grid 递归渲染在大模板下可能卡顿；P12 才补性能测试，建议在 P9/P11 阶段做一次中等规模压测 |

## 18. 当前执行顺序

严格按以下顺序推进：

1. P0：删除旧入口，恢复全量类型检查和测试。
2. P1～P3：正式 Schema、节点索引、结构操作和校验。
3. P4：正式 Renderer，保持前五行视觉基线。
4. P5～P7：完成从空白页构建前五行所需的最小 UI。
5. P8～P9：保存加载、填写和打印。
6. P10：独立验收前五行闭环。
7. P11：通过同一设计器扩展完整工作票。
8. P12：清理旧实现和临时原型。

任何阶段不得用“直接修改示例 Schema”替代该阶段要求的设计器能力。

