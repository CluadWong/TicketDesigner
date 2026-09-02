# 执行日志

> 本文件按时间顺序记录**每一轮执行的详细过程**（原 `development-plan.md` §0.1 的「本轮」段落）。
> **每次执行后**：在文件末尾追加一条「本轮（YYYY-MM-DD N续）」记录，并回到 `development-plan.md` §0
> 更新「最后更新」「任务节点状态（§0.2）」与「最近执行记录（§0.4）」表。
> 结论与最新状态以 [development-plan.md](./development-plan.md) 为准，本文件只做过程留档。

---

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

- **本轮（2026-09-01）P7.2d/P9.1d 动态行 = 用户澄清「repeatable 不是 schema 属性」**：
  1. **用户澄清（与代码现状一致，确认无需改实现）**：`repeatable` 不应是 schema 布尔属性，而是渲染期运行时行为——对比 data 字段值对应的行数与配置行数，若 data 行数超过配置（`minRows`）则动态增加渲染行数以完整呈现 data。例：表格 `minRows=4`、data 含 `{工作内容_5_2:"a"}` → 说明曾录入第 5 行 → 再次渲染须动态出第 5 行。
  2. **核对现状**：实现早已就位——`src/types/schema-v2-table-rows.ts` 的 `resolveTableRowCount(table, data)` = `Math.max(minRows, data 中实际出现的最大行号)`；渲染层 `GridSchemaNode.vue:361` 已用 `v-for="rowIndex in resolveTableRowCount(node, data)"`；`withRowIndex(node, rowIndex)` 在 tbody 每行把后代 `field` 的 `{row}` 占位符替换为 1-based 行号（逐行数据键绑定依赖它）。
  3. **移除 `repeatable` 属性**（仅落点收尾，行为不变）：从 `schema-v2.ts`（`TableNodeV2` 接口）、`schema-v2-operations.ts`（`createTableNodeV2` 默认值）、`schema-v2-serialization.ts`（序列化行 `repeatable: node.repeatable ?? false`）、`yunlv-second-ticket-full.ts`（样例）、`GridSchemaHeight.test.ts` 与 `schema-v2.test.ts`（2 处断言）移除；grep 全仓 `repeatable` 确认零残留。`TableNodeV2` 现保留 `headerHeight` / `rowHeight` / `minRows` / `border?`。
  4. **P7.2e 确认 = 同一机制**：P7.2e 的「逐行 `{row}` 占位符绑定」正是 `resolveTableRowCount` 能按 data 推导行号的前提（行模板字段键 `工作内容_{row}_2` 让 data 的第 5 行键 `工作内容_5_2` 被识别为行 5），故 P7.2d 与 P7.2e 同源，已在 §13 P9.1d 合并记录。
  5. **P7.2f 确认可行**：`TableCellTemplateV2.children: FormNodeV2[]` 类型层已含 `Grid`；`appendNodeToCellV2` 同时支持 `grid-cell` 与 `table-cell-template` 且接受任意 `FormNodeV2`；渲染层 `<td>` 带 `data-layout-id`，拖拽可 `closest('[data-layout-id]')` 命中；`withRowIndex` 递归处理 Grid 子节点（含 `{row}` 替换）。即表格 cell 内可放 P 与子 Grid。
  6. **P9.1c 专用控件延后**：用户确认 number/date/signature 专用控件继续延后（第一版前五行均为文本/数字文本，contenteditable 即可）。
  7. **验证**：新增 `src/types/__tests__/schema-v2-table-rows.test.ts`（12 例，含用户原例 `工作内容_5_2→5 行`、`工作内容_12_1→12`、`工作内容_x_1→1` 等边界）+ `src/components/renderer-v2/__tests__/TableDynamicRows.test.ts`（3 例渲染期动态行）；`vue-tsc` 干净；`vitest` 全量 **139/139** 通过（124 + 12 + 3），无回归。

- **本轮（2026-09-01 续）字段 P 设计态光标居中 + 移除默认值/多行配置**：
  1. **用户反馈①（设计态光标贴顶）**：字段 `<p>` 在待输入（空）时光标贴着上边框，输入内容后才恢复垂直居中——视觉不一致。根因：空 `contenteditable` 的 flex/inline 容器无行盒（line-box）高度，caret 自然落到顶部。
  2. **修复（设计态光标居中）**：`GridSchemaNode.vue` 为 `.layout-p--field` 与 `.layout-p__input` 增加 `::before { content: "\200b" }` 零宽空格占位行盒，使空字段也有行高，caret 经 flex 交叉轴垂直居中，与已输入态完全一致。
  3. **用户反馈②（配置冗余）**：字段 P 不需要「默认值」与「多行」配置；默认即「内容超过宽度时自动换行」即可。
  4. **移除 `multiline` 配置**：`FieldPNodeV2` 删 `multiline?: boolean`；`pStyle` 统一 `white-space: pre-wrap`（去掉 `multiline === false → nowrap` 分支）；设计/预览/打印静态渲染与（canFill 时）真实控件均默认换行。**仅 `number`/`date` 这类 `inputType` 仍渲染原生单行 `<input>`**——`useTextarea(node)` 改为 `node.inputType !== "number" && node.inputType !== "date"`，不动其单行行为。
  5. **移除 `default` 配置**：`FieldPNodeV2` 删 `default?: string`；`fieldValue` 空数据时不再回退 `node.default`（仅 data 优先、空返回 `""`）；`DesignerApp.vue` 删 `updateSelectedMultiline` / `updateSelectedDefault` 两函数与 Inspector 的「多行」「默认值」两项控件；`.layout-p__control` 直接 `min-height: 2.6em; overflow: auto`（不再依赖 `--multiline` 修饰类，原 `.layout-p--multiline` / `.layout-p__control--multiline` 规则已删）。
  6. **验证**：`GridSchemaNode.fill.test.ts` 把「multiline=false→单行 input」用例改为「文本字段（非 number/date）填写态默认渲染 `textarea`（自动换行）、不渲染单行 input」，并删除「data 为空回退节点 default」用例（净 -1 例）；`FieldPNodeV2` 现仅 `prefix`/`suffix`/`inputType`/`action`/`underline`/`webUnderline`/`printUnderline`/`style`。`vue-tsc` 干净；`vitest` 全量 **138/138** 通过（139 - 1），无回归。

- **本轮（2026-09-01 再续）用户四条指令落地（前三项已完成，第四项待确认）**：
  1. **空白初始化默认配一个 Grid 作为根部（Item 1）**：`DesignerApp.resetBlank()` 改为从 `createEmptyFormSchemaV2()` 空 page 起算后，调用 `createGridNodeV2()` + `insertRootGridV2(blank, grid)` 插入一个默认根 Grid，并选中它（`selectedNodeId` / `selectionPathIds` 指向该 Grid）。注意：`createEmptyFormSchemaV2` 本身**不改**（测试依赖其返回空 page）；默认根 Grid 仅作用于「重置/新建」路径，不影响载入样例或已有 schema。
  2. **相邻 Grid 外框去重（Item 2）**：新增 `GridSchemaNode` 的 `suppressBorders?: {top?;right?;bottom?;left?}` prop + 两个兄弟推导函数：
     - 页面级竖向堆叠：`GridFormRenderer.pageSiblingSuppressBorders(children, index)` —— 相邻且都绘制外框（all/outer）的 Grid，抑制后一个的 `top`（保留前一个的 `bottom` 单线）。
     - 单元格级横向排布：`GridSchemaNode.cellSiblingSuppressBorders(children, index)` —— 抑制后一个的 `left`（保留前一个的 `right` 单线）。
     - 渲染层 Grid 的 class 绑定加 `layout-grid--no-top/right/bottom/left`（仅当 `suppressBorders` 对应侧为真），CSS 规则置于 `--all`/`--outer` 之后以源码顺序胜出（同级特异度）。仅隐藏「后一个」的引导侧，避免 2px 重叠、保留单线。
  3. **字段全部字符串类型，移除输入类型配置（Item 3）**：`FieldPNodeV2` 删 `inputType?: "text"|"number"|"date"|"signature"`；`useTextarea`/`inputElType` 改为恒返回 `true`/`"text"`，填充态一律渲染 `<textarea>`（自动换行 `pre-wrap`），不再有 number/date 单行 input；`DesignerApp.vue` 删 `updateSelectedInputType` 与 Inspector「输入类型」select（`text`/`number`/`date`/`signature` 选项）。样例 `yunlv-second-ticket-full.ts` 的 `dateField` 工厂去掉 `inputType:"date"`（保留 `action:"date"`），顶部注释同步修订。
  4. **外部组件「图形安措」类型（Item 4，按用户澄清实现）**：用户澄清机制——外部组件一律由宿主**弹窗调用**、回调把数据回写 `data` 再渲染到票面；`action` 是选项值、`actionParams` 是外部组件的额外参数。据此落地：① `FieldPNodeV2.action` 联合类型新增 `"safetyGraphic"`；② 新增 `FieldPNodeV2.actionParams?: Record<string, string>`（通用外部组件参数，图形安措用 `matchField` 指定匹配字段）；③ Inspector「外部组件（action）」下拉新增「图形安措」选项，选中后下方出现「安措匹配字段」输入框（`updateSelectedSafetyField` 写入 `actionParams.matchField`，清空则移除该键、空对象置 undefined）；④ 渲染层不动（弹窗与 data 回写为宿主行为，字段 P 仍走普通控件渲染）。序列化 `normalizeNode` 经 `...node` 展开保留 `action`/`actionParams`、校验 `scanNode` 不拦截，无需改序列化/校验。
  - **验证**：删 `GridSchemaNode.fill.test.ts`「inputType=number→单行 input」过期用例（-1），新增 `GridSchemaNode.border.test.ts` 相邻 Grid 去重 2 例 + `schema-v2.test.ts` 图形安措序列化/校验 1 例；`vue-tsc --noEmit` 干净；`vitest` 全量 **140/140** 通过（138 + 3 新增 - 1 删），无回归。
  - **文档落地**：见本条目 + `development-plan.md` §0 + `MEMORY.md` + 本日日志。
  - **未提交**（用户未要求，按「未经允许不提交 git」约定）。

- **本轮（2026-09-01 三续）配置面板（Inspector）组件配置统一为「上下结构 + 一行两列」布局**：
  1. **需求（用户指令）**：配置面板里所有组件配置的「标签 + 输入控件」统一改为**上下结构**（标签在上、输入在下）；若输入控件可能输入长文本则**独占一行一列**（整行），其余短控件改为**一行两列**（每行两个）。
  2. **CSS 改动（`DesignerApp.vue` `<style scoped>`）**：
     - `.v2-control--inline` 由 `flex-direction: row`（标签左、输入右）改为 `column`（上下结构），`align-items` 改 `stretch`、`margin:0`（在网格里紧凑排布）。其 `input` 覆盖规则由 `flex:1;width:auto` 改回 `width:100%`（与 `.v2-control input` 一致）——所有控件至此一律上下结构。
     - 新增 `.v2-control--full { grid-column: 1 / -1; }`：长文本控件在 2 列网格中横跨两列，独占整行。
     - 新增 `.v2-grid-dimensions .v2-control { margin: 0; }`：网格容器内控件去掉上下外边距，改由 `gap` 控制间距（原 行数/列数、宽/高 已用该容器，现统一）。
  3. **模板改动（右栏各节点检查分支）**：
     - **长文本（独占一整行）**：text 节点「文本内容」(`rows=3`)、html 节点「HTML 片段」(`rows=6`) 与「CSS」(`rows=4`) 三个 `textarea` 加 `v2-control--full`（本身就独占，加类强化语义、并确保万一进入网格仍横跨）。
     - **Grid 节点**：「列宽」`v-for` 多列包进 `.v2-grid-dimensions`（2 列自动换行）；「单元格默认（内边距 / 水平对齐 / 垂直对齐）」三个控件包进 `.v2-grid-dimensions`，第 3 个「垂直对齐」加 `--full` 独占末行。
     - **Text / Field-P 节点**：「水平对齐 / 垂直对齐 / 字体」三个控件包进 `.v2-grid-dimensions`，「字体」加 `--full`；Field-P 另把「前标签 / 后标签」包进 `.v2-grid-dimensions` 成一行两列；两者「文本样式」4 控件本就在 `.v2-style-grid`（2 列），随 `--inline` 改竖向后自然上下结构。
     - **Grid-Cell 节点**：「内边距 / 水平对齐 / 垂直对齐」包进 `.v2-grid-dimensions`，「垂直对齐」加 `--full`。
     - **Image 节点**：「图片地址 / 数据字段」包进 `.v2-grid-dimensions` 成一行两列；「宽 / 高」仍在 `.v2-grid-dimensions`。
     - **Table 节点**：「表头高度 / 行高 / 最小行数 / 边框」四个控件包进 `.v2-grid-dimensions`（2×2 网格）。
     - 其余单控件（如「边框」「外部组件」「字段名」「安措匹配字段」「填充方式」及「列配置」表）保持整行。
     - 所有 `data-*` 属性（`data-dimension` / `data-cell-default` / `data-cell-padding` 等）与 `.v2-control` / `.v2-style-grid` / `.v2-grid-dimensions` 类名均保留，`DesignerApp.test.ts` 选择器不受影响。
  4. **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **140/140** 通过（含 `DesignerApp.test.ts` 25/25，选择器无回归），无回归；未跑 `vite build`（非大改、无新依赖）。
  5. **未提交**（用户未要求，按「未经允许不提交 git」约定）。

- **本轮（2026-09-01 四续）行高倍数配置从 table 移到 grid-cell**：
  1. **需求（用户指令）**：移除 table 的「行高倍数」配置（表头高度 + 行高），改为在 **cell（grid-cell）** 上配置「行高倍数」；表头固定 1× 基准行高（不可再配）。经 AskUserQuestion 确认：cell 取 `grid-cell`（非 table-cell-template）、表头高度一并移除。
  2. **类型（`schema-v2.ts`）**：`TableNodeV2` 删除 `headerHeight: number` 与 `rowHeight: number`；`GridCellV2` 新增 `rowHeight?: number`（单元格行高倍数，覆盖所在 Grid 行的 `height`，不设置则继承 Grid 行高）。
  3. **操作 / 序列化 / 校验**：
     - `schema-v2-operations.ts`：删除 `updateTableHeaderHeightV2` / `updateTableRowHeightV2`；`createTableNodeV2` 不再写 `headerHeight/rowHeight` 默认。
     - `schema-v2-serialization.ts`：`normalizeTable` 删除 `headerHeight/rowHeight` 默认补全（随 `...node` 保留旧数据中的字段，但类型已移除）。
     - `schema-v2-validation.ts`：`minNodeHeightMm` 表改为 `(1 + node.minRows) * baseRowHeight`（表头与数据行均 1×）；删除 `INVALID_TABLE_ROW_HEIGHT` 校验（不再有该字段）。
  4. **渲染（`GridSchemaNode.vue`）**：
     - 表格表头 `<tr>` 与数据 `<tr>` 的 `minHeight` 均改为固定 `baseRowHeight`（1× 基准），数据行数由 `resolveTableRowCount` 推导不变。
     - `cellStyle` 新增 `minHeight: cell.rowHeight ? \`${cell.rowHeight * baseRowHeight}mm\` : undefined`——单元格设置行高倍数时撑开自身，所在 Grid 行容器按最高单元格自然撑高（行容器的 `row.height` 作为下限）。
  5. **设计器（`DesignerApp.vue`）**：
     - 删除 Table 面板「表头高度（行高倍数）」「行高（行高倍数）」两项输入及其 handler（`updateTableHeaderHeight` / `updateTableRowHeight`）、对应 import（`updateTableHeaderHeightV2` / `updateTableRowHeightV2`）；Table 面板现仅余「最小行数 / 边框」(`.v2-grid-dimensions` 2 列)。
     - Grid-Cell 面板：`.v2-grid-dimensions` 改为 2×2 ——「内边距 / 行高倍数」一行、「水平对齐 / 垂直对齐」一行（垂直对齐不再 `--full`）；新增 `updateSelectedCellRowHeight`（空值→`undefined`，否则 `Math.max(0, floor)`）；「清除覆盖」按钮 `:disabled` 与 `clearCellOverride` 同步纳入 `rowHeight`。
  6. **测试**：`schema-v2-operations.test.ts` 删除「updates table header height and row height」用例 1 例及对应 import；`schema-v2.test.ts`（2 处 table 字面量）、`schema-v2-table-rows.test.ts`、`GridSchemaHeight.test.ts`、`yunlv-second-ticket-full.ts` 去掉 `headerHeight/rowHeight` 字面量（其中 `GridSchemaHeight` 仍断言表头/数据行 `min-height: 8mm`，与固定 1× 基准一致）。
  7. **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **139/139** 通过（140 - 1 删除过时用例，含 `DesignerApp.test.ts` 25/25 无回归），无回归；未跑 `vite build`（无新依赖）。
  8. **未提交**（用户未要求，按「未经允许不提交 git」约定）。

- **本轮（2026-09-01 五续）字段 P 设计态空字段 / 无前标签也能回车换行**：
  1. **需求（用户指令）**：字段组件（field P），`prefix` 为 null 时，设计态在 p 标签输入范围内按回车会生成 `<div>` 但看似一行；`prefix` 非 null（复合字段）则正常换行。期望即使无输入也能回车换行。
  2. **根因定位**：`.layout-p` 为 `display:flex`（复合字段前缀/输入区/后缀横排 + 垂直居中所需）。`prefix` 为 null 时无前缀字段的 `<p>` 本身 `contenteditable`（`isEditable` 对无前缀字段返回 `"true"`），回车插入的 `<div>` 被当作 flex 行内子项（`flex-direction:row`）排成一行 → 多行失效；复合字段的可编辑区是 inline-block 的 `.layout-p__input`，块级 `<div>` 在其内纵向堆叠故正常。
  3. **修复（CSS-only，不动模板结构）**：`src/components/renderer-v2/GridSchemaNode.vue`
     - `.layout-p` 加 `flex-wrap: wrap`；
     - 新增 `.layout-p > div { flex: 1 1 100%; min-width: 0 }`，强制回车插入的块级 div 占满整行并换行堆叠，空字段下回车也正常换行。复合字段不受影响（其可编辑区在 `.layout-p__input`，非 `<p>` 直接子级）。
  4. **弯路记录**：曾尝试把无前缀字段的可编辑区也包进 `.layout-p__input` 并移除 `<p>` 的 `contenteditable`——但 `DesignerApp.test.ts`（预览只读断言 `[data-node-id="unit-field"].contenteditable === "true"`）与 `GridSchemaNode.test.ts`（复合字段 `.layout-p__input` 须带 `data-field`）要求 `contenteditable` 与 `data-field` 留在 `<p>` 及其当前位置，故回退原结构、改用 CSS 修复。
  5. **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **139/139** 通过（无回归：DesignerApp 25/25 预览态只读、GridSchemaNode 复合字段 data-field、P10Acceptance 内嵌表逐行 data-field 唯一、FirstFiveRowsSnapshot 快照零变动），未跑 `vite build`。
  6. **未提交**（用户未要求，按「未经允许不提交 git」约定）。

- **本轮（2026-09-01 五续补正）`:deep()` 命中 contenteditable 运行时 div**：
  1. **问题（用户实测反馈）**：五续的 `.layout-p > div { flex: 1 1 100%; min-width: 0 }` **不生效**；用户手动给插入的 div 设 `width: 100%` 时换行正常。
  2. **根因**：`<style scoped>` 会把 `.layout-p > div` 编译为 `.layout-p[data-v-xxx] > div[data-v-xxx]`；contenteditable 回车插入的 `<div>` 由浏览器运行时塞入、不带 scope 属性 → 选择器匹配不到，规则形同虚设。
  3. **修复**：改为 `.layout-p :deep(div) { flex: 1 1 100%; width: 100%; min-width: 0 }`（`:deep()` 去掉子选择器的 scope 属性）。
  4. **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **139/139**（无回归）。

- **本轮（2026-09-01 六续）字段组件新增「宽度 / 默认内容 / 内部边框」三项配置**：
  1. **需求（用户指令）**：字段组件增加三项配置 —— ①宽度：字符串，支持 mm/px/% 等；②默认内容：文本域输入；③内部边框：控制 p 标签内的 div 是否显示底边框（默认不显示；勾选后设计 / 预览 / 打印都保持显示）。
  2. **类型（`schema-v2.ts`）**：`FieldPNodeV2` 新增 `width?: string`、`default?: string`、`innerBorder?: boolean`。序列化 `normalizeNode` 的 p 分支为 `{ ...node, field: ... }` 展开，新字段天然可序列化往返，无需改动。
  3. **渲染（`GridSchemaNode.vue`）**：
     - `pStyle` 增 `width: node.width`（未配置时不写，沿用 `.layout-p` 的 `width: 100%`）。
     - `fieldValue` 恢复默认内容回退：`data` 值为空时返回 `node.default ?? ""`（该回退曾于 2026-09-01 续移除，本次按需求恢复）。
     - `<p>` 的 class 增 `'layout-p--inner-border': node.innerBorder`；新增 CSS `.layout-p--inner-border :deep(div) { border-bottom: 1px solid #111827 }`——规则不置于任何 `@media` 内，故设计态 / 预览 / 打印均生效；沿承五续补正，必须用 `:deep()` 才能命中运行时插入的 div。
  4. **设计器（`DesignerApp.vue`）**：字段检查器新增三控件——「默认内容」为 `<textarea class="v2-textarea" rows="3">`（`.v2-control--full` 独占整行），「宽度」输入框与「内部边框」复选在 `.v2-grid-dimensions` 一行两列；新增 handler `updateSelectedWidth` / `updateSelectedDefault` / `updateSelectedInnerBorder`（空串或未勾选时置 `undefined`）；新增测试钩子 `data-field-width` / `data-field-default` / `data-field-inner-border`；新增 `.v2-control input[type="checkbox"]` 样式，避免复选沿用文本框的全宽边框（仍保持「标签在上、控件在下」的上下结构并左对齐）。
  5. **测试**：新建 `src/components/renderer-v2/__tests__/FieldPConfig.test.ts`（10 例：宽度 mm/px/% 与缺省、默认内容预设 / 被 data 覆盖 / 空、填充态控件回退 default、内部边框开关及在 readonly 与填充态均保留）；`DesignerApp.test.ts` 增 3 例（宽度写入与清空回落、默认内容文本域写入并在画布渲染、内部边框勾选 / 取消同步渲染类），25 → 28 例。
  6. **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **152/152** 通过（139 + 13，无回归），未跑 `vite build`。
  7. **未提交**（用户未要求，按「未经允许不提交 git」约定）。

- **本轮（2026-09-01 七续）内部边框（innerBorder）打印不生效修复**：
  1. **问题（用户反馈）**：字段组件「内部边框」配置 `innerBorder=true`，但打印时不显示横线。
  2. **根因定位**：渲染层静态（非填充，即设计 / 预览 / 打印共同走的分支）把字段值渲染成 `<p>` 内的纯文本节点（`{{ fieldValue(node) }}`），**不含任何 `<div>` 子元素**；而内部边框的边框规则是 `.layout-p--inner-border :deep(div) { border-bottom }`，只命中 `<div>`，故静态 / 打印态匹配不到 → 无边框。设计态能"看到"边框仅因用户回车在 contenteditable `<p>` 内插入了运行时 `<div>`；填充态走 `<textarea>`（无 div）同样没有。排除 `@media print` 干扰：`GridSchemaNode.vue` 的 `@media print` 仅移除 `.layout-p--underline`（屏幕预览保留、打印去下划线），不动 innerBorder。
  3. **修复（`GridSchemaNode.vue`）**：
     - 新增 `fieldLines(node)`：`fieldValue(node).split("\n")`，空值返回 `[""]`（至少一行）。
     - 静态（非填充）非复合分支：`node.innerBorder` 时按行渲染 `<div class="layout-p__line" v-for line>{{ line }}</div>`；否则维持原 `{{ fieldValue }}` 纯文本（无 innerBorder 的字段零影响，快照不变）。
     - 静态复合分支：`.layout-p__input` 内容在 `node.innerBorder` 时同样拆成逐行 `<div class="layout-p__line">`，否则原文本。
     - 新增 CSS `.layout-p__line { min-height: 1.35em; width: 100%; text-align: inherit; white-space: pre-wrap; overflow-wrap: anywhere }`——保证空行也有一行高度、底边框可见；通用 `.layout-p :deep(div)` 已让其占满整行并换行，`.layout-p--inner-border :deep(div)` 为每个 div 画**真实** `border-bottom`（打印必然显示，不依赖背景图形，不受浏览器「忽略背景图形」影响）。
     - 填充态（`canFill`）仍走 `<textarea>`（需求仅要求设计 / 预览 / 打印显示 innerBorder），类 `layout-p--inner-border` 仍挂在 `<p>`（既有测试通过）。
     - 更新内部边框 CSS 注释：三态均由真实 border 绘制、打印必定命中。
  4. **测试**：`FieldPConfig.test.ts` 增 1 例——预览（readonly）下 `innerBorder=true` + 多行 default 渲染出与行数一致的 `.layout-p__line` div；空值（无 data 无 default）至少渲染 1 个 `.layout-p__line`。
  5. **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **154/154** 通过（153 + 1，无回归；`FirstFiveRowsSnapshot` 因样例无 innerBorder 字段零变动），未跑 `vite build`。
  6. **未提交**（用户未要求，按「未经允许不提交 git」约定）。

- **本轮（2026-09-01 八续）表格字段按列配置自动派生（替换 `{row}` 占位符方案）**：
  1. **需求（用户指令）**：table 组件在列配置（`columns`）好后，内部 p 标签对应的字段**由列配置生成**，键格式统一为 `列key_行号`（2-part：列 key + 下划线 + 1-based 行号），例如列 `location` 第 3 行 = `location_3`；且与需求设计有区别（原 3-part `colFiled_row_col` 不用）。同时 table 内的 p 标签**不是字段组件，不能被选中或配置**，增删列即增删字段。用户确认：保留 `rowTemplate`、字段前缀用现有列 key、嵌套 Grid 仍允许。
  2. **核心机制（`schema-v2-table-rows.ts` 重写）**：删除 `ROW_PLACEHOLDER` / `bindRowPlaceholder` / `escapeRegExp`；新增 `buildTableRowField(columnKey, rowIndex) = columnKey + "_" + rowIndex`、`bindTableRowCell(node, columnKey, rowIndex)`（仅字段 P 被重写为 `列key_行号`，嵌套 Grid 递归派生、其他节点原样；schema 中手写 field 会被覆盖）、`resolveTableRowCount(node, data) = max(minRows, data 键中 `列key_` 前缀的最大行号)`、`parseTableRowIndex`（私有）；保留 `collectFieldKeys`（收集 schema 手写值，表格内为空）。
  3. **类型 / 校验 / 渲染联动**：
     - `schema-v2-operations.ts`：`createTableNodeV2` 与 `addTableColumnV2` 的行模板字段 P `field` 改为 `""`（注释说明渲染期派生）；`renameTableColumnKeyV2` 仍同步 columnKey/template id（field 为空无需同步）。
     - `schema-v2-validation.ts`：`scanNode` 新增 `insideTableRowTemplate` 参数，表格行模板内的字段 P 跳过 `EMPTY_FIELD` / `DUPLICATE_FIELD` 命名检查（由列配置派生，无需手写唯一名）；Grid/Table 递归透传。
     - `GridSchemaNode.vue`：`<td>` 改用 `bindRowCell(child, column.key, rowIndex)`（= `bindTableRowCell`），`withRowIndex` 移除；静态渲染不变。
     - `DesignerApp.vue`：新增 `isInsideTable(id)`（沿父链上溯遇 `table` 即真）、`isStyleEditableNodeId` 拒绝表内节点；`selectNode` 点击表内 P 时 `selectableIds` 过滤后回退选中所属 Table；`selectableChildrenOf` 对 `table` 返回 `[]`（结构树不展开表内子节点）；表格检查器加提示「列key_行号」自动派生、不可单独配置。
  4. **样例 / 测试 / 快照同步**：
     - `yunlv-second-ticket-first-five-rows.ts` / `yunlv-second-ticket-full.ts`：行模板字段 P `field` 改为 `""`（注释更新为「列key_行号」派生）。
     - `demoData.ts`：`工作地点_1..5` / `工作内容_1..5`（旧命名，与样例列 key 不匹配）替换为 `location_1..4` / `content_1..4`（与样例 `location`/`content` 列逐字对应，含 `地点1`/`地点4` 实值）。
     - `P10Acceptance.test.ts`：逐行 field 断言改为 `[["location_1","content_1"], …]`；填写态回写用例 data 键改为 `location_1`/`location_2`/`content_2`。
     - `YunlvSecondTicketFull.test.ts`：首行字段断言改为 `location_1`/`content_1`。
     - `TableDynamicRows.test.ts`：移除手写 `工作内容_{row}_N` 覆盖（默认列 key 为 col1/col2，字段派生为 `col1_r`/`col2_r`），data 键改为 `col2_5` / `col1_2`。
     - `DesignerApp.test.ts`：原「`{row}` 提示」用例改为「点击表内 P 回退选中 Table 并显示列key_行号 提示、无单独字段名控件」；原「删表内默认字段插文本」用例改为「删列即删派生字段模板」（渲染 `thead th` 减一）。
     - `schema-v2-operations.test.ts`：行模板默认字段断言 `field` 改为 `""`。
     - `FirstFiveRowsSnapshot.test.ts.snap`：删除后重生成，data-field 由 `工作任务_1_1` 等变为 `location_1`/`content_1`（表格级 `data-field="工作任务"` 保留）。
  5. **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **154/154** 通过（无回归，快照按预期更新），未跑 `vite build`。
  6. **未提交**（用户未要求，按「未经允许不提交 git」约定）。
  7. **文档同步**：`design.md`（§6/§11 动态行数描述）、`design-biz.md`（§6/§11）、`acceptance-row-spec.md`（字段绑定约定 + 修订说明）、`development-plan.md`（§0 最后更新补 ⑩、§0.4 表补一行、§2.1 行模板字段描述）均将 `{row}` 占位符方案更新为「列key_行号」自动派生 + 表内字段不可选中配置；`docs/archive/` 历史记录未改动。

- **本轮（2026-09-02）分层核对：设计器 / 渲染组件 / 填充（只核对，不改码）**：
  1. **背景（用户指令）**：目标功能结构为——① 设计器引用渲染组件；② 渲染组件只做渲染（拖拽、配置在其中**不存在**而非被禁用）；③ 填充 = 把数据渲染到渲染组件上。要求核对当前实现、罗列不符合点，作为后续调整清单的依据。
  2. **核对范围**：`GridFormRenderer.vue`、`GridSchemaNode.vue`、`HtmlBlock.vue`、`renderer-v2/index.ts`、`App.vue`、`dev/demoData.ts`、`package.json` 通读当前工作区版本；`src/components/preview/` 与 `src/engine/` 确认为空目录（`engine` 仅有空 `__tests__`）。
  3. **障碍（需用户留意）**：`src/components/designer/DesignerApp.vue` 工作区文件被磁盘加密软件加壳（文件头 `%TSD-Header`；非白名单进程读取全为密文，`git` 读工作区亦为密文 → `git diff` 判为 binary）。改用 `git show HEAD:`（2026-08-31 提交、2497 行明文）+ 当前版 `DesignerApp.test.ts`（562 行 / 28 例）交叉验证；**与该文件直接相关的结论需在工作区文件可读后复核**。
  4. **结论**：符合项 5 条（设计器单一引用点、拖拽/配置实现均在设计器层、非设计态禁用有护栏与测试、打印样式归属渲染组件、表格行数按 data 推导）；**不符合项 15 条**——
     - **A 类（渲染组件不纯）**：A1 三态语义内嵌 props 且由 `data != null` 推断模式；A2 渲染组件内置设计态 `contenteditable` 编辑；A3 填充态（`<textarea>`）与预览态（静态文本 / 逐行 div）是两套 DOM 分支；A4 值回写走 `inject("formFill")`，渲染组件反向依赖设计器、脱离后静默失效；A5 渲染组件持有 `selectedNodeId` 并输出 `.layout-node--selected` 高亮（含 `@media print` 清除分支）。
     - **B 类（分层缺失）**：B1 无独立渲染入口（`App.vue` 只挂 DesignerApp、`preview/` 空、`GridFormRenderer.test.ts` 仅 1 例）；B2 填充数据硬编码 `demoData`、无数据导入/结果导出；B3 设计器直接 import `@/dev/*` 且初始 schema 写死样例；B4 渲染期领域逻辑在 `@/types`，`src/engine/` 是空壳。
     - **C 类（禁用靠手工守卫）**：C1 `addRootGrid`/`addGrid`/`addNodeToSelectedCell`/`startPaletteDrag`/`onCanvasDragOver`/`onCanvasDrop`/`selectNode`/`selectNodeById` 各写一遍 `if (previewMode) return`；C2 设计器靠渲染组件输出的 `data-node-id`/`data-layout-id` + `closest()` 隐式耦合；C3 非设计态仍渲染 Inspector 面板。
     - **D 类（清理）**：D1 `useTextarea`/`inputElType` 恒值死代码（`input` 分支永不命中）；D2 `window.print()` 与 `@media print` 分处两层；D3 渲染组件内为设计态服务的打印样式分支。
  5. **待拍板**：A2 与 §0.3「设计态 contenteditable 不回写 schema（用户曾确认维持）」直接冲突——维持现状 / 设计态只读并在 Inspector 改内容 / 就地输入回写 schema，三者择一。
  6. **产出**：新建 `docs/architecture-layering-review.md`（目标结构、核对范围与局限、符合项、15 条不符合项含位置-现状-目标-优先级、待拍板、五批调整顺序）；`docs/README.md` 索引加一行；`development-plan.md` §0 最后更新补 ⑪、§0.3 加「分层不符合项」「DesignerApp 加密」两条风险、§0.4 表补一行。
  7. **补充（重要，进行中冲突）**：当日日志前一条已确认「拖拽重排已有节点」规划并进入实施，其 P2/P4 把 `draggable` + `@dragstart` 与 `.v2-insertion-line` 插入指示放进 `GridSchemaNode.vue`——与本次目标结构「渲染组件不做拖拽」**直接冲突**，已记为 **A6（P1）**，并要求「先定拖拽归属、再继续拖拽实施」。因 `DesignerApp.vue` 当前不可读，无法确认该实施已落地到什么程度，需在工作区文件可读后复核。
  8. **验证**：本轮无代码改动，未跑 `vue-tsc` / `vitest`（基线为当日实测 **159/159**），未提交 git。

- **本轮（2026-09-02 再续）决策：是否需要分化第二个渲染组件（结论 = 不分组件，改为分层）**：
  1. **问题（用户提问）**：是否有必要再分化出一个渲染组件，专门与设计器协同完成表单设计业务。
  2. **结论**：**不分化第二个渲染组件，改为分化第二层「设计表面（Canvas Surface）」**——渲染内核（`renderer-v2`）保持唯一并同时服务设计器 / 预览 / 填充 / 打印；选中、拖拽源、落点判定、插入指示、节点命中、就地编辑全部收敛到表面层（包裹组件 + composable + overlay），**引用内核而不是复制内核**。
  3. **理由**：分化即「两份 DOM + 两份 CSS」，而边框规则、打印适配、表格派生字段、行高算法这类最易错也最常改的部分必须两边同步，当前「设计器引用渲染组件」的最大收益（所见即所得一致）会被抵消。
  4. **归属判据（写入文档 §6.2 表）**：布局 / 边框 / 文本与字段样式 / 表格派生与行数 / 纸张与 `@media print` → **内核**；选中高亮 / 拖拽源与落点 / 插入指示 / 节点命中反查 / 空容器占位 / 就地编辑 → **表面层**。内核只"让渡"稳定地址（`data-node-id` / `data-layout-id`），交互由表面层负责（对应 C2 契约显式化）。
  5. **真正该分化的条件（§6.3，目前三条均不成立）**：① 设计态与交付态 DOM 结构本质不同；② 两侧 CSS 需独立演进互不复用；③ 设计器与交付端由不同团队维护。即便将来命中 ①，也应优先做内核内 `mode` 分支而非复制组件。
  6. **与拖拽重排（A6）的落法（§6.4）**：拖拽源改由 `CanvasSurface` 在画布层事件委托（从 event target 上溯 `[data-node-id]`），落点复用 `closest('[data-layout-id]')` + 插入 index，插入指示由 overlay 绘制；**`GridSchemaNode.vue` 不加 `draggable` / `@dragstart` / `.v2-insertion-line`**。
  7. **文档同步**：`architecture-layering-review.md` 新增 §6（结论 / 归属判据表 / 分化条件 / 与 A6 的关系 / §6.5 重排后的调整顺序），§5 标注「已被 §6.5 取代」；`docs/README.md` 索引更新；`development-plan.md` §0.3 分层条目补入定案结论。
  8. **状态**：仍无代码改动，未跑验证（基线 159/159），未提交 git；**下一步若要动手，先做 §6.5 第 0 批（C2 契约显式化）**，且需先解决 `DesignerApp.vue` 加密导致的不可读问题。

- **本轮（2026-09-02 再续）前五行样例字段键统一到 JSON 对齐键（已完成）**：
  1. **背景**：P11 完整样例（扁平 13 段 grid，对齐设计器导出 `ticket-schema-v2-1788315240965.json`）与前五行样例（P10 验收）对相同逻辑字段用了不同键——`工作负责人_监护人` vs `工作负责人（监护人）`、`变配电站名称` vs `电站设备`、表列 `location`/`content` vs `工作地点`/`工作内容`（见上条「风险/待确认」）。本次把前五行样例改到 JSON 键，并同步 P10 验收与其快照，消除历史不一致。
  2. **改动**：
     - `yunlv-second-ticket-first-five-rows.ts`：表 `columns` key `location`/`content` → `工作地点`/`工作内容`（与行模板 `tableTemplate("工作地点")`/`tableTemplate("工作内容")` 对齐，渲染期按「列key_行号」派生 `工作地点_r`/`工作内容_r`）；`owner-field` 早已为 `工作负责人（监护人）`、`station-field` 早已为 `电站设备`（上条已改）；行模板注释同步「与 demoData 内嵌表键一致」。
     - `P10Acceptance.test.ts`：`fieldVal("工作负责人_监护人")` → `工作负责人（监护人）`；逐行 field 断言 `[["location_1","content_1"]…]` → `[["工作地点_1","工作内容_1"]…]`；填写态回写用例 data 键 `location_1`/`location_2`/`content_2` → `工作地点_1`/`工作地点_2`/`工作内容_2`；`demoData` 键存在性断言随之通过。
     - `demoData.ts`：由「两套键并集」收敛为**单一 JSON 对齐键集**——删除旧键 `工作负责人_监护人`/`变配电站名称`/`计划工作时间_1`/`计划工作时间_2`/`注意事项（安全措施）`/`注意事项备注`/`补充安全措施备注`/`确认工作负责人签名`/`确认工作许可人签名`/`确认工作班成员签名`/`终结时间`/`终结工作负责人签名`/`终结工作负责人日期`/`终结工作许可人签名`/`终结工作许可人日期`/`location_*`/`content_*`，保留 `工作地点_1..5`/`工作内容_1..5`（完整样例 5 行、前五行只读前 4）。
     - `FirstFiveRowsSnapshot.test.ts.snap`：`vitest run FirstFiveRowsSnapshot -u` 重生成（data-field 变 `工作地点_*`/`工作内容_*`、`工作负责人（监护人）`/`电站设备`）。
  3. **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **159/159（16 文件）** 通过，无回归；未跑 `vite build`；未提交 git。
  4. **残留风险（已消除）**：`demoData.ts` 历史上会被外部按样例 schema 自动重写（race）。因两样例现已共用 `工作地点`/`工作内容` 列键、派生键一致，自动重写后仍为 `工作地点_*`，与手定稿相同，风险解除。

- **本轮（2026-09-02 四续）交付场景差距分析（只核对，不改码）**：
  1. **场景（用户给定）**：设计器设计表单 → 表单配置存服务器作为模板 → 浏览表单详情时从服务器取模板配置 → 页面上仅渲染该表单。要求找出与当前实现的差距。
  2. **核对对象**：`schema-v2-serialization.ts`（全文）、`schema-v2-validation.ts`（统计 error 18 / warning 10 处）、`schema-v2-table-rows.ts`（全文）、`schema-v2.ts`（`FormSchemaV2`/`FieldPNodeV2`/`FormDataV2`）、`vite.config.ts` / `package.json` / `main.ts`（单入口应用、`private:true`、无 lib 构建、别名 `@→src`）、`styles/root.css`（仅 `body{margin:0}`，无强全局依赖）。
  3. **结论**：**四段链路只有第 ① 段（设计）完整**，共 **19 项差距（G1–G19）**，其中 **P0 七项**——
     - G1 无保存出口：只有 `exportFile`（浏览器下载 JSON）与 `saveToLocal`（localStorage），无 API 调用也无保存回调；
     - G5 解析「严格即崩」：`parseFormSchemaV2` 遇任一 error 即 throw，而 `EMPTY_PAGE` / `EMPTY_FIELD` / `DUPLICATE_FIELD` / `INVALID_GRID_ROWS` 等对渲染并不致命 → 线上模板一处瑕疵即详情页白屏；
     - G6 未知节点类型直接 throw（`normalizeNode` 末尾）：设计器今后新增节点类型，未升级的渲染端遇新模板整体崩溃；
     - G12 **无完整字段清单**：`collectFieldKeys` 收不到表格内字段（field 由渲染期派生为 `列key_行号`），也没有按 `minRows × 列key` 枚举的 API → 服务器拿不到表格字段，无法建表 / 校验 / 导出 / 列表展示；
     - G8 渲染组件不可独立交付：`private:true`、无 lib 构建与 `exports`、依赖 `@/` 别名，宿主只能复制源码；
     - G11 详情页（只读）与填写页（可编辑）是两套 DOM（A3 的直接后果）；
     - G16 **空值与 default 语义冲突（实际缺陷）**：`fieldValue` 在 `raw == null || raw === ""` 回退 `default` → 带 default 的字段**无法被清空**（清空后控件又显示默认内容），详情页同样表现为「清空的字段看起来没清掉」。
  4. **其余差距**：G2 草稿与发布未分级（`serialize` 有 error 即拒）；G3 无模板元信息（schema 的 `version:2` 是格式版本而非模板版本，无 templateId/name/revision）；G4 无版本迁移（`version !== 2` 即 throw）；G7 废弃键残留（normalize 展开保留未知键，且仍写入已被渲染层忽略的 `orientation`）；G9 无独立渲染入口与用法文档；G10 纸张外壳硬编码（灰底 + 阴影 + 24px padding，缺 `bare`/`scale`）；G13 无字段级元数据（`FieldPNodeV2` 无 label / required / 校验规则）；G14 无空 data 骨架生成；G15 回写靠 `inject("formFill")` 私有约定；G17 `action`（date / signature / upload / safetyGraphic）渲染端完全未实现；G18 存储型 XSS 通道（渲染侧有 DOMPurify + Shadow DOM，但 `ADD_ATTR` 允许 `target` 且保存侧无清洗）；G19 图片资源引用无约定。
  5. **产出**：新建 `docs/delivery-scenario-gap.md`（链路断点、核对范围、G1–G19 差距表含证据/影响/建议/优先级、8 步最小落地路径、3 项待拍板）；`docs/README.md` 索引加一行。
  6. **与分层清单的关系**：G8/G9 ↔ B1、G11 ↔ A1/A3、G15 ↔ A4、G10 ↔ A5 之后的外壳清理；**建议与 §6.5 分层整改合并推进**。
  7. **状态**：无代码改动，未跑验证（基线 159/159），未提交 git。

---

## 2026-09-02 四续 — 交付场景差距范围重聚焦（据用户第 7 轮定稿澄清，仅核对不改码）

- **用户第 7 轮定稿澄清（原文）**：「当前应用是专注于设计器应用本身，不含服务器、组件消费页面，设计器导出json，组件消费页面引用渲染器+json+data完成渲染，用户再调用打印功能，这就是完整的使用场景。」
- **重聚焦动作**：改写 `docs/delivery-scenario-gap.md`——
  1. 标题/场景/链路全部重述为 `设计器导出JSON →(服务器透明存储·外部)→ 消费页面引用渲染器+json+data渲染 → 用户打印`；
  2. 新增 **§0.1 范围澄清细目**，明确「本应用 = 设计器 + 渲染组件；服务器/消费页 = 外部」，并给出 ◆/◇ 归属表；
  3. 将 G1–G19 全部标注 **◆ 本应用须补 / ◇ 外部实现**：◆ = G4 G5 G6 G7 G8 G9 G10 G11 G12 G13 G14 G15 G16 G17 G18（P0：G5/G6/G8/G11/G12/G16）；◇ = G1 G2 G3 G18b G19（仅备案，不计入本应用行动清单）；
  4. §2.1 / §2.2 改为「◆ 本应用须补」/「◇ 外部实现」两表，每条加「归属」列；§3 最小落地路径改为 6 步（聚焦 ◆ 须补项）；§4 待拍板新增「消费页对接契约（外部 ◇）」一行（本应用只需暴露 `v-model:schema` + `@save`、渲染器 props `schema/data/mode/options`、Schema `version` 字段）。
- **外部条目不影响本应用的理由**：只要求本应用给出 JSON 与渲染器契约，本应用无需提供存储/模板信封/草稿发布分级/资源约定。
- **与分层关系**：◆ P0 六项（G5/G6/G8/G11/G12/G16）正是 §6.5 第 1–4 批（渲染内核瘦身 + 设计表面独立入口 + 解析容错 + 统一 DOM + 字段清单 + 回写 emit），同一件事的两面，合并推进。
- **同步**：`README.md` 索引 `delivery-scenario-gap.md` 行改写为定稿范围说明；`development-plan.md` §0.3 加「交付场景差距范围已定稿」一条、§0.4 表补「2026-09-02 四续」一行。
- **状态**：无代码改动，未跑验证（基线 159/159），未提交 git。
- **本轮（2026-09-02 五续）拖拽重排已有节点（P9）收尾验收 + 修复 drop 回归**：
  1. **背景**：前序会话已完成 P2（拖拽源 + emit）/ P3（DesignerApp drop 分支 + 移除旧的「上移/下移按钮 + 移动到目标格下拉」）/ P4（`.v2-insertion-line` 插入指示）的代码与 `DesignerApp.test.ts` 拖拽用例迁移；本续做验证与修复。
  2. **根因（drop 不生效）**：HTML5 `dragstart` 是冒泡事件，被拖拽字段（如 `owner-field`）的祖先节点（`ticket-layout` grid 等同样绑定了 `@dragstart` 的 `<div>`）也会收到并各自调用 `onNodeDragStart`，后者 `dt.setData(NODE_MOVE_MIME, node.id)` **覆盖了 dataTransfer**、并 `emit("node-drag-start", gridId)` 把被拖拽节点误判为 grid，导致 `legalDropCellIds` 被重置为空、drop 在 `if (!legal.has(cellId)) return` 处静默放弃（调试输出实测 `moveId= ticket-layout` 而非 `owner-field`）。
  3. **修复**：`GridSchemaNode.onNodeDragStart` 在成功分支开头加 `event.stopPropagation()`——只阻断 DOM 事件冒泡到祖先节点，不影响 Vue 自定义事件 `node-drag-start` 沿组件树向上传递到 DesignerApp（emit 链独立）。修复后实测：dragstart 仅命中真实节点、`moveId= owner-field`、`legalDropCellIds` 含目标格、drop 正常提交 `moveNodeToIndexV2`。
  4. **TS 修复**：两处递归 `@node-drag-start="(id) => emit('node-drag-start', id)"` 的 `id` 隐式 any（vue-tsc TS7006）→ 改为 `(id: string) =>`。
  5. **快照回归**：`FirstFiveRowsSnapshot` 因设计态渲染新增 `draggable="true"` 与插入指示 `<!--v-if-->` 锚点导致 `toMatchSnapshot` 偏差，属预期结构变化（拖拽为设计态特性），`vitest run -u` 重生成基线。
  6. **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **157/157（16 文件）** 通过（新增 2 例拖拽：跨格移动 + 同格重排），无回归；未跑 `vite build`；未提交 git。
  7. **架构备注（A6 冲突，未改）**：`architecture-layering-review.md` §6 将「拖拽源/落点」归为**设计表面层**（建议 `CanvasSurface` 画布事件委托，`GridSchemaNode` 不加 `draggable`/`@dragstart`）。但本实现按用户「合并为统一拖拽、拖拽实现后移除旧按钮」决策，直接把拖拽源落在 `GridSchemaNode`、落点判定在 `DesignerApp`。功能已交付且绿灯；A6 表面层分化列为**推迟重构**，不在本轮范围。
  8. **清理核对**：旧的 `moveSelectedNode`/`moveSelectedNodeToTarget`/`moveTargetId`/`dropTargets`/`selectedPosition` 及 `data-move-target`/`node-move="` UI 符号已全部从 `DesignerApp.vue` 移除；`listDropTargetsV2` 定义保留（仍被 `schema-v2-operations.test.ts` 单元测试引用），仅移除其在设计器的使用；`moveNodeV2`/`moveNodeWithinParentV2` 定义保留（仍被单元测试引用），仅移除设计器 UI 引用。预览态 `previewMode` 与 `readonly`/`fillMode` 双重闸门禁用拖拽。



- **本轮（2026-09-02 三续）P7.2e 状态澄清：完整编辑 UI = 已完成（用户确认）**：
  1. **用户澄清**：P7.2e「完整编辑 UI」若指「通过人工方式（设计器 UI）实现符合参考图片结构的工作票模板」，则**已完成**——证据为设计器手动编排出整票并导出 `src/dev/ticket-schema-v2-1788315240965.json`，且 `yunlv-second-ticket-full.ts` 已与之同步（扁平 13 段 grid、字段键与设计器导出一致）。
  2. **核查**：`yunlv-second-ticket-full.ts` 含导出 JSON 的全部特征字段（工作负责人（监护人）/ 电站设备 / 工作地点·工作内容 表列 / 安措备注 / 延期工作负责人签名日期 / 工作票终结日期 / 工作负责人签名-终结 等）与 13 个段 grid id，确认 .ts 与导出 JSON 对齐。
  3. **文档动作**：`development-plan.md` 中 P7.2e 从「推迟项」移除并记为已完成——§0.1 下一步、§0.2 推迟列表、§0.1 P11-4 排期、§2.1 状态表四处同步；保留其对「设计器人工编排整票模板」的释义。当前剩余推迟项：P9.1c 专用控件、P9.2、P12 清理（P6.3b/c 拖拽已于 2026-09-02 五续以统一拖拽原语完成）。
  4. **基线**：当前 `vitest` 全量 **157/157（16 文件）** 通过（与计划 §0 当前基线一致），`vue-tsc` 干净；本轮仅文档状态更新，无代码改动、未提交 git。

---

## 2026-09-02 六续 — 交付差距整改启动（DesignerApp.vue 解密后实际改码）

- **前提**：用户确认 `DesignerApp.vue` 已解密（工作区 = `HEAD`，可编辑）；此前核对基于 `git HEAD` 版本 + 测试交叉验证，现已能直接读写。
- **侦察发现**：解密后工作区 `DesignerApp.vue` 已含完整拖拽重排（P9）——`DRAG_MIME` / `onCanvasDragOver` / `computeInsertionIndex` / `onCanvasDrop → moveNodeToIndexV2` / `onCanvasNodeDragStart` 画布事件委托（行 518–732，模板 1470–1482），与 §6.5「拖拽走画布事件委托、不进渲染内核」一致。故本次「继续」的落点为定稿清单的 ◆ P0 整改，而非重做拖拽。
- **实施（◆ P0 四项，全量 vitest 165/165、vue-tsc 干净）**：
  1. **G16 空值/default 语义修复**：`renderer-v2/GridSchemaNode.vue` `fieldValue` 区分「data 中无该键（回退 default）」与「有键但为空串（返回空，可清空）」——修复带默认值字段无法清空。
  2. **G12 完整字段清单**：`types/schema-v2-table-rows.ts` 新增 `collectSchemaFields(schema, data?)`，非表格走手写 field，表格按 `列key_行号` × `resolveTableRowCount` 枚举（含嵌套 Grid 内字段 P 派生），输出 `[{key,kind,tableField?,row?}]`；表格主体字段不再遗漏。
  3. **G5 容错解析**：`types/schema-v2-serialization.ts` 新增 `parseTolerantFormSchemaV2`（JSON 非法 / 结构非法 / 含校验 error 均不抛错，返回 `{schema,issues,ok}`）；严格 `parseFormSchemaV2` 行为不变（消费页可容忍设计器瑕疵 / 新版本模板）。
  4. **G6 未知类型降级**：`normalizeNode` 未知类型放行（不再整体 throw）；`schema-v2-validation.ts` `scanNode` 新增 `UNKNOWN_NODE_TYPE` error 分支（严格解析仍抛错、容错解析收集后降级）；渲染端对未知类型按 `v-else-if` 链跳过（局部降级，未加显式占位框）。
- **测试新增**：`FieldPConfig.test.ts` G16×1、`schema-v2-table-rows.test.ts` G12×3、`schema-v2.test.ts` G5/G6×4（共 +8，基线 159→165）。
- **同步文档**：`delivery-scenario-gap.md` 追加 §5 整改进度；`development-plan.md` §0.3 加密风险标记解除 + 整改启动指针、§0.4 补执行行；`README.md` 无需改。
- **未提交 git**（沿用约定，未经允许不提交）。
- **下一步 ◆ P0**：G8（渲染组件独立入口 `preview` + props 收敛 `schema/data/mode/options`）/ G11（只读与可编辑统一 DOM）/ G15（回写 `inject("formFill")` 改 `emit`）；其余 ◆ P1/P2/P3（G9/G10/G14/G4/G7/G13/G17/G18）按 §3 路径推进。G6 渲染端显式占位框可后续补。
