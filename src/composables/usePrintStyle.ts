/**
 * 打印样式动态注入
 *
 * 按 schema.paper 动态生成 @page 规则，注入到 <head>：
 *   @page { size: A4 portrait; margin: 0; }
 *
 * - onMounted 注入并更新
 * - schema 变化时自动更新
 * - onUnmounted 移除 <style> 节点
 *
 * 设计依据：docs/engine.md §7 打印集成；docs/development-plan.md 阶段 2.4。
 */

import { onMounted, onUnmounted, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { FormSchema } from '@/types'

/** 注入的 <style> 节点 id */
const STYLE_ID = 'ticket-designer-print-style'

/**
 * 按 schema.paper 生成 @page CSS 规则
 * @param schema 表单 schema
 * @returns 形如 `@page { size: A4 portrait; margin: 0; }` 的 CSS 字符串
 */
function buildPageCss(schema: FormSchema): string {
  const size = schema.paper.size.toLowerCase() // 'a4' / 'a3'
  const orientation = schema.paper.orientation // 'portrait' / 'landscape'
  return `@page { size: ${size} ${orientation}; margin: 0; }`
}

/**
 * 注入/更新打印 @page 规则
 *
 * 用法：
 * ```ts
 * usePrintStyle(() => props.schema)
 * // 或
 * usePrintStyle(schemaRef)
 * ```
 *
 * @param schema 表单 schema（支持 ref / getter / 直接对象）
 */
export function usePrintStyle(schema: MaybeRefOrGetter<FormSchema>): void {
  /** 获取或创建 <style> 节点 */
  const getStyleEl = (): HTMLStyleElement => {
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = STYLE_ID
      document.head.appendChild(el)
    }
    return el
  }

  /** 按 schema 更新 @page 规则 */
  const update = (): void => {
    const s = toValue(schema)
    getStyleEl().textContent = buildPageCss(s)
  }

  // setup 顶层注册 watcher，响应 schema 变化（deep 监听 body 等嵌套字段）
  watch(() => toValue(schema), update, { deep: true })

  // 挂载时首次注入
  onMounted(update)

  // 卸载时移除 <style> 节点
  onUnmounted(() => {
    document.getElementById(STYLE_ID)?.remove()
  })
}
