<script setup lang="ts">
/**
 * 段落文本组件渲染器（模板编辑器模式）
 *
 * p 组件是数据无关的空壳——不含 text 内容字段。
 * 模板编辑器画布中显示 `{field}` 占位（如 field='单位' 显示 {单位}），方便设计者识别数据位置。
 * field 缺省时显示空占位（纯静态文本位置）。
 *
 * 预览模式由 FormPreview 组件渲染 `<p contenteditable data-field="...">` 并填入 data[field]。
 *
 * 设计依据：docs/design.md §3、docs/design-biz.md §3.2、§5.3。
 */
import { computed } from 'vue'
import type { PComponent } from '@/types'

const props = defineProps<{
  /** 组件实例 */
  comp: PComponent
}>()

/** 模板占位文本：有 field 显示 {field}，无 field 显示空 */
const placeholder = computed(() => {
  const f = props.comp.field
  return f ? `{${f}}` : ''
})
</script>

<template>
  <p :data-field="props.comp.field">{{ placeholder }}</p>
</template>

<!-- 样式由全局 components.css 的 .form-renderer p 提供，避免与测量用的 HTML 漂移 -->
