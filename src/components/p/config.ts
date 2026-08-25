/**
 * p 组件配置项声明
 *
 * 设计依据：docs/design-biz.md §5.3 p 组件示例
 *
 * p 组件是数据无关的空壳——不含 text 内容字段。
 * 可配置字段：
 *   - field: 字段标识（预览组件用，绑定 data[field] 填入文本）
 */

import type { ComponentConfig, ConfigField } from '@/types'
import type { PComponent } from '@/types'
import { createDefaultFactory } from '@/types'

/** p 组件配置项列表（key 强制为 PComponent 字段名，避免拼写错误） */
const fields: ReadonlyArray<ConfigField & { key: keyof PComponent }> = [
  {
    key: 'field',
    label: '字段标识',
    type: 'text',
    required: false,
    help: '预览时绑定 data[field] 填入文本；空则不参与数据绑定',
  },
]

/** p 组件配置项 */
export const pConfig: ComponentConfig<PComponent> = {
  type: 'p',
  displayName: '段落文本',
  fields,
  // 通过 createDefaultFactory 从 fields[].default 自动组装，产出空壳模板
  createDefault: createDefaultFactory<PComponent>('p', fields),
}
