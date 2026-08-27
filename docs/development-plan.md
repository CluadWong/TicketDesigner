# 开发计划

> 本计划配套 [design.md](./design.md)、[design-biz.md](./design-biz.md) 和 [engine.md](./engine.md)。
> 当前唯一主线是嵌套 Grid Schema V2；旧流式实现只作为迁移参考，最终需要移除。

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
- [ ] 配置面板仍未覆盖 P7 深层属性：P 字号/字重/对齐/竖排、Table 列编辑（key/标题/宽度/对齐/rowTemplate）、HTML/Image 编辑
- [ ] 用户尚不能从空白页通过 UI 创建“完整前五行”：缺列宽 mm/fr/auto、colspan、合并拆分、组件库拖拽与格子内排序（P6.2/P6.3 未完成）
- [ ] 保存、加载、撤销、预览/填写仍未接入 V2（P8/P9 全未完成）
- [x] 旧测试、旧 Renderer 和旧依赖已清理

### 2.1 设计验证阶段聚焦：前五行闭环验收的前置缺口

当前主线是 P10“前五行闭环验收”（不写 JSON、保存加载、填值打印一致）。经代码核对（2026-08-27），验收所需的以下前置能力仍缺失，P10 目前无法跑通：

| 验收步骤（P10） | 依赖阶段 | 当前状态 |
|---|---|---|
| 3. 创建外层 Grid 并配置行列 | P6.2 / P6.3 | 行列增删、行列数调整、边框已可做；列宽 mm/fr/auto、colspan、合并拆分、拖拽投放未做 |
| 5. 配置全部 static/field P | P7.1 | 文本/字段名/前后标签可编辑；字号/字重/对齐/竖排未做 |
| 6. 创建两列表格和四个数据行 | P7.2 | 仅最小行数可调；列编辑（key/标题/宽度）、rowTemplate 编辑未做 |
| 7-8. 保存并关闭 / 重新加载修改 | P8 | 序列化/反序列化函数已存在（`schema-v2-serialization.ts`，含往返测试）但未接入 UI 与持久化；加载重建 nodeIndex、保存前校验、撤销栈均未做 |
| 9. 填写测试数据 | P9.1 | 未做（无 data 绑定与回写） |
| 10. 打印并对比 | P9.3 | 仅设计态 `@media print` 隐藏 UI；无独立 Preview、无 A3/A4 `@page`、无溢出提示 |

此外，以下已勾项存在依赖未闭环，需在验收前补齐：

- **P2.3 ID 策略**：`保存加载后保留原 ID`、`DOM data-node-id 与 Schema ID 一致` 未勾，直接关系 P10“节点 ID 稳定”门槛。
- **P4.2 尺寸系统**：`mm/fr/auto 列轨道`、`box-sizing 统一`、`固定字体行高`、`fixed Page 可用区域计算` 未勾，直接关系 P4“打印尺寸误差 ≤0.5mm”门槛。
- **P3 溢出警告**依赖固定 mm 列宽估算，但在 fr/auto 列宽落地（P4.2 / P6.2）前，该警告在弹性列下不可靠。

**建议推进顺序**：P2.3 ID 稳定 → P8 保存/加载 → P7 属性编辑 → P6.2/P6.3 列宽与投放 → P4.2 尺寸系统 → P9 填值打印 → P10 独立验收。自动化快照测试（P4.5）应尽早补齐以锁住前五行视觉基线（P0.5）。

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
| 固定文字和字段 | P，通过 static/field mode 区分 |
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
- [ ] 保存加载后保留原 ID
- [ ] DOM data-node-id 与 Schema ID 一致

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

- [ ] mm/fr/auto 列轨道
- [ ] baseRowHeight × height
- [x] Table 表头/数据行最小高度，内容可撑开父 GridRow
- [ ] box-sizing 统一
- [ ] 固定字体、行高和 letter-spacing
- [ ] fixed Page 可用区域计算

### P4.3 边框

- [ ] all/outer/inner/none
- [ ] 嵌套 Grid 无双边框
- [ ] Table 外框和 GridCell 边界不重复
- [ ] colspan 后格线正确

### P4.4 模式

- [x] designer：data-node-id、选中和结构警告
- [ ] preview：字段数据填入和权限
- [x] print：隐藏辅助 UI，业务尺寸不变

### P4.5 测试

- [ ] 组件单测
- [ ] 前五行 DOM 结构快照
- [ ] 8mm/40mm 尺寸测试
- [ ] 长文本和 Table 增行撑高测试
- [x] Chrome/Edge 截图验证

**完成门槛**：正式 Renderer 输出与当前前五行截图基线一致；打印尺寸误差不超过 0.5mm。

## 9. 阶段 P5：设计器基础框架 V2

**目标**：V2 画布具备节点选择和配置更新能力。

- [x] DesignerApp 持有 `FormSchemaV2`
- [x] 提供 nodeIndex、selectedNodeId 和基础属性面板
- [x] 点击 data-node-id 选中节点
- [x] 显示 Page > Grid > 实际组件面包屑
- [ ] 节点树可展开和选择
- [x] 点击空白取消选择；重复点击同一位置可逐级选择祖先
- [x] 点击节点后缓存完整祖先路径，循环选择和面包屑切换只改变 active 节点
- [x] 选择链只显示 Page/Grid/实际组件，GridRow/GridCell 改为布局引用
- [x] 配置更新调用 `updateNode`
- [x] 选中节点显示蓝色内描边和浅色背景，不改变布局尺寸
- [x] 结构错误显示在节点检查面板和状态栏
- [ ] v2 工具栏控制纸张、边距和基础行高
- [x] 所有入口只接受 `version: 2` Schema

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

- [ ] **P6.2a 列宽 mm/fr/auto 编辑**〔MVP·渲染已支持，设计器未暴露〕：选中 Grid 可为每列设 `mm` 数值 / `fr` / `auto`。DoD：列宽编辑后渲染即时反映（复用 `track()`）。（覆盖 P10 步骤 3 各行列数配置）
- [ ] **P6.2b 单元格 padding 与对齐**〔MVP·部分〕：补充 schema 字段与设计器 UI，设水平对齐与 padding；渲染层已有 `verticalAlign`（top/bottom）。DoD：可设单元格水平对齐与内边距并即时渲染。
- [ ] **P6.2c colspan（跨列合并）**〔推迟〕：前五行“合并整行”可由单列 Grid 行实现，非必须；schema/渲染均无 colspan 字段。第一版不做，后续补。
- [ ] **P6.2d 合并/拆分相邻格**〔推迟〕：依赖 P6.2c，第一版不做。
- [ ] **P6.2e Grid 边框模式**〔MVP·已部分具备〕：schema `BorderModeV2` 已定义、`DesignerApp` 已有“边框”配置项；补全 all/outer/inner/none 枚举选择 UI。DoD：可选四种模式并即时渲染（覆盖 P10 步骤 3 外层 Grid 设 all 边框）。

### P6.3 投放

已完成（结构能力）：Cell 投放点显示、插入而非覆盖、级联删除、删末位清理空父级、一键包装子 Grid、禁止移入自身后代。跨格移动的结构纯函数已具备（见“当前进度”），但 UI 拖拽未做。待办：

- [ ] **P6.3a 组件库插入（拖拽增强）**〔MVP·按钮插入已具备〕：当前 P/Grid/Table 由按钮插入，第一版维持按钮插入即可；HTML/Image 拖入推迟。DoD：按钮可插入 P/Grid/Table 到目标格。
- [ ] **P6.3b 格子内排序**〔推迟〕：拖动调整子节点顺序；第一版靠插入顺序构建即可。
- [ ] **P6.3c 跨格移动（UI 拖拽）**〔推迟〕：结构操作已支持，UI 拖拽移动第一版不做，可用删除+重插或配置面板移动替代。

**当前进度**：基础结构纯函数已覆盖空白模板、根 Grid、Grid 行列配置、内部行增删移动、格子拆分合并、跨格移动、子 Grid 包装和节点插入；
组件库拖拽、格子内排序及完整前五行 UI 构建仍待完成。内部行/格子操作不改变其不可选、不可作为独立组件持久化的约束。

**完成门槛**：不手写 JSON，可以创建外层 Grid 并配置五个目标内部行；保存 Schema 与手写基线结构等价。

## 11. 阶段 P7：P、Table、HTML、Image 编辑

> 经代码核对（2026-08-27）：`DesignerApp.vue` 配置面板仅覆盖子集（Grid 行列/边框、P 文本/字段名/前后标签、Table 最小行数）；字号/字重/对齐/竖排、Table 列编辑、HTML/Image 编辑均未接。schema 已定义 `HtmlNodeV2`/`ImageNodeV2` 及 `createHtmlNodeV2`/`createImageNodeV2`，但渲染层尚未渲染 html/image 节点，P7.3/P7.4 的编辑与安全风险（sanitizer/CSS scope/{{field}} 自动绑定）全未做。下方按 MVP / 推迟 拆分。

### P7.1 P

- [ ] **P7.1a static/field 分段控件**〔MVP〕：在属性面板切换 static/field 模式。DoD：选中 P 可切模式并即时渲染。
- [ ] **P7.1b 固定文本编辑**〔MVP〕：编辑 static 文本。DoD：改文本后渲染同步。
- [ ] **P7.1c field 与 inputType 编辑**〔MVP〕：编辑 field 名与输入类型。DoD：field 名编辑后 `data-field` 同步（与 P9.1 数据键一致）。
- [x] field P 空内容、data-field、下划线和打印下划线基础语义
- [x] field P 前标签、输入器、后标签组合渲染
- [ ] **P7.1d 字号、字重、对齐、竖排、不换行**〔MVP·子集〕：**竖排为第一版必需**（P10 工作任务标签）；字号/字重/水平对齐/不换行为打印美观最小支持。DoD：可设竖排与基本字号字重对齐，渲染即时反映（竖排覆盖 P10 步骤 5 左格“工作任务”标签）。

### P7.2 Table

- [ ] **P7.2a 新增/删除/移动列**〔推迟〕：前五行用默认 2 列即可；完整列增删移动推迟到 P11。
- [ ] **P7.2b 编辑 key、标题、宽度、对齐**〔MVP·最小 / 部分推迟〕：第一版保证“创建指定列数表格 + 设列宽”（列宽见 P6.2a）；列 key/标题/对齐完整编辑推迟。DoD：可创建 2 列表格并设列宽。
- [ ] **P7.2c headerHeight、rowHeight、minRows**〔MVP·部分〕：`minRows` 已可通过配置面板设置；`headerHeight`/`rowHeight` 补 schema 字段与 UI。DoD：可设表头高/行高/minRows（覆盖 P10 步骤 6 表头1·行高1·minRows4）。
- [ ] **P7.2d repeatable**〔推迟〕：动态增删行，第一版固定 minRows 即可（与 P9.1d 一致）。
- [ ] **P7.2e 编辑 rowTemplate 的 Cell children**〔推迟〕：依赖 P9.1d 动态绑定，第一版不做。
- [ ] **P7.2f 单元格放 P 或子 Grid**〔MVP〕：工作任务表格 cell 内为 field P（已可插入 P）。DoD：表格 cell 可插入 P/子 Grid。

### P7.3 HTML〔第一版 MVP 基础版，见 engine.md §11〕

- [ ] **P7.3a 渲染隔离（Shadow DOM）**〔MVP〕：`host.attachShadow({ mode: 'open' })` 写入 `<style>${css}</style>${html}`，CSS 仅作用本块。DoD：开发者 HTML/CSS 不污染表单样式。
- [ ] **P7.3b 固定清洗（DOMPurify）**〔MVP〕：引擎级固定 sanitize，剥离 `script/iframe/object/embed`、`on*`、`javascript:`/`data:text/html`，禁 `@import`；始终执行、无 per-node 信任开关。DoD：含 `<script>`/onclick 的片段被剥离，普通结构/样式保留。
- [ ] **P7.3c 字段绑定 `{{field}}`**〔MVP〕：挂载解析为 shadow 内 `<span data-bind="field">`，填值时经 `shadowRoot` 对 `[data-bind]` 原地 `textContent = data[field]`，与 field P / Image 同 in-place 模型。DoD：配置 `单位：{{单位}}` 后填值显示对应 data（覆盖 P10 步骤 9 的 HTML 区块）。
- [ ] **P7.3d 预设模板选择**〔推迟〕
- [ ] **P7.3e 高级源码编辑增强**〔推迟〕
- [ ] **P7.3f sanitize 报告（剥离项回显）**〔推迟〕

### P7.4 Image〔第一版 MVP 基础版〕

- [ ] **P7.4a src/field 模式 + base64**〔MVP〕：`src` 接收 URL 与 base64（`data:image/...;base64,...`）；field 模式填值 `imgEl.src = data[field] ?? src`，原样透传。DoD：静态 base64 签名图与 URL 图均可渲染（见 engine.md §11）。
- [ ] **P7.4b 尺寸和 objectFit**〔MVP，部分〕：`ImageNodeV2.objectFit` 已定义默认 contain；补宽度/高度 mm 配置 UI。DoD：可设 width/height mm 与 objectFit。
- [ ] **P7.4c 加载失败占位**〔MVP〕：URL 模式 `onerror` 占位。DoD：坏链显示占位而非破图。

**完成门槛**：通过属性面板完成标题、所有标签、输入字段、竖排“工作任务”和两列表格配置。

## 12. 阶段 P8：保存、加载和历史

**目标**：编辑结果可以稳定持久化并恢复。

> 范围与现状：第一版 MVP 只需「保存 / 加载 / 基础撤销」闭环（见 §2.2），深撤销栈、版本迁移为推迟项。**节点 ID 稳定依赖 P2.3**，不在本阶段独立完成。
> 关键事实（2026-08-27 核对）：序列化/反序列化函数 `serializeFormSchemaV2` / `parseFormSchemaV2` 已实现于 `src/types/schema-v2-serialization.ts`，并有往返测试（`types/__tests__/schema-v2.test.ts`）；`buildEditorNodeIndexV2` 已实现于 `src/types/schema-v2-index.ts`。因此 P8.1 主要是**接线到设计器 UI 与持久化**，而非从零实现算法。

### P8.1 序列化 / 反序列化接线　[引擎已具备·接线]
- [ ] 设计器「保存」调用 `serializeFormSchemaV2(schema, true)`，输出含 `version=2` 的合法 V2 JSON
- [ ] 「载入 / 导入」调用 `parseFormSchemaV2(json)`，非法输入抛 `SchemaV2SerializationError` 并提示
- **DoD**：前五行 V2 Schema 经 export→import 后深度等价（结构、字段、ID 一致）；非法 JSON 被拦截。往返测试扩展覆盖前五行样例。

### P8.2 持久化通道　[MVP]
- [ ] 接入 localStorage 键值（推荐）与/或文件下载·上传，提供「保存 / 载入 / 新建空白」入口
- [ ] 加载后恢复完整设计器状态（schema、selectedNodeId 若有效）
- **DoD**：保存后刷新页面或「重新加载模板」，前五行视觉与编辑状态一致，可继续编辑（覆盖 P10 步骤 7–8）。

### P8.3 加载后重建 nodeIndex 与可选状态　[MVP]
- [ ] 载入后调用 `buildEditorNodeIndexV2(schema)` 重建索引
- [ ] 恢复 selectedNodeId 并校验有效性；DOM `data-node-id` 与 Schema ID 一致（依赖 P2.3）
- **DoD**：加载后所有节点可被选中、移动、配置（P10 指标“所有节点可再次编辑”）；索引覆盖 Page/Grid/实际组件，不含 Row/Cell 布局节点（与 design.md §3.2 一致）。

### P8.4 保存前结构校验　[MVP]
- [ ] 复用 P3 校验器（`src/types/schema-v2-validation.ts`），保存/导出前跑一次，一次返回全部问题
- **DoD**：结构非法时阻止保存并提示具体错误；合法时通过；与 P3 单测共用校验函数。

### P8.5 基础撤销 / 重做栈（≥20 步）　[MVP]
- [ ] 实现命令栈或快照栈，覆盖属性修改、节点增删、结构操作
- [ ] 提供触发入口（按钮 / Ctrl+Z、Ctrl+Y）
- **DoD**：连续 20 次属性或结构操作后逐步撤销可逐帧还原，重做可恢复（满足完成门槛）。MVP 可用简单快照栈，性能优化后做。

### P8.6 未保存修改提示　[MVP]
- [ ] 比对当前状态与最近保存快照，关闭 / 切换模板前确认
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

- [ ] **P9.1a 从 data 初始化填值**〔MVP〕：加载 Schema + data 后，field P 显示 `data[field]`；Table 固定行内 field 同步 data。DoD：载入带 data 的样例，所有 field 显示对应值。（覆盖 P10 步骤 1–8 构建后进入填值的前提；样例 data 见 `src/dev/demoData.ts`，当前孤立未接、仅作渲染验证 demo，待 P9.1a 实现时再接为“载入样例”的 data）
- [ ] **P9.1b 输入事件回写 data**〔MVP〕：field P 的 `contenteditable` 输入经事件更新 `data[field]`；Table 行内 field 回写对应数组项。DoD：编辑后 `data[field]` 实时更新，保存并重加载值不变。（覆盖 P10 步骤 9、指标“数据回写正确”）
- [ ] **P9.1c number/date/signature 内部控件**〔推迟〕：第一版前五行均为文本/数字文本，用 contenteditable 文本即可；日期选择器、签名板等专用控件后续补。
- [ ] **P9.1d repeatable Table 动态绑定数组 + rowTemplate 行上下文**〔推迟〕：运行时增删行的动态绑定；MVP 固定 minRows 4 行已由 P9.1a/b 的 cell 级绑定覆盖。

### P9.2 权限〔整体推迟，见 §2.2 MVP 范围〕

- [ ] **P9.2a readonly**（字段级）：推迟
- [ ] **P9.2b hidden 且默认保留固定空间**：推迟
- [ ] **P9.2c required 标记和提交校验**：推迟
- [ ] **P9.2d HTML 权限边界**：推迟（开发者专用 + 无 JS，无字段级权限需求；sanitizer 已固定为引擎级策略，见 engine.md §11）

### P9.3 打印

- [ ] **P9.3a A3/A4 `@page`**〔MVP〕：CSS `@page { size: A4; margin: ... }`，默认 A4，A3 可配置。DoD：打印预览纸张尺寸 = A4，无边距漂移。
- [ ] **P9.3b 打印隐藏设计器 UI**〔MVP，已有基础〕：核对骨架、状态栏、选区高亮、设计器工具层在 `@media print` 下全部隐藏，仅保留业务 DOM。
- [ ] **P9.3c 独立 Preview（复用 Preview DOM）**〔MVP〕：新增预览态切换，渲染同打印 DOM，不进入打印即可核对位置/尺寸。DoD：预览所见 ≈ 打印所得。
- [ ] **P9.3d 不改变业务尺寸（共用 DOM，仅隐藏辅助 UI）**〔MVP〕：与 P9.3b 共用同一份 DOM，禁止打印态重新布局/缩放。DoD：设计态与打印态业务坐标一致。（覆盖完成门槛“打印与设计态位置一致”）
- [ ] **P9.3e fixed Page 溢出提示**〔MVP，依赖 P3 校验器 + P4.2 fixed Page 可用区〕：内容超出可用区时提示节点与超量。DoD：构造超长文本触发警告并定位到节点。
- [ ] **P9.3f Chrome/Edge 打印预览验证**〔MVP〕：DoD：两引擎打印预览中 A4 尺寸误差 ≤0.5mm（兼容 §2.2 注明目标引擎）。

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
- [ ] 数据回写正确
- [ ] 打印尺寸误差不超过 0.5mm
- [ ] 主要结构与参考图一致（含左侧“工作任务”竖排、右侧表格表头与 4 行输入格）

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
- [ ] 清理 `src/dev` 旧渲染器副本与孤立文件（`GridSchemaNode.vue`、`GridSchemaRenderer.vue`、`demoData.ts` 等；`yunlv-second-ticket-first-five-rows.ts` 若已迁入正式目录则同步移除 dev 副本）
- [ ] 更新组件开发文档和示例
- [ ] 补充性能和大模板测试

## 17. 风险控制

| 风险 | 控制 |
|---|---|
| Schema 嵌套修改复杂 | 统一节点索引和结构操作纯函数 |
| ID 索引引用过期 | Schema 结构变化后重建/增量更新索引 |
| 行高语义 | 使用 min-height；Table 内容可撑开父 GridRow，溢出检测另行提示 |
| 嵌套边框变粗 | 单边归属规则 + 截图测试 |
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
