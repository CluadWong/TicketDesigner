/**
 * v1 测量用 HTML 字符串渲染
 *
 * 这是引擎测量阶段的临时实现：把组件渲染为简单 HTML 字符串，
 * 写入 off-screen measurer 后取 offsetHeight 作为高度。
 *
 * ⚠ 仅供引擎测量使用，**不用于实际表单渲染**。
 * 实际渲染由阶段 2 的 Vue 组件渲染器（CompP/CompImage/CompTable）负责。
 * v2 阶段可替换为 Vue render 函数版本以提升测高精度。
 *
 * 设计依据：docs/engine.md §6.4 测量容器。
 */

import type { Component, TableComponent, TableRow } from '@/types'

/**
 * 转义 HTML 文本内容（防注入 + 保证渲染正确）
 * @param text 原始文本
 * @returns 转义后的文本
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 转义 HTML 属性值
 *
 * ⚠ 转义顺序：必须先转 &，再转 "。
 * 反序会导致 "& 的转义结果 &amp; 中的 & 被二次转义"。
 *
 * @param text 原始属性值
 * @returns 转义后的属性值
 */
function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/**
 * 拼装 data-field 属性字符串
 * @param field 字段标识（可选）
 * @returns 形如 ` data-field="xxx"` 或空串
 */
function dataFieldAttr(field?: string): string {
  return field ? ` data-field="${escapeAttr(field)}"` : ''
}

/**
 * 渲染普通组件（p / image）为 HTML 字符串
 *
 * 表格不通过此函数测整体高度，分别用 measureTableHeader / measureTableRow 测。
 *
 * @param comp 组件实例
 * @returns HTML 字符串
 */
export function renderComponentHtml(comp: Component): string {
  switch (comp.type) {
    case 'p':
      return `<p${dataFieldAttr(comp.field)}>${escapeHtml(comp.text)}</p>`
    case 'image': {
      const w = comp.width ? ` width="${comp.width}"` : ''
      const h = comp.height ? ` height="${comp.height}"` : ''
      return `<img${dataFieldAttr(comp.field)} src="${escapeAttr(comp.src)}"${w}${h}>`
    }
    case 'table':
      // 表格整体高度不通过此函数测，由专用函数按 thead/行 分别测
      return ''
    default: {
      // 穷尽性检查：未来新增组件类型时此分支会触发，提醒补全
      const _exhaustive: never = comp
      return _exhaustive
    }
  }
}

/**
 * 渲染表格表头为 HTML 字符串
 * @param comp 表格组件（含列定义）
 * @returns 仅含 thead 的表格 HTML
 */
export function renderTableHeaderHtml(comp: TableComponent): string {
  const ths = comp.columns
    .map(c => `<th>${escapeHtml(c.title)}</th>`)
    .join('')
  return `<table><thead><tr>${ths}</tr></thead></table>`
}

/**
 * 渲染表格单行为 HTML 字符串
 * @param comp 表格组件（含列定义）
 * @param row 行数据
 * @returns 仅含 tbody 单行的表格 HTML
 */
export function renderTableRowHtml(comp: TableComponent, row: TableRow): string {
  const tds = comp.columns
    .map(c => `<td>${escapeHtml(String(row[c.key] ?? ''))}</td>`)
    .join('')
  return `<table><tbody><tr>${tds}</tr></tbody></table>`
}
