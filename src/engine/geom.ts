/**
 * 纸张几何计算
 *
 * 设计依据：docs/engine.md §4-§5。
 * 单位换算：浏览器 CSS 中 1mm = 96/25.4 px（96 DPI 标准）。
 */

import type { PaperSize, Orientation } from '@/types'

/** 纸张物理规格（mm）：短边 × 长边 */
export const PAPER_GEOM = {
  A4: { short: 210, long: 297 },
  A3: { short: 297, long: 420 }
} as const

/** mm → px 转换系数（96 DPI） */
export const PX_PER_MM = 96 / 25.4

/** 计算结果：纸张宽高（mm） */
export interface PaperDim {
  /** 纸张宽度（mm） */
  w: number
  /** 纸张高度（mm） */
  h: number
}

/**
 * 计算纸张宽高（mm）
 *
 * - portrait（纵向）：w=short, h=long
 * - landscape（横向）：w=long, h=short
 *
 * @param size 纸张尺寸
 * @param orientation 纸张方向
 * @returns 纸张宽高（mm）
 */
export function geom(size: PaperSize, orientation: Orientation): PaperDim {
  const p = PAPER_GEOM[size]
  return orientation === 'landscape'
    ? { w: p.long, h: p.short }
    : { w: p.short, h: p.long }
}

/**
 * mm 转 px
 * @param mm 毫米值
 * @returns 像素值（浮点）
 */
export function mmToPx(mm: number): number {
  return mm * PX_PER_MM
}
