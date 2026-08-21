import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CompImage from '@/components/image/CompImage.vue'
import type { ImageComponent } from '@/types'

describe('CompImage', () => {
  it('输出 src 属性', () => {
    const comp: ImageComponent = { id: 'img1', type: 'image', src: 'a.png' }
    const wrapper = mount(CompImage, { props: { comp } })
    expect(wrapper.find('img').attributes('src')).toBe('a.png')
  })

  it('带 field 时输出 data-field', () => {
    const comp: ImageComponent = {
      id: 'img1', type: 'image', field: 'sig', src: 's.png',
    }
    const wrapper = mount(CompImage, { props: { comp } })
    expect(wrapper.find('img').attributes('data-field')).toBe('sig')
  })

  it('无 field 时不输出 data-field', () => {
    const comp: ImageComponent = { id: 'img1', type: 'image', src: 's.png' }
    const wrapper = mount(CompImage, { props: { comp } })
    expect(wrapper.find('img').attributes('data-field')).toBeUndefined()
  })

  it('带 width/height 时输出尺寸属性', () => {
    const comp: ImageComponent = {
      id: 'img1', type: 'image', src: 's.png', width: 100, height: 50,
    }
    const wrapper = mount(CompImage, { props: { comp } })
    expect(wrapper.find('img').attributes('width')).toBe('100')
    expect(wrapper.find('img').attributes('height')).toBe('50')
  })

  it('缺省 width/height 时不输出尺寸属性', () => {
    const comp: ImageComponent = { id: 'img1', type: 'image', src: 's.png' }
    const wrapper = mount(CompImage, { props: { comp } })
    expect(wrapper.find('img').attributes('width')).toBeUndefined()
    expect(wrapper.find('img').attributes('height')).toBeUndefined()
  })
})
