/**
 * 分页引擎输出契约
 *
 * 引擎输入：FormSchema（见 schema.ts）
 * 引擎输出：PaginateResult（pages[] + warnings[]）
 *
 * 设计依据：docs/engine.md §3。
 * 与 engine.md 的差异：Block 不携带预渲染 HTML 字符串，
 * 让 Vue 渲染器直接消费 comp/rows 做数据驱动渲染（更贴合 Vue 心智）。
 */

import type { Component, TableComponent, TableRow } from './schema'

/**
 * 引擎输出的单个 Block
 *
 * 两种形态：
 *   - item：整块组件（p/image 等不可切分组件）
 *   - table-slice：表格的某一页切片（含本页承载的行）
 */
export type Block =
  | ItemBlock
  | TableSliceBlock

/** 整块组件 Block */
export interface ItemBlock {
  /** 形态标识：整块 */
  type: 'item'
  /** 对应源组件 */
  comp: Component
}

/**
 * 表格切片 Block
 *
 * 一个表格在多页中的某一页的切片，承载本页可容纳的行；
 * 表头由渲染器根据 comp.columns 渲染（每页重复）。
 */
export interface TableSliceBlock {
  /** 形态标识：表格切片 */
  type: 'table-slice'
  /** 源表格组件（含 columns 定义） */
  comp: TableComponent
  /** 本切片承载的行数据 */
  rows: TableRow[]
}

/**
 * 单页
 *
 * 对应屏幕一张离散纸 = 打印一页。
 * 页号 index 从 0 开始；总页数 N 由 PaginateResult.pages.length 给出。
 */
export interface Page {
  /** 页号（0-based） */
  index: number
  /** 本页的 block 序列 */
  blocks: Block[]
}

/**
 * 引擎警告
 *
 * 用于在屏幕端对问题组件做视觉提示（如红色"超高"标记）。
 */
export interface Warning {
  /** 触发警告的组件 id */
  compId: string
  /** 警告文案（如"组件高度超过正文可用高，已裁剪"） */
  message: string
}

/**
 * 分页引擎输出契约
 *
 * 结构：
 *   pages: Page[]         —— 切分后的所有页
 *   warnings: Warning[]   —— 警告信息（如超高组件被裁剪）
 *
 * 渲染器消费：v-for 渲染 pages，每页注入页眉/页脚/页码；
 * 屏幕端按 warnings 在对应组件上叠加视觉提示。
 */
export interface PaginateResult {
  /** 切分后的页序列 */
  pages: Page[]
  /** 警告列表 */
  warnings: Warning[]
}
