import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Paper from '@/components/renderer/Paper.vue'
import type { FormSchema, Page, Warning } from '@/types'

/** 工厂：构造 schema（含页眉页脚配置） */
function makeSchema(overrides: Partial<FormSchema> = {}): FormSchema {
  return {
    paper: { size: 'A4', orientation: 'portrait' },
    margin: 15,
    header: { height: 15, text: '云南铝业工作票', showPageNumber: true },
    footer: { height: 15, text: '编号：YN-001', showPageNumber: true },
    body: [],
    ...overrides,
  }
}

describe('Paper', () => {
  const schema = makeSchema()

  describe('页眉/页脚', () => {
    it('渲染页眉文本', () => {
      const page: Page = { index: 0, blocks: [] }
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 3, warnings: [] },
      })
      expect(wrapper.find('.paper-header').text()).toContain('云南铝业工作票')
    })

    it('渲染页眉页码（第 n 页 / 共 N 页）', () => {
      const page: Page = { index: 1, blocks: [] }
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 3, warnings: [] },
      })
      expect(wrapper.find('.paper-header').text()).toContain('第 2 页 / 共 3 页')
    })

    it('渲染页脚文本 + 页码', () => {
      const page: Page = { index: 0, blocks: [] }
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 2, warnings: [] },
      })
      const footer = wrapper.find('.paper-footer')
      expect(footer.text()).toContain('编号：YN-001')
      expect(footer.text()).toContain('第 1 页 / 共 2 页')
    })

    it('showPageNumber=false 时不显示页码', () => {
      const s = makeSchema({
        header: { height: 15, text: '页眉', showPageNumber: false },
        footer: { height: 15, text: '页脚', showPageNumber: false },
      })
      const page: Page = { index: 0, blocks: [] }
      const wrapper = mount(Paper, {
        props: { page, schema: s, totalPages: 3, warnings: [] },
      })
      expect(wrapper.find('.paper-header').text()).not.toContain('第')
      expect(wrapper.find('.paper-footer').text()).not.toContain('第')
    })

    it('无 header 配置时按边距高度占位', () => {
      const s = makeSchema({ header: undefined, margin: 20 })
      const page: Page = { index: 0, blocks: [] }
      const wrapper = mount(Paper, {
        props: { page, schema: s, totalPages: 1, warnings: [] },
      })
      // 页眉槽仍渲染（占位贴顶）
      expect(wrapper.find('.paper-header').exists()).toBe(true)
      // 高度 = 边距 20mm
      expect(wrapper.find('.paper-header').attributes('style')).toContain('20mm')
    })
  })

  describe('正文 blocks 渲染', () => {
    it('渲染 p 组件 block', () => {
      const page: Page = {
        index: 0,
        blocks: [
          { type: 'item', comp: { id: 'p1', type: 'p', text: 'hello' } },
        ],
      }
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 1, warnings: [] },
      })
      expect(wrapper.text()).toContain('hello')
    })

    it('渲染 image 组件 block', () => {
      const page: Page = {
        index: 0,
        blocks: [
          { type: 'item', comp: { id: 'img1', type: 'image', src: 'a.png' } },
        ],
      }
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 1, warnings: [] },
      })
      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe('a.png')
    })

    it('渲染 table-slice block 时使用传入的 rows', () => {
      const page: Page = {
        index: 0,
        blocks: [
          {
            type: 'table-slice',
            comp: {
              id: 't1',
              type: 'table',
              columns: [{ key: 'a', title: 'A' }],
              rows: [],
            },
            rows: [{ a: 'v1' }, { a: 'v2' }],
          },
        ],
      }
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 1, warnings: [] },
      })
      const trs = wrapper.findAll('tbody tr')
      expect(trs).toHaveLength(2)
      expect(trs[0].findAll('td')[0].text()).toBe('v1')
    })

    it('多个 block 按顺序渲染', () => {
      const page: Page = {
        index: 0,
        blocks: [
          { type: 'item', comp: { id: 'p1', type: 'p', text: '前段' } },
          { type: 'item', comp: { id: 'p2', type: 'p', text: '后段' } },
        ],
      }
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 1, warnings: [] },
      })
      const blocks = wrapper.findAll('.block')
      expect(blocks).toHaveLength(2)
      expect(blocks[0].text()).toContain('前段')
      expect(blocks[1].text()).toContain('后段')
    })
  })

  describe('警告叠加', () => {
    it('block 对应组件有警告时叠加 .has-warning class', () => {
      const page: Page = {
        index: 0,
        blocks: [
          { type: 'item', comp: { id: 'p1', type: 'p', text: 'x' } },
        ],
      }
      const warnings: Warning[] = [
        { compId: 'p1', message: '组件高度超过正文可用高，已裁剪' },
      ]
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 1, warnings },
      })
      expect(wrapper.find('.block').classes()).toContain('has-warning')
    })

    it('block 对应组件无警告时不叠加 .has-warning class', () => {
      const page: Page = {
        index: 0,
        blocks: [
          { type: 'item', comp: { id: 'p1', type: 'p', text: 'x' } },
        ],
      }
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 1, warnings: [] },
      })
      expect(wrapper.find('.block').classes()).not.toContain('has-warning')
    })

    it('有警告时渲染 WarningOverlay 角标', () => {
      const page: Page = {
        index: 0,
        blocks: [
          { type: 'item', comp: { id: 'p1', type: 'p', text: 'x' } },
        ],
      }
      const warnings: Warning[] = [
        { compId: 'p1', message: '超高警告' },
      ]
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 1, warnings },
      })
      expect(wrapper.find('.warning-badge').exists()).toBe(true)
      expect(wrapper.find('.warning-badge').text()).toContain('超高警告')
    })

    it('警告只叠加在匹配 compId 的 block 上', () => {
      const page: Page = {
        index: 0,
        blocks: [
          { type: 'item', comp: { id: 'p1', type: 'p', text: 'first' } },
          { type: 'item', comp: { id: 'p2', type: 'p', text: 'second' } },
        ],
      }
      const warnings: Warning[] = [
        { compId: 'p2', message: 'p2 超高' },
      ]
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 1, warnings },
      })
      const blocks = wrapper.findAll('.block')
      expect(blocks[0].classes()).not.toContain('has-warning')
      expect(blocks[1].classes()).toContain('has-warning')
    })
  })

  describe('纸张容器尺寸', () => {
    it('A4 纵向容器宽度 210mm', () => {
      const page: Page = { index: 0, blocks: [] }
      const wrapper = mount(Paper, {
        props: { page, schema, totalPages: 1, warnings: [] },
      })
      expect(wrapper.find('.paper').attributes('style')).toContain('210mm')
    })

    it('A3 横向容器宽度 420mm', () => {
      const s = makeSchema({
        paper: { size: 'A3', orientation: 'landscape' },
      })
      const page: Page = { index: 0, blocks: [] }
      const wrapper = mount(Paper, {
        props: { page, schema: s, totalPages: 1, warnings: [] },
      })
      expect(wrapper.find('.paper').attributes('style')).toContain('420mm')
    })

    it('左右内边距等于 margin', () => {
      const s = makeSchema({ margin: 20 })
      const page: Page = { index: 0, blocks: [] }
      const wrapper = mount(Paper, {
        props: { page, schema: s, totalPages: 1, warnings: [] },
      })
      const style = wrapper.find('.paper').attributes('style') ?? ''
      expect(style).toContain('20mm')
    })
  })
})
