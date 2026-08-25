<script setup lang="ts">
/**
 * 中栏：画布面板
 *
 * 职责（v1 阶段 3.3 交互）：
 *   - 承载 FormRenderer，渲染纸张堆叠
 *   - 接收 FormRenderer 的 paginate 事件，转发给父组件
 *   - drop zone：读取 dataTransfer 拿到组件 type，emit add-comp 通知父组件生成实例
 *   - click 代理：根据点击目标是否在 [data-comp-id] 内，emit select-comp(id|null)
 *
 * 设计依据：docs/design-biz.md §2.1、docs/development-plan.md §3.3.1、§3.3.4。
 */

import type { FormSchema, PaginateResult, Component } from '@/types'
import FormRenderer from '@/components/renderer/FormRenderer.vue'

const props = defineProps<{
  /** 表单 schema */
  schema: FormSchema
  /** 当前选中的组件 id（用于事件代理判断，可选） */
  selectedCompId: string | null
}>()

const emit = defineEmits<{
  /** 分页结果变化（来自 FormRenderer，转发给父组件供状态栏显示） */
  paginate: [result: PaginateResult]
  /** 选中/取消选中组件（点击 .block 选中，点击画布空白取消） */
  'select-comp': [id: string | null]
  /** 从左栏拖拽到画布：父组件根据 type 生成默认实例 push 进 schema.body */
  'add-comp': [type: Component['type']]
}>()

/**
 * drop 事件：读取 dataTransfer 拿到组件 type，emit add-comp
 */
function handleDrop(event: DragEvent): void {
  event.preventDefault()
  const type = event.dataTransfer?.getData('application/x-component-type')
  if (!type) return
  // 类型守卫：只允许已注册的组件 type
  if (type !== 'p' && type !== 'image' && type !== 'table') return
  emit('add-comp', type)
}

/** dragover 必须阻止默认行为，否则 drop 事件不会触发 */
function handleDragOver(event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

/**
 * click 代理：根据点击目标是否在 [data-comp-id] 内决定选中或取消
 *
 * - 点击 .block（含 data-comp-id）：emit select-comp(id)
 * - 点击画布空白（.canvas-pane / .canvas-content 自身）：emit select-comp(null)
 */
function handleCanvasClick(event: MouseEvent): void {
  const target = event.target as HTMLElement
  // 找最近的 [data-comp-id] 祖先（点击可能落在 block 内部子元素上）
  const blockEl = target.closest('[data-comp-id]') as HTMLElement | null
  if (blockEl?.dataset.compId) {
    emit('select-comp', blockEl.dataset.compId)
  } else {
    // 点画布空白：取消选中
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
