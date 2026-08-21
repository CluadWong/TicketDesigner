<script setup lang="ts">
/**
 * 段落文本组件渲染器
 *
 * 渲染 `<p data-field="...">text</p>`：
 *   - field 缺省时不输出 data-field 属性（Vue 对 undefined 自动省略）
 *   - text 直接渲染为节点文本
 *
 * v1 不做数据填充（仅打印模板）。
 * v2 由流程运行时按 data-field 注入实际值。
 *
 * 设计依据：docs/design.md §3、docs/design-biz.md §3.2。
 */
import type { PComponent } from '@/types'

const props = defineProps<{
  /** 组件实例 */
  comp: PComponent
}>()
</script>

<template>
  <p :data-field="props.comp.field">{{ props.comp.text }}</p>
</template>

<!-- 样式由全局 components.css 的 .form-renderer p 提供，避免与测量用的 HTML 漂移 -->
