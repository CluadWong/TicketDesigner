# 分页引擎 设计文档

> 配套 [design.md](./design.md)。本文定义分页引擎的算法、输入输出契约与 Schema 类型。

## 1. 已验证的可行性结论

经 `soar-web-v3-td/public/demo-v2.html` 验证，以下技术点全部可行：

| 点 | 验证结果 |
|---|---|
| JS 分页引擎（off-screen 测高 → 按页可用高切分） | ✅ |
| 屏幕离散纸张（多张纸垂直堆叠，所见即所得） | ✅ |
| 表格按行切分跨页 + 表头每页重复 | ✅ |
| grid 容器不跨页（整体推下页留白） | ✅ |
| 页眉/页脚占位模型（上下边距 0，页眉页脚贴顶/底） | ✅ |
| 动态纸张切换（A4/A3 × 横/纵）+ `@page size` 动态注入 | ✅ |
| 打印复用屏幕 DOM 结构 | ✅ |

> v1 引擎可直接把 demo-v2 的 `paginate()` 抽成纯函数，加 TS 类型。

## 2. Schema 类型定义

```ts
/** 纸张尺寸 */
type PaperSize = 'A4' | 'A3'
/** 纸张方向 */
type Orientation = 'portrait' | 'landscape'

/** 页眉配置（仅文本 + 页码） */
interface HeaderConfig {
  height: number                    // mm，默认 = 边距（占位）
  text?: string                     // 页眉文本
  showPageNumber?: boolean          // 是否显示页码
}
/** 页脚配置（同页眉） */
interface FooterConfig {
  height: number
  text?: string
  showPageNumber?: boolean
}

/** 组件基类 */
interface BaseComponent {
  id: string
  type: string
}
/** 段落文本 */
interface PComponent extends BaseComponent {
  type: 'p'
  text: string
}
/** 图片 */
interface ImageComponent extends BaseComponent {
  type: 'image'
  src: string
  width?: number                    // mm
  height?: number                   // mm
}
/** 表格列定义 */
interface TableColumn {
  key: string
  title: string
  width?: number                    // mm
}
/** 表格行（单元格值） */
type TableRow = Record<string, string | number>
/** 表格组件（可跨页切分） */
interface TableComponent extends BaseComponent {
  type: 'table'
  columns: TableColumn[]
  rows: TableRow[]
}
/** grid 容器（不跨页） */
interface GridComponent extends BaseComponent {
  type: 'grid'
  columns: number                   // 列数
  gap?: number                      // mm
  cells: PComponent[]               // 单元格内仅放文本（v1 简化）
}
/** flex 容器（不跨页） */
interface FlexComponent extends BaseComponent {
  type: 'flex'
  direction: 'row' | 'column'
  gap?: number                      // mm
  items: Component[]                // 子组件
}

type Component =
  | PComponent | ImageComponent | TableComponent
  | GridComponent | FlexComponent

/** 表单 Schema（引擎输入） */
interface FormSchema {
  paper: { size: PaperSize; orientation: Orientation }
  margin: number                    // 左右边距 mm（上下=0）
  header?: HeaderConfig
  footer?: FooterConfig
  body: Component[]
}
```

## 3. 引擎输出契约

```ts
/** 引擎输出的单个 Block */
type Block =
  | { type: 'item'; comp: Component; html: string }   // 整块组件
  | { type: 'table-slice'; comp: TableComponent; theadHtml: string; rows: TableRow[] }  // 表格切片

/** 单页 */
interface Page {
  index: number                     // 0-based
  blocks: Block[]
}

/** 警告（如超高裁剪） */
interface Warning {
  compId: string
  message: string                   // 如"组件超高被裁剪"
}

/** 引擎输出 */
interface PaginateResult {
  pages: Page[]
  warnings: Warning[]
}
```

## 4. 纸张几何

```ts
const PAPER_GEOM = {
  A4: { short: 210, long: 297 },
  A3: { short: 297, long: 420 }
}

/** 计算纸张宽高（mm） */
function geom(size: PaperSize, orient: Orientation): { w: number; h: number } {
  const p = PAPER_GEOM[size]
  return orient === 'landscape' ? { w: p.long, h: p.short } : { w: p.short, h: p.long }
}
```

## 5. 核心尺寸公式

```
纸张宽 W、高 H（mm）
左右边距 M（默认 12）
页眉高 HH（默认 = M，即占位）
页脚高 FH（默认 = M，即占位）

内容区宽  = W − 2M
内容区高  = H                          // 上下边距=0
正文可用高 = H − HH − FH
```

单位换算：`PX_PER_MM = 96 / 25.4`（浏览器 CSS mm → px）。

## 6. 分页算法

### 6.1 主流程

```
function paginate(schema) -> PaginateResult:
  g = geom(schema.paper)
  bodyHmm = g.h - headerHeight - footerHeight
  bodyPx = bodyHmm * PX_PER_MM
  contentPx = (g.w - 2*margin) * PX_PER_MM

  pages = []
  warnings = []
  cur = { blocks: [], used: 0 }
  flush = () => { if cur.blocks.length: pages.push(cur); cur = { blocks: [], used: 0 } }

  for comp in schema.body:
    if comp.type == 'table':
      paginateTable(comp, bodyPx, cur, flush, warnings)   // 见 6.2
    else:
      paginateBlock(comp, bodyPx, cur, flush, warnings)   // 见 6.3
  flush()
  return { pages, warnings }
```

### 6.2 表格切分

```
function paginateTable(comp, bodyPx, cur, flush, warnings):
  theadPx = measureTableHeader(comp.columns)
  rowPxArr = comp.rows.map(r => measureTableRow(comp.columns, r))

  i = 0
  while i < comp.rows.length:
    avail = bodyPx - cur.used
    // 至少要放表头 + 1 行；放不下则开新页
    if avail < theadPx + rowPxArr[i] + 1:
      flush()
      avail = bodyPx
    // 收集本页可容纳的行
    segRows = []
    segPx = theadPx              // 每个切片都含表头
    while i < rows.length && segPx + rowPxArr[i] <= avail:
      segRows.push(rows[i]); segPx += rowPxArr[i]; i++
    if segRows.length:
      cur.blocks.push({ type:'table-slice', comp, theadHtml, rows:segRows })
      cur.used += segPx
    if i < rows.length:
      flush()                    // 仍有剩余行 → 开新页继续
```

### 6.3 普通组件 / 容器

```
function paginateBlock(comp, bodyPx, cur, flush, warnings):
  html = renderComponent(comp)
  px = measure(html)

  // 超高组件：裁剪 + 警告
  if px > bodyPx:
    warnings.push({ compId: comp.id, message: '组件高度超过正文可用高，已裁剪' })
    // 仍放入当前页（渲染时 overflow:hidden 裁剪）

  // 当前页放不下且本页已有内容 → 推到下一页
  if cur.used + px > bodyPx && cur.blocks.length:
    flush()

  cur.blocks.push({ type:'item', comp, html })
  cur.used += px
```

### 6.4 测量容器

```
.measurer {
  position: absolute;
  left: -99999px;
  visibility: hidden;
}
// JS 设置 measurer.style.width = contentPx + 'px'  // 保证测高与实际渲染一致
```

**关键**：测量容器宽度必须等于正文内容区宽度，否则测出的高度不准。

## 7. 打印集成

### 7.1 `@page` 动态注入

```ts
/** 按当前 schema.paper 动态注入 @page 规则 */
function injectPrintStyle(schema: FormSchema) {
  const sizeStr = schema.paper.orientation === 'landscape'
    ? `${schema.paper.size} landscape`
    : schema.paper.size
  const css = `@media print { @page { size: ${sizeStr}; margin: 0 ${schema.margin}mm; } }`
  // 注入到 <style id="print-style">
}
```

### 7.2 打印媒体查询

```css
@media print {
  body { background:#fff; padding:0; }
  .toolbar { display:none !important; }
  .measurer { display:none !important; }
  .page-stack { gap:0; }
  .paper {
    width:auto !important;
    height:auto !important;
    padding:0 !important;            /* 尺寸交给 @page */
    page-break-after:always;
  }
  .paper:last-child { page-break-after:auto; }
  .body-slot { height:auto !important; overflow:visible !important; }
  .footer-slot { position:static !important; }   /* 屏幕端 absolute，打印端 static */
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
```

## 8. 性能注意

| 点 | 策略 |
|---|---|
| 表格逐行测高 | 每行 2 次 DOM 操作，demo 级可接受；生产级应缓存行高或批量测 |
| 设计器实时编辑 | debounce 重算（如 300ms） |
| 测量容器宽度 | 必须与正文内容区宽度严格一致 |
