import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CompTable from '@/components/table/CompTable.vue'
import type { TableComponent, TableRow } from '@/types'

/** 工厂：构造表格组件 */
function makeTable(overrides: Partial<TableComponent> = {}): TableComponent {
  return {
    id: 't1',
    type: 'table',
    columns: [
      { key: 'name', title: '名称' },
      { key: 'age', title: '年龄' },
    ],
    rows: [
      { name: '张三', age: 20 },
      { name: '李四', age: 25 },
    ],
    ...overrides,
  }
}

describe('CompTable', () => {
  it('渲染表头列（按 columns 顺序）', () => {
    const wrapper = mount(CompTable, { props: { comp: makeTable() } })
    const ths = wrapper.findAll('thead th')
    expect(ths).toHaveLength(2)
    expect(ths[0].text()).toBe('名称')
    expect(ths[1].text()).toBe('年龄')
  })

  it('默认用 comp.rows 渲染所有行', () => {
    const wrapper = mount(CompTable, { props: { comp: makeTable() } })
    const trs = wrapper.findAll('tbody tr')
    expect(trs).toHaveLength(2)
    const firstRowTds = trs[0].findAll('td')
    expect(firstRowTds[0].text()).toBe('张三')
    expect(firstRowTds[1].text()).toBe('20')
  })

  it('传入 rows prop 时用传入的行（不取 comp.rows）', () => {
    const rows: TableRow[] = [{ name: '王五', age: 30 }]
    const wrapper = mount(CompTable, {
      props: { comp: makeTable(), rows },
    })
    const trs = wrapper.findAll('tbody tr')
    expect(trs).toHaveLength(1)
    expect(trs[0].findAll('td')[0].text()).toBe('王五')
  })

  it('传入空 rows prop 时不渲染行（用于空切片场景）', () => {
    const wrapper = mount(CompTable, {
      props: { comp: makeTable(), rows: [] },
    })
    expect(wrapper.findAll('tbody tr')).toHaveLength(0)
  })

  it('带 field 时输出 data-field', () => {
    const wrapper = mount(CompTable, {
      props: { comp: makeTable({ field: 'deviceList' }) },
    })
    expect(wrapper.find('table').attributes('data-field')).toBe('deviceList')
  })

  it('无 field 时不输出 data-field', () => {
    const wrapper = mount(CompTable, { props: { comp: makeTable() } })
    expect(wrapper.find('table').attributes('data-field')).toBeUndefined()
  })

  it('列宽 width 输出 mm 单位 inline style', () => {
    const comp = makeTable({
      columns: [{ key: 'name', title: '名称', width: 30 }],
    })
    const wrapper = mount(CompTable, { props: { comp } })
    const th = wrapper.find('thead th')
    expect(th.attributes('style')).toContain('30mm')
  })

  it('单元格值缺省时输出空字符串', () => {
    const rows: TableRow[] = [{ name: '赵六' }] // age 缺省
    const wrapper = mount(CompTable, {
      props: { comp: makeTable(), rows },
    })
    const tds = wrapper.findAll('tbody td')
    expect(tds[0].text()).toBe('赵六')
    expect(tds[1].text()).toBe('')
  })
})
