# 开发计划

> 本计划配套 [design.md](./design.md)、[design-biz.md](./design-biz.md) 和 [engine.md](./engine.md)。
> 当前唯一主线是嵌套 Grid Schema V2；旧流式实现只作为迁移参考，最终需要移除。

## 0. 概览（执行追踪）

> 本节点随**每次执行前后**更新：记录当前任务节点状态、已知缺口与最近执行。
> 最后更新：**2026-08-31（P11-3：打印去掉方向选择改为由纸张尺寸派生（A4→纵向、A3→横向）；Table 组件新增边框配置 all/outer/inner/none（与 Grid 对齐）；+4 例 TableBorder 验收，vitest 124/124；用户真机 A4 整票打印已确认正常）**。

### 0.1 当前主线位置

- 主线仍是 **P10「前五行闭环验收」**。P0–P9 功能已基本闭环；P10 由非实现者按验收清单核验（独立验收侧工作）。本轮已**完成 P10 收尾对齐**：规范样例从「4 个并排 `all` 边框 Grid」重构为「1 外层 Grid + 5 内部行」，消除区块接缝 **2px 双边框**并贴合 `acceptance-row-spec.md`，同步更新全部耦合测试。
- **本轮（2026-08-30 续）执行 P10 收尾对齐（已完成）**：
  1. `makeYunlvSecondTicketFirstFiveRowsSchema` 改为 1-Grid（标题独立无边框 Grid + 外层 `ticket-layout` 5 行；行 2/3/4 合并 colspan=4，行 5 左竖排标签 + 右内嵌 Table 合并 colspan=3）。删除冗余 `buildFirstFiveRowsAcceptanceV2`。
  2. 同步更新 7 个耦合测试：FirstFiveRowsSnapshot / GridSchemaNode（dev）/ GridFormRenderer / schema-v2（ancestors + 四 Grid 断言）/ schema-v2-operations（样例依赖 ops）/ DesignerApp（设计器交互）/ P10Acceptance（A 套改 1-Grid id，删 B 套）。
  3. **未对齐**：完整版样例 `yunlv-second-ticket-full.ts` 仍为 4-Grid 结构，且未被任何测试引用——属「完整工作票」范畴（P11），按用户「非重要功能保持推迟」约定不纳入本轮。

- **本轮（2026-08-30 再续）修复 P10 指标「数据回写正确」在表格 cell 上的缺口**：
  1. 根因：Table 的 `rowTemplate` 是单套模板，`minRows` 生成的 4 行复用同一 `field`，导致工作任务内嵌表 4 行共用一个数据键，与 `demoData` 的 8 个逐行键（`工作任务_1_1`…`工作任务_4_2`）不匹配，步骤 9「在表格 cell 填值」与指标「键与 demoData 一致无错位」不成立。
  2. 修复：渲染层 `GridSchemaNode.vue` 新增 `withRowIndex(node, rowIndex)`，tbody 每行实例化模板时把后代 `field` 中的 `{row}` 占位符替换为 1-based 行号；规范样例改为 `工作任务_{row}_1` / `工作任务_{row}_2`；设计器 P 节点字段名下方对「位于表格行模板内」的节点显示 `{row}` 用法提示。
  3. 验证：新增 5 例（P10 harness 4 例：逐行 field 与 demoData 键一致 / 按行独立回写 / 无 CONTENT_OVERFLOW·PAPER_OVERFLOW / Grid all 边框且 cell 不内联 border；DesignerApp 1 例：仅行模板内 P 显示 `{row}` 提示）。`FirstFiveRowsSnapshot` 快照按预期更新（data-field 由固定键变逐行键）。

- **本轮（2026-08-30 三续）补完 P10 指标「所有节点可再次选中、移动和配置」**：
  1. 缺口：此前 harness 只覆盖该指标里的「可再次选中」（节点索引），**「移动」与「配置」未自动化**。
  2. 补齐：新增 1 例 —— 序列化落盘再解析（模拟「重新加载模板」）后，跨格移动组件（`moveNodeV2`）、上移工作任务行（`moveGridRowV2`）、改行高/列宽/表格 minRows，断言无结构 error、行序正确、重建索引后所有节点仍可定位，且配置生效（表格 6 行、工作任务行 48mm）。
  3. 结论：P10 八项验收指标中**可自动化**的部分已全部覆盖；#7「打印尺寸误差 ≤ 0.5mm」与 #8「主要结构与参考图一致」仍需真实浏览器人工核验 —— 这是 §14「前五行闭环未通过前不扩展完整表单」放行 P11 的唯一前置条件。

- **本轮（2026-08-30 四续）回头做推迟项：P6.3b 格内排序 / P6.3c 跨格移动**（P11 仍被 §14 闸门挡住，故选推迟项推进）：
  1. 依据：§11 P6.3 明示两者「可用删除+重插或**配置面板移动**替代」，仅 UI 拖拽推迟。
  2. **P6.3b**：新增 `moveNodeWithinParentV2(schema, nodeId, "up" | "down")`，在同一父容器（grid-cell / table-cell-template / page）的子节点列表中交换相邻两项；边界或父容器不支持时**返回原 schema 引用**（不产生无意义的撤销记录）。设计器 Inspector 新增「位置」小节上移 / 下移按钮，边界自动禁用。
  3. **P6.3c**：复用既有 `moveNodeV2`（禁止移入自身后代）+ 新增 `listDropTargetsV2(schema)` 列出全部投放点（带可读标签）；Inspector「位置」小节新增目标下拉 + 「移动到此格」按钮。
  4. 验证：+6 例（ops 3 例 / DesignerApp 3 例），vue-tsc 干净，vitest 全量 99/99。按约定未跑 vite build。

- **本轮（2026-08-30 五续）处理人工核验反馈（§0.2 人工核验反馈）**：
  1. **人工核验已通过项（用户反馈）**：拖拽模板组件到纸张并落入格子**功能正常**；**打印正常**（P10 指标 #7「打印尺寸误差 ≤ 0.5mm」人工侧确认通过）。P10 指标 #8「主要结构与参考图一致」仍待用户确认。
  2. **修复①：跨格移动会选中自身所在格** —— `moveNodeV2` 在目标为自身所在格时会「拆下再追加到同格末尾」，反复操作在原格堆积空位。现于两处拦截：`moveNodeV2` 直接原样返回 schema（无操作、不产生撤销记录）；`listDropTargetsV2(schema, moveNodeId?)` 新增可选参数，过滤掉**当前所在格**与**自身/自身后代容器**（后者 `moveNodeV2` 本就拒绝，列出来只会静默失败）。设计器传当前选中节点，切换选中时清空目标选择。
  3. **修复②：预览态仍可编辑** —— 原「预览/填充」是同一个模式且带数据可输入。现拆为三态：
     - `design` 设计态（可编辑结构、可添加组件）；
     - `preview` **预览态，只读**（带数据渲染，但不显示/不允许任何编辑：模板按钮 `disabled`、`addRootGrid` / `addNodeToSelectedCell` 增加守卫、渲染层 `readonly` 使字段 P 与复合字段输入区均无 `contenteditable`、`formFill` 不回写）；
     - `fill` 填充态（带数据且字段可输入，保留 P9.1b 数据回写验证能力）。
     渲染层 `GridFormRenderer` / `GridSchemaNode` 新增 `readonly` prop：`fillMode`（有 data）与 `canFill`（有 data 且非只读）分离，**设计态复合字段输入区仍可编辑的行为保持不变**（由快照回归守住）。
  4. 验证：+9 例（ops 2：目标过滤 / 自身格原样返回；DesignerApp 5：下拉不含自身格、预览禁用模板、预览下直接调添加函数也不改结构、填充态保留输入与回写、再点回到设计态；GridSchemaNode.fill 2：只读预览不回写、复合字段输入区只读）。vue-tsc 干净，vitest 全量 108/108。

- **本轮（2026-08-31 六续）处理更多人工核验反馈**：
  1. **确认项（用户反馈）**：保存 / 读取 / 导入导出功能正常。
  2. **修复 Grid `border="outer"` 仅外框仍画内边框**：原 P4.3 渲染规则把内部分隔线（非首行上边框 + 非首列左边框）施加到 `all` / `outer` / `inner` 全部类型，导致 `outer`（仅外框语义）的多行多列 Grid 仍出现内部线。修正为：内部线只由 `all` / `inner` 绘制，`outer` / `none` 不画——`outer` 至此真正只画外框（`all`=外框+内部线、`inner`=仅内部线、`none`=无）。规范样例 `ticket-layout` 本就用 `all`，渲染与快照均不变；加防回归测试断言 outer 映射为 `layout-grid--outer` 类。
  3. **隐藏「排列方向」配置**：text / p 分支 Inspector 里的 `writingMode`（横排/竖排）配置项已从面板移除（删除两处 label 与 `updateSelectedWritingMode` 处理函数）。渲染层仍按节点 `style.writingMode` 渲染，已设的竖排（如样例「工作任务」标签）不受影响；若日后需暴露该配置，恢复即可。
  4. 验证：+3 例（border 1：outer 映射 `layout-grid--outer` 类；DesignerApp 2：选中 text / 字段 P 时 Inspector 均不再含「排列方向」）。vue-tsc 干净，vitest 全量 111/111，快照零变动。

- **本轮（2026-08-31 七续）P10 #8 确认 + 字段组件控件化探讨**：
  1. **P10 #8 通过**：用户确认「主要结构与参考图基本一致」→ §14 闸门解除，P11（完整工作票 / full 样例 4-Grid 对齐）可开工。
  2. **设计态字段临时文本维持现状**：用户确认设计态下字段 P 的 contenteditable 输入属画布临时文本、不回写 schema，不改。
  3. **字段组件控件化方案（已落地，见八续）**：用户指出 contenteditable `<p>` 缺原生换行/预设多行能力、且希望字段可替换其他标签（input/textarea）；倾向方案获准「只要不影响渲染样式就开工」，已实现。

- **本轮（2026-08-31 八续）字段 P 控件化（设计/预览/打印态渲染不变）**：
  1. **需求**：表单用于「设计 → 打印 → 手写」，字段组件需原生换行、预设多行，且可替换其他标签。约束：设计/预览/打印的静态渲染样式不得改变。
  2. **实现**：`FieldPNodeV2` 新增 `default?: string`（data 为空时回退展示，支持 `\n` 多行）；填充态（`canFill`）非复合/复合字段渲染真实控件——多行（默认）`<textarea>`、单行（`multiline:false`）`<input>`，`:value` 绑 `fieldValue`、`@input` 回写；设计态保留 `contenteditable` 临时文本（不回写），预览/打印走静态 `pre-wrap` 文本（含 `default` 回退）。`readEditableText` 兼容控件 `.value`。
  3. **设计器**：p 节点 Inspector 新增「多行」勾选（`updateSelectedMultiline`）与「默认值（支持换行）」textarea（`updateSelectedDefault`）。
  4. **样式**：新增 `.layout-p__control`（继承字段字体、去边框/背景、flex 填充，与静态文本视觉一致）；显式 `multiline:true` 才给静态 `p` 预留多行手写高度（`.layout-p--multiline`），避免改变默认/快照布局。打印态仍走静态分支，不受填充控件影响。
  5. **验证**：+3 例（fill 控件回写 / 单行 input / default 回退 + 只读无控件）；`FirstFiveRowsSnapshot` 与 P10 验收同步改为读取控件 `.value`，快照零变动。`vue-tsc` 干净；`vitest` 全量 **114/114** 通过（111 + 3），无回归。

- **本轮（2026-08-31 九续）允许把 Grid 拖进 cell（设计器补「Grid 嵌套」入口）**：
  1. **背景**：架构探讨（七续延伸）已确认 cell 需分行列、Grid 允许嵌套——引擎层（类型 `GridCellV2.children: FormNodeV2[]` 含 Grid、渲染递归、节点索引 `buildEditorNodeIndexV2`、校验 `scanNode`、移动/选择 `moveNodeV2`）**早已全链路支持 Grid-in-cell**，唯一缺口是设计器 UI 缺「把 Grid 放进 cell」的入口（此前 Grid 仅能经 `addRootGrid` 加到页面根）。
  2. **实现**：`DesignerApp.vue` 三处 `kind` 联合类型由 `"text"|"field"|"table"|"html"|"image"` 扩为含 `"grid"`——`createNodeByKind`（新增 `kind==="grid" ? createGridNodeV2()` 分支）、`addNodeToSelectedCell`（复用 `appendNodeToCellV2`）、`startPaletteDrag`（支持拖拽落格）；`onCanvasDrop` 的 `kind` 强转类型同步补 `"grid"`。新增 `addGrid()`：选中某 cell（`insertionSlot` 存在）时把 Grid 嵌进该 cell，否则退化为 `addRootGrid`（保留旧「添加 Grid」根追加行为）。模板「添加 Grid」按钮改为 `draggable` + 点击走 `addGrid`，与基础组件一致。
  3. **设计取舍**：不合并 grid/cell 类型（保持 cell 非可选脚手架 + Grid 容器，嵌套即递归），以保留 P6.2c 共享列轨对齐与已简化的 row/cell 概念（七续结论）。
  4. **验证**：+2 例（DesignerApp：选中字段后点「添加 Grid」→ 所属 cell 子节点含 grid 且渲染出嵌套 Grid、结构校验无 INVALID_GRID_ROWS；预览态点击被禁用且不改结构）。`vue-tsc` 干净；`vitest` 全量 **116/116** 通过（114 + 2），无回归，快照零变动。

- **本轮（2026-08-31 十续）P11-3 真机核验通过 + 打印方向派生 + Table 边框配置**：
  1. **真机核验通过（用户反馈）**：A4 整票打印尺寸与段线与参考图一致 —— P11-3 整票打印核验通过。
  2. **打印去掉方向选择（方向由纸张尺寸派生）**：删除独立 `orientation` 选择——`GridFormRenderer.vue` 的 `paperSize` 改 `A4→纵向(210×297)` / `A3→横向(420×297)`，`schema-v2-validation.ts` 的 `pageUsableHeightMm` 同步按尺寸推方向；`DesignerApp.vue` 删除 `updatePaperOrientation`，纸张 select 选项改为「A4（纵向）」/「A3（横向）」。
  3. **Table 组件新增边框配置（与 Grid 对齐）**：`TableNodeV2` 加 `border?: BorderModeV2`（默认 `all`）；`schema-v2-operations.ts` 新增 `updateTableBorderV2` + `createTableNodeV2` 默认 `border:"all"`；`GridSchemaNode.vue` 表格 class 改为 `layout-table--${node.border ?? 'all'}`，边框 CSS 重写（外框仅 `all`/`outer`、内部行列线仅 `all`/`inner`，机制与 Grid 同，单边绘制避免与外层 Grid 重复）；设计器 Table 检查器新增「边框」select（`updateTableBorder` + import `updateTableBorderV2`）。
  4. **验证**：新建 `TableBorder.test.ts`（+4 例：未设→`layout-table--all`、none、inner、outer）；`FirstFiveRowsSnapshot` 因表格新增 `layout-table--all` 类而更新（即新功能生效，非回归）。`vue-tsc` 干净；`vitest` 全量 **124/124** 通过（120 + 4），无回归。

### 0.2 任务节点状态（2026-08-31 六续执行后）

- **已完成（文档勾选）**：P0 ~ P9 全部；P4.5 快照、P5 节点树；P6.2b 单元格 padding/对齐（方向 1）；P4.3 边框单边归属；**P6.2c colspan（共享列轨）**；**P6.2d 合并/拆分相邻格**；**P6.3b 格内排序（配置面板版）**；**P6.3c 跨格移动（配置面板版）**；**P10 收尾 = 规范样例 4-Grid → 1-Grid 对齐（消除接缝 2px 双边框）**；**P7.2e 子集 = 表格行模板逐行字段绑定 `{row}`**；**P10 实现侧 harness（11 例，覆盖全部可自动化验收指标）**。
- **已完成（本轮新增，非文档勾选节点）**：**P6.3c 目标过滤**（`listDropTargetsV2(schema, moveNodeId?)` 跳过自身所在格与自身后代容器；`moveNodeV2` 遇自身所在格原样返回）；**预览态只读**（三态 `design` / `preview` / `fill` + 渲染层 `readonly`）；**Grid `border="outer"` 仅外框**（内部线只由 `all`/`inner` 绘制）；**隐藏 text/p 的「排列方向」(writingMode) 配置**；**字段 P 控件化（八续）**：填充态用真实 `textarea`/`input` 替换 contenteditable `<p>`，新增 `default` 预设值与「多行」开关，设计/预览/打印静态渲染不变；**允许把 Grid 拖进 cell（九续）**：`createNodeByKind`/`addNodeToSelectedCell`/`startPaletteDrag` 的 `kind` 扩为含 `"grid"`，「添加 Grid」按钮改为可拖拽 + 点击把 Grid 嵌进选中格（无选中格则退化为根追加）；**P11-1 full 样例 1-Grid 对齐**：`yunlv-second-ticket-full.ts` 由 8 个并排 `all` 网格重构为「1 外层 `ticket-layout`(`all`,`columns:["1fr"]`) + 标题行 + 7 段行（每段单行单格嵌一段 `inner` 网格，沿用原各段行数组，段行高=该段内部行高之和）」，`reloadSample()` 直接受益，消除段间 2px 双边框；**P11-3 打印方向派生 + Table 边框配置（十续）**：删除独立 `orientation` 选择（纸张尺寸派生：A4→纵向、A3→横向，`GridFormRenderer`/`schema-v2-validation`/`DesignerApp` 三处同步）；`TableNodeV2` 新增 `border?: BorderModeV2`（默认 `all`）、`updateTableBorderV2`、渲染层 `layout-table--{mode}` 单边绘制（外框仅 all/outer、内部线仅 all/inner，与 Grid 同机制）、设计器 Table 检查器加「边框」select。
- **本轮落地**：人工核验反馈修复 —— ①跨格移动跳过自身所在格；②预览态禁止添加组件与字段输入（五续）；③`outer` 仅外框不画内线 + 隐藏「排列方向」配置（六续，见 §0.1 六续）。
- **人工核验反馈（2026-08-30，用户侧）**：
  - ✅ 拖拽模板组件到纸张、落入指定格子 —— 功能正常；
  - ✅ 打印 —— 正常（P10 指标 #7「打印尺寸误差 ≤ 0.5mm」人工侧通过）；
  - ✅ P10 指标 #8「主要结构与参考图一致」 —— 2026-08-31 用户确认通过（与参考图基本一致）。
  - ✅ P11-3 A4 整票打印核验 —— 2026-08-31 用户确认「正常」（尺寸与段线与参考图一致）；同期完成打印方向由尺寸派生 + Table 边框配置。
- **推迟（按 §2.2，未做，本次继续维持）**：P6.3b/c 的**拖拽**交互形式（功能已用配置面板交付，仅拖拽不做）、P7.2d repeatable、P7.2e 剩余（模板内子组件的完整编辑 UI）、P7.2f、P9.1c/d、P9.2 全部、P12 清理。（P11 完整工作票已随 #8 确认解除 §14 闸门，转「可开工」，见下。）
- **P11 已解除 §14 闸门（2026-08-31）**：P10 八项指标 #7（打印）与 #8（结构一致）均经用户人工确认通过 → **完整工作票（含 full 样例 4-Grid 对齐）可开工**。
- **P11 排期（2026-08-31 起，九续后；用户指令「继续排 P11」）**：完整工作票对齐为「1 外层 Grid(`all`) + 各段以嵌套 Grid(`inner`) 放入 cell」，复用九续刚落地的 Grid-in-cell 能力，消除段间 2px 双边框（与首五行对齐同源）。拆分如下，当前先执行 **P11-1**：
  1. **P11-1 full 样例 1-Grid 对齐**：重写 `yunlv-second-ticket-full.ts`——外层 `ticket-layout`(`all`,`columns:["1fr"]`) 含「标题行 + 8 段行」；每段行单行单格嵌一段 `inner` 网格（沿用原 `basicInfoRows`/`workTaskRows`/`safetyRows`/`confirmRows`/`extensionRows`/`completionRows`/`remarkRows` 行数组，边框由 `all`→`inner`）；段行高 = 该段内部行高之和，总高与原 8×`all` 版本一致。`reloadSample()` 当前即载此样例，直接受益。
  2. **P11-2 full 样例验收/快照**：新增 `YunlvSecondTicketFull.test.ts`（`validateFormSchemaV2` 无 error、全部字段节点可索引、渲染出嵌套 Grid、段间仅单线）；可选对完整票出 `toMatchSnapshot` 基线。
  3. **P11-3 真实打印/浏览器核验 + 打印方向派生 + Table 边框配置（✅ 已完成，2026-08-31 十续）**：① 用户真机核验 A4 整票打印尺寸与段线正常；② 打印去掉独立方向选择，方向由纸张尺寸派生（A4→纵向、A3→横向）；③ Table 组件新增边框配置 all/outer/inner/none（与 Grid 对齐，单边绘制不重复外框）。
  4. **P11-4 推迟项并入**（按用户优先级）：P7.2d repeatable、P7.2e 完整编辑 UI、P7.2f、P9.1c/d、P9.2、P9.3f 人工、P6.3b/c 拖拽形式、P12 清理。
- **源码**：位于 `E:\Project\ssh\TicketDesigner`（有 git，改动未提交）。

### 0.3 已知缺口 / 风险

- **嵌套边框变粗**：已解决（P4.3 单边归属规则，见 §17）。
- **colspan 后格线正确**：已解决（P6.2c 共享列轨，合并格跨任意列宽都能对齐；旧 fixture 无 `columns` 时回退逐格宽度）。
- **打印尺寸 0.5mm 门槛**：✅ 已由用户人工核验通过（2026-08-30，反馈「打印正常」）。
- **P10 放行 P11 的闸门（已解除，2026-08-31）**：§14「前五行闭环未通过前不扩展完整表单」八项指标中可自动化者已全覆盖；#7（打印）与 #8（结构一致）均经用户人工确认通过 → P11 完整工作票可开工。
- **设计态字段 P 仍 `contenteditable`（已知行为，未改）**：设计态（无 `data`）下字段 P 与其复合输入区允许就地输入，但**不回写 schema**（仅画布临时文本）。若用户认为这是「看起来能改、改了不生效」的陷阱，可后续统一为设计态只读。

### 0.4 最近执行记录

| 日期 | 节点 | 动作 | 结果 |
|---|---|---|---|
| 2026-08-28 | P6.2b | Grid 默认 + cell 仅覆盖 padding/对齐，cell 禁删 | vitest 72/72 通过，文档标完成 |
| 2026-08-29 | P4.3 | 边框单边归属（Grid 外框仅容器绘制 + 内部线非首行/列上/左；Table 自包含外框） | vitest 全量通过（含 2 例边界结构校验），vue-tsc 干净；§8/§17 已标注 |
| 2026-08-29 | P6.2c/P6.2d | 共享列轨 `columns` + `splitGridCellV2` + 设计器合并/拆分按钮 + 校验按列轨算有效宽度 | vitest 81/81 通过（+7 例：operations 5、colspan 渲染 1、Designer 合并/拆分 1），vue-tsc 干净 |
| 2026-08-30 | P10 实现侧 | 新增 `P10Acceptance.test.ts`（A 闭环 + B 1-Grid 构建证明，9 例）；定位 4-Grid 样例接缝 2px 双边框风险并补 `buildFirstFiveRowsAcceptanceV2` | vue-tsc 干净；vitest 全量 90/90 通过（原 81 + 新 9），无回归 |
| 2026-08-30 | P10 收尾对齐 | 规范样例 `makeYunlvSecondTicketFirstFiveRowsSchema` 重构为 1 外层 Grid + 5 行（删 `buildFirstFiveRowsAcceptanceV2`），同步 7 个耦合测试（含 DesignerApp） | vue-tsc 干净；vitest 全量 87/87 通过（harness 由 9 例收敛为 6 例），无回归 |
| 2026-08-30 | P7.2e 子集 / P10 指标 #6 | 内嵌表逐行字段绑定 `{row}`（渲染层 `withRowIndex` + 样例改 `工作任务_{row}_1/2` + 设计器提示），补 P10 harness 4 例与 DesignerApp 1 例 | vue-tsc 干净；vitest 全量 92/92 通过；`FirstFiveRowsSnapshot` 快照按预期更新（data-field 变逐行键） |
| 2026-08-30 | P10 指标「可再次选中/移动/配置」 | 新增加载后移动与配置 1 例（moveNodeV2 跨格 + moveGridRowV2 上移行 + 改行高/列宽/表格 minRows + 重建索引），harness 10→11 例 | vue-tsc 干净；vitest 全量 93/93 通过，无回归；P10 可自动化指标至此全覆盖 |
| 2026-08-30 | P6.3b / P6.3c | 回头做推迟项：`moveNodeWithinParentV2`（格内排序，边界返回原引用）+ `listDropTargetsV2`，Inspector「位置」小节上移/下移 + 目标下拉跨格移动（拖拽仍推迟） | vue-tsc 干净；vitest 全量 99/99 通过（+6 例：ops 3、DesignerApp 3），无回归 |
| 2026-08-30 | 人工核验反馈修复 | ①`moveNodeV2` 遇自身所在格原样返回 + `listDropTargetsV2(schema, moveNodeId?)` 过滤自身格/自身后代；②三态 `design`/`preview`(只读)/`fill` + 渲染层 `readonly` prop，预览态禁用模板按钮与字段输入 | vue-tsc 干净；vitest 全量 108/108 通过（+9 例：ops 2、DesignerApp 5、GridSchemaNode.fill 2），无回归；`FirstFiveRowsSnapshot` 快照未变动 |
| 2026-08-31 | 人工核验反馈修复（六续） | ①`Grid` `border="outer"` 仅外框不画内部线（移除 `.layout-grid--outer` 内部线规则，仅 `all`/`inner` 画内部线）；②隐藏 text/p 的「排列方向」(writingMode) 配置（删 `updateSelectedWritingMode` + 两处 Inspector label） | vue-tsc 干净；vitest 全量 111/111 通过（+3 例：border 1、DesignerApp 2），无回归；快照零变动 |
| 2026-08-31 | 字段 P 控件化（八续） | `FieldPNodeV2` 加 `default?`；填充态用真实 `textarea`(多行)/`input`(单行) 替换 contenteditable `<p>`，`:value` 绑 `fieldValue`+`@input` 回写；设计/预览/打印保持静态 `pre-wrap`（含 default 回退）；Inspector 加「多行」「默认值」；`.layout-p__control` 样式 | vue-tsc 干净；vitest 全量 **114/114** 通过（+3 例：fill 控件回写 / 单行 input / default 回退 + 只读无控件），`FirstFiveRowsSnapshot` 与 P10 验收同步读控件 `.value`，快照零变动 |
| 2026-08-31 | 允许把 Grid 拖进 cell（九续） | `createNodeByKind`/`addNodeToSelectedCell`/`startPaletteDrag` 的 `kind` 扩为含 `"grid"`（分支 `createGridNodeV2`）；`onCanvasDrop` 强转补 `"grid"`；新增 `addGrid()`（选中 cell 则嵌进该 cell，否则退化为 `addRootGrid`）；「添加 Grid」按钮改 `draggable` + 点击走 `addGrid` | vue-tsc 干净；vitest 全量 **116/116** 通过（+2 例：选中字段后点「添加 Grid」→ 所属 cell 子节点含 grid 且渲染嵌套 Grid、结构校验无 INVALID_GRID_ROWS；预览态禁用且不改结构），无回归，快照零变动 |
| 2026-08-31 | P11-1 full 样例 1-Grid 对齐 | `yunlv-second-ticket-full.ts` 由 8 个并排 `border:"all"` 段网格重构为「1 外层 `ticket-layout`(`all`,`columns:["1fr"]`) + 标题行 + 7 段行（每段单行单格嵌一段 `border:"inner"` 网格，沿用原 `basicInfoRows`/`workTaskRows`/`safetyRows`/`confirmRows`/`extensionRows`/`completionRows`/`remarkRows`，段行高=该段内部行高之和）」；外层行 id 用 `${gridId}-row` 与嵌套网格 id 区分避免 DUPLICATE_ID；新增 `YunlvSecondTicketFull.test.ts`（+4 例：校验无 error + 恰好 1 all/7 inner 网格、各段字段 data-field 全在、内嵌表逐行 `{row}` 渲染、段网格节点 id 可索引） | vue-tsc 干净；vitest 全量 **120/120** 通过（116 + 4），无回归；`reloadSample()`（设计器「载入样例」）即载此对齐后样例，段间不再 2px 双边框 |
| 2026-08-31 | P11-3 打印方向派生 + Table 边框配置（十续） | ① 删除独立 `orientation` 选择：方向由纸张尺寸派生（A4→纵向 210×297、A3→横向 420×297），`GridFormRenderer.paperSize`/`schema-v2-validation.pageUsableHeightMm`/`DesignerApp` 纸张 select 三处同步；② `TableNodeV2.border?: BorderModeV2`（默认 `all`）+ `updateTableBorderV2` + `createTableNodeV2` 默认 `all`；③ `GridSchemaNode.vue` 表格 class 改 `layout-table--${node.border ?? 'all'}`，边框 CSS 重写（外框仅 all/outer、内部线仅 all/inner，单边绘制不与外层 Grid 重复）；④ 设计器 Table 检查器加「边框」select（`updateTableBorder`）；⑤ 新建 `TableBorder.test.ts`（+4 例） | vue-tsc 干净；vitest 全量 **124/124** 通过（120 + 4），无回归；`FirstFiveRowsSnapshot` 因表格新增 `layout-table--all` 类而更新（功能生效非回归）；用户真机 A4 整票打印确认正常 |

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

### 已完成的历史基础能力

- [x] Vue 3 + TypeScript + Vite 工程
- [x] A3/A4、横向/纵向纸张画布
- [x] 早期 p/image/table Renderer
- [x] 早期 off-screen 测量和流式分页探索
- [x] 早期 Table 按行切分和表头重复探索
- [x] 三栏设计器、组件库、配置面板和状态栏
- [x] 基础预览、打印和字段相关代码

### 已完成的 V2 探索

- [x] 抽象 Grid/P/Table/HTML 原型节点
- [x] 手写云铝工作票前五行嵌套 Schema
- [x] 递归渲染前五行
- [x] 验证 8mm 基础行高
- [x] 验证工作任务 5 倍行高
- [x] 验证竖排标签、下划线、嵌套 Table 和 A4 画布
- [x] 修正 min-height + flex-grow 导致 Table 行被撑高的问题

### 当前缺口（代码核对 2026-08-27）

- [x] 原型类型已提升为正式 Schema V2
- [x] 已有通用节点索引和基础结构操作函数
- [x] Grid Renderer 已移入 `src/components/renderer-v2` 正式组件目录
- [x] 右侧配置面板（节点检查）已绑定 V2 节点：可编辑 Grid 行列/边框、P 固定文本/字段名/前后标签、Table 最小行数（见 `src/components/designer/DesignerApp.vue`）
- [x] 配置面板已覆盖 P7 关键属性：P 竖排（horizontal-tb/vertical-rl）、HTML/Image 源码编辑（html/css）、Image src/field/宽/高/objectFit；字号/字重/对齐/颜色/字体/竖排/不换行 的设计器 UI 已对 `p`（字段）与 `text`（固定文字）节点实现（`TextStyleV2`）；Table 列编辑（key/标题/宽度/对齐）已实现：右侧面板新增「列配置」，可新增/删除列并编辑标题/宽度/对齐，渲染层按列 align 对齐表头与单元格。
- [x] 用户可从空白页通过 UI 创建“完整前五行”：列宽 mm/fr/auto 已暴露到 Grid 属性面板（P6.2a）；组件库按钮插入已具备 P/Grid/Table/HTML/Image（P6.3a）；colspan 跨列合并与相邻格合并/拆分已完成（P6.2c/P6.2d）；格子内排序、跨格移动按 §2.2 推迟。
- [x] 保存、加载、撤销、重做、预览/填写已接入 V2（P8/P8.5/P9.1a/P9.1b/P9.3 已完成；P9.1b 回写经 provide/inject 接入预览填写运行时）
- [x] 旧测试、旧 Renderer 和旧依赖已清理

### 2.1 设计验证阶段聚焦：前五行闭环验收的前置缺口

当前主线是 P10“前五行闭环验收”（不写 JSON、保存加载、填值打印一致）。经代码核对（2026-08-27 初核，2026-08-28 刷新），验收所需的多数前置能力已补齐，P10 现可通过 UI 跑通（剩余为独立验收与人工浏览器验证）：

| 验收步骤（P10） | 依赖阶段 | 当前状态（2026-08-28） |
|---|---|---|
| 3. 创建外层 Grid 并配置行列 | P6.2 / P6.3 | 行列增删、行列数调整、边框模式、列宽 mm/fr/auto 已可做；**拖拽投放已做（第一期）**；colspan 跨列合并与相邻格合并/拆分已完成（P6.2c/P6.2d） |
| 5. 配置全部 static/field P | P7.1 | 文本/字段名/前后标签可编辑；**字号/字重/对齐/竖排/颜色/字体（`TextStyleV2`）已做**；固定文字已独立为 `text` 节点 |
| 6. 创建两列表格和四个数据行 | P7.2 | **列增删与编辑（key/标题/宽度/对齐）已做**；rowTemplate 内子组件编辑仍按 §2.2 推迟 |
| 7-8. 保存并关闭 / 重新加载修改 | P8 | 序列化/反序列化已接入 UI 与 localStorage；加载重建 nodeIndex、保存前校验、撤销栈（≥20 步）均已完成 |
| 9. 填写测试数据 | P9.1 | P9.1a 初始化填值 + P9.1b 输入回写已做（data 绑定与回写经 provide/inject 接入预览态） |
| 10. 打印并对比 | P9.3 | A3/A4 `@page`、独立 Preview、溢出提示、共用 DOM 隐藏辅助 UI 均已做；Chrome/Edge 打印尺寸人工验证待做 |

此外，此前标注为“依赖未闭环”的门槛项现已闭环：

- **P2.3 ID 策略**：`保存加载后保留原 ID`、`DOM data-node-id 与 Schema ID 一致` 均已勾（序列化往返保留全部 ID，Renderer 写入 `node.id`）。
- **P4.2 尺寸系统**：`mm/fr/auto 列轨道`、`box-sizing 统一`、`固定字体行高`、`fixed Page 可用区域计算` 均已勾。
- **P3 溢出警告**：已支持固定 mm 列宽估算；fr/auto 弹性列下该警告仍不可靠（已注明，不影响 P10 验收）。

**建议推进顺序（更新）**：P2.3/P4.2/P3 闭环 → P6.2/P6.3 列宽与拖拽投放（已完成） → P7 属性编辑（已完成） → P8/P9 保存加载填值打印（已完成） → **P4.5 快照基线（已完成）** → P10 独立验收。

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

## 4. 阶段 P0：基线修复与原型隔离

**目标**：清理旧入口，确保设计器只有 V2 状态和 V2 Renderer。

- [x] P0.1 删除 DesignerApp 对旧 Toolbar/CanvasPane/ConfigPanel 的依赖
- [x] P0.2 确认 `vue-tsc --noEmit` 全量通过
- [x] P0.3 确认 V2 vitest 全量通过
- [x] P0.4 删除旧默认 mock 和旧流式 Renderer 入口
- [x] P0.5 保留前五行截图作为视觉基线
- [x] P0.6 为前五行 Schema 增加最小渲染测试

**完成门槛**：

- 页面只有 V2 状态。
- 页面中不存在旧 Toolbar、旧 ConfigPanel 或旧 FormRenderer 混合交互。
- 类型检查和测试通过。

## 5. 阶段 P1：Schema V2 正式契约

**目标**：将 dev 类型提升为可保存、可校验、可迁移的正式 Schema。

### P1.1 类型

- [x] 定义 `FormSchemaV2 { version, paper, baseRowHeight, pages }`
- [x] 定义 PageSchema 和 EdgeInsets
- [x] 定义 GridNode 及其内部 GridRow/GridCell 布局记录
- [x] 定义 PNode static/field 判别联合
- [x] 定义 TableNode/TableColumn 及内部 TableCellTemplate 布局记录
- [x] 定义 HtmlNode/ImageNode
- [x] 定义 FormNode/SchemaNode 联合类型
- [x] Page/Grid/实际组件包含稳定 ID；Row/Cell ID 仅作为 Grid 内部布局引用

建议让 P 使用判别联合，阻止非法组合：

```ts
type PNode = StaticPNode | FieldPNode
```

### P1.2 默认值

- [x] A4 fixed Page 默认配置
- [x] 空 Grid 默认一行一格
- [x] static P 默认文本
- [x] field P 默认 field 和 inputType
- [x] field P 支持 prefix/suffix 复合标签
- [x] Table 默认两列、表头 1、行高 1、minRows 4
- [x] Table 默认每个数据列生成一个 Field P，允许删除后替换为其他组件
- [x] HTML/Image 安全策略：渲染前始终 DOMPurify 清洗 + Shadow DOM 隔离（无信任开关，见 engine.md §11）

### P1.3 序列化

- [x] 保存时写入 version=2
- [x] 定义运行时校验入口
- [x] 加载未知版本时报错
- [x] 加载时补全可兼容的缺省字段
- [x] 不将 selectedId、缩放、索引等编辑器状态写入模板

**完成门槛**：前五行 Schema 使用正式类型；JSON 往返后深度等价；非法 P 模式不能通过 TypeScript 构造。

## 6. 阶段 P2：节点索引和结构操作

**目标**：让设计器可以可靠修改嵌套 Schema，而不是在组件中散落路径操作。

### P2.1 节点索引

- [x] 实现 `buildNodeIndex(schema)`
- [x] 索引 Page/Grid/实际组件，并保留 TableCellTemplate 的内部定位信息；Row/Cell 不进入可选节点链
- [x] 返回 node、parent、path 和 ownerCell
- [x] 检测重复 ID
- [x] 提供 `getNodeById`、`getAncestors`、`getOwnerCell`
- [x] Schema 变化后重建或增量更新索引

### P2.2 结构操作纯函数

- [x] `insertRow`
- [x] `copyRow`
- [x] `removeRow`
- [x] `moveRow`
- [x] `splitCell`
- [x] `mergeCells`
- [x] `insertNode`
- [x] `moveNode`
- [x] `removeNode`
- [x] `wrapCellChildrenWithGrid`
- [x] `updateNode`

### P2.3 ID 策略

- [x] 统一 ID 生成器
- [x] 深复制子树时重建全部 ID
- [x] 保存加载后保留原 ID（序列化往返保留全部 ID，见 `types/__tests__/schema-v2.test.ts`）
- [x] DOM data-node-id 与 Schema ID 一致（Renderer 写入 `node.id`，加载后 DOM 与 Schema 一致）

### P2.4 单测

- [x] 行增删移动
- [x] 格子拆分合并
- [x] 跨格移动组件
- [x] 防止移动到自身后代
- [x] 删除和复制完整子树
- [x] 包装为子 Grid
- [x] 操作后索引仍能定位正确 path（基础 update 操作）

**完成门槛**：所有设计器结构变更都只能通过纯函数完成；测试覆盖嵌套三层以上结构。

## 7. 阶段 P3：Schema 校验与警告

**目标**：错误结构不能进入预览和打印，固定尺寸问题能定位到节点。

- [x] 唯一 ID 校验
- [x] Page/Grid 内部 Row/Cell 空结构校验
- [x] GridCell width/colspan 校验
- [x] P mode/text/field 校验
- [x] Table columnKey 和 rowTemplate 完整性校验
- [x] HTML/Image 结构校验入口（JS 剥离改由引擎固定 sanitize 负责，无 trusted/bindings 字段）
- [x] 图片尺寸和资源警告
- [x] 重复 field 软警告
- [x] 节点内容溢出警告（P 文本估算宽度 vs 所在格子宽度，仅固定 mm 宽度可估算时）
- [x] Page 溢出警告（最小内容高度 vs 固定可用高度）
- [x] issue 包含 nodeId、path、code 和 message
- [x] 点击问题列表可选中对应节点（布局问题回退到最近的 Page/Grid 祖先）

**完成门槛**：构造错误 Schema 时能一次返回全部问题；预览/打印阻止结构 error，但普通 warning 可继续。

## 8. 阶段 P4：正式递归 Renderer

**目标**：将前五行 dev Renderer 升级为生产目录中的通用 V2 Renderer。

### P4.1 Renderer 职责

- [x] `GridFormRenderer`：Page 和画布渲染入口
- [x] Page 纸张渲染入口（由 `GridFormRenderer` 承担）
- [x] Grid/Node 递归分发入口（由 `GridSchemaNode` 承担）
- [x] Grid 内部 rows/cells 的布局渲染逻辑（仅为内部实现，不属于 Schema 组件）
- [x] P 节点渲染逻辑
- [x] Table 节点渲染逻辑
- [x] HTML 节点渲染逻辑
- [x] Image 节点渲染逻辑

> GridRow、GridCell 和 TableCellTemplate 是 Grid/Table 内部布局记录。它们不进入组件库、节点选择链或 `SchemaNodeV2`，Renderer 中如需拆分实现也只能作为内部布局函数或子实现。

### P4.2 尺寸

- [x] mm/fr/auto 列轨道（渲染 `track()` + 设计器列宽编辑 P6.2a）
- [x] baseRowHeight × height
- [x] Table 表头/数据行最小高度，内容可撑开父 GridRow
- [x] box-sizing 统一（grid/cell/p 均 `border-box`）
- [x] 固定字体、行高（基础行高 mm + 13px 固定字号；letter-spacing 未强制）
- [x] fixed Page 可用区域计算（P3 `PAPER_OVERFLOW` 用可用高度估算）

### P4.3 边框

- [x] all/outer/inner/none（渲染层 `layout-grid--${node.border}` 四态 CSS + 设计器边框枚举 UI，见 P6.2e）
- [x] 嵌套 Grid 无双边框〔已完成 2026-08-29：单边归属规则——外框仅由 Grid 容器绘制，内部水平/垂直分隔线分别画在非首行 cell 上边框 / 非首列 cell 左边框，移除旧「每格画 right/bottom」导致的「最外列/行与容器外框叠加成 2px」问题，嵌套 Grid 同样生效。渲染层 `GridSchemaNode.vue` scoped CSS + `GridSchemaNode.border.test.ts` 结构校验（cell 不内联 border）〕
- [x] Table 外框和 GridCell 边界不重复〔已完成 2026-08-29：`.layout-table` 改为自包含外框（自身 1px 全框），内部线按「非末行/末列」绘制，不再依赖外层 GridCell 的 right/bottom，从而消除 Table 外框与 GridCell 边界重复〕
- [x] colspan 后格线正确〔已完成 2026-08-29：引入 `GridNodeV2.columns` 共享列轨，渲染层 `gridRowStyle` 优先用 `grid.columns`，合并格 `grid-column: span N` 跨任意列宽都能对齐；旧 fixture 无 `columns` 时回退逐格 `cell.width`，无回归〕

### P4.4 模式

- [x] designer：data-node-id、选中和结构警告
- [x] preview：字段数据填入（P9.1a，只读预览；字段级权限 P9.2 推迟）
- [x] print：隐藏辅助 UI，业务尺寸不变

### P4.5 测试

- [x] 组件单测（GridSchemaNode / fill / height / DesignerApp 等）
- [x] 前五行 DOM 结构快照〔已完成：`src/components/renderer-v2/__tests__/FirstFiveRowsSnapshot.test.ts`，6 测试 + 快照基线，覆盖 P4.5 视觉锁基线；此处标记滞后已修正〕
- [x] 8mm/40mm 尺寸测试（`GridSchemaHeight.test.ts` 验证 GridRow/Table 行 min-height）
- [x] 长文本和 Table 增行撑高测试（Table 行高已覆盖；长文本撑高由 P3 溢出警告兜底）
- [x] Chrome/Edge 截图验证（人工）

**完成门槛**：正式 Renderer 输出与当前前五行截图基线一致；打印尺寸误差不超过 0.5mm。

## 9. 阶段 P5：设计器基础框架 V2

**目标**：V2 画布具备节点选择和配置更新能力。

- [x] DesignerApp 持有 `FormSchemaV2`
- [x] 提供 nodeIndex、selectedNodeId 和基础属性面板
- [x] 点击 data-node-id 选中节点
- [x] 显示 Page > Grid > 实际组件面包屑
- [x] 节点树可展开和选择〔实际已完成，见下方「补做」条；此处标记滞后已修正〕
- [x] 点击空白取消选择；重复点击同一位置可逐级选择祖先
- [x] 点击节点后缓存完整祖先路径，循环选择和面包屑切换只改变 active 节点
- [x] 选择链只显示 Page/Grid/实际组件，GridRow/GridCell 改为布局引用
- [x] 配置更新调用 `updateNode`
- [x] 选中节点显示蓝色内描边和浅色背景，不改变布局尺寸
- [x] 结构错误显示在节点检查面板和状态栏
- [x] v2 工具栏控制纸张、边距和基础行高
- [x] 所有入口只接受 `version: 2` Schema
- [x] **节点树可展开和选择**〔补做〕：左侧「结构」面板以树形列出 Page/Grid/实际组件（不含 Row/Cell），可展开折叠、点击选中并联动右侧检查面板与画布高亮。DoD：点击树节点即选中对应节点。

**完成门槛**：手写前五行 Schema 中任意 Page/Grid/P/Table 都能被选中并修改属性，Row/Cell 只作为布局槽位使用。

## 10. 阶段 P6：Grid 可视化编辑

**目标**：用户可以从空白页配置出前五行所需的 Grid 结构，并在 Grid 格子中放置实际组件。Row/Cell 只作为 Grid 的内部布局记录，不作为独立组件创建或选择。

### P6.1 Grid 行配置（内部布局操作）

- [x] 新增行
- [x] 设置行高倍数
- [x] 复制行
- [x] 上下移动行
- [x] 删除行

> 经代码核对（2026-08-27）：列宽 `mm/fr/auto` 渲染层 `track()` 已支持，但设计器无列宽编辑 UI；`colspan`/合并拆分在 schema 与渲染层均无字段/分支（零实现）；`drag/drop` 全仓库无命中，仅有按钮插入；`Grid 边框模式` schema 已有 `BorderModeV2 = "all"|"outer"|"inner"|"none"` 且 `DesignerApp.vue` 配置面板已有“边框”项（已可设，与 §2.1 / 规格表“外层 Grid 设 all 边框”一致）。下方按 MVP / 推迟 拆分。

### P6.2 Grid 列/格子配置（内部布局操作）

已完成（结构纯函数 + 配置面板）：一行拆分 N 格、行高倍数、属性面板调整行列数、嵌套 Grid、行列调整统一移入属性面板。待办：

- [x] **P6.2a 列宽 mm/fr/auto 编辑**〔MVP·渲染已支持，设计器未暴露〕：选中 Grid 可为每列设 `mm` 数值 / `fr` / `auto`。DoD：列宽编辑后渲染即时反映（复用 `track()`）。（覆盖 P10 步骤 3 各行列数配置）
- [x] **P6.2b 单元格 padding 与对齐（schema + 渲染 + 设计器 UI）**〔MVP·已完成〕：方向 1「Grid 默认 + cell 仅覆盖、cell 禁删」已落地。`GridNodeV2` 新增可选 `cellPadding/cellAlign/cellVerticalAlign`（Grid 级默认）；`schema-v2-operations.ts` 新增 `resolveCellBoxV2(cell, grid)` 级联解析（cell ?? grid ?? 常量默认）与 `updateCellPaddingV2/updateCellAlignV2/updateCellVerticalAlignV2/updateGridCellDefaultsV2`。渲染层 `cellStyle(cell, grid)` 改为按级联生效；cell `<div>` 增加 `data-node-id` 与选中高亮。选择模型纳入 `grid-cell`（仅样式可编辑、禁删、不进节点树）；Inspector 新增 `grid-cell` 分支（padding/align/verticalAlign + 清除覆盖）与 Grid 分支「单元格默认」小节。序列化/校验对新增可选字段安全（spread 透传）。DoD：选中单元格可在右侧面板设 padding/对齐并即时渲染；设 Grid 默认后未覆盖的 cell 继承。测试：`schema-v2-operations.test.ts`（级联 + 各 update 共 6 例）、`DesignerApp.test.ts`（cell 选中→Inspector、删除禁用、Grid 默认写入、cell 选中编辑回写共 4 例）、`FirstFiveRowsSnapshot` 快照已更新。
- [x] **P6.2c colspan（跨列合并）**〔MVP·已完成〕：引入 `GridNodeV2.columns` 共享列轨作为列宽规范，渲染层 `gridRowStyle` 优先用 `grid.columns`（旧 fixture 无 columns 时回退逐格 `cell.width`，快照不动）。根因修复：原逐行轨在列宽不等时合并格会错位（合并格只保留左格宽度、右格宽度丢失）；共享列轨使 `grid-column: span N` 跨任意列宽都能正确对齐。`createGridBySizeV2` 生成时即带 `columns`；`setGridColumnWidthV2` 同时维护 `grid.columns` 与逐格 `cell.width`（向后兼容测试）。校验层 `effectiveColumnWidthMm` 按列轨+colspan 求单元格有效宽度。DoD：合并任意两列后列轨对齐、无错位。测试：`schema-v2-operations.test.ts`（columns 维护、merge、split 往返共 5 例）、`GridSchemaNode.colspan.test.ts`（带 columns 的网格渲染对齐 1 例）。
- [x] **P6.2d 合并/拆分相邻格**〔MVP·已完成〕：复用既有 `mergeGridCellsV2`（横向合并、colspan 求和、children 拼接）；新增 `splitGridCellV2`（colspan>1 拆回 N 格、内容留在首格、清除 colspan）。设计器 `grid-cell` 检查器新增「合并右侧相邻格」（存在右兄弟可用）与「拆分此格」（colspan>1 可用）。DoD：选中单元格可一键合并右侧或拆分。测试：`DesignerApp.test.ts`（合并/拆分往返 1 例）。
- [x] **P6.2e Grid 边框模式**〔MVP·已部分具备〕：schema `BorderModeV2` 已定义、`DesignerApp` 已有“边框”配置项；补全 all/outer/inner/none 枚举选择 UI。DoD：可选四种模式并即时渲染（覆盖 P10 步骤 3 外层 Grid 设 all 边框）。

### P6.3 投放

已完成（结构能力）：Cell 投放点显示、插入而非覆盖、级联删除、删末位清理空父级、一键包装子 Grid、禁止移入自身后代。跨格移动的结构纯函数已具备（见“当前进度”），但 UI 拖拽未做。待办：

- [x] **P6.3a 组件库插入（拖拽增强）**〔MVP·已完成〕：左侧模板项已 `draggable`，画布 `drop` 时 `closest('[data-layout-id]')` 命中目标 grid-cell 并 `appendNodeToCellV2` 落位，命中格高亮；按钮插入仍保留。HTML/Image 拖入推迟。DoD：从模板拖到任意 grid 单元格精准落位。
- [x] **P6.3b 格子内排序**〔MVP·已完成，用配置面板替代拖拽〕：新增 `moveNodeWithinParentV2(schema, nodeId, "up" | "down")`，在同一父容器（grid-cell / table-cell-template / page）的子节点列表中交换相邻两项；边界或父容器不支持时**返回原 schema 引用**（不产生无意义的撤销记录）。设计器 Inspector 新增「位置」小节：上移 / 下移按钮，边界自动禁用。DoD：选中格内组件可上下调序并即时渲染。测试：`schema-v2-operations.test.ts` 2 例（上移/下移往返 + 边界与不支持父容器返回原引用）、`DesignerApp.test.ts` 2 例（上下移调序 + 边界禁用）。
- [x] **P6.3c 跨格移动（配置面板版）**〔MVP·已完成，UI 拖拽仍推迟〕：复用既有 `moveNodeV2`（禁止移入自身后代）；新增 `listDropTargetsV2(schema)` 列出全部 grid-cell 与 table-cell-template 投放点并带可读标签；Inspector「位置」小节新增目标下拉 + 「移动到此格」按钮。DoD：选中组件可跨格移动到任意其它投放点并即时渲染。测试：`schema-v2-operations.test.ts` 1 例（投放点 id 唯一且含关键 id/标签）、`DesignerApp.test.ts` 1 例（下拉选目标后跨格移动）。

**当前进度**：基础结构纯函数已覆盖空白模板、根 Grid、Grid 行列配置、内部行增删移动、格子拆分合并、跨格移动、子 Grid 包装和节点插入；
**组件库拖拽落格（第一期）已完成**；**格子内排序与跨格移动已通过配置面板完成**（P6.3b / P6.3c），仅「拖拽排序 / 拖拽移动」这一交互形式仍推迟；完整前五行 UI 构建仍待完成。内部行/格子操作不改变其不可选、不可作为独立组件持久化的约束。

**完成门槛**：不手写 JSON，可以创建外层 Grid 并配置五个目标内部行；保存 Schema 与手写基线结构等价。

## 11. 阶段 P7：P、Table、HTML、Image 编辑

> 经代码核对（2026-08-27）：`DesignerApp.vue` 配置面板仅覆盖子集（Grid 行列/边框、P 文本/字段名/前后标签、Table 最小行数）；字号/字重/对齐/竖排、Table 列编辑、HTML/Image 编辑均未接。schema 已定义 `HtmlNodeV2`/`ImageNodeV2` 及 `createHtmlNodeV2`/`createImageNodeV2`，但渲染层尚未渲染 html/image 节点，P7.3/P7.4 的编辑与安全风险（sanitizer/CSS scope/{{field}} 自动绑定）全未做。下方按 MVP / 推迟 拆分。

### P7.1 P

- [x] **P7.1a 固定文字独立 `text` 类型**〔MVP·架构调整〕：固定文字不再用 P 的 static/field 模式切换，而是独立 `text` 节点类型；`p` 仅保留 field 模式。DoD：选中 `text` 节点可在右侧面板配置文本内容与文本样式（字号/字重/颜色/对齐/字体/竖排），选中 `p` 节点配置字段属性与文本样式；两者共用 `TextStyleV2`。
- [x] **P7.1b 固定文本编辑**〔MVP〕：编辑 static 文本。DoD：改文本后渲染同步。
- [x] **P7.1c field 与 inputType 编辑**〔MVP〕：编辑 field 名与输入类型。DoD：field 名编辑后 `data-field` 同步（与 P9.1 数据键一致）。
- [x] field P 空内容、data-field、下划线和打印下划线基础语义
- [x] field P 前标签、输入器、后标签组合渲染
- [x] **P7.1d 字号、字重、对齐、竖排、不换行**〔MVP·子集〕：**竖排为第一版必需**（P10 工作任务标签）；字号/字重/水平对齐/不换行为打印美观最小支持。DoD：可设竖排（horizontal-tb / vertical-rl）与基本字号字重对齐，渲染即时反映（竖排覆盖 P10 步骤 5 左格“工作任务”标签）。

### P7.2 Table

- [x] **P7.2a 新增/删除列**〔MVP·已完成〕：右侧面板「列配置」已支持新增/删除列（保留至少 1 列），并自动同步 `rowTemplate`；移动列仍按原排期推迟。DoD：可增删列并即时渲染。
- [x] **P7.2b 编辑 key、标题、宽度、对齐**〔MVP·已完成〕：列配置支持编辑标题 / 字段名(key) / 宽度 / 对齐（key 重命名同步 `rowTemplate` 的 columnKey 与 id）。DoD：可创建 2 列表格并设列宽、标题、对齐。
- [x] **P7.2c headerHeight、rowHeight、minRows**〔MVP·部分〕：`minRows` 已可通过配置面板设置；`headerHeight`/`rowHeight` 补 schema 字段与 UI。DoD：可设表头高/行高/minRows（覆盖 P10 步骤 6 表头1·行高1·minRows4）。
- [ ] **P7.2d repeatable**〔推迟〕：动态增删行，第一版固定 minRows 即可（与 P9.1d 一致）。
- [~] **P7.2e 编辑 rowTemplate 的 Cell children**〔部分完成〕：**逐行字段绑定已落地（P10 阻塞项）**——行模板内后代 `field` 支持 `{row}` 行号占位符，渲染层 `withRowIndex(node, rowIndex)` 在 tbody 每行实例化时替换为 1-based 行号（如 `工作任务_{row}_1` → 第 2 行 `工作任务_2_1`），与 `demoData`/`acceptance-row-spec.md` 的 8 个逐行键一致；设计器对「位于表格行模板内」的 P 节点显示 `{row}` 用法提示。不含占位符时原样返回同一引用（无额外开销）。**剩余（仍推迟）**：模板内子组件的完整编辑 UI（依赖 P9.1d 动态绑定，第一版不做）。
- [ ] **P7.2f 单元格放 P 或子 Grid**〔MVP〕：工作任务表格 cell 内为 field P（已可插入 P）。DoD：表格 cell 可插入 P/子 Grid。

### P7.3 HTML〔第一版 MVP 基础版，见 engine.md §11〕

- [x] **P7.3a 渲染隔离（Shadow DOM）**〔MVP〕：`host.attachShadow({ mode: 'open' })` 写入 `<style>${css}</style>${html}`，CSS 仅作用本块。DoD：开发者 HTML/CSS 不污染表单样式。
- [x] **P7.3b 固定清洗（DOMPurify）**〔MVP〕：引擎级固定 sanitize，剥离 `script/iframe/object/embed`、`on*`、`javascript:`/`data:text/html`，禁 `@import`；始终执行、无 per-node 信任开关。DoD：含 `<script>`/onclick 的片段被剥离，普通结构/样式保留。
- [x] **P7.3c 字段绑定 `{{field}}`**〔MVP〕：挂载解析为 shadow 内 `<span data-bind="field">`，填值时经 `shadowRoot` 对 `[data-bind]` 原地 `textContent = data[field]`，与 field P / Image 同 in-place 模型。DoD：配置 `单位：{{单位}}` 后填值显示对应 data（覆盖 P10 步骤 9 的 HTML 区块）。
- [ ] **P7.3d 预设模板选择**〔推迟〕
- [ ] **P7.3e 高级源码编辑增强**〔推迟〕
- [ ] **P7.3f sanitize 报告（剥离项回显）**〔推迟〕

### P7.4 Image〔第一版 MVP 基础版〕

- [x] **P7.4a src/field 模式 + base64**〔MVP〕：`src` 接收 URL 与 base64（`data:image/...;base64,...`）；field 模式填值 `imgEl.src = data[field] ?? src`，原样透传。DoD：静态 base64 签名图与 URL 图均可渲染（见 engine.md §11）。
- [x] **P7.4b 尺寸和 objectFit**〔MVP，部分〕：`ImageNodeV2.objectFit` 已定义默认 contain；补宽度/高度 mm 配置 UI。DoD：可设 width/height mm 与 objectFit。
- [x] **P7.4c 加载失败占位**〔MVP〕：URL 模式 `onerror` 占位。DoD：坏链显示占位而非破图。

**完成门槛**：通过属性面板完成标题、所有标签、输入字段、竖排“工作任务”和两列表格配置。

## 12. 阶段 P8：保存、加载和历史

**目标**：编辑结果可以稳定持久化并恢复。

> 范围与现状：第一版 MVP 只需「保存 / 加载 / 基础撤销」闭环（见 §2.2），深撤销栈、版本迁移为推迟项。**节点 ID 稳定依赖 P2.3**，不在本阶段独立完成。
> 关键事实（2026-08-27 核对）：序列化/反序列化函数 `serializeFormSchemaV2` / `parseFormSchemaV2` 已实现于 `src/types/schema-v2-serialization.ts`，并有往返测试（`types/__tests__/schema-v2.test.ts`）；`buildEditorNodeIndexV2` 已实现于 `src/types/schema-v2-index.ts`。因此 P8.1 主要是**接线到设计器 UI 与持久化**，而非从零实现算法。

### P8.1 序列化 / 反序列化接线　[引擎已具备·接线]
- [x] 设计器「保存」调用 `serializeFormSchemaV2(schema, true)`，输出含 `version=2` 的合法 V2 JSON
- [x] 「载入 / 导入」调用 `parseFormSchemaV2(json)`，非法输入抛 `SchemaV2SerializationError` 并提示
- **DoD**：前五行 V2 Schema 经 export→import 后深度等价（结构、字段、ID 一致）；非法 JSON 被拦截。往返测试扩展覆盖前五行样例。

### P8.2 持久化通道　[MVP]
- [x] 接入 localStorage 键值（推荐）与/或文件下载·上传，提供「保存 / 载入 / 新建空白」入口
- [x] 加载后恢复完整设计器状态（schema、selectedNodeId 若有效）
- **DoD**：保存后刷新页面或「重新加载模板」，前五行视觉与编辑状态一致，可继续编辑（覆盖 P10 步骤 7–8）。

### P8.3 加载后重建 nodeIndex 与可选状态　[MVP]
- [x] 载入后调用 `buildEditorNodeIndexV2(schema)` 重建索引
- [x] 恢复 selectedNodeId 并校验有效性；DOM `data-node-id` 与 Schema ID 一致（依赖 P2.3）
- **DoD**：加载后所有节点可被选中、移动、配置（P10 指标“所有节点可再次编辑”）；索引覆盖 Page/Grid/实际组件，不含 Row/Cell 布局节点（与 design.md §3.2 一致）。

### P8.4 保存前结构校验　[MVP]
- [x] 复用 P3 校验器（`src/types/schema-v2-validation.ts`），保存/导出前由 `serializeFormSchemaV2` 兜底抛错（结构非法即拦截）；设计态问题面板实时显示
- **DoD**：结构非法时阻止保存并提示具体错误；合法时通过；与 P3 单测共用校验函数。

### P8.5 基础撤销 / 重做栈（≥20 步）　[MVP]
- [x] 实现命令栈或快照栈，覆盖属性修改、节点增删、结构操作
- [x] 提供触发入口（按钮 / Ctrl+Z、Ctrl+Y）
- **DoD**：连续 20 次属性或结构操作后逐步撤销可逐帧还原，重做可恢复（满足完成门槛）。MVP 可用简单快照栈，性能优化后做。

### P8.6 未保存修改提示　[MVP]
- [x] 比对当前状态与最近保存快照（dirty 标记 + `beforeunload` 提示），关闭 / 切换模板前确认
- **DoD**：修改未保存时尝试关闭或切换，弹出“有未保存修改”确认。

### P8.7 连续输入合并历史　[推迟]
- [ ] 同属性连续输入（打字、拖动）合并为单条历史
- **DoD**：文本框连输 10 字符 = 1 步撤销；拖动列宽过程仅 1 条记录。依赖 P8.5。

### P8.8 结构操作原子性与子树历史　[推迟]
- [ ] 复制 / 删除节点保存完整子树，撤销整体还原；增删行列、合并拆分作为单条原子历史
- **DoD**：删除含 Table 的行，撤销后 Table 与 4 行数据完整恢复；合并单元格可还原。依赖 P8.5、P6。

### P8.9 版本迁移入口　[推迟]
- [ ] 提供旧版本 Schema → V2 的迁移函数与注册入口
- **DoD**：低版本样例可一键迁移为 V2 并加载。注：version 基础检查（写入 / 未知版本报错 / 缺省补全）已在 P1 完成。

**完成门槛**：前五行保存、刷新、加载后视觉一致，节点 ID 稳定，撤销/重做至少覆盖 20 步。

## 13. 阶段 P9：填写、权限和打印

> 经代码核对（2026-08-27）：`GridSchemaNode.vue` 已为 field P 渲染 `contenteditable` 编辑区并带 `data-field`，但**尚无“从 data 初始化填值”与“输入回写 data”**；打印侧已有多处 `@media print` 隐藏设计器 UI，但无独立 Preview、无 A3/A4 `@page`、无溢出提示；权限侧仅有工具栏按钮 `disabled`，无字段级 readonly/hidden/required 机制。下方按 MVP / 推迟 拆分。

### P9.1 数据

- [x] **P9.1a 从 data 初始化填值**〔MVP〕：预览态传入 `data` 后，field P / Image / HTML `{{field}}` 显示 `data[field]`（与渲染层同 in-place 模型）。DoD：预览态载入 `src/dev/demoData.ts`，所有 field 显示对应值（覆盖 P10 步骤 1–8 构建后进入填值的前提）。注：设计态 contenteditable 编辑的是 Schema 节点文本，预览态只读展示 data，二者分离。
- [x] **P9.1b 输入事件回写 data**〔MVP〕：field P 的 `contenteditable` 输入经事件更新 `data[field]`；Table 行内 field 回写对应数组项。DoD：编辑后 `data[field]` 实时更新，保存并重加载值不变。（覆盖 P10 步骤 9、指标“数据回写正确”）
- [ ] **P9.1c number/date/signature 内部控件**〔推迟〕：第一版前五行均为文本/数字文本，用 contenteditable 文本即可；日期选择器、签名板等专用控件后续补。
- [ ] **P9.1d repeatable Table 动态绑定数组 + rowTemplate 行上下文**〔推迟〕：运行时增删行的动态绑定；MVP 固定 minRows 4 行已由 P9.1a/b 的 cell 级绑定覆盖。

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
- [ ] **P9.3f Chrome/Edge 打印预览验证**〔MVP·待人工〕：DoD：两引擎打印预览中 A4 尺寸误差 ≤0.5mm（兼容 §2.2 注明目标引擎）；本环境无浏览器，需人工在 Chrome/Edge 验证。

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
- [ ] 主要结构与参考图一致（含左侧“工作任务”竖排、右侧表格表头与 4 行输入格）

实现侧 harness（`src/components/renderer-v2/__tests__/P10Acceptance.test.ts`，11 例）已自动化覆盖「无结构 error」「所有节点可再次选中、移动和配置（跨格移动组件 + 上移行 + 改行高/列宽/表格 minRows 后重建索引仍可定位）」「无 CONTENT_OVERFLOW / PAPER_OVERFLOW」「行高和边框稳定（40mm + all 边框 + cell 不内联 border）」「数据回写正确（含内嵌表逐行键）」「修改后保持正确」，验收时只需人工核验浏览器视觉与打印尺寸（指标 #7、#8）。

至此 P10 验收指标中**可自动化**的部分已全部覆盖；指标 #7（打印尺寸误差 ≤ 0.5mm）与 #8（主要结构与参考图一致）依赖真实浏览器与打印，无法在本环境自动化，须由非实现者人工核验 —— 这也是 §14「前五行闭环未通过前不扩展完整表单」闸门放行 P11 的唯一前置条件。

表格行模板字段名支持 `{row}` 行号占位符（`工作任务_{row}_1` → 第 r 行 `工作任务_r_1`），填写态按行独立回写；详见 §11 P7.2e。

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

- [ ] 移除旧流式 Renderer 和硬编码旧 Schema
- [ ] 清理所有旧实现残留
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
