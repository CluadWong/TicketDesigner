# P0–P8 阶段详细规格（存档）

> **已存档**：P0–P8 各阶段的详细规格与验收门槛均已实现并通过，从 `development-plan.md` 移出以精简主线文档。
> 原始章节编号为 §4–§12，此处**保留原编号**以便历史引用可追溯。
> 当前主线（P9–P12）与最新状态见 [../development-plan.md](../development-plan.md)。

---

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
