/**
 * 表单 Schema 输入类型定义
 *
 * 描述一份可被分页引擎消费的表单结构：
 * 纸张配置 + 左右边距 + 页眉/页脚（可选）+ 正文组件流。
 *
 * 设计依据：docs/engine.md §2、docs/design.md §2、docs/design-biz.md §3。
 *
 * v1 范围：仅 p / image / table 三种组件；权限相关字段不放入 Schema
 *         （由专门的流程配置页面处理，见 design-biz.md §4）。
 */

/** 纸张尺寸（mm）：A4=210×297，A3=297×420 */
export type PaperSize = 'A4' | 'A3'

/** 纸张方向：portrait=纵向，landscape=横向 */
export type Orientation = 'portrait' | 'landscape'

/** 纸张配置：尺寸 + 方向，共同决定最终宽高 */
export interface PaperConfig {
  size: PaperSize
  orientation: Orientation
}

/**
 * 页眉配置
 *
 * 仅支持文本 + 页码占位符，不做组件容器（v1 简化决策）。
 * 未配置内容时仍占位，高度 = 边距。
 */
export interface HeaderConfig {
  /** 高度（mm），默认等于左右边距 */
  height: number
  /** 页眉文本 */
  text?: string
  /** 是否在页眉显示页码（格式：第 {n} 页 / 共 {N} 页） */
  showPageNumber?: boolean
}

/**
 * 页脚配置
 *
 * 与页眉结构一致。
 */
export interface FooterConfig {
  /** 高度（mm），默认等于左右边距 */
  height: number
  /** 页脚文本 */
  text?: string
  /** 是否在页脚显示页码（格式：第 {n} 页 / 共 {N} 页） */
  showPageNumber?: boolean
}

/**
 * 组件基类：所有组件共有的标识字段
 *
 * `field` 用于与流程数据绑定（v2）：渲染时输出 `data-field` 属性，
 * 流程运行时通过 DOM 操作按 field 注入数据。
 * v1 设计器允许填写 field（写入 Schema），但不做数据填充。
 */
export interface BaseComponent {
  /** 组件唯一 id（用于编辑器选中、引擎警告定位） */
  id: string
  /** 组件类型，由具体组件类型字面量收窄 */
  type: string
  /**
   * 字段绑定标识（v2 流程数据键名）
   * - 缺省时组件不参与数据绑定（纯展示用，如说明性文字）
   * - 设计器对重复 field 做软警告（不强制阻止）
   */
  field?: string
}

/** 段落文本：可直接编辑的文本组件（主要输入标签） */
export interface PComponent extends BaseComponent {
  type: 'p'
  /** 段落文本内容 */
  text: string
}

/** 图片组件：固定或自然尺寸的图片 */
export interface ImageComponent extends BaseComponent {
  type: 'image'
  /** 图片地址 */
  src: string
  /** 宽度（mm），缺省则按内容区宽度等比缩放 */
  width?: number
  /** 高度（mm），缺省则按宽度等比缩放 */
  height?: number
}

/** 表格列定义 */
export interface TableColumn {
  /** 列 key（对应行数据字段名） */
  key: string
  /** 列标题（表头显示文本） */
  title: string
  /** 列宽（mm），缺省则均分 */
  width?: number
}

/** 表格行：列 key → 单元格值 */
export type TableRow = Record<string, string | number>

/**
 * 表格组件：长表格，**可跨页切分**
 *
 * - 引擎按行累加高度，凑满一页 → 切片 → 开新页；
 *   每个切片都重新插入 thead（表头每页重复）。
 * - field 绑定语义为"整表数据"（design-biz.md §3.3 形态 1）：
 *   v2 运行时 `data[field]` 直接替换 `rows`，DOM 上 `<table data-field="...">`。
 */
export interface TableComponent extends BaseComponent {
  type: 'table'
  /** 列定义 */
  columns: TableColumn[]
  /** 行数据（v1 设计时为空行模板；v2 运行时由流程数据替换） */
  rows: TableRow[]
}

/**
 * 正文组件联合类型
 *
 * v1 范围：p / image / table 三种。
 * 后续若需 grid/flex 容器再追加（设计器架构已为此预留扩展点）。
 */
export type Component =
  | PComponent
  | ImageComponent
  | TableComponent

/**
 * 表单 Schema：分页引擎的输入
 *
 * 结构：
 *   paper + margin + header + footer + body[]
 *
 * 边距模型（design.md §2.3）：
 *   - 上下边距 = 0（由页眉/页脚占位贴纸张顶/底）
 *   - 左右边距统一（margin 字段，默认 12mm）
 *
 * 不含权限字段：权限由专门的流程配置页面处理（design-biz.md §4），
 *               不在表单 Schema 内承载。
 *
 * header/footer 必填：设计器输出一定包含（用于占位高度计算 + 引擎分页），
 *                      即使无文本/页码也需声明 { height: <margin>, text: '', showPageNumber: false }。
 */
export interface FormSchema {
  /** 纸张配置 */
  paper: PaperConfig
  /** 左右边距（mm），上下边距=0 */
  margin: number
  /** 页眉配置（height 用于占位高度；无文本时 text 留空字符串） */
  header: HeaderConfig
  /** 页脚配置（同 header） */
  footer: FooterConfig
  /** 正文组件流（按顺序流式排列，引擎按页切分） */
  body: Component[]
}
