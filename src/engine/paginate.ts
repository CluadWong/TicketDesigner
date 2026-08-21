/**
 * 分页引擎主算法
 *
 * 输入：FormSchema + MeasureAPI
 * 输出：PaginateResult（pages[] + warnings[]）
 *
 * 设计依据：docs/engine.md §6 分页算法。
 *
 * 算法分三部分：
 *   - paginate：主流程，遍历 body 组件按类型分流
 *   - paginateBlock：普通组件（p/image）整体测高，超高裁剪+警告
 *   - paginateTable：表格按行切分，表头每页重复，超高行强制塞+裁剪
 *
 * 关键尺寸公式（docs/engine.md §5）：
 *   bodyHmm = 纸张高 - headerHeight - footerHeight
 *   bodyPx  = bodyHmm * PX_PER_MM
 *   contentPx = (纸张宽 - 2 * margin) * PX_PER_MM
 *
 * 依赖注入：通过 MeasureAPI 接口测量，便于单测 mock（见 1.5 任务）。
 */

import type {
  FormSchema,
  Component,
  TableComponent,
  TableRow
} from '@/types'
import type { Block, Page, Warning, PaginateResult } from '@/types'
import { geom, mmToPx, PX_PER_MM } from './geom'
import type { MeasureAPI } from './measure'

/**
 * .block 上下 margin 总和（常量，与 components.css 的 .form-renderer .block margin 一致）
 *
 * Paper 内每个 block 外层包 `<div class="block" style="margin: 1mm 0">`，
 * 整个 block 的"额外高度"等于上下 margin 之和 = 2mm。
 *
 * - paginateBlock：measureBlock 已包 .block，测量值含此 margin，无需再加
 * - paginateTable：measureTableHeader/Row 不包 .block（table 内部元素），
 *   整个 table-slice 在 Paper 内才包一层 .block，所以 paginateTable 给每个切片
 *   统一加一次 BLOCK_MARGIN_PX，与渲染 DOM 结构对齐
 */
const BLOCK_MARGIN_PX = 2 * PX_PER_MM // ≈ 7.56px

/** 引擎分页选项 */
export interface PaginateOptions {
  /** 测量 API 实现（DOM 测量由调用方注入） */
  measure: MeasureAPI
}

/** 内部：当前正在构建的页 */
interface CurrentPage {
  /** 已放入的 block 列表 */
  blocks: Block[]
  /** 已占用高度（px） */
  used: number
}

/**
 * 分页引擎主函数
 *
 * @param schema 表单 Schema
 * @param options 分页选项（含测量 API）
 * @returns 分页结果（pages + warnings）
 *
 * @example
 * ```ts
 * const measure = new DomMeasure()
 * const result = paginate(schema, { measure })
 * measure.destroy()
 * console.log(result.pages.length, result.warnings)
 * ```
 */
export function paginate(schema: FormSchema, options: PaginateOptions): PaginateResult {
  const { measure } = options

  // 纸张几何
  const g = geom(schema.paper.size, schema.paper.orientation)

  // 页眉/页脚高度：缺省时按边距占位（design.md §2.3）
  const headerHeight = schema.header?.height ?? schema.margin
  const footerHeight = schema.footer?.height ?? schema.margin

  // 正文可用高（px）
  // 同步减 1px，与 Paper.vue 的 .paper height: calc(h mm - 1px) 对齐，
  // 避免浏览器把 mm 解析为 px 时亚像素舍入导致测量值偏大、渲染多出空白页。
  const bodyHmm = g.h - headerHeight - footerHeight
  const bodyPx = bodyHmm * PX_PER_MM - 1

  // 正文内容区宽（px）——测量容器宽度必须等于此值
  const contentPx = mmToPx(g.w - 2 * schema.margin)

  // 输出容器
  const pages: Page[] = []
  const warnings: Warning[] = []

  // 当前正在构建的页
  let cur: CurrentPage = { blocks: [], used: 0 }

  /**
   * 结束当前页：若已有内容则推入 pages，并开启新页
   *
   * ⚠ 关键：不重新赋值 cur，只替换其 blocks/used 字段。
   * 因为 paginateBlock / paginateTable 接收 cur 作为函数参数，
   * 重新赋值 cur 只在 flush 闭包内生效，外部仍指向旧对象。
   */
  const flush = (): void => {
    if (cur.blocks.length > 0) {
      pages.push({ index: pages.length, blocks: cur.blocks })
      // 给 cur 换一个新空数组，旧数组由 pages 持有不被修改
      cur.blocks = []
      cur.used = 0
    }
  }

  // 遍历正文组件流，按类型分流到对应切分函数
  for (const comp of schema.body) {
    if (comp.type === 'table') {
      paginateTable(
        comp,
        bodyPx,
        contentPx,
        measure,
        cur,
        flush,
        warnings
      )
    } else {
      paginateBlock(
        comp,
        bodyPx,
        contentPx,
        measure,
        cur,
        flush,
        warnings
      )
    }
  }

  flush()

  return { pages, warnings }
}

/**
 * 普通组件（p / image）切分
 *
 * - 整体测高
 * - 超高（px > bodyPx）：警告 + 仍放入当前页（渲染时 overflow:hidden 裁剪）
 * - 当前页放不下且本页已有内容：先 flush 开新页再放
 *
 * @param comp 组件实例
 * @param bodyPx 正文可用高（px）
 * @param contentPx 正文内容区宽（px）
 * @param measure 测量 API
 * @param cur 当前页（可变引用，函数内会修改）
 * @param flush flush 回调（结束当前页）
 * @param warnings 警告列表（函数内会 push）
 */
function paginateBlock(
  comp: Component,
  bodyPx: number,
  contentPx: number,
  measure: MeasureAPI,
  cur: CurrentPage,
  flush: () => void,
  warnings: Warning[]
): void {
  const px = measure.measureBlock(comp, contentPx)

  // 超高组件：警告 + 仍放入当前页（渲染时 overflow:hidden 裁剪）
  if (px > bodyPx) {
    warnings.push({
      compId: comp.id,
      message: '组件高度超过正文可用高，已裁剪'
    })
  }

  // 当前页放不下且本页已有内容 → 推到下一页
  if (cur.used + px > bodyPx && cur.blocks.length > 0) {
    flush()
  }

  cur.blocks.push({ type: 'item' as const, comp })
  cur.used += px
}

/**
 * 表格切分（可跨页）
 *
 * - 表头每页重复（每个切片都含 thead 高度）
 * - 单行不被切断（按整行测高，不切行）
 * - 超高行（表头+单行 > 整页可用高）：警告 + 强制塞当前行（靠 overflow 裁剪）
 *
 * 算法：
 *   1. 测表头高度 + 每行高度
 *   2. 按"当前页可用高 = bodyPx - cur.used"判断能否塞下表头+1行
 *   3. 不能塞下且本页有内容 → flush 开新页
 *   4. 内层 while：累加行高度直到塞满本页可用高
 *   5. 一行都塞不下（超高行）→ 强制塞当前行前进
 *   6. 仍有剩余行 → flush 开新页继续
 *
 * @param comp 表格组件
 * @param bodyPx 正文可用高（px）
 * @param contentPx 正文内容区宽（px）
 * @param measure 测量 API
 * @param cur 当前页（可变引用）
 * @param flush flush 回调
 * @param warnings 警告列表
 */
function paginateTable(
  comp: TableComponent,
  bodyPx: number,
  contentPx: number,
  measure: MeasureAPI,
  cur: CurrentPage,
  flush: () => void,
  warnings: Warning[]
): void {
  // 空表格不产生任何 block
  if (comp.rows.length === 0) return

  const theadPx = measure.measureTableHeader(comp, contentPx)
  const rowPxArr = comp.rows.map(row => measure.measureTableRow(comp, row, contentPx))

  let i = 0
  while (i < comp.rows.length) {
    let avail = bodyPx - cur.used

    // 至少要放表头 + 1 行 + .block margin；放不下则开新页
    // （+1 为安全余量，避免边界误差）
    if (avail < theadPx + rowPxArr[i] + BLOCK_MARGIN_PX + 1) {
      flush()
      avail = bodyPx
    }

    // 超高行：表头 + 单行 + .block margin > 整页可用高，警告
    if (theadPx + rowPxArr[i] + BLOCK_MARGIN_PX > bodyPx) {
      warnings.push({
        compId: comp.id,
        message: `表格第 ${i + 1} 行高度超过页可用高，已裁剪`
      })
    }

    // 收集本页可容纳的行
    // segPx 起始含 theadPx + BLOCK_MARGIN_PX（整个切片是一个 .block）
    const segRows: TableRow[] = []
    let segPx = theadPx + BLOCK_MARGIN_PX
    while (i < comp.rows.length && segPx + rowPxArr[i] <= avail) {
      segRows.push(comp.rows[i])
      segPx += rowPxArr[i]
      i++
    }

    // 一行都塞不下（超高行），强制塞当前行前进（靠 overflow 裁剪）
    if (segRows.length === 0) {
      segRows.push(comp.rows[i])
      segPx += rowPxArr[i]
      i++
    }

    cur.blocks.push({ type: 'table-slice' as const, comp, rows: segRows })
    cur.used += segPx

    // 仍有剩余行 → 开新页继续
    if (i < comp.rows.length) {
      flush()
    }
  }
}
