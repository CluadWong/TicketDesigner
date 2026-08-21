<script setup lang="ts">
/**
 * 左栏：组件库面板
 *
 * 职责（v1 阶段 3.2 骨架）：
 *   - 遍历 componentRegistry 渲染可拖拽项（v1 仅 p/image/table）
 *   - 拖拽到中栏画布逻辑待阶段 3.3 实现
 *
 * 设计依据：docs/design-biz.md §2.1、§5.4、docs/development-plan.md §3.2.2。
 */

import { getComponentList } from '@/config/component-registry'

/** 已注册组件列表（按 displayName 渲染） */
const componentList = getComponentList()

/**
 * 拖拽开始：设置 dataTransfer 携带组件 type
 *
 * 阶段 3.3 实现 CanvasPane 的 drop 处理后，会读取 dataTransfer 拿到 type，
 * 调用 config.createDefault(id) 生成默认实例 push 进 schema.body。
 */
function handleDragStart(event: DragEvent, type: string): void {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('application/x-component-type', type)
  event.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <div class="palette">
    <div class="palette-title">组件库</div>
    <div class="component-list">
      <div
        v-for="comp in componentList"
        :key="comp.type"
        class="component-item"
        draggable="true"
        @dragstart="handleDragStart($event, comp.type)"
      >
        <span class="component-icon">{{ comp.type === 'table' ? '▦' : comp.type === 'image' ? '🖼' : '¶' }}</span>
        <span class="component-name">{{ comp.displayName }}</span>
      </div>
    </div>
    <div class="palette-hint">
      拖拽组件到画布<br />（阶段 3.3 实现完整交互）
    </div>
  </div>
</template>

<style scoped>
.palette {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
}

.palette-title {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.component-list {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.component-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: grab;
  user-select: none;
  font-size: 13px;
  color: #374151;
  transition: all 0.15s;
}

.component-item:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.component-item:active {
  cursor: grabbing;
}

.component-icon {
  font-size: 14px;
  width: 16px;
  text-align: center;
}

.component-name {
  flex: 1;
}

.palette-hint {
  padding: 12px 16px;
  font-size: 11px;
  color: #9ca3af;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  line-height: 1.5;
  text-align: center;
}

@media print {
  .palette {
    display: none !important;
  }
}
</style>
