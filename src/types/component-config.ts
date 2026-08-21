/**
 * 组件配置项类型定义
 *
 * 设计依据：docs/design-biz.md §5 组件配置项 JSON 声明
 *
 * 每个组件除 UI 渲染逻辑外，单独声明一份配置项 JSON（ComponentConfig），
 * 用于：
 *   1. 驱动右栏配置面板自动渲染表单控件
 *   2. 约束组件可配置属性（避免散落在代码各处）
 *   3. 提供创建默认实例的工厂方法（左栏拖拽到画布时调用）
 */

import type { Component } from './schema'

/**
 * 配置项控件类型
 *
 * 对应右栏面板渲染的表单控件类型：
 *   - text: 单行文本输入框
 *   - textarea: 多行文本输入框
 *   - number: 数字输入框
 *   - select: 下拉选择框
 *   - switch: 开关（true/false）
 */
export type ConfigFieldType = 'text' | 'textarea' | 'number' | 'select' | 'switch'

/**
 * select 类型的选项
 */
export interface ConfigOption {
  /** 选项显示文本 */
  readonly label: string
  /** 选项值 */
  readonly value: string | number
}

/**
 * 单个配置项定义
 *
 * 右栏面板按此结构渲染对应的表单控件。
 */
export interface ConfigField {
  /** 配置项 key（对应 Component 实例上的字段名，如 'field' / 'text' / 'src'） */
  readonly key: string
  /** 显示标签 */
  readonly label: string
  /** 控件类型 */
  readonly type: ConfigFieldType
  /** 是否必填（设计器层校验，非运行时权限） */
  readonly required?: boolean
  /** 默认值（创建组件时初始化用；createDefaultFactory 会从此读取） */
  readonly default?: unknown
  /** select 类型的选项列表（type === 'select' 时必填） */
  readonly options?: readonly ConfigOption[]
  /** 帮助文案（在控件下方显示） */
  readonly help?: string
}

/**
 * 组件配置项声明
 *
 * 泛型参数 T 用于把 fields[].key 类型收紧为 keyof T，
 * 避免拼写错误（如 'txet' 而非 'text'）TS 不报错的隐患。
 *
 * 每个组件开发时单独导出此声明，配套 UI 组件一起注册到 component-registry。
 *
 * @typeParam T 具体组件类型（如 PComponent / ImageComponent / TableComponent）
 */
export interface ComponentConfig<T extends Component = Component> {
  /** 组件类型（与 T['type'] 对应） */
  readonly type: T['type']
  /** 组件显示名（左栏组件库展示） */
  readonly displayName: string
  /** 配置项列表（按顺序在右栏渲染）；key 强制为 T 的字段名，避免拼写错误 */
  readonly fields: ReadonlyArray<ConfigField & { key: keyof T }>
  /**
   * 创建组件默认实例
   *
   * 左栏拖拽到画布时调用，生成带唯一 id + 默认值的组件实例。
   * @param id 组件唯一 id（由调用方生成，如 nanoid 或 uuid）
   * @returns 组件实例
   */
  readonly createDefault: (id: string) => T
}

/**
 * 用于 registry 聚合的类型擦除版本
 *
 * ComponentConfig<T> 在 T 不同时无法直接联合（泛型不变性），
 * 此类型保留 ComponentConfig 的形状，但 fields[].key 退化为 string，
 * 用于 component-registry 聚合异构组件 config。
 *
 * 在每个组件 config.ts 定义处仍用 ComponentConfig<具体类型>，
 * 享受 fields[].key 为 keyof T 的类型保护；进入 registry 时擦除为统一形状。
 */
export type RegisteredComponentConfig = {
  /** 组件类型 */
  readonly type: Component['type']
  /** 组件显示名 */
  readonly displayName: string
  /** 配置项列表（key 已退化为 string，因为 registry 聚合不同 T 的 config） */
  readonly fields: ReadonlyArray<ConfigField>
  /** 创建默认实例工厂 */
  readonly createDefault: (id: string) => Component
}

/**
 * 从 fields[].default 自动组装默认实例的工厂方法
 *
 * 用于消除 fields[].default 与 createDefault 默认值的双份维护问题：
 *   - 修改默认值时只需改 fields[].default 一处
 *   - createDefault 通过此工厂从 fields 读取，自动保持一致
 *
 * @typeParam T 具体组件类型
 * @param type 组件 type
 * @param fields 配置项列表
 * @returns 工厂函数：(id) => T
 */
export function createDefaultFactory<T extends Component>(
  type: T['type'],
  fields: ReadonlyArray<ConfigField & { key: keyof T }>,
): (id: string) => T {
  return (id: string): T => {
    const result: Record<string, unknown> = { id, type }
    for (const f of fields) {
      if (f.default !== undefined) {
        result[f.key as string] = f.default
      }
    }
    return result as T
  }
}
