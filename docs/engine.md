# Grid Schema V2 渲染引擎设计

> 本文定义扁平组件数组的索引、校验、递归渲染、尺寸和打印契约。
> 现有 `paginate(FormSchemaV1)` 继续作为旧流式模板兼容实现，不再扩展固定工作票能力。

## 1. 引擎职责

V2 引擎负责：

- 校验 `components[]` 的结构正确性。
- 建立 ID 和父子索引。
- 从根组件递归生成 Grid/P/Table/HTML/Image DOM。
- 按 mm 和基础行高计算固定尺寸。
- 检测纸张、格子和字段内容溢出。
- 为设计态、预览态和打印态提供同一结构。

引擎不负责：

- 流程数据持久化。
- 权限决策。
- 设计器选中状态和拖拽策略。
- 未经声明的 HTML 内部字段解析。

## 2. 输入契约

```ts
interface FormSchemaV2 {
  version: 2
  paper: {
    size: 'A3' | 'A4'
    orientation: 'portrait' | 'landscape'
    mode: 'fixed' | 'flow'
  }
  margin: number
  baseRowHeight: number
  components: DesignerComponent[]
}

interface ComponentBase {
  id: string
  parentId: string | null
  index: number
  colspan?: number
  padding?: number
}
```

组件详细字段以 [design.md](./design.md) 第 3 节为准。

## 3. 索引构建

每次加载 Schema 或结构发生变化时建立：

```ts
interface ComponentIndex {
  byId: Map<string, DesignerComponent>
  childrenByParentId: Map<string | null, DesignerComponent[]>
}

function buildComponentIndex(components: DesignerComponent[]): ComponentIndex {
  const byId = new Map<string, DesignerComponent>()
  const childrenByParentId = new Map<string | null, DesignerComponent[]>()

  for (const component of components) {
    byId.set(component.id, component)
    const children = childrenByParentId.get(component.parentId) ?? []
    children.push(component)
    childrenByParentId.set(component.parentId, children)
  }

  for (const children of childrenByParentId.values()) {
    children.sort((left, right) => left.index - right.index)
  }

  return { byId, childrenByParentId }
}
```

数组物理顺序不能影响结果。测试必须随机打乱 components 后比较相同渲染结构。

## 4. 结构校验

渲染前运行 `validateSchemaV2()`，返回错误列表而不是在第一个错误处抛出：

```ts
interface SchemaIssue {
  level: 'error' | 'warning'
  code: string
  componentId?: string
  message: string
}
```

### 4.1 必须阻止渲染的错误

- `DUPLICATE_ID`：组件 ID 重复。
- `MISSING_PARENT`：parentId 不存在。
- `INVALID_PARENT_TYPE`：父组件不是 Grid/Table。
- `PARENT_CYCLE`：父子链形成循环。
- `INVALID_INDEX`：index 不是非负整数。
- `DUPLICATE_INDEX`：同父格子出现多个直接组件。
- `GRID_COLUMN_OVERFLOW`：index/colspan 越过 Grid 列边界。
- `TABLE_CELL_OVERFLOW`：index 超出 Table 行列范围。
- `INVALID_DIMENSION`：基础行高、height、rowHeight 或尺寸非法。

### 4.2 可继续渲染的警告

- `INDEX_GAP`：同父 index 存在空洞。
- `DUPLICATE_FIELD`：输入 field 重复。
- `EMPTY_FIELD`：editable P 未设置 field。
- `UNTRUSTED_HTML`：HTML 未标记可信或过滤失败。
- `CONTENT_OVERFLOW`：内容超过固定格子。
- `PAPER_OVERFLOW`：根内容超过纸张可用范围。

### 4.3 循环检测

对每个组件沿 parentId 向上访问，维护 visiting/visited 集合。检测到 visiting 节点时，将循环链上的所有
组件 ID 写入错误信息。不能依赖递归 Renderer 自然栈溢出来发现循环。

## 5. Grid 定位

Grid 子组件按行优先 index 定位：

```ts
const columnCount = grid.columns.length
const column = child.index % columnCount
const row = Math.floor(child.index / columnCount)
```

对应 CSS：

```ts
{
  gridColumn: `${column + 1} / span ${child.colspan ?? 1}`,
  gridRow: row + 1
}
```

列轨道转换：

- number → `${value}mm`
- `${number}fr` → 原样写入
- auto → auto

Renderer 不通过数组顺序自动填格，必须显式设置 gridColumn/gridRow，确保 index 空洞不会导致后续
组件前移。

## 6. 尺寸计算

### 6.1 纸张

| 纸张 | 竖向 | 横向 |
|---|---|---|
| A4 | 210×297mm | 297×210mm |
| A3 | 297×420mm | 420×297mm |

```text
contentWidth  = paperWidth  - 2 × margin
contentHeight = paperHeight - 2 × margin
```

V2 初期使用四边统一 margin；需要四边独立配置时再扩展 PaperConfig，不从页眉高度隐式推导。

### 6.2 基础行高

```text
gridHeight  = baseRowHeight × grid.height
tableRow    = baseRowHeight × table.rowHeight
tableHeight = baseRowHeight × (1 + rowCount × rowHeight)
```

`1` 表示 Table 表头一行。需要不同表头高度时增加 headerHeight，而不是让内容自动撑高。

固定行必须生成 CSS `height`，同时设置 `box-sizing: border-box`。不得使用 flex-grow 或只设置
min-height，否则空白区域会被分配给明细行，导致设计和打印尺寸不可推导。

### 6.3 内容溢出

固定格子默认：

```css
overflow: hidden;
```

设计态同时测量 `scrollWidth/clientWidth` 和 `scrollHeight/clientHeight`。发生溢出时保留固定尺寸，
给组件增加警告，不允许内容反向撑高父 Grid。

## 7. 边框算法

边框由父 Grid 的格子槽绘制：

- `all`：Grid 绘制 top/left，每个格子绘制 right/bottom。
- `inner`：只绘制非末列格子的 right 和非末行格子的 bottom。
- `none`：不绘制。

子组件自身不绘制所属格子的外边框。嵌套时由父槽承担外框、子 Grid inner 承担内部格线，避免双线。

Table 使用同一原则：所属 Grid 槽承担外框，Table 只绘制表头/数据行之间和列之间的内部线。

## 8. 递归渲染

```ts
function renderNode(component: DesignerComponent, index: ComponentIndex) {
  switch (component.type) {
    case 'grid':
      return renderGrid(component, index.childrenByParentId.get(component.id) ?? [])
    case 'table':
      return renderTable(component, index.childrenByParentId.get(component.id) ?? [])
    case 'p':
      return renderP(component)
    case 'html':
      return renderHtml(component)
    case 'image':
      return renderImage(component)
  }
}
```

根渲染从 `childrenByParentId.get(null)` 开始。Grid/Table 是允许拥有子组件的容器；其他节点即使由于
错误数据出现子组件也不渲染，并由校验器报告错误。

### 8.1 Table 单元格

```ts
const row = Math.floor(child.index / table.columns.length)
const column = child.index % table.columns.length
```

Table Renderer 先生成表头，再生成 rowCount × columnCount 个数据槽，根据 index 放入子组件。
空槽仍必须生成，不能因缺少组件改变后续格子位置。

### 8.2 HTML

HTML 渲染顺序：

1. 按可信级别运行 sanitizer。
2. 删除 script、事件属性和危险 URL。
3. 给 CSS 选择器添加组件 ID 作用域。
4. 在独立包装节点中设置内容。
5. 观察尺寸但不允许突破父格子。

## 9. 页面模式

### 9.1 fixed

工作票默认使用 fixed：

- 根组件按确定尺寸渲染在单张纸内容区。
- 不运行普通块自动分页。
- 超过 contentHeight 返回 PAPER_OVERFLOW。
- 多页固定票据使用显式 Page 节点或每页独立根 Grid；第一阶段先支持单页。

### 9.2 flow

flow 是旧报表能力的后续迁移目标：

- 根级普通 Grid 作为不可拆分块。
- 放不下时整体移到下一页。
- repeatable Table 可以按完整数据行切片，每页重复表头。
- Table 单行不能拆分。

在 fixed 模式闭环完成之前，不把旧 paginate 算法直接套到嵌套 Grid 上。

## 10. 设计态、预览态和打印态

三种状态必须复用结构 DOM：

| 状态 | 差异 |
|---|---|
| 设计态 | 显示组件 ID、格子辅助线、选中框、投放提示和警告 |
| 预览态 | 隐藏设计辅助元素；editable P 开放输入；填入 data |
| 打印态 | 复用预览 DOM；隐藏工具栏和交互标记；保持业务尺寸 |

打印样式不得修改 Grid columns、height、padding、font-size 或 Table 行高。

## 11. 结构操作函数

设计器不能散落地直接修改 parentId/index，应统一调用纯函数：

```ts
moveComponent(components, componentId, targetParentId, targetIndex)
swapComponents(components, leftId, rightId)
removeComponentTree(components, componentId)
wrapCellWithGrid(components, componentId, gridConfig)
resizeGridColumns(components, gridId, columns)
normalizeChildIndexes(components, parentId)
```

每个函数返回新数组和变更摘要，便于撤销/重做及测试。

## 12. 测试基线

### 12.1 结构测试

- components 数组随机重排后索引结果一致。
- 多级 parentId 正确还原。
- 循环、缺失父级和非法父类型被识别。
- Grid/Table index 和边界校验完整。
- 容器级联删除不误删兄弟节点。

### 12.2 尺寸测试

- baseRowHeight=8 时普通行高为 8mm。
- 工作任务外层高度为 40mm。
- Table 表头和四行数据各为 8mm。
- 嵌套 Grid 不产生双边框。
- 内容过长只产生警告，不改变固定高度。

### 12.3 浏览器验收

- 1600×1000 设计器截图无重叠和裁切。
- A4 打印预览尺寸正确。
- Edge/Chrome 渲染关键尺寸一致。
- 前五行截图与参考 HTML 的结构、列宽和纵向节奏接近。

## 13. v1 兼容边界

现有 `src/engine/paginate.ts`、`FormRenderer` 和 `FormSchema.body[]` 属于 v1：

- 继续通过现有回归测试。
- 不为固定工作票继续增加嵌套 Grid 特例。
- V2 使用独立类型和 Renderer，按 schema.version 分流。
- 完整工作票通过 V2 验收后，再决定 v1 的迁移和删除时间。
