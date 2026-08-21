import { describe, it, expect } from 'vitest'
import type { PComponent, ImageComponent, TableComponent, TableRow } from '@/types'
import {
  renderComponentHtml,
  renderTableHeaderHtml,
  renderTableRowHtml
} from '../render-html'

/** 工厂：构造 p 组件 */
function makeP(overrides: Partial<PComponent> = {}): PComponent {
  return {
    id: 'p1',
    type: 'p',
    text: 'hello',
    ...overrides,
  }
}

/** 工厂：构造 image 组件 */
function makeImage(overrides: Partial<ImageComponent> = {}): ImageComponent {
  return {
    id: 'img1',
    type: 'image',
    src: 'https://example.com/a.png',
    ...overrides,
  }
}

/** 工厂：构造 table 组件 */
function makeTable(overrides: Partial<TableComponent> = {}): TableComponent {
  return {
    id: 'tbl1',
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

describe('render-html', () => {
  describe('renderComponentHtml - p', () => {
    it('基础渲染：输出 <p>text</p>', () => {
      const html = renderComponentHtml(makeP({ text: 'hello' }))
      expect(html).toBe('<p>hello</p>')
    })

    it('带 field：输出 data-field 属性', () => {
      const html = renderComponentHtml(makeP({ field: 'workName', text: 'hi' }))
      expect(html).toBe('<p data-field="workName">hi</p>')
    })

    it('空 field：不输出 data-field 属性', () => {
      const html = renderComponentHtml(makeP({ field: undefined, text: 'hi' }))
      expect(html).toBe('<p>hi</p>')
    })

    it('文本含 HTML 字符应转义', () => {
      const html = renderComponentHtml(makeP({ text: '<script>alert("x")</script>' }))
      // < → &lt;  > → &gt;  " → &quot;
      expect(html).toBe('<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>')
    })

    it('文本含 & 应转义为 &amp;', () => {
      const html = renderComponentHtml(makeP({ text: 'a & b' }))
      expect(html).toBe('<p>a &amp; b</p>')
    })

    it('field 含双引号应转义', () => {
      const html = renderComponentHtml(makeP({ field: 'a"b', text: 'x' }))
      expect(html).toBe('<p data-field="a&quot;b">x</p>')
    })
  })

  describe('renderComponentHtml - image', () => {
    it('基础渲染：输出 <img src="...">', () => {
      const html = renderComponentHtml(makeImage({ src: 'https://e.com/a.png' }))
      expect(html).toBe('<img src="https://e.com/a.png">')
    })

    it('带 field：输出 data-field 属性', () => {
      const html = renderComponentHtml(makeImage({ field: 'sig', src: 's.png' }))
      expect(html).toBe('<img data-field="sig" src="s.png">')
    })

    it('带 width/height：输出尺寸属性', () => {
      const html = renderComponentHtml(makeImage({ src: 's.png', width: 100, height: 50 }))
      expect(html).toBe('<img src="s.png" width="100" height="50">')
    })

    it('缺省 width/height：不输出尺寸属性', () => {
      const html = renderComponentHtml(makeImage({ src: 's.png' }))
      expect(html).toBe('<img src="s.png">')
    })

    it('src 含双引号应转义', () => {
      const html = renderComponentHtml(makeImage({ src: 'a"b.png' }))
      expect(html).toBe('<img src="a&quot;b.png">')
    })
  })

  describe('renderComponentHtml - table', () => {
    it('表格整体 HTML 应为空字符串（按行分别测高）', () => {
      const html = renderComponentHtml(makeTable())
      expect(html).toBe('')
    })
  })

  describe('renderTableHeaderHtml', () => {
    it('输出 <table><thead><tr>...</tr></thead></table>', () => {
      const html = renderTableHeaderHtml(makeTable())
      expect(html).toBe(
        '<table><thead><tr><th>名称</th><th>年龄</th></tr></thead></table>'
      )
    })

    it('表头标题含 HTML 字符应转义', () => {
      const html = renderTableHeaderHtml(
        makeTable({
          columns: [{ key: 'x', title: '<b>col</b>' }],
        })
      )
      expect(html).toBe(
        '<table><thead><tr><th>&lt;b&gt;col&lt;/b&gt;</th></tr></thead></table>'
      )
    })

    it('空 columns：输出空表头', () => {
      const html = renderTableHeaderHtml(makeTable({ columns: [] }))
      expect(html).toBe('<table><thead><tr></tr></thead></table>')
    })
  })

  describe('renderTableRowHtml', () => {
    it('按列顺序输出单元格', () => {
      const row: TableRow = { name: '张三', age: 20 }
      const html = renderTableRowHtml(makeTable(), row)
      expect(html).toBe(
        '<table><tbody><tr><td>张三</td><td>20</td></tr></tbody></table>'
      )
    })

    it('单元格值缺省时输出空字符串', () => {
      const row: TableRow = { name: '李四' } // 缺 age
      const html = renderTableRowHtml(makeTable(), row)
      expect(html).toBe(
        '<table><tbody><tr><td>李四</td><td></td></tr></tbody></table>'
      )
    })

    it('单元格值含 HTML 字符应转义', () => {
      const row: TableRow = { name: '<x>', age: 0 }
      const html = renderTableRowHtml(makeTable(), row)
      expect(html).toBe(
        '<table><tbody><tr><td>&lt;x&gt;</td><td>0</td></tr></tbody></table>'
      )
    })
  })
})
