import { describe, it, expect } from 'vitest'
import { PAPER_GEOM, PX_PER_MM, geom, mmToPx } from '../geom'

describe('geom', () => {
  describe('PX_PER_MM', () => {
    it('应为 96/25.4（96 DPI 标准）', () => {
      // 96 / 25.4 ≈ 3.7795275591
      expect(PX_PER_MM).toBeCloseTo(3.7795, 4)
    })
  })

  describe('PAPER_GEOM', () => {
    it('A4 短边 210 长边 297', () => {
      expect(PAPER_GEOM.A4).toEqual({ short: 210, long: 297 })
    })

    it('A3 短边 297 长边 420', () => {
      expect(PAPER_GEOM.A3).toEqual({ short: 297, long: 420 })
    })
  })

  describe('geom()', () => {
    it('A4 纵向：宽=短边 210 高=长边 297', () => {
      expect(geom('A4', 'portrait')).toEqual({ w: 210, h: 297 })
    })

    it('A4 横向：宽=长边 297 高=短边 210', () => {
      expect(geom('A4', 'landscape')).toEqual({ w: 297, h: 210 })
    })

    it('A3 纵向：宽=短边 297 高=长边 420', () => {
      expect(geom('A3', 'portrait')).toEqual({ w: 297, h: 420 })
    })

    it('A3 横向：宽=长边 420 高=短边 297', () => {
      expect(geom('A3', 'landscape')).toEqual({ w: 420, h: 297 })
    })
  })

  describe('mmToPx()', () => {
    it('0mm 应为 0px', () => {
      expect(mmToPx(0)).toBe(0)
    })

    it('25.4mm 应为 96px（1 英寸）', () => {
      expect(mmToPx(25.4)).toBeCloseTo(96, 5)
    })

    it('应等于 mm * PX_PER_MM', () => {
      const mm = 100
      expect(mmToPx(mm)).toBe(mm * PX_PER_MM)
    })
  })
})
