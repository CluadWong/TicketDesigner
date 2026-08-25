<script setup lang="ts">
/**
 * 预览弹窗组件
 *
 * 全屏弹窗，包裹 FormPreview，提供打印/关闭工具栏。
 * 弹窗内支持 window.print()，打印时只输出纸张内容。
 *
 * DOM 结构（Teleport to body）：
 *   <body>
 *     <div id="app">设计器...</div>
 *     <div class="preview-overlay">          ← 弹窗根
 *       <div class="preview-toolbar">打印/关闭</div>
 *       <div class="preview-content">
 *         <FormPreview :schema :data :rules />
 *       </div>
 *     </div>
 *   </body>
 *
 * 打印 CSS：
 *   - #app { display: none }  隐藏设计器
 *   - .preview-overlay { position: static }  弹窗容器重置
 *   - .preview-toolbar { display: none }  隐藏工具栏
 *   - .preview-content { overflow: visible }  内容区不裁剪
 *   - 纸张分页规则复用 FormRenderer / components.css 的 @media print
 *
 * 设计依据：docs/development-plan.md 阶段 4。
 */
import type { FormSchema, RulesMap } from '@/types'
import FormPreview from './FormPreview.vue'

const props = defineProps<{
  /** 弹窗是否显示 */
  visible: boolean
  /** 表单模板 schema */
  schema: FormSchema
  /** 表单数据 */
  data: Record<string, unknown>
  /** 权限规则 */
  rules?: RulesMap
}>()

const emit = defineEmits<{
  /** 关闭弹窗 */
  close: []
  /** 数据更新（来自 FormPreview） */
  'update:data': [data: Record<string, unknown>]
}>()

/**
 * 触发浏览器打印
 *
 * 打印时 @media print 规则生效：
 *   - #app 隐藏（设计器不可见）
 *   - .preview-overlay 重置为 static 定位
 *   - .preview-toolbar 隐藏
 *   - FormPreview 内的纸张按 page-break-after 输出
 */
function handlePrint(): void {
  window.print()
}

/** 关闭弹窗 */
function handleClose(): void {
  emit('close')
}

/** ESC 键关闭弹窗 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.visible"
      class="preview-overlay"
      @keydown="handleKeydown"
      tabindex="0"
    >
      <!-- 工具栏 -->
      <div class="preview-toolbar">
        <span class="toolbar-title">表单预览</span>
        <div class="toolbar-actions">
          <button class="btn btn-primary" @click="handlePrint">打印</button>
          <button class="btn" @click="handleClose">关闭</button>
        </div>
      </div>

      <!-- 内容区：FormPreview 渲染纸张 -->
      <div class="preview-content">
        <FormPreview
          :schema="props.schema"
          :data="props.data"
          :rules="props.rules"
          @update:data="newData => emit('update:data', newData)"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  background: #e5e7eb;
  display: flex;
  flex-direction: column;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: #1f2937;
  color: #f9fafb;
  flex-shrink: 0;
}

.toolbar-title {
  font-size: 14px;
  font-weight: 600;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.btn {
  height: 28px;
  padding: 0 12px;
  background: #374151;
  color: #f9fafb;
  border: 1px solid #4b5563;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn:hover {
  background: #4b5563;
}

.btn-primary {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.preview-content {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

/* 打印模式：只输出纸张内容 */
@media print {
  /* 隐藏设计器页面 */
  #app {
    display: none !important;
  }

  /* 弹窗容器重置为静态定位，铺满打印区域 */
  .preview-overlay {
    position: static !important;
    background: white !important;
    overflow: visible !important;
  }

  /* 隐藏弹窗工具栏 */
  .preview-toolbar {
    display: none !important;
  }

  /* 内容区重置：不裁剪、不滚动、不留白 */
  .preview-content {
    overflow: visible !important;
    padding: 0 !important;
  }
}
</style>
