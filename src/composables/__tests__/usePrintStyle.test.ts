import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { FormSchema } from '@/types'
import type { MaybeRefOrGetter } from 'vue'
import { usePrintStyle } from '@/composables/usePrintStyle'

const STYLE_ID = 'ticket-designer-print-style'

/** 工厂：构造 schema */
function makeSchema(overrides: Partial<FormSchema> = {}): FormSchema {
  return {
    paper: { size: 'A4', orientation: 'portrait' },
    margin: 12,
    header: { height: 12, text: '', showPageNumber: false },
    footer: { height: 12, text: '', showPageNumber: false },
    body: [],
    ...overrides,
  }
}

/**
 * 包装组件：在 setup 内调用 usePrintStyle
 * @param schema FormSchema | Ref<FormSchema> | (() => FormSchema)
 */
function makeWrapper(schema: MaybeRefOrGetter<FormSchema>) {
  return defineComponent({
    setup() {
      usePrintStyle(schema)
      return () => h('div')
    },
  })
}

afterEach(() => {
  document.getElementById(STYLE_ID)?.remove()
})

describe('usePrintStyle', () => {
  it('挂载时注入 <style> 节点到 <head>', () => {
    const wrapper = mount(makeWrapper(makeSchema()))
    expect(document.getElementById(STYLE_ID)).not.toBeNull()
    wrapper.unmount()
  })

  it('内容包含 @page + size + orientation', () => {
    const wrapper = mount(makeWrapper(makeSchema({
      paper: { size: 'A4', orientation: 'portrait' },
    })))
    const css = document.getElementById(STYLE_ID)!.textContent ?? ''
    expect(css).toContain('@page')
    expect(css).toContain('a4')
    expect(css).toContain('portrait')
    expect(css).toContain('margin: 0')
    wrapper.unmount()
  })

  it('A3 + landscape 应输出 a3 landscape', () => {
    const wrapper = mount(makeWrapper(makeSchema({
      paper: { size: 'A3', orientation: 'landscape' },
    })))
    expect(document.getElementById(STYLE_ID)!.textContent).toContain('a3 landscape')
    wrapper.unmount()
  })

  it('schema ref 变化时自动更新 @page', async () => {
    const schemaRef = ref(makeSchema())
    const wrapper = mount(makeWrapper(schemaRef))
    expect(document.getElementById(STYLE_ID)!.textContent).toContain('a4 portrait')

    schemaRef.value = makeSchema({
      paper: { size: 'A3', orientation: 'landscape' },
    })
    await nextTick()
    expect(document.getElementById(STYLE_ID)!.textContent).toContain('a3 landscape')
    wrapper.unmount()
  })

  it('getter 函数 schema 变化时自动更新', async () => {
    const schemaRef = ref(makeSchema())
    const wrapper = mount(makeWrapper(() => schemaRef.value))
    expect(document.getElementById(STYLE_ID)!.textContent).toContain('a4 portrait')

    schemaRef.value = makeSchema({
      paper: { size: 'A3', orientation: 'landscape' },
    })
    await nextTick()
    expect(document.getElementById(STYLE_ID)!.textContent).toContain('a3 landscape')
    wrapper.unmount()
  })

  it('卸载时移除 <style> 节点', () => {
    const wrapper = mount(makeWrapper(makeSchema()))
    expect(document.getElementById(STYLE_ID)).not.toBeNull()
    wrapper.unmount()
    expect(document.getElementById(STYLE_ID)).toBeNull()
  })
})
