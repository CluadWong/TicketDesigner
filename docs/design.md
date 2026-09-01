# 表单低代码设计器统一设计文档

> 本文定义固定版式表单设计器的唯一目标架构：嵌套 Grid Schema V2。
>
> 组件业务语义见 [design-biz.md](./design-biz.md)，渲染契约见 [engine.md](./engine.md)，
> 实施顺序见 [development-plan.md](./development-plan.md)。若旧文档或代码注释与本文冲突，以本文为准。
>
> 本文为设计目标契约（spec）；各项能力的实现进度与当前缺口以 [development-plan.md](./development-plan.md) §2.1 为准。
> **P0–P8 阶段详细规格已存档**至 [archive/phase-specs-p0-p8.md](./archive/phase-specs-p0-p8.md)，P9–P12 见 development-plan.md §13–§16；文档总索引见 [README.md](./README.md)。

## 1. 目标

系统用于设计、填写和打印工作票、审批单、记录表等固定纸张表单。设计器不是自由坐标绘图工具，
而是通过可嵌套格子构造稳定、可编辑、可序列化的 A3/A4 版式。

完成标准不是“人工编写的 Schema 可以渲染”，而是：

1. 用户可以通过设计器 UI 构造目标版式。
2. 设计器导出的 Schema 完整表达结构、字段和打印尺寸。
3. 保存并重新加载后，视觉和编辑能力不丢失。
4. 设计态、填写态和打印态使用同一 Schema 与同一 Renderer。
5. 输入真实数据后，字段位置、行高、边框和分页仍与模板一致。

## 2. 总体架构

```text
Designer
├─ 编辑嵌套 Schema
├─ 维护运行时 ID 索引
└─ 保存 FormSchema
          │
          ▼
GridFormRenderer
├─ 递归渲染 Grid/P/Table/HTML/Image
├─ 检测固定尺寸溢出
└─ 生成纸张 DOM
          │
          ├─ 设计态：选中、格子辅助线、警告
          ├─ 填写态：data/rules、可编辑字段
          └─ 打印态：隐藏辅助 UI，保持业务尺寸
```

核心决策：

- 正式导出和渲染格式使用嵌套 Schema。
- 每个节点仍有稳定唯一 ID。
- 设计器根据嵌套树派生 `id → node/parent/path` 索引，不把索引写入 Schema。
- 静态版式统一由 Grid 表达，不使用绝对定位。
- 固定文字和输入字段统一使用 P，通过 mode 区分。
- Table 只负责规则明细数据。
- HTML 是受控扩展点，不替代结构化模板。
- 固定工作票使用确定行高和 fixed 页面模式。

## 3. Schema 根结构

```ts
interface FormSchemaV2 {
  version: 2
  paper: PaperConfig
  baseRowHeight: number
  pages: PageSchema[]
}

interface PageSchema {
  id: string
  mode: 'fixed'
  margin: EdgeInsets
  children: FormNode[]
}

type FormNode =
  | GridNode
  | PNode
  | TableNode
  | HtmlNode
  | ImageNode
```

`SchemaNodeV2` 只包含 Page 和真正可放置的 FormNode（Grid/P/Table/HTML/Image）。GridRow、GridCell
和 TableCellTemplate 属于布局数据，不能作为独立节点被选择、删除或放入组件库。

### 3.1 为什么选择嵌套 Schema

嵌套结构直接对应设计器中的页面、Grid、行、格子和子组件：

- Renderer 可以递归渲染，不需要先还原 parentId 关系。
- Grid 内部的 Row/Cell 只是布局记录，不是可放置组件；Cell 可以自然包含多个子组件。
- colspan、表格单元格模板和局部复杂布局不依赖脆弱的位置编号。
- 保存的 JSON 可读，便于诊断和人工审查。
- 移动组件就是在两个 children 数组之间移动节点。

扁平 `components[] + parentId/index` 可以作为数据库存储转换格式，但不是设计器和 Renderer 的强制契约。

### 3.2 稳定 ID 与派生索引

Page、Grid 和实际组件（P/Table/HTML/Image）使用稳定组件 ID；GridRow/GridCell/TableCellTemplate 仅使用内部布局引用 ID，不进入选择链与可索引的可选节点。设计器加载 Schema 后，对可选节点建立：

```ts
interface EditorNodeRef<T = SchemaNode> {
  node: T
  parent: SchemaNode | null
  path: Array<string | number>
  slot: 'page' | 'row' | 'cell' | 'table-cell' | null
}

type EditorNodeIndex = Map<string, EditorNodeRef>
```

索引只存在于内存中，用于选中、拖拽、父级面包屑、配置更新和撤销重做。Schema 变化后增量更新或重建。

## 4. Grid 模型

```ts
interface GridNode {
  id: string
  type: 'grid'
  border: 'all' | 'outer' | 'inner' | 'none'
  rows: GridRow[]
  style?: BoxStyle
}

interface GridRow {
  id: string
  height: number
  cells: GridCell[]
}

interface GridCell {
  id: string
  width?: number | `${number}fr` | 'auto'
  colspan?: number
  padding?: number
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  children: FormNode[]
}
```

Grid 可以同时表达：

- 表单外框：一个包含多行的根 Grid。
- 单位/编号：一行四格。
- 负责人/班组：一行四格，但关闭内部边框。
- 工作班成员：一行五格。
- 设备名称：一行两格。
- 工作任务：一行两格，右格放 Table。
- 更复杂布局：GridCell 中继续放子 Grid。

GridCell 的内部行列布局通过嵌套 Grid 实现，而不是给 Cell 增加第二套行列模型。这样同一列可以拆成多行多列，
每个子格独立放置 Table 或其他组件；例如工作任务的第二格可以包装为三行单列子 Grid，再分别插入三个 Table。

第一阶段支持 colspan，不强制实现 rowspan。跨行视觉结构优先使用父 Grid + 嵌套子 Grid 表达。

设计器创建规则 Grid 时可使用行列快捷配置：

```ts
createGridBySizeV2({ rows: 5, columns: 4, rowHeight: 1 })
```

该 API 只负责生成初始 `rows[].cells[]`；保存后的 Schema 仍使用标准嵌套结构。每个 Cell 的
`children` 可以继续放置 P、Table、HTML、Image 或子 Grid。复杂表单可以先用行列配置生成骨架，
再逐格调整列宽、合并关系和嵌套组件。

## 5. 行高与尺寸

Schema 定义统一基础行高，例如：

```ts
baseRowHeight: 8 // mm
```

实际高度：

```text
GridRow 高度 = baseRowHeight × row.height
Table 表头高度 = baseRowHeight × table.headerHeight
Table 数据行高度 = baseRowHeight × table.rowHeight
```

约束：

- 普通单行使用 `height: 1`。
- 两行输入区域使用 `height: 2`。
- 工作任务由 1 行表头和 4 行数据组成，外层行高度为 5。
- Renderer 必须将行高输出为 CSS `min-height`，允许 Table 的实际内容将父 GridRow 撑开。
- `row.height`、`headerHeight` 和 `rowHeight` 表示最小行高，而不是内容的最大高度；内容超出时继续向下扩展。
- 所有尺寸使用 mm 或明确的 fr/auto 轨道，不依赖视口缩放推导业务尺寸。

## 6. P 模型

```ts
interface PNode {
  id: string
  type: 'p'
  mode: 'static' | 'field'
  text?: string
  field?: string
  prefix?: string
  suffix?: string
  inputType?: 'text' | 'number' | 'date' | 'signature'
  underline?: boolean
  webUnderline?: boolean
  printUnderline?: boolean
  style?: TextStyle
}
```

约束：

- static P 必须使用 text，不参与数据绑定。
- field P 必须使用 field，值来自外部 data。
- field P 不渲染占位符，字段名通过 `field` 属性绑定。
- field P 可通过可选 `prefix` / `suffix` 组合为“前标签 + 输入器 + 后标签”；只配置 `prefix` 时即可表达“标签 + 输入器”。
- 日期和签名第一阶段作为 inputType，实现成熟后再决定是否升级为专用组件。

## 7. Table 模型

```ts
interface TableNode {
  id: string
  type: 'table'
  field?: string
  columns: TableColumn[]
  headerHeight: number
  rowHeight: number
  minRows: number
  rowTemplate: TableCellTemplate[]
}

interface TableCellTemplate {
  id: string
  columnKey: string
  align?: 'left' | 'center' | 'right'
  children: FormNode[]
}
```

- columns 定义表头、key 和列宽。
- rowTemplate 定义每一数据行的单元格内容。
- 默认 Table 为 `thead > tr > th` 加 `tbody > tr > td > p`；每个数据列模板默认放置一个 Field P。
- 用户可以删除某个默认 P，再在对应 `td` 中放置其他组件，以覆盖特殊单元格需求。
- minRows 确保空数据时仍有可手写/填写的固定行数。
- 动态行数由 data 推导（非 schema 属性）：渲染行数 = `max(minRows, data 中实际出现的最大行号)`，行模板字段以 `{row}` 占位符绑定（如 `工作内容_{row}_2`），data 含 `工作内容_5_2` 即补渲染第 5 行；中间未填行留空，保证 data 完整可见。详见 `src/types/schema-v2-table-rows.ts`。
- 一个单元格需要多个元素时，children 中直接放多个节点或一个子 Grid。
- 静态表单外框、签名区和说明区不使用 Table，统一使用 Grid。

## 8. HTML 与 Image

### 8.1 HTML

HTML 仅处理暂时无法结构化的局部内容：

```ts
interface HtmlNode {
  id: string
  type: 'html'
  html: string
  css?: string
}
```

- HTML 被限制在所属 GridCell 内。
- CSS 经 Shadow DOM 隔离，仅作用本块，不污染表单样式。
- 渲染前由引擎统一用 DOMPurify 清洗，始终剥离 script/事件属性/危险 URL，无信任开关。
- 内部字段用 `{{field}}` 自动绑定 data，无需显式声明。
- 不允许将整张表单放进一个 HTML 节点。

### 8.2 Image

Image 保留 Logo、二维码和图片签章能力。固定图片使用 src，动态图片使用 field，从 data 获取地址。

## 9. 边框模型

边框由 Grid 控制：

- all：外边框和内部格线。
- outer：只有 Grid 外边框。
- inner：只有相邻 Cell 的内部格线。
- none：不绘制边框。

嵌套时父 GridCell 承担外框，子 Grid 使用 inner/none，避免双边框。Table 只绘制自己的表头和行列内部线，
所属 GridCell 负责外部边界。

## 10. 设计器交互

设计器必须支持：

- 选中 Grid 后调整整体行数、列数和边框。
- Grid 内部保存行高、列宽、padding、对齐等布局数据。
- 向 Cell 拖入 Grid、P、Table、HTML、Image。
- 在 Cell 中调整多个子组件顺序。
- 将已有子组件包装为子 Grid。
- 编辑 P 的 static/field 模式。
- 编辑 Table 列、表头、行高、最小行数和行模板。
- Grid 的行列数量通过右侧属性面板调整；组件库只负责添加 Grid 或实际组件，不提供固定的行/列快捷操作。
- 通过节点树或面包屑选择父级容器。
- 显示结构错误、字段冲突和内容溢出。
- 保存、加载、撤销和重做。

设计器不支持任意绝对坐标拖拽。拖放目标必须是 Page、GridCell 或 TableCellTemplate。

## 11. 渲染与运行时数据

Renderer 直接递归 Schema，不执行持久化结构转换：

```text
Page
└─ Grid
   └─ GridRow
      └─ GridCell
         ├─ P
         ├─ Grid
         ├─ Table
         ├─ HTML
         └─ Image
```

数据保持外置：

```ts
type FormData = Record<string, unknown>
type RulesMap = Record<string, FieldRule>
```

- static P 显示 text。
- field P 读取并回写 data[field]。
- Table 数据行数由 data 推导（非 schema 属性）：渲染行数 = `max(minRows, 行模板字段 data 键中最大行号)`，行模板字段用 `{row}` 占位符（如 `工作内容_{row}_2`）与 data 逐行键对应；中间未填行留空。
- readonly/hidden/required 由 RulesMap 提供，不写入模板。
- 重复 field 在设计态给出软警告。

## 12. 页面模式与分页

工作票优先使用 fixed 页面模式：

- 一张 Page 对应一张真实纸张。
- Grid 按确定尺寸排版。
- 内容超出 Page 可用区域时给出 PAPER_OVERFLOW，不自动拆散固定布局。
- 多页固定表单使用多个 PageSchema，页面边界由模板明确声明。

动态明细报表后续支持 flow：普通 Grid 作为不可拆分块，Table 按 data 实际行数渲染、可完整行切分并重复表头（动态行数由 data 推导，非 schema 属性）。

## 13. 版本与迁移

V2 是唯一正式模型和唯一设计器入口。旧流式实现属于待移除的历史代码，不再接受新功能扩展，
也不提供旧模式编辑。保存和加载只处理 `version: 2` 的嵌套 Schema。

## 14. 第一阶段验收基线

云铝电气第二种工作票前五行必须满足以下架构判定。其**具体操作步骤与验收指标以 [development-plan.md](./development-plan.md) P10 为准**，本文不再另列步骤，避免三处描述出现偏差。

1. 能从空白 A4 页面通过 UI 创建，而不是手写 Schema。
2. 标题、四个基本信息行（单位/编号、负责人/班组、成员、设备名称）和工作任务行结构正确，外层 Grid 带 all 边框；逐行字段与边框见 [前五行字段/边框规格表](./acceptance-row-spec.md)。
3. 单行高度一致；工作任务行高度等于 5 个基础行高，左侧“工作任务”竖排，右侧 Table 包含表头和 4 行输入格。
4. 所有输入位置都有独立 field。
5. Schema 保存、重新加载并修改列宽/标签后，结构与样式效果不变。
6. 所有节点仍可被选中、移动和配置。
7. 填入测试数据后能正确回写 data。
8. A4 打印截图与参考 HTML/图片接近，打印尺寸误差不超过 0.5mm。

只有完成上述闭环，才能判断该模型确实能通过设计器实现完整表单。

注：本基线是 P10 验收的架构判定视角；当前因 P7/P8/P9 未完成尚不能全程通过 UI 达成，缺口见 development-plan §2.1。

## 15. 决策记录

1. 嵌套 Schema 是正式导出与渲染格式。
2. 稳定 ID 是节点身份，运行时索引是派生数据。
3. Grid 是静态版式唯一通用容器。
4. P 统一固定文字和输入字段。
5. Table 只处理规则明细。
6. 行高作为最小值；内容自适应撑高时必须保持列、边框和相邻行关系正确。
7. HTML 是受控扩展点，不是模板主格式。
8. UI 构建闭环是架构验收标准，单纯渲染手写 Schema 不算完成。
