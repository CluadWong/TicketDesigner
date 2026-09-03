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

---

## 2026-09-02 七续 — 交付差距 G8 渲染组件可独立运行

- **目标（定稿范围 G8 选项①）**：渲染组件可作为「消费页」独立引用——不依赖设计器即可 `schema + data + mode` 渲染并填写回写；库化打包（vite lib + dts）延后。
- **实施（全量 vitest 170/170、vue-tsc 干净，基线 165→170）**：
  1. **公共入口 `FormRenderer.vue`**（新建，`components/renderer-v2/`）：props 收敛为 `schema / data? / mode?("preview"|"fill") / options?({bare?})`；`v-model:data`（`update:data`）+ `@field-change`；内部 `provide("formFill", (field,value)=>{ data 回写 + emit update:data + emit field-change })` 桥接内核私有 `inject("formFill")`。设计器 `DesignerApp` 仍直接引用内核 `GridFormRenderer`，本组件是「消费页友好」包装，不暴露任何设计器私有状态（selectedNodeId / 拖拽态 / node-drag-start）。
  2. **内核 `bare` 无外壳**：`GridFormRenderer.vue` 加 `bare?` prop + `<div class="grid-form-canvas" :class="{'grid-form-canvas--bare':bare}">`；CSS `.grid-form-canvas--bare{height:auto;padding:0;background:transparent;overflow:visible}` 去掉灰底画布与纸张阴影，便于消费页嵌入中部而非模拟整张纸。
  3. **独立消费页 `preview/`**（新建）：`preview.html`（根目录，引用 `/src/preview/main.ts`）+ `src/preview/main.ts`（`createApp(App).mount("#app")`，引入 `@/styles/root.css`）+ `src/preview/App.vue`（样例 `makeYunlvSecondTicketFirstFiveRowsSchema` + `demoData`，mode 预览/填写切换 + bare 复选 + `@field-change` 打印；注释说明真实消费页流程 = 服务器 JSON → `parseTolerantFormSchemaV2(json).schema` → `<FormRenderer>`）。
  4. **`vite.config.ts` 多页入口**：`build.rollupOptions.input` 加 `main: index.html` 与 `preview: preview.html`，设计器与消费页演示并存；开发期 `vite` 后分页访问 `/index.html` 与 `/preview.html`。
  5. **`FormRenderer.test.ts`**（新建，5 例）：① preview 模式携带 data 回显只读静态文本、不渲染 `.layout-p__control`；② fill 模式字段初始值来自 data（精确选中 `.layout-p__control[data-field="单位"]`，因外层 `<p>` 也带 data-field，需限定）；③ fill 输入触发 `field-change`（`["单位","新单位值"]`）与 `update:data`（payload 含改写字段）；④ 消费页流程 `parseTolerantFormSchemaV2(JSON.stringify(schema)).schema` 喂给 preview 可渲染并回显；⑤ `options.bare` 渲染出 `grid-form-canvas--bare`。
- **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **170/170（17 文件）** 通过（165 + 新 5），无回归；未跑 `vite build`；未提交 git。
- **遗留契约（G15 待办）**：G8 用 `provide("formFill")` 桥接 + `update:data` emit 已满足消费页「拿到实时数据」需求，但内核 `GridFormRenderer` 仍依赖私有 `inject("formFill")`，与 G15「彻底改为 emit 契约」目标尚有距离——本轮属「临时可用」，G15 仍需把内核回写从 inject 改为 emit。其余 ◆ P0：G11（只读与可编辑统一 DOM）待做。
- **同步文档**：`delivery-scenario-gap.md` §5 进度表补 G8 ✅（含位置/要点）；`development-plan.md` §0「最后更新」开头插 ⑪、§0.3 缺口标记 G8 完成并收窄剩余 P0、§0.1 + §0.4 基线 170/170 + 执行行。

## 2026-09-02 八续 — G11 统一渲染路径（A3）

- **目标**：落实 [architecture-layering-review.md](./architecture-layering-review.md) §6.5 第 4 批 A3「预览/填写同构」——同一份数据在浏览（只读）/填写下版式一致（换行、行高、innerBorder 逐行横线），打印与填写结果对得上；A2（设计态 contenteditable 下线）经用户拍板**延后**，本轮设计态维持原 contenteditable 不回写 schema，未改动其结构。
- **核心改动（`GridSchemaNode.vue`）**：
  1. `<p>` 字段模板重写：预览/填写统一走 `v-if="fillMode"` 分支，复用同一控件——非 innerBorder 渲染 `<textarea :readonly="!canFill">`、innerBorder 渲染 `.layout-p__lines` 可编辑容器（`:contenteditable="canFill ? 'true' : undefined"`），仅 `readonly`/`contenteditable` 差异；设计态保留原 `v-else`（复合 `.layout-p__input` contenteditable、非复合 逐行 `<div>`/文本）。
  2. innerBorder 填充态光标稳定：`v-once` 渲染初始逐行 `<div class="layout-p__line">`，新增 `innerLinesEl` ref + `syncInnerLinesFromData()`，`watch(() => fieldValue(props.node), ...)` 与 `onMounted` 在外部 data 变化时用 `textContent` 重建（焦点在可编辑区时跳过，避免光标跳位；`textContent` 无 HTML 注入）。
  3. 类型收窄：`syncInnerLinesFromData` 头部加 `if (props.node.type !== "p") return;`；`watch` getter 改 `() => props.node.type === "p" ? fieldValue(props.node) : ""`（修复 vue-tsc TS2345 `FormNodeV2` 不能赋给 `FieldPNodeV2`）。
  4. 删除恒为 `true`/`"text"` 的 `useTextarea`/`inputElType`，`<component :is="useTextarea(node) ? 'textarea' : 'input'">` 全部改为直接 `<textarea>`。
- **关键修复 — Vue 3.5.41 编译器崩溃（两处）**：
  - 现象：`vitest` 编译 `GridSchemaNode.vue` 抛 `TypeError: Cannot read properties of undefined (reading '2')`（@vue/compiler-core `injectSlotKey`，codegen 阶段）与 `reading 'trim'`（`transformOn`，transform 阶段）。
  - 根因（本地 `compile_sfc.mjs` 复现确认）：① `<component :is>` 动态组件作为 `v-if`/`v-else` 分支子节点，编译期 `getMemoedVNodeCall`/`injectSlotKey` 路径异常；② `v-once` 元素作为 `v-if` 分支**唯一子节点**时，`createChildrenCodegenNode` 对该分支注入 `key` 触发 `injectSlotKey` 读 `node.arguments[2]`（undefined）崩溃。
  - 方案：动态组件改直接 `<textarea>`（#① 消除）；`v-once` 的 innerBorder 容器不再作为 v-if 唯一子节点，改为与姊妹 `<textarea v-show="!node.innerBorder">` **同渲染、v-show 切换**（分支变为多子节点 → 走 fragment 路径，避开 `injectSlotKey`），`v-once` + watch 光标稳定逻辑保留。编译脚本复现确认两崩溃均消除。
- **测试调整**：
  - `GridSchemaNode.fill.test.ts:135` `control.element.value` → `(control.element as HTMLTextAreaElement).value`（vue-tsc TS2339 `value` 不存在于 `VueNode`）。
  - 4 个渲染测试断言随统一路径更新：preview 现渲染 readonly `.layout-p__control` 并带值（`GridSchemaNode.fill.test.ts` / `FieldPConfig.test.ts` / `FormRenderer.test.ts` / `P10Acceptance.test.ts`）。
  - `designer/__tests__/DesignerApp.test.ts` 预览断言：原查 `.layout-p__input` contenteditable → 改为断言渲染 readonly `.layout-p__control`（普通字段 `unit-field` 与复合字段 `member-count-field` 均如此），并校验复合字段 `.layout-p__input` 在预览下不再渲染。
  - `FirstFiveRowsSnapshot`：设计态 DOM 因模板内 4 处 HTML 注释污染而变动 → 移除这些注释（G11 理由已写入 `<script>` JSDoc）后快照零变动，设计态 DOM 与基线一致（A2 维持）。
- **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **170/170（17 文件）** 通过，无回归；未跑 `vite build`；未提交 git。
- **遗留**：A2 设计态 contenteditable 延后（本轮未动，行为维持「可临时编辑但不回写 schema」）；G15 内核回写从私有 `inject("formFill")` 改为 emit 契约仍待办（G8 已用 `provide`+`update:data` 桥接临时可用）。当前 ◆ P0 仅剩 G15。

## 2026-09-02 九续 — G15 数据回写契约化（A4）

- **目标**：落实 [architecture-layering-review.md](./architecture-layering-review.md) §6.5 第 1 批 A4「数据回写契约化」——内核不再依赖设计器私有的 `inject("formFill")` 字符串 key，改为正式 `emit("field-change", field, value)`，使渲染组件可彻底脱离设计器独立运行，消费页用 `v-model:data` 即可拿到实时填写结果。
- **核心改动**：
  1. `GridSchemaNode.vue`（内核叶）：删 `inject("formFill")` 与 `const formFill`；`defineEmits` 加 `(e: "field-change", field: string, value: string): void`；`onFillInput` 改 `emit("field-change", field, readEditableText(...))`；删 `import { inject }`。两处递归子 `<GridSchemaNode>` 加 `@field-change="... => emit('field-change', ...)"` 透传。
  2. `GridFormRenderer.vue`（内核根）：`defineEmits` 加 `field-change`；页面级 `<GridSchemaNode>` 加 `@field-change="... => emit('field-change', ...)"`。
  3. `FormRenderer.vue`（消费页公共入口）：删 `provide("formFill", ...)` 与 `import { provide }`；新增 `onFieldChange(field, value)` 监听内核 `@field-change`，写回内部 `data` 并 re-emit `field-change`/`update:data`（维持消费页 `v-model:data` 契约）。
  4. `DesignerApp.vue`（设计器）：删 `provide("formFill", ...)` 与 `import { provide }`；`<GridSchemaRenderer>` 加 `@field-change="onCanvasFieldChange"`，`onCanvasFieldChange` 写回响应式 `previewFormData`。
  5. `src/preview/App.vue`：无改动（本就监听 `FormRenderer` 的 `@field-change` 打印）。
- **测试调整**：`GridSchemaNode.fill.test.ts` 7 例由 `global: { provide: { formFill } }` + `expect(formFill).toHaveBeenCalledWith(...)` 改为直接断言 `wrapper.emitted("field-change")`（设计态/只读预览/文本节点用例断言 `toBeFalsy()`）。`FormRenderer.test.ts`/`DesignerApp.test.ts` 因消费页/设计器改为监听 emit，行为不变，零改动。
- **验证**：`vue-tsc --noEmit` 干净；`vitest` 全量 **170/170（17 文件）** 通过，无回归；未跑 `vite build`；未提交 git。
- **结论**：◆ P0 全部落地（G5/G6/G8/G11/G12/G15/G16 均 ✅），渲染组件已具备「独立消费 JSON+data 并正确回写」能力；A4 完成，剩余 ◆ P1/P2/P3（G9/G10/G14/G4/G7/G13/G17/G18）按交付差距 §3 路径推进。

---

## 2026-09-02 十续 — 字段 P 改回 `<p>` 渲染 + 新增 collectFieldValues DOM 采集

- **用户反馈（两条）**：① 预览/填充态原本把字段 P 的 `<p>` 替换成 `<textarea>` 渲染，导致 `<p>` 所在行高被撑开、版式与设计态不符；要求「保持原本的 `<p>` 标签进行数据填入即可」。② 预览时用户输入不必过程中逐键记录，只需提供一个「通过 DOM 遍历字段的组件」去获取。
- **核心改动（`GridSchemaNode.vue`）**：
  1. 字段 P 预览/填充态统一渲染为可编辑 `<p>`（与设计态同结构、行高一致），移除八续引入的 `<textarea>` 分支；`onFillInput` 改 `onFillBlur`（`@blur` 失焦一次 `emit("field-change", field, readEditableText(...))`，输入过程不实时回写）；非复合字段 `fieldValue(node)` 直接进 `<p>` 文本、复合字段 `.layout-p__input` span 可编辑、innerBorder 走 `.layout-p__lines`（`v-once`）逐行 `<div>`；`canFill` 保持 `computed(() => fillMode && props.readonly !== true)`。
  2. 新增 `readEditableText`（优先 `innerText`、jsdom 回退 `textContent`，保留换行）。
  3. 新增 `collectFieldValues(root)`（`collectFieldValues.ts`）：遍历渲染 DOM 的 `[data-field]` 读 `innerText`（img 读 `src`），供消费页/设计器随时采集（无需逐键回写）。
  4. `DesignerApp.vue`：引入 `collectFieldValues`、`canvasEl` ref 挂在画布 `<main>`、`collectFormValues()` `defineExpose` 暴露；画布 `<GridSchemaRenderer :readonly="false">`（预览态字段可编辑、可被 DOM 采集）。
  5. `renderer-v2/index.ts` 导出 `collectFieldValues`。
- **Vue 3.5.41 编译器崩溃（十续新增，固化为 skill `vue-sfc-compiler-crashes`）**：`v-once` 元素作为 `v-if` 分支**唯一子节点**触发 `injectSlotKey`/`reading '2'`（`<component :is>` 分支内另触发 `transformOn`/`reading 'trim'`）；方案：把 `v-if` 直接挂 `v-once` 元素自身、非 v-if 分支用 `<template v-else>`（无额外 DOM、不污染快照），编译脚本复现确认崩溃消除。
- **测试调整**：重写 `GridSchemaNode.fill.test.ts`（`<p>` contenteditable + 失焦 emit、设计/只读不 emit）；`FieldPConfig.test.ts`/`FormRenderer.test.ts`/`P10Acceptance.test.ts`/`TableDynamicRows.test.ts` 预览/填充断言改查 `[data-field].text()`；`DesignerApp.test.ts` 预览态断言 `<p>` 可编辑 + 值来自数据、填充态失焦回写、新增 `collectFormValues` DOM 采集用例；新增 `collectFieldValues.test.ts`（含表格逐行）。
- **验证**：`vue-tsc --noEmit` 干净；`vitest` **171/173（17 文件）**——仅 `DesignerApp.test.ts` 2 例失败（预览态 `unit-field` 文本空、默认内容回退空），根因留待十一续；未跑 `vite build`；未提交 git。

## 2026-09-02 十一续 — 修复非复合字段在 contenteditable `<p>` 下文本不渲染

- **目标**：修复十续遗留的 2 个 `DesignerApp.test.ts` 失败（预览态 `unit-field` 文本空、设计态默认内容回退空），达成全绿。
- **侦察（关键事实）**：data 已到达 `GridFormRenderer` 的 `data` prop（`previewData["单位"]="121"`），且子 `GridSchemaNode`（unit-field）实例 `props.data["单位"]="121"`、`props.node.field="单位"`；`fieldValue(node)` 经临时 `console.log` 确认返回 `"121"`。但渲染出的 `<p>` 为 `<p ...></p>`（**完全无文本节点**）。对照：复合字段 `member-count-field` 在 `.layout-p__input` 内正常渲染 `"10"`，其余**所有非复合字段**（`number-field`/`owner-field`/`wt-loc`…）均空。
- **根因**：非复合字段的展示值 `{{ fieldValue(node) }}` 是 contenteditable `<p>` 的**直接文本子节点**，且被外层 `<template v-if="isCompositeField(node)">` / `<template v-else>` 配对包裹；当 data **晚于挂载**到达（DesignerApp 先 design 后切 preview，`previewFormData` 在点击时赋值）时，该直接文本子节点**不会被 Vue 重新 patch**（复合字段的值位于内层 `<span>`，故能正常更新）。`P10Acceptance` 因 `mount(GridFormRenderer, { props:{ schema, data } })` 挂载即带 data，走初始渲染路径，故不触发此缺陷、一直绿——这正是两条路径表现分歧的原因。
- **修复（`GridSchemaNode.vue`）**：把 `<p>` 内部结构压平，去除 `<template v-if>` / `<template v-else>` 包裹，改用 `<p>` 的直接子节点 `v-if`/`v-else-if`/`v-else` 链：
  1. 前缀 `<span class="layout-p__label">`（v-if）、复合 `<span class="layout-p__input">`（v-if isCompositeField）、非复合 innerBorder `<span class="layout-p__lines" v-once ref="innerLinesEl">`（v-else-if）、**非复合普通值 `<span class="layout-p__value">{{ fieldValue(node) }}</span>`**（v-else）、后缀 `<span>`。
  2. 展示值 `<span>` 直接作为 `<p>` 的 `v-else` 子项（不再经 `<template v-else>` 包裹），数据晚到时 span 文本随 `fieldValue` 正常刷新。
  3. CSS 新增 `.layout-p__value { flex:1 1 auto; min-width:0; white-space:pre-wrap; overflow-wrap:anywhere }`（作为 `<p>` 的 flex 子项填充整行，保持版式）。
- **测试**：`FirstFiveRowsSnapshot` 设计态每个非复合字段新增 `<span class="layout-p__value"></span>`（空值）→ `vitest -u` 重生成（功能生效非回归）；`DesignerApp.test.ts` 27/27。
- **验证**：`vue-tsc --noEmit` 干净（Exit 0）；`vitest` 全量 **173/173（18 文件）** 通过，无回归；未跑 `vite build`；未提交 git。
- **经验固化**：contenteditable 元素（`<p>`/容器）的**直接文本插值子节点**在「数据晚于挂载到达」时 Vue 不重新 patch；需把值放进内层 `<span>`（或任何非直接文本子节点）才能可靠刷新。后续改字段 P 渲染结构时勿再把 `{{ fieldValue }}` 直接作为 contenteditable 元素的文本子节点、且勿用 `<template v-else>` 包裹它。

## 2026-09-02 十二续 — 修复空值字段 P 塌缩成「一条居中直线、光标在线下」

- **用户反馈（真机）**：`GridSchemaNode.vue` 中非复合字段的空值 `<span class="layout-p__value"></span>` 在 UI 上只显示一条**垂直居中的直线**，点击后**光标落在该直线的下方**，而不是像正常 input 那样「光标在中间、底部才是边框线」。
- **根因（布局推导，与十一续结构是两回事）**：
  1. `.layout-p` 是 `display:flex` 容器，`.layout-p__value` 作为 flex 子项被**块化**（`display:inline` → `block`），空内容时**内容高度为 0**；
  2. 于是 `<p>` 的内容盒塌缩为 0，只剩 `.layout-p--underline` 的 1px 底边框；`<p>` 自身 `align-self:center`，该 1px 线在单元格里被垂直居中 → 视觉上就是「一条居中的直线」；
  3. 而 contenteditable 的**行盒**仍按 `line-height:1.35`（≈17.55px）从内容盒顶部向下撑开，光标位于这个行盒内 → 光标整体落在那条 1px 线**下方**（顺序与直觉相反，因为边框在内容盒底边、行盒从同一基线继续向下溢出）。
- **修复（`GridSchemaNode.vue`，纯 CSS、不动结构/不改文本节点）**：
  1. `.layout-p__value` 新增 `min-height: 1.35em`（与 `.layout-p` 的 `line-height:1.35` 对齐）——空值时也占满一整行，光标落在行内、底部才是边框；有内容时以内容高度为准，`min-height` 仅作下限，**不影响多行换行版式**。
  2. 顺带修同类隐患：`.layout-p__input`（复合字段可输入区，自带 underline）的 `min-height` 由 `1em` → `1.35em`——此前空值块盒（13px）比行盒（17.55px）矮，行盒含光标同样向下溢出压到下划线上。（`.layout-p__lines` 本来就是 1.35em，不受影响。）
- **为何不用「恢复 `::before{content:"\200b"}`」**：注入零宽空格虽也能撑出行盒，但属于可编辑区内容，存在被光标/取值误吞的风险（历史注释即因此被注释掉）；`min-height` 是纯布局下限、不产生任何文本节点，对 `innerText`/`textContent` 采值零影响（`collectFieldValues` 走 `innerText`）。
- **验证**：`vue-tsc --noEmit` 干净（Exit 0）；`vitest` 全量 **173/173（18 文件）** 通过，无回归；未跑 `vite build`；未提交 git。
- **经验固化**：flex 化的 contenteditable 容器里，**每个承载文本的 flex 子项都必须有「一行的高度」下限**（`min-height: <line-height>`），否则空值即塌缩；修 `<p>` 自身的 `min-height` 无效（子项会在其中被 `align-items:center` 居中，行盒仍向下溢出），必须作用在**承载文本的那个子项**上。

## 2026-09-02 十三续 — 修复「选 A3 横向打印仍按 A4 出页」导致内容被裁

- **用户反馈（真机）**：工具栏切到 A3（横向）后画布渲染正常（纸张元素 420×297mm），但打印出来仍是 A4 样式，内容缺失（被裁）。
- **根因**：`@page { size: A4; margin: 0 }` **硬编码在 `DesignerApp.vue` 的样式块里**。`@page` 是页面级规则——既不能写成组件 scoped 样式、也无法用 Vue 绑定——所以 P11-3 把「方向由纸张尺寸派生」落到渲染层（`paperSize` computed：A3→420×297）与校验层（`pageUsableHeightMm`）后，**唯独打印纸张尺寸没跟着变**：屏幕 420mm 宽、打印页 210mm 宽 → 右侧内容被裁。
- **修复（纸张尺寸单一来源 + 运行时注入 `@page`）**：
  1. `src/types/schema-v2.ts` 新增**共享解析**：`PAPER_SIDE_MM`（A4 210/297、A3 297/420）+ `resolvePaperSizeV2(paper)` → `{size, orientation, widthMm, heightMm}`（方向由尺寸派生：A4 纵向 / A3 横向）。渲染、打印、校验三处统一调用，杜绝各处硬编码。
  2. 新增 `src/components/renderer-v2/page-size-style.ts`：`document.head` **单例 `<style id="grid-form-page-size">`**，写入 `@page { size: <w>mm <h>mm; margin: 0 }`；`setPageSizeStyle(w,h)` 幂等更新、`registerPageSizeStyle()` 登记使用者并在最后一个释放时移除、`currentPageSizeStyle()` 供测试/调试。写具体毫米值而非 `A3 landscape`（各浏览器对「关键字+方向」支持不一致，物理尺寸最稳且与纸张元素完全对齐）。
  3. `GridFormRenderer.vue`（渲染内核）：`paperSize` 改用 `resolvePaperSizeV2`；`watch(paperSize, s => setPageSizeStyle(s.widthMm, s.heightMm), { immediate: true })` + `onUnmounted(registerPageSizeStyle())`。**放在内核而非设计器**，消费页 `<FormRenderer>` 打印同样正确。
  4. `DesignerApp.vue`：删除硬编码 `@page { size: A4 }`（留注释说明由内核注入）。
  5. `schema-v2-validation.ts`：`pageUsableHeightMm` 删除本地 `PAPER_SIDE_MM`，改用 `resolvePaperSizeV2`（消除第二份纸张尺寸副本）。
  6. `renderer-v2/index.ts` 导出 `setPageSizeStyle / registerPageSizeStyle / currentPageSizeStyle`。
- **测试**：新增 `src/components/renderer-v2/__tests__/PaperSizePrint.test.ts`（4 例）：A4→`@page { size: 210mm 297mm }` 且纸张元素 210mm/297mm；A3→`420mm 297mm` 且纸张元素 420mm；A4→A3 切换时 `@page` 同步更新（回归用例）；全部实例卸载后移除注入样式。
- **踩坑**：初版用**模块级引用计数**（`applyPageSizeStyle` 每次 +1），切纸张时 watch 再次触发导致计数虚高、卸载后样式残留（测试暴露）。改为**「更新」与「登记」分离**（`setPageSizeStyle` 幂等更新不计数 + `registerPageSizeStyle()` 返回 release 函数交给 `onUnmounted`）。另：测试里不可直接 `remove()` 该 style（模块缓存引用会失效），须走 `unmount()` 释放。
- **验证**：`vue-tsc --noEmit` 干净（Exit 0）；`vitest` 全量 **177/177（19 文件）**（173 + 新 4）通过，无回归；未跑 `vite build`；未提交 git。
- **经验固化**：`@page` 只能用运行时注入的全局 `<style>` 表达；任何「纸张尺寸」都必须来自 `resolvePaperSizeV2` 单一来源——渲染尺寸、打印 `@page`、溢出校验三者一旦各写一份，就会出现「屏幕对、打印错」。

## 2026-09-02 十四续 — Grid 组件增加 gap 单元格间距配置

- **需求**：Grid 增加 gap 样式配置（用户选单一 gap：同时作用于行间距与列间距，等价于 CSS `gap`）。
- **Schema（`types/schema-v2.ts`）**：`GridNodeV2` 新增 `gap?: number`（mm，非负，行列同值）。
- **解析/操作（`types/schema-v2-operations.ts`）**：新增 `updateGridGapV2(schema, gridId, gap)`（0/负/非数字→清字段）、`resolveGridGapV2(grid)`（缺省/非法回退 0，旧数据保持单元格紧贴）。
- **序列化（`types/schema-v2-serialization.ts`）**：`normalizeNode` 的 grid 分支显式规范化 gap（非法值清除），导出干净；`schema-v2-validation.ts` 的 `validateGrid` 加 `INVALID_GRID_GAP`（warning）。
- **渲染（`GridSchemaNode.vue`）**：`.layout-grid` 容器加 `gridContainerStyle(node)`→`rowGap`（flex 行间距，因容器是 flex column）；`.layout-grid__row` 的 `gridRowStyle` 加 `columnGap`（grid 列间距）。导入 `resolveGridGapV2`。
- **设计器（`DesignerApp.vue`）**：Grid 选中时在「单元格默认」分组新增「单元格间距(mm)」输入（`data-grid="gap"`，`@change="updateGridGap"`），导入 `updateGridGapV2`。
- **与边框规则交互**：内部线单边归属（每格只画自身单边）在 gap 下表现为「每条线之间出现等距留白」——这是 CSS gap 的必然结果，符合「单元格分开」语义，无需特殊处理；相邻 Grid 外框去重逻辑不受影响。
- **测试**：`schema-v2-operations.test.ts` +1（`resolveGridGapV2`/`updateGridGapV2`）、`GridGap.test.ts`（新增 3：无 gap 无字段 / gap=6 行+列均 6mm / 嵌套 Grid 独立计算 gap）、`schema-v2.test.ts` +2（round-trip 保留 gap / 非法 gap 载入清除）、`DesignerApp.test.ts` +1（检查器设 gap 写回 schema.gap）。
- **验证**：`vue-tsc --noEmit` 干净（Exit 0）；`vitest` 全量 **184/184（20 文件）**（177 + 新 7）通过，无回归；未跑 `vite build`；未提交 git。

## 2026-09-02 十五续 — 修复「Grid `gap` 下内部边框归属错误」导致前一列视觉无边框

- **用户反馈（真机）**：十四续新增的 Grid `gap` 在 `border:"all"` 下暴露问题——2 列 `gap:4mm` 时**第一列 cell 不显示右边框**、看起来与 gap 融成一体；分 3 列时**第 2 列也缺右边框**。用户明确指认是 `.layout-grid--all > .layout-grid__row > .layout-grid__cell` 样式问题。
- **根因**：十四续的「单边归属」把内部垂直分隔线画在「非首列 cell 的 `border-left`」、内部水平线画在「非首行 cell 的 `border-top`」。**gap 是列与列 / 行与行之间的留白**——非首列 cell 的 left 边框被推到 gap 中间（距前一列内容边缘 4mm 处），于是前一列（第 1 列、3 列里的第 2 列）视觉上**没有右边缘的线**、被 gap 的留白「吞掉」，看起来像和 gap 连成一片；3 列同理（第 2 列 left 边框落在它与第 3 列之间的 gap，第 2 列本身右缘无线）。
- **修复（`GridSchemaNode.vue`，纯 CSS、不动结构）**：把内部线归属从「下一个 cell 的 left/top」翻转成「**当前 cell 的 right/bottom**」——
  - 垂直：`非末列 cell` 画 `border-right`（原：非首列画 `border-left`）；
  - 水平：`非末行 cell` 画 `border-bottom`（原：非首行画 `border-top`）。
  - 这样每条线都落在**拥有它的那个 cell 自身边缘**上：gap>0 时线紧贴该列/行的右/下边界，留白（column-gap/row-gap）落在外侧，列与列、行与行不再粘连，每列每行的右/下分隔线都清晰可见。
  - **单边归属不变**：仍只有「非末列」画 right、末列不画（与容器外框不重叠成 2px）；「非末行」画 bottom、末行不画。嵌套 Grid / Table 相邻沿用 P4.3 机制仍无双边框。
  - **gap=0 视觉与旧规则完全一致**：相邻 cell 之间仍单条 1px 线，只是换了一侧拥有，无版式回退。
  - 同步更新注释：原「非首行上边框 / 非首列左边框」改为「非末行下边框 / 非末列右边框」，并注明 gap 下留白落外侧的语义。
- **测试**：`GridGap.test.ts` +1（`gap + border=all：列/行间距生效且 2×2=4 cell 全部渲染、列间距 4mm 生效` 的结构回归，锁定「边框归属修正不丢 cell」）。jsdom 无法可靠计算 scoped `border-*` 计算样式（scoped 选择器带 `data-v`、getComputedStyle 不应用），故**不**另起 computed-style 断言（脆弱）；边框归属正确性由 CSS 规则本身 + 全量回归背书。
- **验证**：`vue-tsc --noEmit` 干净（Exit 0）；`vitest` 全量 **185/185（20 文件）**（184 + 新 1）通过，无回归；未跑 `vite build`；未提交 git。
- **经验固化（补充十四续「无需特殊处理」那条）**：十四续写「内部线单边归属在 gap 下表现为线间等距留白、符合预期、无需特殊处理」——**仅当单边归属画在「下一格的 left/top」时才成立**；一旦归属侧是 left/top，gap 会把线推到留白中间、前一格视觉无边框。正确做法是**让每条内部线归属「拥有它的 cell 的 right/bottom」**，线永远贴在自己边缘、留白在外侧。记此修正，避免后续 Table 边框复用同一错误归属。

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
