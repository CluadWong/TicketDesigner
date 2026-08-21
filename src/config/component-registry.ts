/**
 * 组件注册表
 *
 * 汇集所有组件的 ComponentConfig，供：
 *   - 左栏组件库面板：遍历 registry，按 displayName 渲染可拖拽项
 *   - 右栏配置面板：选中组件时按其 config.fields 自动渲染表单控件
 *   - 画布拖拽：调用 config.createDefault(id) 生成默认实例
 *
 * 强约束：新增组件必须同时提供 UI 组件 + config.ts，并在本注册表登记，
 * 否则组件库不展示、配置面板无法渲染。
 *
 * 设计依据：docs/design-biz.md §5.4、docs/development-plan.md 阶段 3.1。
 */

import type { RegisteredComponentConfig } from '@/types'
import type { Component } from '@/types'
import { pConfig } from '@/components/p/config'
import { imageConfig } from '@/components/image/config'
import { tableConfig } from '@/components/table/config'

/**
 * 已注册组件配置列表
 *
 * 顺序即左栏组件库展示顺序。
 * readonly：防止外部代码意外修改（push/sort/赋值等）。
 *
 * 元素类型用 RegisteredComponentConfig（擦除泛型 T 后的统一形状），
 * 因为各组件 config 定义时用 ComponentConfig<PComponent> 等具体泛型，
 * 泛型不变性使它们无法直接联合；定义处仍享受 keyof T 类型保护，
 * 此处聚合时擦除为统一形状。
 */
export const componentRegistry: readonly RegisteredComponentConfig[] = [
  pConfig,
  imageConfig,
  tableConfig,
]

/**
 * 启动时校验 type 唯一性
 *
 * 若注册表存在重复 type，getComponentConfig 会返回第一个匹配，
 * 第二个永远不命中，bug 难查。模块加载时一次性校验。
 */
function validateTypeUnique(): void {
  const seen = new Set<string>()
  for (const c of componentRegistry) {
    if (seen.has(c.type)) {
      throw new Error(`[component-registry] 重复的组件 type: ${c.type}，请检查注册表`)
    }
    seen.add(c.type)
  }
}

// 模块加载时执行一次校验；重复 type 立即抛错，避免后续运行时诡异行为
validateTypeUnique()

/**
 * 按组件 type 查找配置
 * @param type 组件类型（'p' / 'image' / 'table'）
 * @returns 配置；未注册返回 undefined
 */
export function getComponentConfig(type: Component['type']): RegisteredComponentConfig | undefined {
  return componentRegistry.find(c => c.type === type)
}

/**
 * 校验某组件类型是否已注册
 * @param type 组件类型
 * @returns true 已注册；false 未注册
 */
export function isComponentRegistered(type: string): boolean {
  return componentRegistry.some(c => c.type === type)
}

/**
 * 获取所有已注册组件的 displayName 列表（用于左栏面板展示）
 * @returns [{ type, displayName }] 列表
 */
export function getComponentList(): Array<{ type: Component['type']; displayName: string }> {
  return componentRegistry.map(c => ({ type: c.type, displayName: c.displayName }))
}
