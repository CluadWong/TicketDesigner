import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FormRenderer from '@/components/renderer/FormRenderer.vue'
import type { FormSchema, Component } from '@/types'
import type { MeasureAPI } from '@/engine'

const STYLE_ID = 'ticket-designer-print-style'

/** 工厂：构造 schema */
function makeSchema(overrides: Partial<FormSchema> = {}): FormSchema {
  return {
    paper: { size: 'A4', orientation: 'portrait' },
    margin: 15,
    header: { height: 15, text: '', showPageNumber: false },
    footer: { height: 15, text: '', showPageNumber: false },
    body: [],
    ...overrides,
  }
}

/** 工厂：构造 p 组件 */
function makeP(id: string): Component {
  return { id, type: 'p', text: id }
}

/**
 * 创建 mock measureFactory
 * @param blockHeight p/image 高度（默认 20px）
 * @param theadHeight 表头高度（默认 10px）
 * @param rowHeight 单行高度（默认 20px）
 */
function mockMeasureFactory(
  blockHeight = 20,
  theadHeight = 10,
  rowHeight = 20,
): () => MeasureAPI {
  return () => ({
    measureBlock: () => blockHeight,
    measureTableHeader: () => theadHeight,
    measureTableRow: () => rowHeight,
  })
}

afterEach(() => {
  document.getElementById(STYLE_ID)?.remove()
})

describe('FormRenderer', () => {
  it('空 schema 渲染 0 张纸', () => {
    const schema = makeSchema()
    const wrapper = mount(FormRenderer, {
      props: { schema, measureFactory: mockMeasureFactory() },
    })
    expect(wrapper.findAll('.paper')).toHaveLength(0)
  })

  it('单个 p 渲染 1 张纸', async () => {
    const schema = makeSchema({ body: [makeP('p1')] })
    const wrapper = mount(FormRenderer, {
      props: { schema, measureFactory: mockMeasureFactory() },
    })
    await nextTick()
    expect(wrapper.findAll('.paper')).toHaveLength(1)
    expect(wrapper.text()).toContain('p1')
  })

  it('调用了 measureFactory 创建 measure', () => {
    const schema = makeSchema({ body: [makeP('p1')] })
    const factory = vi.fn(mockMeasureFactory())
    mount(FormRenderer, {
      props: { schema, measureFactory: factory },
    })
    expect(factory).toHaveBeenCalled()
  })

  it('无警告时不渲染警告面板', () => {
    const schema = makeSchema({ body: [makeP('p1')] })
    const wrapper = mount(FormRenderer, {
      props: { schema, measureFactory: mockMeasureFactory() },
    })
    expect(wrapper.find('.warnings-panel').exists()).toBe(false)
  })

  it('超高组件产生警告且渲染警告面板', async () => {
    // mock 测高 100000px > bodyPx(~1008)，触发超高警告
    const schema = makeSchema({ body: [makeP('big')] })
    const wrapper = mount(FormRenderer, {
      props: {
        schema,
        measureFactory: mockMeasureFactory(100000),
      },
    })
    await nextTick()
    expect(wrapper.find('.warnings-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('big')
    expect(wrapper.find('.has-warning').exists()).toBe(true)
    expect(wrapper.find('.warning-badge').text()).toContain('超过正文可用高')
  })

  it('showWarnings=false 时即使有警告也不渲染面板', async () => {
    const schema = makeSchema({ body: [makeP('big')] })
    const wrapper = mount(FormRenderer, {
      props: {
        schema,
        showWarnings: false,
        measureFactory: mockMeasureFactory(100000),
      },
    })
    await nextTick()
    expect(wrapper.find('.warnings-panel').exists()).toBe(false)
    // 但 block 上的角标仍渲染（受 Paper 控制）
    expect(wrapper.find('.has-warning').exists()).toBe(true)
  })

  it('纸张数量等于分页结果 pages.length', async () => {
    // 56 个 p（每个 20px）：第 1 页 55 个，第 2 页 1 个 → 2 张纸
    const body: Component[] = Array.from({ length: 56 }, (_, i) => makeP(`p${i}`))
    const schema = makeSchema({ body })
    const wrapper = mount(FormRenderer, {
      props: { schema, measureFactory: mockMeasureFactory() },
    })
    await nextTick()
    expect(wrapper.findAll('.paper')).toHaveLength(2)
  })

  it('注入了 @page <style> 节点', () => {
    const schema = makeSchema({ body: [makeP('p1')] })
    const wrapper = mount(FormRenderer, {
      props: { schema, measureFactory: mockMeasureFactory() },
    })
    const el = document.getElementById(STYLE_ID)
    expect(el).not.toBeNull()
    expect(el!.textContent).toContain('@page')
    expect(el!.textContent).toContain('a4 portrait')
    wrapper.unmount()
  })

  it('schema 变化时重新分页', async () => {
    const schema = makeSchema({ body: [makeP('p1')] })
    const wrapper = mount(FormRenderer, {
      props: { schema, measureFactory: mockMeasureFactory() },
    })
    await nextTick()
    expect(wrapper.findAll('.paper')).toHaveLength(1)

    // 改 schema：增加 100 个 p，触发多页
    const newBody: Component[] = Array.from({ length: 100 }, (_, i) => makeP(`p${i}`))
    await wrapper.setProps({
      schema: makeSchema({ body: newBody }),
    })
    await nextTick()
    expect(wrapper.findAll('.paper').length).toBeGreaterThan(1)
  })

  it('卸载时移除 @page <style> 节点', () => {
    const schema = makeSchema({ body: [makeP('p1')] })
    const wrapper = mount(FormRenderer, {
      props: { schema, measureFactory: mockMeasureFactory() },
    })
    expect(document.getElementById(STYLE_ID)).not.toBeNull()
    wrapper.unmount()
    expect(document.getElementById(STYLE_ID)).toBeNull()
  })

  it('A3 横向 schema 注入 a3 landscape @page', () => {
    const schema = makeSchema({
      paper: { size: 'A3', orientation: 'landscape' },
      body: [makeP('p1')],
    })
    const wrapper = mount(FormRenderer, {
      props: { schema, measureFactory: mockMeasureFactory() },
    })
    expect(document.getElementById(STYLE_ID)!.textContent).toContain('a3 landscape')
    wrapper.unmount()
  })
})
