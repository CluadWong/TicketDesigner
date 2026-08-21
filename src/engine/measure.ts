/**
 * 测量 API 与 DOM 实现
 *
 * 引擎采用依赖注入模式：
 *   - MeasureAPI 接口：定义测量契约（引擎核心算法依赖此接口，便于单测 mock）
 *   - DomMeasure 类：浏览器环境实现，创建 off-screen measurer 测高
 *
 * 设计依据：docs/engine.md §6.4 测量容器 + §8 性能注意。
 *
 * ⚠ 关键约束：测量容器宽度必须严格等于正文内容区宽度，否则测值不准。
 */

import type { Component, TableComponent, TableRow } from '@/types'
import {
  renderComponentHtml,
  renderTableHeaderHtml,
  renderTableRowHtml
} from './render-html'

/**
 * 测量 API 契约
 *
 * 引擎核心算法通过此接口测量组件高度，不直接操作 DOM。
 * 单测时可注入 mock 实现（按预设高度返回）。
 */
export interface MeasureAPI {
  /**
   * 测量普通组件（p / image）渲染后的高度
   * @param comp 组件实例
   * @param contentWidthPx 正文内容区宽度（px）——测量容器宽度必须等于此值
   * @returns 组件高度（px）
   */
  measureBlock(comp: Component, contentWidthPx: number): number

  /**
   * 测量表格表头渲染后的高度
   * @param comp 表格组件（含列定义）
   * @param contentWidthPx 正文内容区宽度（px）
   * @returns 表头高度（px）
   */
  measureTableHeader(comp: TableComponent, contentWidthPx: number): number

  /**
   * 测量表格单行渲染后的高度
   * @param comp 表格组件（含列定义，决定列宽分布）
   * @param row 行数据
   * @param contentWidthPx 正文内容区宽度（px）
   * @returns 单行高度（px）
   */
  measureTableRow(comp: TableComponent, row: TableRow, contentWidthPx: number): number

  /**
   * 销毁测量器（释放 DOM 资源）
   *
   * - DomMeasure 实现会移除 measurer 节点
   * - mock 实现可省略（接口可选）
   */
  destroy?(): void
}

/**
 * 浏览器 DOM 测量实现
 *
 * 创建一个 off-screen 容器（position:absolute; left:-99999px; visibility:hidden），
 * 临时设置 innerHTML 为渲染后的 HTML 字符串，读取 offsetHeight 作为高度。
 *
 * 使用方式：
 * ```ts
 * const measure = new DomMeasure()
 * const result = paginate(schema, { measure })
 * measure.destroy()
 * ```
 *
 * ⚠ 必须在测量结束后调用 destroy() 移除 DOM 节点，避免内存泄漏。
 */
export class DomMeasure implements MeasureAPI {
  /** off-screen 测量容器 */
  private readonly measurer: HTMLDivElement

  constructor() {
    this.measurer = document.createElement('div')
    this.measurer.className = 'form-renderer'
    this.measurer.style.cssText =
      'position:absolute;left:-99999px;top:0;visibility:hidden;'
    document.body.appendChild(this.measurer)
  }

  /**
   * 设置测量容器宽度并写入 HTML，返回高度
   * @param html 渲染后的 HTML 字符串
   * @param contentWidthPx 容器宽度（px）
   * @returns 容器渲染后的高度（px）
   */
  private measureHtml(html: string, contentWidthPx: number): number {
    this.measurer.style.width = `${contentWidthPx}px`
    this.measurer.innerHTML = html
    return this.measurer.offsetHeight
  }

  /** @inheritdoc */
  measureBlock(comp: Component, contentWidthPx: number): number {
    // 包裹 .block div，让 measurer 内的元素也应用 .form-renderer .block 样式，
    // 与 Paper 内实际 DOM 结构保持一致，避免测高结构性误差。
    // 注：p / image 在 Paper 内每个 block 单独包一层 .block，所以测量时也包一层。
    const html = `<div class="block">${renderComponentHtml(comp)}</div>`
    return this.measureHtml(html, contentWidthPx)
  }

  /** @inheritdoc */
  measureTableHeader(comp: TableComponent, contentWidthPx: number): number {
    // 不包 .block：表头在 Paper 内是属于 table-slice block 内部的子元素，
    // 整个 table-slice 才包一层 .block，表头不再单独包。
    // .block margin 由 paginateTable 给每个切片统一加一次 BLOCK_MARGIN_PX。
    return this.measureHtml(renderTableHeaderHtml(comp), contentWidthPx)
  }

  /** @inheritdoc */
  measureTableRow(comp: TableComponent, row: TableRow, contentWidthPx: number): number {
    // 同 measureTableHeader：行不单独包 .block，整个 table-slice 才包。
    return this.measureHtml(renderTableRowHtml(comp, row), contentWidthPx)
  }

  /**
   * 销毁测量容器，释放 DOM
   *
   * 测量结束后必须调用，否则 measurer 节点会残留在 body 中。
   */
  destroy(): void {
    this.measurer.remove()
  }
}
