/**
 * p 组件配置项声明
 *
 * 设计依据：docs/design-biz.md §5.3 p 组件示例
 *
 * 可配置字段：
 *   - field: 字段标识（v2 流程数据绑定键，空则不参与数据绑定）
 *   - text: 段落文本内容（必填）
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
    help: '用于与流程数据绑定；空则不参与数据绑定',
  },
  {
    key: 'text',
    label: '文本内容',
    type: 'textarea',
    required: true,
    default: '段落文本',
  },
]

/** p 组件配置项 */
export const pConfig: ComponentConfig<PComponent> = {
  type: 'p',
  displayName: '段落文本',
  fields,
  // 通过 createDefaultFactory 从 fields[].default 自动组装，避免双份维护
  createDefault: createDefaultFactory<PComponent>('p', fields),
}
