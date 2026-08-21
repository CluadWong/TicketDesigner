<script setup lang="ts">
/**
 * 中栏：画布面板
 *
 * 职责（v1 阶段 3.2 骨架）：
 *   - 承载 FormRenderer，渲染纸张堆叠
 *   - 接收 FormRenderer 的 paginate 事件，转发给父组件
 *   - drop zone 占位（阶段 3.3 实现拖拽生成组件）
 *   - 组件选中交互占位（阶段 3.3 实现点击选中）
 *
 * 设计依据：docs/design-biz.md §2.1、docs/development-plan.md §3.2.3。
 */

import type { FormSchema, PaginateResult } from '@/types'
import FormRenderer from '@/components/renderer/FormRenderer.vue'

const props = defineProps<{
  /** 表单 schema */
  schema: FormSchema
  /** 当前选中的组件 id（阶段 3.3 实现选中高亮） */
  selectedCompId: string | null
}>()

const emit = defineEmits<{
  /** 分页结果变化（来自 FormRenderer，转发给父组件供状态栏显示） */
  paginate: [result: PaginateResult]
  /** 选中/取消选中组件（阶段 3.3 实现点击交互） */
  'select-comp': [id: string | null]
}>()

/**
 * drop 事件：阶段 3.3 实现拖拽生成组件
 *
 * 当前为占位，仅阻止默认行为避免浏览器打开 dataTransfer 内容。
 */
function handleDrop(event: DragEvent): void {
  event.preventDefault()
  // TODO 阶段 3.3：读取 dataTransfer 拿到组件 type，
  // 调用 config.createDefault(id) 生成实例 push 进 schema.body
}

/** dragover 必须阻止默认行为，否则 drop 事件不会触发 */
function handleDragOver(event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

/** 点击画布空白区域：取消选中（阶段 3.3 实现交互） */
function handleCanvasClick(event: MouseEvent): void {
  const target = event.target as HTMLElement
  // 点击的是画布容器自身（非组件），取消选中
  if (target.classList.contains('canvas-content') || target.classList.contains('canvas-pane')) {
    emit('select-comp', null)
  }
}
</script>

<template>
  <div
    class="canvas-pane"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @click="handleCanvasClick"
  >
    <div class="canvas-content">
      <FormRenderer
        :schema="props.schema"
        :show-warnings="false"
        @paginate="result => emit('paginate', result)"
      />
    </div>
  </div>
</template>

<style scoped>
.canvas-pane {
  overflow: auto;
  background: #e5e7eb;
  padding: 24px;
}

.canvas-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
}

/**
 * 打印模式：彻底重置容器约束
 *
 * - .canvas-pane：display: block + height: auto + overflow: visible + padding: 0
 * - .canvas-content：display: block + min-height: 0
 *   （屏幕模式的 min-height: 100% 在打印时会撑高容器，
 *    可能让第一张 .paper 被推到第二打印页起始，产生空白页）
 *
 * 只让 .paper 自己严格控制 height: 297mm + page-break-after: always。
 */
@media print {
  .canvas-pane {
    background: white !important;
    padding: 0 !important;
    overflow: visible !important;
    display: block !important;
    height: auto !important;
  }

  .canvas-content {
    display: block !important;
    min-height: 0 !important;
    align-items: stretch !important;
  }
}
</style>
