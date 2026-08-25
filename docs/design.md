# 表单低代码设计器统一设计文档

> 本文定义设计器下一阶段的目标架构。现有 `p / image / table + body[]` 实现作为 v1
> 验证基线保留，但不再作为固定版式工作票的最终模型。
>
> 组件业务约束见 [design-biz.md](./design-biz.md)，实施顺序见
> [development-plan.md](./development-plan.md)。若历史讨论或旧代码注释与本文冲突，以本文为准。

## 1. 目标与边界

系统用于设计、填写和打印具有固定纸张版式的工作票、审批单和记录表。目标不是自由坐标绘图，
而是在 A3/A4 纸张内通过可嵌套格子构造稳定、可编辑、可序列化的版式。

核心约束：

- 画布、预览和打印使用同一棵逻辑组件关系和同一套 DOM。
- 所有静态版式由 `grid` 表达，不使用绝对定位。
- 所有组件存放在一个扁平 `components[]` 中。
- 嵌套关系只通过 `id / parentId / index` 表达，不在组件内保存 `children[]`。
- 单行高度使用统一基础行高，多行区域使用基础行高的整数倍。
- `table` 只负责规则明细数据，不承担通用静态排版。
- `html` 是受控扩展点，不作为整张模板的主要存储格式。

## 2. 核心抽象

### 2.1 格子布局

整张表单是一个根 `grid`。根 Grid 通常为一列，每个直接子 Grid 表示表单中的一行；一行可再次
划分多列，也可以在任意格子中继续放置 Grid、P、Table 或 HTML。

```text
Paper
├─ P：标题
└─ Grid：表单外框
   ├─ Grid：单位 / 输入 / 编号 / 输入
   ├─ Grid：工作负责人 / 输入 / 班组 / 输入
   ├─ Grid：工作班成员 / 输入 / 共 / 人数 / 人
   ├─ Grid：设备名称 / 输入
   └─ Grid：工作任务
      ├─ P：竖排标签
      └─ Table：地点 / 内容明细
```

Grid 只声明列轨道、自身高度、边框和布局属性；其直接子组件从全局组件数组中解析。

### 2.2 扁平组件列表

所有组件实现统一的关系字段：

```ts
interface ComponentBase {
  id: string
  parentId: string | null
  index: number
  colspan?: number
  padding?: number
}

interface FormSchema {
  version: 2
  paper: PaperConfig
  margin: number
  baseRowHeight: number
  components: DesignerComponent[]
}
```

关系规则：

1. `parentId === null` 表示纸张根级组件。
2. `parentId` 必须指向一个 `grid` 或 `table` 容器。
3. 同一父组件下的 `index` 从 0 开始，表示逻辑格子位置。
4. Grid 使用行优先规则计算位置：`column = index % columnCount`，
   `row = floor(index / columnCount)`。
5. Table 子组件的 `index` 表示数据单元格序号：`row * columnCount + column`。
6. 同一父组件下 `index` 默认唯一；需要在一个格子放多个组件时，先在该位置放一个子 Grid。
7. 数组物理顺序不参与布局，保存前可以按 `parentId + index` 排序，也可以保持创建顺序。
8. 删除容器时必须级联删除所有后代，移动容器时只更新该容器的 `parentId/index`。

这种结构避免深层对象的不可控修改，便于按 ID 查找、拖拽移动、撤销重做、局部更新和后端存储。

## 3. 组件模型

### 3.1 Grid

```ts
interface GridComponent extends ComponentBase {
  type: 'grid'
  columns: Array<number | `${number}fr` | 'auto'>
  height?: number
  border?: 'all' | 'inner' | 'none'
  gap?: number
}
```

- 数字列宽单位为 mm，`fr` 分配剩余空间。
- `height` 是 `baseRowHeight` 的倍数；根 Grid 可以不设置高度，由子组件撑开。
- 第一阶段只实现列拆分和 `colspan`，暂不实现任意 `rowspan`。
- 复杂跨行结构优先用嵌套 Grid 表达，减少合并单元格算法。

### 3.2 P

```ts
interface PComponent extends ComponentBase {
  type: 'p'
  text?: string
  editable?: boolean
  field?: string
  placeholder?: string
  inputType?: 'text' | 'number' | 'date' | 'signature'
  underline?: boolean
  style?: TextStyle
}
```

- `editable=false`：固定标签或说明文字，内容来自 `text`。
- `editable=true`：输入字段，`field` 是数据绑定键。
- 一个 P 同时只承担固定文字或输入字段之一，标签和输入混排通过同一行 Grid 的多个格子实现。
- 日期和签名先作为 P 的输入类型实现，不立即增加更多顶层组件类型。

### 3.3 Table

```ts
interface TableComponent extends ComponentBase {
  type: 'table'
  field?: string
  columns: TableColumn[]
  rowCount: number
  rowHeight: number
  repeatable?: boolean
}
```

- Table 用于工作任务、操作记录等规则明细。
- 表头来自 `columns[].title`。
- 设计态空行数由 `rowCount` 决定，单行高度为 `baseRowHeight * rowHeight`。
- 单元格组件通过 `parentId=table.id` 和行优先 `index` 关联。
- 需要多个元素的单元格放入一个子 Grid，Table 本身不增加第二套 children 模型。
- `repeatable=true` 时预览数据可以替换设计态行数；打印时允许按完整行分页。

### 3.4 HTML

```ts
interface HtmlComponent extends ComponentBase {
  type: 'html'
  html: string
  css?: string
  trusted?: boolean
}
```

HTML 用于短期无法组件化的特殊签章、复杂提示或兼容已有模板。必须满足：

- 只能在所属格子内渲染，不能修改父级布局。
- CSS 自动加作用域，禁止污染设计器和其他纸张。
- 非可信内容过滤 `script`、事件属性、危险 URL 和外部样式注入。
- HTML 组件内部字段不参与常规字段扫描；需要数据绑定时应显式声明 bindings。
- 不允许把整张表单放进一个 HTML 组件，否则模板失去可设计性。

### 3.5 Image

图片不是当前工作票原型的核心组件，但保留现有 `image` 能力，用于 Logo、二维码和签章图片。
Image 与其他组件一样进入扁平数组，并通过 `parentId/index` 放入格子。

## 4. 行高、边框与尺寸

表单定义统一基础行高，例如：

```ts
baseRowHeight: 8 // mm
```

- 普通单行 Grid：`height: 1`，实际 8mm。
- 两行输入区：`height: 2`，实际 16mm。
- 工作任务区域：表头 1 行 + 明细 4 行，外层 Grid `height: 5`。
- Renderer 必须使用确定的 CSS `height`，不能使用 `min-height + flex-grow` 分配剩余空间。
- 字号、边框和内边距不得反向撑高固定行；内容溢出时在设计态显示警告。

边框由父 Grid 管理格子边界：

- `all`：外边框和内部格线。
- `inner`：仅相邻格子之间的格线，外边框由父格子承担。
- `none`：不绘制格线，适合负责人、班组等标签与字段混排行。

嵌套 Grid 使用 `inner` 可以避免父格子边框与子 Grid 外边框重叠。

## 5. 设计器交互

设计器继续使用工具栏、组件库、画布和配置面板，但画布交互从“正文组件排序”调整为“格子内编辑”。

### 5.1 组件库

第一阶段提供：

- 布局格子 Grid
- 段落/字段 P
- 明细表格 Table
- HTML
- 图片 Image

### 5.2 Grid 操作

- 在选中 Grid 中增加或删除格子。
- 将一行拆分为 1～N 列。
- 调整固定 mm 列宽和 `fr` 比例。
- 设置基础行高倍数、边框、内边距和对齐。
- 合并/拆分相邻列，通过 `colspan` 实现。
- 将组件拖入格子；投放后写入目标 `parentId/index`。
- 将格子内已有组件包裹为子 Grid，以容纳多个组件。

设计器不实现任意坐标拖拽。拖拽只改变父容器和格子位置，因此 Schema 始终保持可打印的规则布局。

### 5.3 选择与排序

选中状态只保存组件 ID。配置面板通过 `componentsById.get(selectedId)` 查找组件。

同父移动的本质是交换 `index`；跨父移动更新 `parentId` 和 `index`，并重新编号受影响父容器的直接子节点。
撤销/重做记录组件数组的结构化 patch，不记录 DOM。

## 6. 渲染流程

Renderer 首先建立索引：

```ts
const componentsById = new Map(components.map(item => [item.id, item]))
const childrenByParentId = groupBy(components, item => item.parentId)
```

然后从 `parentId === null` 的组件开始递归渲染：

```text
GridSchemaRenderer
└─ GridSchemaNode
   ├─ P
   ├─ GridSchemaNode
   ├─ Table
   │  └─ GridSchemaNode（单元格内容）
   └─ HTML
```

渲染前必须执行结构校验：

- ID 唯一。
- parentId 存在且父组件可容纳子组件。
- 不存在父子循环。
- 同父 index 合法且无意外重复。
- Grid 子组件没有越过列数和 colspan 边界。
- Table 子组件 index 小于 `rowCount * columns.length`。

设计态、填写态和打印态复用相同节点结构，只改变交互和辅助样式。

## 7. 数据与运行时

Schema 只保存模板，不保存流程实例数据：

```ts
type FormData = Record<string, unknown>
```

- 固定 P 读取 `text`，不参与数据绑定。
- 可编辑 P 使用 `field` 读取和回写 `data[field]`。
- Table 使用 `field` 绑定明细数组；单元格 P 的 field 可用于列级或单元格级语义。
- 权限规则通过组件 field 应用，不写入模板 Schema。
- 重复 field 在设计态给出软警告；保存时不强制阻止。

## 8. 纸张与分页

固定工作票默认使用 `fixed` 页面模式：

- 画布直接对应一张 A3/A4 纸。
- Grid 和 Table 按 mm 及基础行高计算尺寸。
- 内容超出纸张时报告溢出，不自动拆散固定布局。
- 完整工作票需要多页时，每页使用独立根 Grid 或显式 Page 容器。

动态明细报表后续支持 `flow` 模式：Table 可以按完整行分页并重复表头；普通 Grid 默认不可拆分。

打印使用画布相同 DOM，通过 `@page` 设置纸张尺寸。打印 CSS只能隐藏设计辅助元素，不能修改业务尺寸。

## 9. 版本迁移

现有 v1 `FormSchema.body[]` 继续用于旧分页示例和回归测试。新模型使用 `version: 2` 和
`components[]`，迁移期间两套 Renderer 可以并存，但 Designer 不应同时编辑两种模型。

迁移顺序：

1. 在 dev 原型中验证扁平组件数组和前五行工作票。
2. 将 Grid Schema 类型移入 `src/types`，增加结构校验和索引工具。
3. 将递归 Renderer 移入正式组件目录。
4. 将 DesignerApp 切换到 v2 Schema，重做组件选择和格子投放。
5. 完成完整工作票后再移除旧 v1 默认入口。
6. 对需要保留的旧模板提供一次性 v1 → v2 转换函数。

## 10. 决策记录

1. **用 Grid 统一静态版式。** 不再为横向、纵向、标签行等场景引入多个布局组件。
2. **组件关系扁平化。** `components[] + id/parentId/index` 是唯一持久化关系模型。
3. **P 同时覆盖固定文字和输入字段。** 通过 `editable` 区分，减少组件类型。
4. **Table 只做规则明细。** 静态合并版式由嵌套 Grid 处理。
5. **固定行高使用整数倍。** 保证工作票纵向节奏和打印尺寸可推导。
6. **HTML 是受控逃生口。** 保留复杂实现能力，但不允许替代结构化模板。
7. **固定工作票优先固定页面。** 超出时警告，避免通用分页算法破坏票面结构。
8. **HTML 只是组件内容，不是 Schema 格式。** 模板仍保持可校验、可迁移和可编辑。

## 11. 当前验收样例

云铝电气第二种工作票的前五行是当前 Grid 模型的第一条验收基线：

1. 标题居中。
2. 单位/编号行拆成四格，固定标签和可编辑 P 正确对应。
3. 负责人、班组行无内部边框，但保留外层行边界。
4. 工作班成员行支持五列混排和输入下划线。
5. 设备名称行支持标签加自适应输入列。
6. 工作任务行高度为 5 倍基础行高。
7. 左侧标签竖排，右侧 Table 为 1 行表头加 4 行输入格。
8. Schema 中不存在嵌套 children，所有关系都能由 `parentId/index` 还原。
