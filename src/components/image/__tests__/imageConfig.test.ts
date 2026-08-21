import { describe, it, expect } from 'vitest'
import { imageConfig } from '@/components/image/config'
import type { ImageComponent } from '@/types'

describe('imageConfig', () => {
  it('type 为 image', () => {
    expect(imageConfig.type).toBe('image')
  })

  it('displayName 非空', () => {
    expect(imageConfig.displayName).toBe('图片')
  })

  it('fields 包含 field + src + width + height 四项', () => {
    const keys = imageConfig.fields.map(f => f.key)
    expect(keys).toEqual(['field', 'src', 'width', 'height'])
  })

  it('src 必填，width/height 非必填', () => {
    expect(imageConfig.fields.find(f => f.key === 'src')!.required).toBe(true)
    expect(imageConfig.fields.find(f => f.key === 'width')!.required).toBeFalsy()
    expect(imageConfig.fields.find(f => f.key === 'height')!.required).toBeFalsy()
  })

  it('width/height 控件类型为 number', () => {
    expect(imageConfig.fields.find(f => f.key === 'width')!.type).toBe('number')
    expect(imageConfig.fields.find(f => f.key === 'height')!.type).toBe('number')
  })

  it('createDefault 生成 ImageComponent 实例（src 默认空字符串）', () => {
    const comp = imageConfig.createDefault('img-1') as ImageComponent
    expect(comp.id).toBe('img-1')
    expect(comp.type).toBe('image')
    expect(comp.src).toBe('')
  })
})
