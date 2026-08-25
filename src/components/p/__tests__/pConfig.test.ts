import { describe, it, expect } from 'vitest'
import { pConfig } from '@/components/p/config'
import type { PComponent } from '@/types'

describe('pConfig', () => {
  it('type 为 p', () => {
    expect(pConfig.type).toBe('p')
  })

  it('displayName 非空', () => {
    expect(pConfig.displayName).toBe('段落文本')
  })

  it('fields 仅含 field 一项', () => {
    const keys = pConfig.fields.map(f => f.key)
    expect(keys).toEqual(['field'])
  })

  it('field 配置：text 控件 + 非必填 + 含帮助文案', () => {
    const fieldConfig = pConfig.fields.find(f => f.key === 'field')!
    expect(fieldConfig.type).toBe('text')
    expect(fieldConfig.required).toBe(false)
    expect(fieldConfig.help).toContain('数据绑定')
  })

  it('text 配置：textarea 控件 + 必填 + 默认值', () => {
    const textConfig = pConfig.fields.find(f => f.key === 'text')!
    expect(textConfig.type).toBe('textarea')
    expect(textConfig.required).toBe(true)
    expect(textConfig.default).toBe('段落文本')
  })

  it('createDefault 生成 PComponent 实例（带 id + type + 默认 text）', () => {
    const comp = pConfig.createDefault('p-1') as PComponent
    expect(comp.id).toBe('p-1')
    expect(comp.type).toBe('p')
    expect(comp.text).toBe('段落文本')
  })

  it('createDefault 每次生成不同 id 实例', () => {
    const a = pConfig.createDefault('a')
    const b = pConfig.createDefault('b')
    expect(a.id).toBe('a')
    expect(b.id).toBe('b')
  })
})
