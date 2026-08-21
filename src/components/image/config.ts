/**
 * image 组件配置项声明
 *
 * 设计依据：docs/design-biz.md §5.3 image 组件示例
 *
 * 可配置字段：
 *   - field: 字段标识（v2 用于绑定图片 src，URL 或 base64）
 *   - src: 图片地址（必填）
 *   - width: 宽度(mm)
 *   - height: 高度(mm)
 */

import type { ComponentConfig, ConfigField } from '@/types'
import type { ImageComponent } from '@/types'
import { createDefaultFactory } from '@/types'

/** image 组件配置项列表 */
const fields: ReadonlyArray<ConfigField & { key: keyof ImageComponent }> = [
  {
    key: 'field',
    label: '字段标识',
    type: 'text',
    required: false,
    help: 'v2 用于绑定图片 src（URL/base64）',
  },
  {
    key: 'src',
    label: '图片地址',
    type: 'text',
    required: true,
    default: '',
  },
  {
    key: 'width',
    label: '宽度(mm)',
    type: 'number',
    required: false,
  },
  {
    key: 'height',
    label: '高度(mm)',
    type: 'number',
    required: false,
  },
]

/** image 组件配置项 */
export const imageConfig: ComponentConfig<ImageComponent> = {
  type: 'image',
  displayName: '图片',
  fields,
  createDefault: createDefaultFactory<ImageComponent>('image', fields),
}
