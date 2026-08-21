/**
 * table 组件配置项声明
 *
 * 设计依据：docs/design-biz.md §5.3 table 组件示例
 *
 * 可配置字段：
 *   - field: 字段标识（v2 绑定整表数据数组）
 *
 * 注：columns / rows 配置较复杂，不在右栏用简单表单控件配置，
 * 单独在画布内编辑（点击表格进入列编辑模式，v1 暂不实现，v2 扩展）。
 * 因此 columns/rows 的默认值不通过 fields[].default 声明，
 * tableConfig.createDefault 自定义实现。
 */

import type { ComponentConfig, ConfigField } from '@/types'
import type { TableComponent } from '@/types'

/** table 组件配置项列表 */
const fields: ReadonlyArray<ConfigField & { key: keyof TableComponent }> = [
  {
    key: 'field',
    label: '字段标识',
    type: 'text',
    required: false,
    help: 'v2 绑定整表数据数组',
  },
]

/** table 组件配置项 */
export const tableConfig: ComponentConfig<TableComponent> = {
  type: 'table',
  displayName: '表格',
  fields,
  // columns/rows 不在 fields 中（在画布内编辑），故自定义 createDefault
  createDefault: (id: string): TableComponent => ({
    id,
    type: 'table',
    columns: [
      { key: 'col1', title: '列1' },
      { key: 'col2', title: '列2' },
    ],
    rows: [],
  }),
}
