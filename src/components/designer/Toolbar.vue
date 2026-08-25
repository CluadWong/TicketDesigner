<script setup lang="ts">
/**
 * 顶部工具栏
 *
 * 职责（v1 阶段 3.2 骨架）：
 *   - 纸张选择（A4 / A3）
 *   - 方向切换（纵向 / 横向）
 *   - 边距输入
 *   - 页眉/页脚文本
 *   - 页眉/页脚显示页码开关
 *   - 打印按钮
 *   - 保存/加载 JSON（占位，阶段 5 实现）
 *   - 加载示例（A4 / A3，开发辅助）
 *
 * 通过 emit('update:schema') 通知父组件 schema 变化。
 * 设计依据：docs/design-biz.md §2.1、docs/development-plan.md §3.2.1。
 */

import { computed } from 'vue'
import type { FormSchema, PaperSize, Orientation } from '@/types'

const props = defineProps<{
  /** 当前表单 schema */
  schema: FormSchema
}>()

const emit = defineEmits<{
  /** schema 变化时触发 */
  'update:schema': [schema: FormSchema]
  /** 加载 A4 mock 示例 */
  'load-mock-a4': []
  /** 加载 A3 mock 示例 */
  'load-mock-a3': []
  /** 打开预览弹窗 */
  'open-preview': []
}>()

/** 纸张选项 */
const paperOptions: Array<{ label: string; value: PaperSize }> = [
  { label: 'A4', value: 'A4' },
  { label: 'A3', value: 'A3' },
]

/** 方向选项 */
const orientationOptions: Array<{ label: string; value: Orientation }> = [
  { label: '纵向', value: 'portrait' },
  { label: '横向', value: 'landscape' },
]

/** 当前纸张 */
const paper = computed(() => props.schema.paper)

/** 当前页眉 */
const header = computed(() => props.schema.header)

/** 当前页脚 */
const footer = computed(() => props.schema.footer)

/**
 * 修改 schema 字段（浅拷贝 + 替换对应字段，触发响应式）
 */
function patchSchema(patch: Partial<FormSchema>): void {
  emit('update:schema', { ...props.schema, ...patch })
}

/** 修改 paper 字段 */
function patchPaper(patch: Partial<FormSchema['paper']>): void {
  patchSchema({ paper: { ...paper.value, ...patch } })
}

/** 修改 header 字段 */
function patchHeader(patch: Partial<FormSchema['header']>): void {
  patchSchema({ header: { ...header.value, ...patch } })
}

/** 修改 footer 字段 */
function patchFooter(patch: Partial<FormSchema['footer']>): void {
  patchSchema({ footer: { ...footer.value, ...patch } })
}

/** 打开预览弹窗（预览/打印在弹窗内进行） */
function handlePreview(): void {
  emit('open-preview')
}
</script>

<template>
  <div class="toolbar">
    <!-- 纸张配置组 -->
    <div class="toolbar-group">
      <label class="field-label">纸张</label>
      <select
        :value="paper.size"
        class="select-field"
        @change="patchPaper({ size: ($event.target as HTMLSelectElement).value as PaperSize })"
      >
        <option v-for="opt in paperOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select
        :value="paper.orientation"
        class="select-field"
        @change="patchPaper({ orientation: ($event.target as HTMLSelectElement).value as Orientation })"
      >
        <option v-for="opt in orientationOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- 边距配置 -->
    <div class="toolbar-group">
      <label class="field-label">边距</label>
      <input
        type="number"
        :value="props.schema.margin"
        class="number-field"
        min="0"
        max="50"
        @input="patchSchema({ margin: Number(($event.target as HTMLInputElement).value) })"
      />
      <span class="unit">mm</span>
    </div>

    <!-- 页眉/页脚页码开关 -->
    <div class="toolbar-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="header.showPageNumber"
          @change="patchHeader({ showPageNumber: ($event.target as HTMLInputElement).checked })"
        />
        页眉页码
      </label>
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="footer.showPageNumber"
          @change="patchFooter({ showPageNumber: ($event.target as HTMLInputElement).checked })"
        />
        页脚页码
      </label>
    </div>

    <!-- 操作按钮 -->
    <div class="toolbar-group toolbar-actions">
      <button class="btn btn-primary" @click="handlePreview">预览</button>
      <button class="btn" disabled title="阶段 5 实现">保存</button>
      <button class="btn" disabled title="阶段 5 实现">加载</button>
      <span class="divider"></span>
      <button class="btn btn-mock" @click="emit('load-mock-a4')">示例 A4</button>
      <button class="btn btn-mock" @click="emit('load-mock-a3')">示例 A3</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: #1f2937;
  color: #f9fafb;
  height: 48px;
  overflow-x: auto;
  white-space: nowrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  color: #9ca3af;
}

.select-field,
.number-field {
  height: 28px;
  padding: 0 8px;
  background: #374151;
  color: #f9fafb;
  border: 1px solid #4b5563;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
}

.select-field {
  min-width: 64px;
}

.number-field {
  width: 48px;
}

.unit {
  font-size: 11px;
  color: #9ca3af;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #d1d5db;
  cursor: pointer;
}

.checkbox-label input {
  cursor: pointer;
}

.toolbar-actions {
  margin-left: auto;
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

.btn:hover:not(:disabled) {
  background: #4b5563;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-mock {
  background: #059669;
  border-color: #059669;
}

.btn-mock:hover {
  background: #047857;
}

.divider {
  width: 1px;
  height: 20px;
  background: #4b5563;
  margin: 0 4px;
}

@media print {
  .toolbar {
    display: none !important;
  }
}
</style>
