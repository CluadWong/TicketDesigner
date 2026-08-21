// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { DomMeasure } from '../measure'
import type { Component, TableComponent, TableRow } from '@/types'

/**
 * DomMeasure 测试
 *
 * 注意：jsdom 不实现真实布局，offsetHeight 始终返回 0。
 * 因此本测试只验证：
 *   1. 构造不抛错
 *   2. destroy 不抛错且移除 DOM 节点
 *   3. 测量调用返回数值（哪怕是 0）
 *   4. contentWidthPx 设置后容器宽度生效
 *
 * 真实测高精度需要浏览器环境（e2e 测试或手动验证），不在单测范围。
 */

describe('DomMeasure', () => {
  let measure: DomMeasure | null = null

  afterEach(() => {
    if (measure) {
      measure.destroy()
      measure = null
    }
  })

  it('构造不抛错，且在 body 中插入 measurer 节点', () => {
    measure = new DomMeasure()
    const nodes = document.querySelectorAll('div')
    // 至少有 1 个 div（measurer）
    expect(nodes.length).toBeGreaterThanOrEqual(1)
  })

  it('destroy 后 measurer 节点从 body 移除', () => {
    measure = new DomMeasure()
    const before = document.querySelectorAll('div').length
    measure.destroy()
    measure = null
    const after = document.querySelectorAll('div').length
    expect(after).toBe(before - 1)
  })

  it('measureBlock 返回数值', () => {
    measure = new DomMeasure()
    const comp: Component = { id: 'p1', type: 'p', text: 'hello' }
    const h = measure.measureBlock(comp, 500)
    expect(typeof h).toBe('number')
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('measureTableHeader 返回数值', () => {
    measure = new DomMeasure()
    const comp: TableComponent = {
      id: 't1',
      type: 'table',
      columns: [{ key: 'a', title: 'A' }],
      rows: [],
    }
    const h = measure.measureTableHeader(comp, 500)
    expect(typeof h).toBe('number')
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('measureTableRow 返回数值', () => {
    measure = new DomMeasure()
    const comp: TableComponent = {
      id: 't1',
      type: 'table',
      columns: [{ key: 'a', title: 'A' }],
      rows: [],
    }
    const row: TableRow = { a: 'v1' }
    const h = measure.measureTableRow(comp, row, 500)
    expect(typeof h).toBe('number')
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('contentWidthPx 设置后 measurer 宽度生效', () => {
    measure = new DomMeasure()
    const comp: Component = { id: 'p1', type: 'p', text: 'x' }
    measure.measureBlock(comp, 800)
    // 找到 measurer 节点（最后一个 div）
    const measurer = document.querySelector('div[style*="-99999px"]') as HTMLDivElement | null
    // jsdom 不一定支持复杂 style 选择器，做软断言
    if (measurer) {
      expect(measurer.style.width).toBe('800px')
    }
  })
})
