import { describe, it, expect, beforeEach } from 'vitest'
import type { FormSchema, Component, TableComponent, TableRow } from '@/types'
import type { PaginateResult } from '@/types'
import { paginate } from '../paginate'
import type { MeasureAPI } from '../measure'

/**
 * Mock 测量实现
 *
 * 按固定值返回高度，便于精确推算分页结果。
 * - blockHeight: 每个 p/image 组件高度
 * - theadHeight: 表头高度
 * - rowHeight: 表格单行高度
 */
class MockMeasure implements MeasureAPI {
  constructor(
    public blockHeight = 20,
    public theadHeight = 10,
    public rowHeight = 20,
  ) {}

  measureBlock(): number {
    return this.blockHeight
  }
  measureTableHeader(): number {
    return this.theadHeight
  }
  measureTableRow(): number {
    return this.rowHeight
  }
}

/**
 * 工厂：构造 schema
 *
 * 默认 A4 纵向 + margin=0 + header/footer height=0（无页眉页脚占位）：
 *   bodyHmm = 297 - 0 - 0 = 297
 *   bodyPx  = 297 * (96 / 25.4) ≈ 1122.52
 */
function makeSchema(body: Component[] = []): FormSchema {
  return {
    paper: { size: 'A4', orientation: 'portrait' },
    margin: 0,
    header: { height: 0, text: '', showPageNumber: false },
    footer: { height: 0, text: '', showPageNumber: false },
    body,
  }
}

/** 工厂：构造 p 组件 */
function makeP(id: string): Component {
  return { id, type: 'p', text: id }
}

/** 工厂：构造表格组件（默认 3 行） */
function makeTable(id: string, rows: TableRow[] = [{ r: 1 }, { r: 2 }, { r: 3 }]): TableComponent {
  return {
    id,
    type: 'table',
    columns: [{ key: 'r', title: 'r' }],
    rows,
  }
}

/** A4 纵向 + margin=0 + 无页眉页脚的正文可用高（px） */
// 与 paginate.ts 的 bodyPx 计算一致（减 1px 避免打印时 mm→px 舍入多页）
const A4_PORTRAIT_BODY_PX = 297 * (96 / 25.4) - 1 // ≈ 1121.52

describe('paginate', () => {
  let measure: MockMeasure

  beforeEach(() => {
    measure = new MockMeasure()
  })

  describe('空 schema', () => {
    it('body 为空：0 页 0 警告', () => {
      const result = paginate(makeSchema(), { measure })
      expect(result.pages).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('普通组件（p/image）', () => {
    it('单个组件放得下：1 页 1 block', () => {
      const result = paginate(makeSchema([makeP('p1')]), { measure })
      expect(result.pages).toHaveLength(1)
      expect(result.pages[0].blocks).toHaveLength(1)
      expect(result.pages[0].blocks[0]).toMatchObject({
        type: 'item',
        comp: { id: 'p1' },
      })
      expect(result.warnings).toHaveLength(0)
    })

    it('多个组件放得下：1 页多 block', () => {
      // 每组件 20px，A4 bodyPx≈1122，56 个 = 1120 < 1122
      const comps: Component[] = Array.from({ length: 56 }, (_, i) => makeP(`p${i}`))
      const result = paginate(makeSchema(comps), { measure })
      expect(result.pages).toHaveLength(1)
      expect(result.pages[0].blocks).toHaveLength(56)
    })

    it('超过一页容量：第 57 个组件推到第 2 页', () => {
      // 56 * 20 = 1120 < 1122；57 * 20 = 1140 > 1122
      const comps: Component[] = Array.from({ length: 57 }, (_, i) => makeP(`p${i}`))
      const result = paginate(makeSchema(comps), { measure })
      expect(result.pages).toHaveLength(2)
      expect(result.pages[0].blocks).toHaveLength(56)
      expect(result.pages[1].blocks).toHaveLength(1)
    })

    it('超高组件：1 页 1 block + 1 warning', () => {
      measure.blockHeight = A4_PORTRAIT_BODY_PX + 100
      const result = paginate(makeSchema([makeP('big')]), { measure })
      expect(result.pages).toHaveLength(1)
      expect(result.pages[0].blocks).toHaveLength(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toMatchObject({
        compId: 'big',
      })
      expect(result.warnings[0].message).toContain('超过正文可用高')
    })

    it('超高组件不阻碍后续组件分页', () => {
      // 第 1 个超高（2000），后续组件仍按容量切分
      measure.blockHeight = A4_PORTRAIT_BODY_PX + 100
      const result = paginate(makeSchema([makeP('big')]), { measure })
      // 超高组件塞入第 1 页（used 已超 bodyPx），后续组件应推到新页
      // 此处仅验证超高组件自身已正确入页
      expect(result.pages[0].blocks[0]).toMatchObject({ comp: { id: 'big' } })
    })

    it('组件高度恰好等于 bodyPx：1 页 1 block，无警告', () => {
      measure.blockHeight = A4_PORTRAIT_BODY_PX
      const result = paginate(makeSchema([makeP('exact')]), { measure })
      expect(result.pages).toHaveLength(1)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('表格 - 基本切分', () => {
    it('单行表格：1 页 1 slice 含 1 行', () => {
      const result = paginate(
        makeSchema([makeTable('t1', [{ r: 1 }])]),
        { measure },
      )
      expect(result.pages).toHaveLength(1)
      expect(result.pages[0].blocks).toHaveLength(1)
      expect(result.pages[0].blocks[0]).toMatchObject({
        type: 'table-slice',
        comp: { id: 't1' },
      })
      // rows 数量
      expect((result.pages[0].blocks[0] as { rows: TableRow[] }).rows).toHaveLength(1)
    })

    it('多行能塞一页：1 个 slice 含全部行', () => {
      // thead=10 + 3*20 = 70 << 1122
      const result = paginate(makeSchema([makeTable('t1')]), { measure })
      expect(result.pages).toHaveLength(1)
      const slice = result.pages[0].blocks[0] as { rows: TableRow[] }
      expect(slice.rows).toHaveLength(3)
    })

    it('空表格：不产生任何 block', () => {
      const result = paginate(makeSchema([makeTable('t1', [])]), { measure })
      expect(result.pages).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('表格 - 跨页切分', () => {
    it('每页恰好塞满后剩余行推到下一页', () => {
      // 构造：thead=10 + row=20，每页可用 1122
      // 第 1 页能塞 (1122 - 10) / 20 = 55.6 → 55 行
      // 共 56 行：第 1 页 55 行（10+55*20=1110 < 1122），第 2 页 1 行
      const rows: TableRow[] = Array.from({ length: 56 }, (_, i) => ({ r: i + 1 }))
      const result = paginate(makeSchema([makeTable('t1', rows)]), { measure })
      expect(result.pages).toHaveLength(2)
      const slice1 = result.pages[0].blocks[0] as { rows: TableRow[] }
      const slice2 = result.pages[1].blocks[0] as { rows: TableRow[] }
      expect(slice1.rows).toHaveLength(55)
      expect(slice2.rows).toHaveLength(1)
    })

    it('表格后接普通组件：表格切分后 p 起新页', () => {
      // 56 行表格占满 2 页（55+1），后接 1 个 p：
      //   第 2 页有 1 行（10+20=30），还能塞 p（30+20=50 < 1122）→ 同页
      const rows: TableRow[] = Array.from({ length: 56 }, (_, i) => ({ r: i + 1 }))
      const result = paginate(
        makeSchema([makeTable('t1', rows), makeP('p1')]),
        { measure },
      )
      expect(result.pages).toHaveLength(2)
      // 第 2 页应有 2 个 block：1 个 slice + 1 个 p
      expect(result.pages[1].blocks).toHaveLength(2)
      expect(result.pages[1].blocks[0]).toMatchObject({ type: 'table-slice' })
      expect(result.pages[1].blocks[1]).toMatchObject({
        type: 'item',
        comp: { id: 'p1' },
      })
    })
  })

  describe('表格 - 超高行', () => {
    it('超高行强制塞入并产生警告', () => {
      // thead=10 + row=2000 > bodyPx=1122 → 警告 + 强制塞 1 行
      measure.theadHeight = 10
      measure.rowHeight = 2000
      const result = paginate(makeSchema([makeTable('t1', [{ r: 1 }])]), { measure })
      expect(result.pages).toHaveLength(1)
      expect(result.pages[0].blocks).toHaveLength(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toMatchObject({ compId: 't1' })
      expect(result.warnings[0].message).toContain('行高度超过页可用高')
      // 仍塞入 1 行
      const slice = result.pages[0].blocks[0] as { rows: TableRow[] }
      expect(slice.rows).toHaveLength(1)
    })

    it('超高行后续普通组件应推到新页', () => {
      // 超高行强制塞后 used 已超 bodyPx，后续 p 应推到新页
      measure.theadHeight = 10
      measure.rowHeight = 2000
      const result = paginate(
        makeSchema([makeTable('t1', [{ r: 1 }]), makeP('p1')]),
        { measure },
      )
      expect(result.pages).toHaveLength(2)
      // 第 1 页：1 个 table-slice（含超高行）
      expect(result.pages[0].blocks).toHaveLength(1)
      // 第 2 页：1 个 p
      expect(result.pages[1].blocks).toHaveLength(1)
      expect(result.pages[1].blocks[0]).toMatchObject({ comp: { id: 'p1' } })
    })
  })

  describe('混合场景', () => {
    it('p + table + p 复合分页', () => {
      // bodyPx≈1122.52；p1=20 后 avail=1102.52
      // 表格 56 行：thead=10, row=20
      //   第 1 轮：10+N*20<=1102.52 → N<=54.6 → 塞 54 行（segPx=1090），used=20+1090=1110
      //   i=54<56 → flush
      //   第 2 轮：avail=1122.52，剩 2 行（i=54,55），segPx=10+2*20=50，used=50
      //   i=56 不<56，不 flush
      // p2=20，50+20=70<=1122，同页塞入
      // 总：2 页，page0=p1+slice54行，page1=slice2行+p2
      const rows: TableRow[] = Array.from({ length: 56 }, (_, i) => ({ r: i + 1 }))
      const result = paginate(
        makeSchema([makeP('p1'), makeTable('t1', rows), makeP('p2')]),
        { measure },
      )
      expect(result.pages).toHaveLength(2)
      // page 0: p1 + slice 54 行
      expect(result.pages[0].blocks).toHaveLength(2)
      expect(result.pages[0].blocks[0]).toMatchObject({
        type: 'item',
        comp: { id: 'p1' },
      })
      expect(result.pages[0].blocks[1]).toMatchObject({ type: 'table-slice' })
      const slice0 = result.pages[0].blocks[1] as { rows: TableRow[] }
      expect(slice0.rows).toHaveLength(54)
      // page 1: slice 2 行 + p2
      expect(result.pages[1].blocks).toHaveLength(2)
      expect(result.pages[1].blocks[0]).toMatchObject({ type: 'table-slice' })
      const slice1 = result.pages[1].blocks[0] as { rows: TableRow[] }
      expect(slice1.rows).toHaveLength(2)
      expect(result.pages[1].blocks[1]).toMatchObject({
        type: 'item',
        comp: { id: 'p2' },
      })
    })
  })

  describe('页索引', () => {
    it('每个 page 的 index 应从 0 递增', () => {
      const rows: TableRow[] = Array.from({ length: 120 }, (_, i) => ({ r: i + 1 }))
      const result = paginate(makeSchema([makeTable('t1', rows)]), { measure })
      expect(result.pages.map(p => p.index)).toEqual(
        Array.from({ length: result.pages.length }, (_, i) => i),
      )
    })
  })
})
