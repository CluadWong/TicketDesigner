<script setup lang="ts">
/**
 * 图片组件渲染器
 *
 * 渲染 `<img data-field="..." src="..." width="..." height="...">`：
 *   - field 缺省时不输出 data-field 属性
 *   - width/height 缺省时不输出尺寸属性（按图片原始尺寸）
 *
 * v1 不做数据填充；v2 由流程运行时按 data-field 替换 src。
 *
 * 设计依据：docs/design.md §3、docs/design-biz.md §3.2。
 */
import type { ImageComponent } from '@/types'

const props = defineProps<{
  /** 组件实例 */
  comp: ImageComponent
}>()
</script>

<template>
  <img
    :data-field="props.comp.field"
    :src="props.comp.src"
    :width="props.comp.width"
    :height="props.comp.height"
  >
</template>

<!-- 样式由全局 components.css 的 .form-renderer img 提供 -->
