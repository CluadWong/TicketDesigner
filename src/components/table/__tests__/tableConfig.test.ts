import { describe, it, expect } from 'vitest'
import { tableConfig } from '@/components/table/config'
import type { TableComponent } from '@/types'

describe('tableConfig', () => {
  it('type 为 table', () => {
    expect(tableConfig.type).toBe('table')
  })

  it('displayName 非空', () => {
    expect(tableConfig.displayName).toBe('表格')
  })

  it('fields 仅含 field 一项（columns/rows 在画布内编辑，非右栏）', () => {
    const keys = tableConfig.fields.map(f => f.key)
    expect(keys).toEqual(['field'])
  })

  it('field 配置：text 控件 + 非必填 + 含帮助文案', () => {
    const fieldConfig = tableConfig.fields[0]
    expect(fieldConfig.type).toBe('text')
    expect(fieldConfig.required).toBe(false)
    expect(fieldConfig.help).toContain('整表数据')
  })

  it('createDefault 生成 TableComponent 实例（含默认 2 列）', () => {
    const comp = tableConfig.createDefault('t-1') as TableComponent
    expect(comp.id).toBe('t-1')
    expect(comp.type).toBe('table')
    expect(comp.columns).toHaveLength(2)
    expect(comp.columns[0].key).toBe('col1')
    expect(comp.columns[1].key).toBe('col2')
    expect(comp.rows).toEqual([])
  })
})
