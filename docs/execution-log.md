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
