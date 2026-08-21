import { describe, it, expect } from 'vitest'
import {
  componentRegistry,
  getComponentConfig,
  isComponentRegistered,
  getComponentList,
} from '@/config/component-registry'

describe('componentRegistry', () => {
  it('已注册 p / image / table 三种组件', () => {
    const types = componentRegistry.map(c => c.type)
    expect(types).toEqual(['p', 'image', 'table'])
  })

  it('每项均含 type / displayName / fields / createDefault 四字段', () => {
    for (const c of componentRegistry) {
      expect(c.type).toBeTruthy()
      expect(c.displayName).toBeTruthy()
      expect(Array.isArray(c.fields)).toBe(true)
      expect(typeof c.createDefault).toBe('function')
    }
  })
})

describe('getComponentConfig', () => {
  it('按 type 查找 p 配置', () => {
    const c = getComponentConfig('p')
    expect(c).toBeDefined()
    expect(c!.displayName).toBe('段落文本')
  })

  it('按 type 查找 image 配置', () => {
    const c = getComponentConfig('image')
    expect(c).toBeDefined()
    expect(c!.displayName).toBe('图片')
  })

  it('按 type 查找 table 配置', () => {
    const c = getComponentConfig('table')
    expect(c).toBeDefined()
    expect(c!.displayName).toBe('表格')
  })

  it('未注册的 type 返回 undefined', () => {
    expect(getComponentConfig('grid' as never)).toBeUndefined()
  })
})

describe('isComponentRegistered', () => {
  it('p 已注册', () => {
    expect(isComponentRegistered('p')).toBe(true)
  })

  it('image 已注册', () => {
    expect(isComponentRegistered('image')).toBe(true)
  })

  it('table 已注册', () => {
    expect(isComponentRegistered('table')).toBe(true)
  })

  it('未注册的 grid 返回 false', () => {
    expect(isComponentRegistered('grid')).toBe(false)
  })
})

describe('getComponentList', () => {
  it('返回所有组件的 type + displayName 列表', () => {
    const list = getComponentList()
    expect(list).toHaveLength(3)
    expect(list).toContainEqual({ type: 'p', displayName: '段落文本' })
    expect(list).toContainEqual({ type: 'image', displayName: '图片' })
    expect(list).toContainEqual({ type: 'table', displayName: '表格' })
  })

  it('列表顺序与注册顺序一致', () => {
    const list = getComponentList()
    expect(list.map(x => x.type)).toEqual(['p', 'image', 'table'])
  })
})
