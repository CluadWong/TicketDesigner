# 开发计划

> 本计划配套 [design.md](./design.md)、[design-biz.md](./design-biz.md) 和 [engine.md](./engine.md)。
> 当前唯一主线是嵌套 Grid Schema V2；旧流式实现只作为迁移参考，最终需要移除。
> 文档索引见 [README.md](./README.md)；每轮详细过程见 [execution-log.md](./execution-log.md)。
> P0–P8 已完成的阶段详细规格已存档至 [archive/phase-specs-p0-p8.md](./archive/phase-specs-p0-p8.md)。

## 0. 概览（执行追踪）

> 本节点随**每次执行前后**更新：记录当前任务节点状态、已知缺口与最近执行。
> 每轮的**详细过程**追加到 [execution-log.md](./execution-log.md)；本文件只保留结论、状态与指针。
> 最后更新：**2026-09-02（⑬ 十二续 修复空值字段 P 塌缩成「一条居中直线 + 光标落在直线下方」（`.layout-p__value` 新增 `min-height:1.35em`、`.layout-p__input` `1em`→`1.35em`），全量 173/173、vue-tsc 干净；⑫ 十一续 修复非复合字段 contenteditable `<p>` 文本不渲染、全量 173/173、vue-tsc 干净；⑪ G8 渲染组件可独立运行：公共入口 `FormRenderer` + 预览页 multi-page + `bare` 无外壳 + `FormRenderer.test.ts` 5 例，vitest 170/170、vue-tsc 干净；① P7.2d/P9.1d 动态行：确认「可重复」不是 schema 属性，改为渲染期按 data 推导行数 = `max(minRows, data 中出现的最大行号)`，`repeatable` 属性已从 schema/序列化/样例/测试移除；新增 `schema-v2-table-rows.ts` +15 例；② 字段 P 设计态光标居中 + 移除「默认值/多行」配置：设计态空字段经 `::before` 零宽空格行盒垂直居中，默认即 `pre-wrap` 自动换行，仅 number/date 渲染单行 input；`FieldPNodeV2` 删 `default?`/`multiline?`，Inspector 删「多行」「默认值」；P9.1c 专用控件用户确认延后、P7.2f cell 内可放子 Grid 已确认；vitest 138/138；③ 2026-09-01 再续 用户四条指令全部完成（含图形安措）：空白初始化默认根 Grid、相邻 Grid 外框去重（suppressBorders，仅抑制后一个引导侧 top/left）、字段全字符串类型移除输入类型配置（inputType 删除、填充态一律 textarea）、外部组件「图形安措」（action=safetyGraphic + actionParams.matchField），vitest 140/140；④ 2026-09-01 三续 Inspector 布局统一：组件配置标签+输入控件一律上下结构，长文本 textarea 独占整行、其余短控件一行两列（`.v2-control--inline` 改竖 + 新增 `.v2-control--full` / `.v2-grid-dimensions .v2-control{margin:0}`，各节点检查分支按组包进 2 列网格），vue-tsc 干净、vitest 140/140；⑤ 2026-09-01 四续 行高倍数从 table 移到 grid-cell：`TableNodeV2` 删 `headerHeight`/`rowHeight`（表头固定 1× 基准）、`GridCellV2` 加 `rowHeight?:number`（单元格覆盖 Grid 行高）、vue-tsc 干净、vitest 139/139）**；⑥ 2026-09-01 五续 字段 P 设计态无前标签/空字段也能回车换行（`.layout-p` 加 `flex-wrap:wrap` + `.layout-p :deep(div){flex:1 1 100%;width:100%}` 命中 contenteditable 运行时插入的 div、占满整行换行堆叠，vue-tsc 干净、vitest 139/139）；⑦ 2026-09-01 六续 字段组件新增「宽度 / 默认内容 / 内部边框」三项配置（`FieldPNodeV2` 加 `width?:string`/`default?:string`/`innerBorder?:boolean`；渲染层 `pStyle` 写 width、`fieldValue` 回退 default、`.layout-p--inner-border :deep(div)` 画底边框且设计/预览/打印均显示；检查器加文本域「默认内容」+「宽度」+「内部边框」复选，新增 13 例测试，vue-tsc 干净、vitest 152/152）；⑧ 2026-09-01 六续补正 宽度仅作用于可输入区域（无前/后标签→整个 `<p>` 宽度；有前/后标签则只挂内层 `.layout-p__input`/`.layout-p__control` 且 `flexGrow:0` 防拉伸、前缀/后缀不计入宽度），新增 1 例、vitest 153/153）；⑨ 2026-09-01 七续 内部边框(innerBorder)打印不生效修复：根因为静态/预览/打印渲染字段值为纯文本（无 `<div>` 子元素），`.layout-p--inner-border :deep(div)` 匹配不到→无边框；改为静态(非填充)渲染按 `\n` 拆成逐行 `<div class="layout-p__line">`（空值至少一行、min-height 保行高），真实边框打印必然显示，新增 1 例、vitest 154/154）**；⑩ 2026-09-01 八续 表格字段按列配置自动派生（替换原 {row} 占位符方案）：行模板字段 P 的 field 留空，渲染期由 `bindTableRowCell` 按「列key_行号」自动生成（列 location 第 r 行即 `location_r`，与 demoData 的 8 键逐字对应）；表格内字段 P 不可单独选中/配置（点击回退选中所属 Table、结构树不展开 table 子节点、校验跳过表格内字段命名检查），增删列即增删字段；样例/测试/快照/设计器提示全部同步（yunlv 两样例、demoData、P10Acceptance、YunlvSecondTicketFull、TableDynamicRows、FirstFiveRowsSnapshot、DesignerApp、schema-v2-operations），vue-tsc 干净、vitest 154/154**；⑪ **2026-09-02 分层核对（设计器 / 渲染组件 / 填充）**：按用户给定目标结构（设计器引用渲染组件、渲染组件只渲染不拖拽不配置、填充=渲染组件+数据）逐项核对，产出 [architecture-layering-review.md](./architecture-layering-review.md)——列出符合项 5 条与**不符合项 A1–A5（渲染组件不纯：三态内嵌契约 / 设计态 contenteditable / 填充与预览两套 DOM 分支 / inject("formFill") 反向依赖 / selectedNodeId 内嵌）、B1–B4（分层缺失：无独立渲染入口 / 填充数据硬编码 demoData / 设计器依赖 dev 样例 / engine 空壳）、C1–C3（禁用靠逐处守卫 / 隐式 data-node-id 契约 / 非设计态仍渲染面板）、D1–D3（清理项）** 与五批调整顺序；本轮**只核对不改码**。**；⑫ **2026-09-02 G11 统一渲染路径（A3）：预览/填写复用同一控件，仅 readonly/contenteditable 差异，浏览/填写/打印版式一致；设计态 contenteditable 维持不变（A2 延后）；修复 Vue 3.5 编译器 v-once/动态组件崩溃（改直接 textarea + v-show 切换）；同步 5 个测试，vitest 170/170、vue-tsc 干净**

### 0.1 当前主线位置

- **主线：P11「完整工作票」**（P10 前五行闭环已全部验收通过，§14 闸门已解除）。
  - P0–P9 功能闭环；P10 八项验收指标中可自动化部分由 `P10Acceptance.test.ts`（11 例）全覆盖，#7「打印尺寸误差 ≤ 0.5mm」与 #8「结构与参考图一致」经用户真机人工核验通过。
  - **P11-1 已完成**：full 样例对齐为**扁平 13 个独立段 grid**（与设计器导出 `ticket-schema-v2-1788315240965.json` 对齐；border 分布 all×3 / outer×9 / none×4，带 `columns`），消除段间 2px 双边框；前五行样例（P10 验收）字段键已同步到同一 JSON 键集（工作负责人（监护人）/ 电站设备 / 工作地点_* / 工作内容_*）。
  - **P11-3 已完成**：A4 整票打印真机核验通过；打印方向改为由纸张尺寸派生（A4 纵向 / A3 横向）；Table 新增边框配置（all/outer/inner/none，与 Grid 对齐）。
  - **下一步**：P11-2（完整票快照基线，可选）、P11-4（并入推迟项：P9.1c 专用控件、P9.2、P12 清理）。（P7.2e 完整编辑 UI 经用户澄清=「设计器人工编排符合参考图结构的整票模板」，已由导出 JSON `ticket-schema-v2-1788315240965.json` + 同步 `yunlv-second-ticket-full.ts` 完成；P7.2d/P7.2f/P9.1d 已于 2026-09-01 完成。）
- 当前测试基线 **vitest 173/173**，`vue-tsc --noEmit` 干净；每轮详细过程见 **[execution-log.md](./execution-log.md)**。

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
- **设计态字段 P 仍 `contenteditable`（已知行为，未改）**：设计态（无 `data`）下字段 P 与其复合输入区允许就地输入，但**不回写 schema**（仅画布临时文本）。若用户认为这是「看起来能改、改了不生效」的陷阱，可后续统一为设计态只读。
- **分层不符合项（2026-09-02 核对，未整改）**：按「设计器 / 渲染组件 / 填充」三层目标结构核对，共 15 项不符合（A/B/C/D 四类），详见 [architecture-layering-review.md](./architecture-layering-review.md)。其中 **P1 三项**为分层成败关键：① 渲染组件用 `data != null` 推断三态；② 填充态与预览态是两套 DOM 分支；③ 值回写走 `inject("formFill")` 反向依赖设计器。待拍板：设计态 contenteditable 是否下线（与上面「已知行为」条目直接冲突）。**2026-09-02 定案（该文档 §6）：不分化第二个渲染组件**，改为「渲染内核（`renderer-v2`，唯一）+ 设计表面层（选中/拖拽/落点/插入指示，引用内核而非复制）」两层，批次顺序以 §6.5 为准；拖拽重排（A6）的 `dragstart` 走画布事件委托、不进渲染内核。**2026-09-02 五续已按用户「合并为统一拖拽、拖拽实现后移除旧按钮」决策，把拖拽源落在 `GridSchemaNode`、落点判定放在 `DesignerApp`（统一走 `moveNodeToIndexV2`，功能已交付且 vitest 157/157 + vue-tsc 干净绿灯）；A6「表面层分化」列为推迟重构，不在本轮范围**。
- **`DesignerApp.vue` 工作区文件曾被加密（2026-09-02 发现，2026-09-02 五续已解密）**：曾因 `%TSD-Header` 加壳导致非白名单进程读密文；用户已解密，工作区与 `HEAD` 一致（`git diff --stat` 为空），现可正常读写与编辑。
- **交付场景差距范围已定稿（2026-09-02 第 7 轮澄清，仅核对不改码）**：本应用只含**设计器 + 渲染组件**两块，**服务器 / 消费页面为外部**。差距只落在两处：① 设计器导出的 JSON 是否自洽、可被消费；② 渲染组件能否独立于设计器消费 JSON+data 并正确渲染（含打印）。`delivery-scenario-gap.md` 已将 G1–G19 按 **◆ 本应用须补 / ◇ 外部实现** 标注；◆ 须补项 = G4 G5 G6 G7 G8 G9 G10 G11 G12 G13 G14 G15 G16 G17 G18（P0：G5/G6/G8/G11/G12/G16），◇ 外部实现 = G1 G2 G3 G18b G19（仅备案）。与分层整改 §6.5 第 1–4 批重合，建议合并推进。
- **交付差距整改已启动（2026-09-02 五续，解密后）**：◆ P0 中 **G16 / G12 / G5 / G6 已落地**——`fieldValue` 区分「键缺失回退 default」与「键为空串可清空」；新增 `collectSchemaFields(schema, data?)` 完整字段清单（含表格派生 `列key_行号` 与嵌套 Grid 字段）；新增 `parseTolerantFormSchemaV2` 容错解析（JSON/结构/校验 error 均不抛错，返回 `{schema,issues,ok}`，严格 `parseFormSchemaV2` 行为不变）；`normalizeNode` 未知类型放行 + `scanNode` 新增 `UNKNOWN_NODE_TYPE` 校验（严格解析仍抛错、容错解析收集后渲染端按未知类型跳过降级）。**G8 亦已落地（九续）**：公共入口 `FormRenderer`（props `schema/data/mode/options`、`v-model:data` + `@field-change`、桥接 `provide("formFill")`）+ 独立 `preview.html`/`src/preview/main.ts`（消费页演示：JSON→`parseTolerantFormSchemaV2`→`<FormRenderer>`）+ `vite.config.ts` 多页入口 + 内核 `bare` 无外壳 + `FormRenderer.test.ts` 5 例。全量 vitest **170/170**、vue-tsc 干净。**G15 ✅ 已落地（2026-09-02 九续）**：内核 `GridSchemaNode` 移除 `inject("formFill")`，改为 `emit("field-change")`；`GridFormRenderer` 同步 emits 并透传；`FormRenderer` 与 `DesignerApp` 均改为监听内核 `@field-change` 写回（不再 `provide`）。全量 170/170、vue-tsc 干净。当前 ◆ P0 已全部落地（G5/G6/G8/G11/G12/G15/G16）。详见 `delivery-scenario-gap.md` §5。

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
| 2026-09-01 | 表格字段派生（八续） | 行模板字段留空 + 渲染期 `bindTableRowCell` 按「列key_行号」派生 + 表格内 P 不可选中/配置（选中回退 Table、结构树不展开、校验跳过）+ 样例/测试/快照/提示同步 | vue-tsc 干净；vitest 全量 154/154 通过（无回归，FirstFiveRowsSnapshot 重生成 data-field 变 location_1/content_1），设计与需求「字段根据列配置生成」一致 |
| 2026-09-01 | P7.2d/P9.1d 动态行（用户澄清「repeatable 非属性」） | ① 确认「可重复」不是 schema 属性，而是渲染期按 data 推导：行数 = `max(minRows, data 中实际出现过的最大行号)`（例：`minRows=4` 且 data 含 `工作内容_5_2` → 渲染 5 行）；② 移除 `TableNodeV2.repeatable` 布尔属性（schema-v2.ts / schema-v2-operations.ts / schema-v2-serialization.ts / yunlv-second-ticket-full.ts / 2 处测试）——grep 确认无残留；③ 新增 `src/types/schema-v2-table-rows.ts`（`ROW_PLACEHOLDER="{row}"` / `bindRowPlaceholder` / `collectFieldKeys` / `resolveTableRowCount`），渲染层 `GridSchemaNode.vue:361` `v-for="rowIndex in resolveTableRowCount(node, data)"` 已接入；④ P7.2e 经确认即同一机制（逐行 `{row}` 占位符绑定）；⑤ P7.2f 确认 cell 内可放子 Grid（`TableCellTemplateV2.children` 类型含 Grid、`appendNodeToCellV2` 支持、`<td>` 带 `data-layout-id`）；⑥ P9.1c 专用控件用户确认延后 | vue-tsc 干净；vitest 全量 **139/139** 通过（+15 例：`schema-v2-table-rows.test.ts` 12 例含 `工作内容_5_2→5 行` / `TableDynamicRows.test.ts` 3 例渲染期动态行），无回归 |
| 2026-09-01 续 | 字段 P 设计态光标居中 + 移除默认值/多行配置 | ① 设计态空字段 `<p>` 光标贴顶（空 contenteditable 无行盒）→ 加 `.layout-p--field`/`.layout-p__input` 的 `::before{content:"\200b"}` 零宽空格占位行盒，caret 经 flex 交叉轴垂直居中；② 移除 `FieldPNodeV2.multiline?`：`pStyle` 统一 `white-space:pre-wrap`（去掉 nowrap 分支），默认自动换行；③ 移除 `FieldPNodeV2.default?`：`fieldValue` 空数据不再回退 default，`DesignerApp.vue` 删 `updateSelectedMultiline`/`updateSelectedDefault` 与 Inspector「多行」「默认值」；④ `useTextarea(node)` 改为 `inputType!=="number"&&inputType!=="date"`，仅 number/date 渲染原生单行 input；⑤ `GridSchemaNode.fill.test.ts` 把 multiline=false 用例改为「默认 textarea 自动换行」并删 default 回退用例（净 -1） | vue-tsc 干净；vitest 全量 **138/138** 通过（139 - 1），无回归 |
| 2026-09-01 再续 | 用户四条指令全部完成（含图形安措） | ① 空白初始化默认根 Grid（`resetBlank` 插入 `createGridNodeV2`+`insertRootGridV2` 并选中，空 page 工厂不变）；② 相邻 Grid 外框去重（新增 `suppressBorders` prop + `pageSiblingSuppressBorders`/`cellSiblingSuppressBorders`，仅抑制后一个 Grid 引导侧 top/left，CSS `layout-grid--no-*` 置于 `--all/--outer` 之后同级胜出）；③ 字段全字符串类型、移除输入类型（`FieldPNodeV2.inputType` 删除，`useTextarea`/`inputElType` 恒为 true/\"text\"，填充态一律 `<textarea>`；Inspector 删「输入类型」select；样例 `dateField` 去 `inputType`）；④ 外部组件「图形安措」（`FieldPNodeV2.action` 加 `\"safetyGraphic\"` + `actionParams?:Record<string,string>`，Inspector 下拉加选项、选中显「安措匹配字段」输入框写 `actionParams.matchField`） | vue-tsc 干净；vitest 全量 **140/140** 通过（+3：边框去重 2 / 图形安措序列化校验 1 - 1 过期 inputType 用例），无回归 |
| 2026-09-01 三续 | Inspector 布局统一（上下结构 + 一行两列） | ① `.v2-control--inline` 由横向（标签左输入右）改竖向（上下结构）、随 `.v2-control` 一致；新增 `.v2-control--full`（长文本 textarea 独占整行）、`.v2-grid-dimensions .v2-control{margin:0}`；② 各节点检查分支按组包进 2 列网格——Grid（列宽、单元格默认 3 控）、Text/Field-P（水平/垂直对齐+字体、Field-P 前/后标签）、Grid-Cell（内边距/水平/垂直对齐）、Image（图片地址/数据字段）、Table（表头高度/行高/最小行数/边框 2×2）；③ 长文本（文本内容/HTML片段/CSS）独占整行，其余短控件一行两列 | vue-tsc 干净；vitest 全量 **140/140** 通过（含 DesignerApp 25/25，选择器无回归），无回归 |
| 2026-09-01 四续 | 行高倍数从 table 移到 grid-cell | `TableNodeV2` 删 `headerHeight`/`rowHeight`（表头固定 1× 基准行高）；`GridCellV2` 加 `rowHeight?:number`（单元格覆盖所在 Grid 行高）；删除 `updateTableHeaderHeightV2`/`updateTableRowHeightV2` 与 `createTableNodeV2` 默认、`normalizeTable` 默认补全、`INVALID_TABLE_ROW_HEIGHT` 校验；渲染层表格表头/数据行 `minHeight` 固定 `baseRowHeight`、`cellStyle` 按 `cell.rowHeight` 设单元格 `minHeight`；设计器 Table 面板去「表头高度/行高」、Grid-Cell 面板加「行高倍数」(`updateSelectedCellRowHeight`) | vue-tsc 干净；vitest 全量 **139/139** 通过（140 - 1 删除过时表格行高用例；含 DesignerApp 25/25 无回归），无回归 |
| 2026-09-01 五续 | 字段 P 设计态无前标签/空字段回车换行 | 根因：`.layout-p` 为 `display:flex`，无前缀字段 `<p>` 直接 `contenteditable`、回车插入的 `<div>` 被排成一行；修复（CSS-only）：`.layout-p` 加 `flex-wrap:wrap` + `.layout-p > div{flex:1 1 100%;min-width:0}`，强制块级 div 占满整行换行堆叠（复合字段可编辑区在 `.layout-p__input` 不受影响） | vue-tsc 干净；vitest 全量 **139/139** 通过（无回归：DesignerApp 25/25 预览只读、GridSchemaNode 复合字段 data-field、P10Acceptance 表格逐行 data-field 唯一、FirstFiveRowsSnapshot 零变动） |
| 2026-09-01 五续补正 | `:deep()` 命中 contenteditable 运行时 div | 用户实测：`.layout-p > div` 规则不生效（手动给 div 加 `width:100%` 才行）；根因为 scoped 编译成 `.layout-p[data-v] > div[data-v]`、而运行时插入的 div 不带 scope 属性 → 改用 `.layout-p :deep(div){flex:1 1 100%;width:100%;min-width:0}` | vue-tsc 干净；vitest 全量 **139/139** 通过（无回归）；换行观感需浏览器实测（jsdom 不跑布局） |
| 2026-09-01 六续 | 字段组件新增「宽度 / 默认内容 / 内部边框」配置 | `FieldPNodeV2` 新增 `width?:string`（mm/px/% 自由长度）、`default?:string`（默认内容）、`innerBorder?:boolean`（p 内 div 底边框）；渲染层 `pStyle` 写 `width`、`fieldValue` 无 data 时回退 `default`、`.layout-p--inner-border :deep(div){border-bottom}` 且不置于任何 `@media` 内（设计/预览/打印均显示）；检查器新增「默认内容」文本域（独占整行）+「宽度」+「内部边框」复选（一行两列）、3 个 handler、3 个 `data-*` 测试钩子、`.v2-control input[type="checkbox"]` 样式 | vue-tsc 干净；vitest 全量 **152/152** 通过（139 + 13：新建 `FieldPConfig.test.ts` 10 例 + DesignerApp 3 例、25→28），无回归 |
| 2026-09-01 六续补正 | 宽度仅作用于「可输入区域」 | 用户澄清语义：width 针对可输入区域——无前/后标签时整个组件即输入区（`<p>` 写 width），有前/后标签（复合字段）只作用于输入区、前缀/后缀不计入；`pStyle` 改 `width: isCompositeField ? undefined : node.width`，新增 `fieldInputStyle(node)`（`{width, flexGrow:0}`）挂到复合字段内层 `.layout-p__input`（设计）/`.layout-p__control`（填充），`flexGrow:0` 防 flex 拉伸 | vue-tsc 干净；vitest 全量 **153/153** 通过（152 + 1：复合字段 width 用例，无回归） |
| 2026-09-01 七续 | 内部边框(innerBorder) 打印不生效修复 | 根因：静态/预览/打印渲染字段值为纯文本节点（无 `<div>` 子元素），`.layout-p--inner-border :deep(div)` 匹配不到 → 无边框；`@media print` 仅移除 `underline` 不影响 innerBorder，故非打印 CSS 问题。修复：静态（非填充）渲染新增 `fieldLines(node)`（按 `\n` 拆分、空值返回 `[""]`），非复合与复合字段均按行渲染 `<div class="layout-p__line">`，`.layout-p__line{min-height:1.35em}` 保证空行有高度；底边框由既有 `.layout-p--inner-border :deep(div)` 真实边框绘制（打印必然显示，不依赖背景图形）。填充态仍走 textarea（需求未含 fill） | vue-tsc 干净；vitest 全量 **154/154** 通过（153 + 1：静态/预览逐行 div 用例，无回归；`FirstFiveRowsSnapshot` 因样例无 innerBorder 字段零变动） |
| 2026-09-02 | 分层核对（设计器 / 渲染组件 / 填充） | 只核对不改码：通读 `GridFormRenderer.vue` / `GridSchemaNode.vue` / `HtmlBlock.vue` / `App.vue` / `demoData.ts`，`DesignerApp.vue` 因工作区文件被磁盘加密（文件头 `%TSD-Header`）改读 `git HEAD` 版本 + 当前版 `DesignerApp.test.ts`（28 例）交叉验证；产出 [architecture-layering-review.md](./architecture-layering-review.md)：符合项 5 条 + 不符合项 15 条（A1–A5 / B1–B4 / C1–C3 / D1–D3）+ 五批调整顺序 | 无代码改动、无测试运行；`docs/README.md` 索引已加该文档；§0.3 新增「分层不符合项」与「DesignerApp 加密」两条风险 |
| 2026-09-02 续 | P11 full 样例对齐设计器导出 JSON | `yunlv-second-ticket-full.ts` 由「1 外层 Grid + 7 段嵌套 inner」重写为**扁平 13 个独立段 grid**（与设计器导出 `ticket-schema-v2-1788315240965.json` 对齐：border 分布 all×3/outer×9/none×4，带 `columns`）；占位键改有意义（`字段`→`工作班成员人数`，表模板列 key 由渲染期派生 `工作地点_行号`/`工作内容_行号`）；连带 `YunlvSecondTicketFull.test.ts`（+4 例：边框分布断言 / 全字段可索引 / 内嵌表逐行键 / 段 grid id）+ `demoData.ts`（两套键并集，服务 P10 与 P11） | vue-tsc 干净；vitest 全量 **159/159** 通过（154 + 5），无回归 |
| 2026-09-02 再续 | 字段键统一（前五行样例 → JSON 键） | 前五行样例表 `columns` `location`/`content` → `工作地点`/`工作内容`；同步 `P10Acceptance.test.ts`（`工作负责人_监护人`→`工作负责人（监护人）`、逐行 field 与填写态 data 键改为 `工作地点_*`/`工作内容_*`）、`demoData.ts`（收敛为单一 JSON 对齐键集、删旧键）、`FirstFiveRowsSnapshot` 快照 `-u` 重生成 | vue-tsc 干净；vitest 全量 **159/159** 通过（16 文件），无回归 |
| 2026-09-02 八续 | G11 统一渲染路径（A3） | 预览（只读）/ 填写（可编辑）复用同一控件结构，仅 `:readonly="!canFill"` 差异（innerBorder 复用同一 `.layout-p__lines` 可编辑容器，仅 `contenteditable` 差异），保证浏览/填写/打印版式一致（换行、行高、逐行横线）；设计态（无 data）维持原 contenteditable 不回写 schema（A2 延后，未动）。配套修复 Vue 3.5 编译器两崩溃：① `<component :is>` 动态组件置于 `v-if`/`v-else` 分支触发 `transformOn`/`injectSlotKey` → 因 `useTextarea` 恒 true 改为直接 `<textarea>` 并删除 `useTextarea`/`inputElType`；② `v-once` 元素作 `v-if` 分支唯一子节点触发 `injectSlotKey` 读 `node.arguments[2]` → 改 `v-show` 切换（innerBorder/非 innerBorder 两元素同渲染，保留 `v-once` + watch 焦点态不打断以稳定光标）。更新 `GridSchemaNode.fill.test.ts`/`FieldPConfig.test.ts`/`DesignerApp.test.ts` 预览断言（预览渲染 readonly `.layout-p__control` 而非 `.layout-p__input`） | vue-tsc 干净；vitest 全量 **170/170** 通过（无新增用例，断言随统一路径更新；`FirstFiveRowsSnapshot` 移除设计态注释后零变动），无回归 |
| 2026-09-02 四续 | 交付场景差距范围重聚焦（仅核对） | 据用户第 7 轮定稿澄清改 `delivery-scenario-gap.md`：链路重述为 `设计器导出JSON →(服务器透明存储·外部)→ 消费页引用渲染器+json+data → 打印`；新增 §0.1 范围澄清 + G1–G19 **◆本应用须补 / ◇外部实现** 标注；同步 `README.md` 索引与 §0.3 指针。无代码改动 | 无测试运行；文档已回写结论 |
| 2026-09-02 五续 | 交付差距整改启动（解密后实际改码） | ◆ P0：G16 `fieldValue` 清空修复；G12 新增 `collectSchemaFields(schema,data?)`（含表格派生字段）；G5 新增 `parseTolerantFormSchemaV2` 容错解析；G6 `normalizeNode` 未知类型放行 + `scanNode` `UNKNOWN_NODE_TYPE` 校验（渲染端跳过降级）。配套单测：G16×1 / G12×3 / G5·G6×4。不动严格 `parseFormSchemaV2` | vitest 全量 **165/165**（原 159 + 新 8）、vue-tsc 干净；`DesignerApp.vue` 加密风险解除（工作区=HEAD） |
| 2026-09-02 十续 | 字段 P 改回可编辑 `<p>` 渲染 + DOM 采集 | 用户反馈预览/填充态 `<textarea>` 撑开 `<p>` 行高、版式不符 → 字段 P 预览/填充统一渲染为可编辑 `<p>`（设计态同结构、行高一致），移除 textarea 分支；失焦 blur 一次 `emit("field-change")`；新增 `collectFieldValues(root)` 遍历 `[data-field]` 采值、DesignerApp `collectFormValues()` `defineExpose` 暴露（预览 `readonly=false` 使字段可采集）；配套修复 Vue 3.5 `v-once`/`<component :is>` 两编译器崩溃（固化为 skill `vue-sfc-compiler-crashes`） | vue-tsc 干净；vitest **171/173**（仅 `DesignerApp.test.ts` 2 例失败：非复合字段值作 contenteditable `<p>` 直接文本子节点、data 晚于挂载到达时不 patch，十一续闭环）；未提交 git |
| 2026-09-02 十一续 | 修复 contenteditable `<p>` 文本不渲染（十续遗留 2 失败闭环） | 根因：`{{ fieldValue }}` 作 `<p>` 直接文本子节点 + `<template v-else>` 包裹，data 晚到（先 design 后切 preview）时 Vue 不重新 patch；复合字段值在内层 `<span>` 故正常。修复：`<p>` 结构压平为 `v-if`/`v-else-if`/`v-else` 直接子节点链，非复合普通值改用 `<span class="layout-p__value" v-else>{{ fieldValue(node) }}</span>`，新增 `.layout-p__value` CSS；`FirstFiveRowsSnapshot` `-u` 重生成（每非复合字段新增空 `<span class="layout-p__value">`） | vue-tsc 干净；vitest 全量 **173/173（18 文件）** 通过，无回归；未提交 git |

| 2026-09-02 五续 | 拖拽重排已有节点（P9）收尾 + drop 回归修复 | 统一拖拽原语（格内排序/跨格移动/跨 Grid 合并为 moveNodeToIndexV2 单一路经）：GridSchemaNode.onNodeDragStart 加 stopPropagation() 修复 dragstart 冒泡致祖先覆盖 dataTransfer；两处递归 @node-drag-start emit 补 id:string 类型；FirstFiveRowsSnapshot 因设计态新增 draggable 与插入指示锚点 -u 重生成；旧的「上移/下移按钮 + 移动到目标格下拉」UI 已移除 | vue-tsc 干净；vitest 全量 **157/157**（16 文件）通过（+2 拖拽用例：跨格移动 + 同格重排），无回归 |
| 2026-09-02 六续 | 交付差距 G8 渲染组件可独立运行 | ① 公共入口 `FormRenderer.vue`（props `schema/data/mode/options`，`v-model:data` + `@field-change`，`provide("formFill")` 桥接内核 `inject("formFill")`）；② 内核 `GridFormRenderer.vue` 加 `bare` 无外壳（`grid-form-canvas--bare` 去灰底/留白/阴影）；③ 独立消费页 `preview.html` + `src/preview/main.ts` + `src/preview/App.vue`（样例 `makeYunlvSecondTicketFirstFiveRowsSchema` + `demoData`，mode 预览/填写 + bare 切换，`@field-change` 打印）；④ `vite.config.ts` 多页入口（`index.html` 设计器 + `preview.html` 消费页并存）；⑤ `FormRenderer.test.ts` 5 例（preview 只读回显无控件 / fill 控件 + field-change + update:data / parse 消费页流程 / bare 外壳） | vue-tsc 干净；vitest 全量 **170/170**（17 文件，165 + 新 5）通过，无回归 |
| 2026-09-02 十二续 | 修复空值字段 P 塌缩成「一条居中直线、光标在线下」（真机反馈） | 根因：`.layout-p__value` 是 flex 子项被块化，空值时内容高度 0 → `<p>` 内容盒塌缩只剩 1px 下划线（`align-self:center` 使其在格内看起来像「一条居中的直线」），而 contenteditable 行盒仍按 `line-height:1.35` 向下撑开 → 光标落在直线**下方**。修复（纯 CSS）：`.layout-p__value` 加 `min-height:1.35em`；同类隐患 `.layout-p__input`（复合字段可输入区）`min-height` `1em`→`1.35em`；`.layout-p__lines` 本就 1.35em 不变。不恢复 `::before` 零宽空格（避免污染可编辑文本/采值） | vue-tsc 干净；vitest 全量 **173/173（18 文件）** 通过，无回归；未提交 git |
| 2026-09-02 九续 | G15 数据回写契约化（A4） | 内核 `GridSchemaNode` 移除私有 `inject("formFill")`，改为 `emit("field-change", field, value)`；内核根 `GridFormRenderer` 同步 `field-change` 到 emits 并透传；消费者 `FormRenderer`（公共入口）去掉 `provide("formFill")`，改为监听内核 `@field-change` 写回内部 `data` 并 re-emit `field-change`/`update:data`（消费页 `v-model:data` 即可拿到实时填写结果，无需任何 inject 约定）；设计器 `DesignerApp` 去掉 `provide("formFill")`，改为监听内核 `@field-change` 写回响应式 `previewFormData`。配套 `GridSchemaNode.fill.test.ts` 由「断言 inject 的 formFill 被调用」改为「断言 emit 的 field-change」 | vue-tsc 干净；vitest 全量 **170/170** 通过（无新增用例，测试由 provide 改为 emit 断言；`FirstFiveRowsSnapshot` 与 P10 验收零变动），无回归 |

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
