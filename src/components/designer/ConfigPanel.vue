<script setup lang="ts">
/**
 * 右栏：配置面板
 *
 * 职责（v1 阶段 3.2 骨架）：
 *   - 两个 tab 切换：表单属性 / 组件属性
 *   - 表单属性 tab：纸张/边距/页眉/页脚配置（同 Toolbar 但更详细）
 *   - 组件属性 tab：按选中组件的 config.fields 自动渲染表单控件
 *
 * 设计依据：docs/design-biz.md §2.2、§5、docs/development-plan.md §3.2.4。
 */

import { computed } from 'vue'
import type { FormSchema, Component } from '@/types'
import { getComponentConfig } from '@/config/component-registry'

const props = defineProps<{
  /** 表单 schema */
  schema: FormSchema
  /** 当前选中的组件实例（null 表示无选中） */
  selectedComp: Component | null
  /** 当前激活的 tab（'form' | 'component'） */
  activeTab: 'form' | 'component'
}>()

const emit = defineEmits<{
  /** schema 变化 */
  'update:schema': [schema: FormSchema]
  /** 切换 tab */
  'update:active-tab': [tab: 'form' | 'component']
  /** 上下移动选中组件 */
  'move-comp': [id: string, direction: 'up' | 'down']
  /** 删除选中组件 */
  'delete-comp': [id: string]
}>()

/** 选中组件的 config（基于 selectedComp.type 查找） */
const selectedConfig = computed(() => {
  if (!props.selectedComp) return null
  return getComponentConfig(props.selectedComp.type) ?? null
})

/** 选中组件在 schema.body 中的索引（-1 表示未找到） */
const selectedIndex = computed(() => {
  if (!props.selectedComp) return -1
  return props.schema.body.findIndex(c => c.id === props.selectedComp!.id)
})

/** 是否可上移（非首个） */
const canMoveUp = computed(() => selectedIndex.value > 0)

/** 是否可下移（非末个） */
const canMoveDown = computed(
  () =>
    selectedIndex.value >= 0 &&
    selectedIndex.value < props.schema.body.length - 1,
)

/**
 * 修改 schema 字段
 */
function patchSchema(patch: Partial<FormSchema>): void {
  emit('update:schema', { ...props.schema, ...patch })
}

/**
 * 修改选中组件的某个属性（按 config.fields 的 key 写入）
 */
function patchCompField(key: string, value: unknown): void {
  if (!props.selectedComp) return
  const body = props.schema.body.map(c => {
    if (c.id !== props.selectedComp!.id) return c
    // 浅拷贝组件 + 覆盖对应字段
    return { ...c, [key]: value } as Component
  })
  patchSchema({ body })
}

/**
 * 修改表单的页眉字段
 */
function patchHeader(patch: Partial<FormSchema['header']>): void {
  patchSchema({ header: { ...props.schema.header, ...patch } })
}

/**
 * 修改表单的页脚字段
 */
function patchFooter(patch: Partial<FormSchema['footer']>): void {
  patchSchema({ footer: { ...props.schema.footer, ...patch } })
}

/** 切换到表单属性 tab */
function switchToFormTab(): void {
  emit('update:active-tab', 'form')
}

/** 切换到组件属性 tab */
function switchToComponentTab(): void {
  emit('update:active-tab', 'component')
}

/**
 * 上移选中组件
 */
function handleMoveUp(): void {
  if (!props.selectedComp || !canMoveUp.value) return
  emit('move-comp', props.selectedComp.id, 'up')
}

/**
 * 下移选中组件
 */
function handleMoveDown(): void {
  if (!props.selectedComp || !canMoveDown.value) return
  emit('move-comp', props.selectedComp.id, 'down')
}

/**
 * 删除选中组件
 */
function handleDelete(): void {
  if (!props.selectedComp) return
  emit('delete-comp', props.selectedComp.id)
}
</script>

<template>
  <div class="config-panel">
    <!-- Tab 头 -->
    <div class="tabs">
      <button
        :class="['tab', { active: props.activeTab === 'form' }]"
        @click="switchToFormTab"
      >
        表单属性
      </button>
      <button
        :class="['tab', { active: props.activeTab === 'component' }]"
        :disabled="!props.selectedComp"
        @click="switchToComponentTab"
      >
        组件属性
      </button>
    </div>

    <!-- 表单属性 tab -->
    <div v-if="props.activeTab === 'form'" class="tab-content">
      <div class="section">
        <div class="section-title">纸张</div>
        <div class="form-row">
          <label class="form-label">尺寸</label>
          <select
            :value="props.schema.paper.size"
            class="form-control"
            @change="patchSchema({ paper: { ...props.schema.paper, size: ($event.target as HTMLSelectElement).value as FormSchema['paper']['size'] } })"
          >
            <option value="A4">A4 (210×297mm)</option>
            <option value="A3">A3 (420×297mm)</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">方向</label>
          <select
            :value="props.schema.paper.orientation"
            class="form-control"
            @change="patchSchema({ paper: { ...props.schema.paper, orientation: ($event.target as HTMLSelectElement).value as FormSchema['paper']['orientation'] } })"
          >
            <option value="portrait">纵向</option>
            <option value="landscape">横向</option>
          </select>
        </div>
      </div>

      <div class="section">
        <div class="section-title">边距</div>
        <div class="form-row">
          <label class="form-label">左右边距(mm)</label>
          <input
            type="number"
            :value="props.schema.margin"
            class="form-control"
            min="0"
            max="50"
            @input="patchSchema({ margin: Number(($event.target as HTMLInputElement).value) })"
          />
        </div>
      </div>

      <div class="section">
        <div class="section-title">页眉</div>
        <div class="form-row">
          <label class="form-label">文本</label>
          <input
            type="text"
            :value="props.schema.header.text"
            class="form-control"
            placeholder="页眉文本"
            @input="patchHeader({ text: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div class="form-row">
          <label class="form-label">显示页码</label>
          <input
            type="checkbox"
            :checked="props.schema.header.showPageNumber"
            @change="patchHeader({ showPageNumber: ($event.target as HTMLInputElement).checked })"
          />
        </div>
      </div>

      <div class="section">
        <div class="section-title">页脚</div>
        <div class="form-row">
          <label class="form-label">文本</label>
          <input
            type="text"
            :value="props.schema.footer.text"
            class="form-control"
            placeholder="页脚文本"
            @input="patchFooter({ text: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div class="form-row">
          <label class="form-label">显示页码</label>
          <input
            type="checkbox"
            :checked="props.schema.footer.showPageNumber"
            @change="patchFooter({ showPageNumber: ($event.target as HTMLInputElement).checked })"
          />
        </div>
      </div>
    </div>

    <!-- 组件属性 tab -->
    <div v-else class="tab-content">
      <div v-if="!props.selectedComp || !selectedConfig" class="empty-state">
        未选中组件<br />
        <span class="empty-hint">点击画布中的组件以编辑属性</span>
      </div>
      <div v-else>
        <!-- 组件操作工具栏：上移/下移/删除 -->
        <div class="comp-toolbar">
          <button
            class="comp-btn"
            :disabled="!canMoveUp"
            @click="handleMoveUp"
          >
            ↑ 上移
          </button>
          <button
            class="comp-btn"
            :disabled="!canMoveDown"
            @click="handleMoveDown"
          >
            ↓ 下移
          </button>
          <button class="comp-btn danger" @click="handleDelete">
            删除
          </button>
        </div>
        <div class="section">
          <div class="section-title">{{ selectedConfig.displayName }}</div>
          <div
            v-for="field in selectedConfig.fields"
            :key="field.key"
            class="form-row"
          >
            <label class="form-label">
              {{ field.label }}
              <span v-if="field.required" class="required-mark">*</span>
            </label>

            <!-- text 控件 -->
            <input
              v-if="field.type === 'text'"
              type="text"
              :value="(props.selectedComp as unknown as Record<string, unknown>)[field.key] as string"
              class="form-control"
              @input="patchCompField(field.key, ($event.target as HTMLInputElement).value)"
            />

            <!-- textarea 控件 -->
            <textarea
              v-else-if="field.type === 'textarea'"
              :value="(props.selectedComp as unknown as Record<string, unknown>)[field.key] as string"
              class="form-control"
              rows="3"
              @input="patchCompField(field.key, ($event.target as HTMLTextAreaElement).value)"
            />

            <!-- number 控件 -->
            <input
              v-else-if="field.type === 'number'"
              type="number"
              :value="(props.selectedComp as unknown as Record<string, unknown>)[field.key] as number"
              class="form-control"
              @input="patchCompField(field.key, Number(($event.target as HTMLInputElement).value))"
            />

            <!-- select 控件 -->
            <select
              v-else-if="field.type === 'select' && field.options"
              :value="(props.selectedComp as unknown as Record<string, unknown>)[field.key] as string | number"
              class="form-control"
              @change="patchCompField(field.key, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>

            <!-- switch 控件 -->
            <input
              v-else-if="field.type === 'switch'"
              type="checkbox"
              :checked="(props.selectedComp as unknown as Record<string, unknown>)[field.key] as boolean"
              @change="patchCompField(field.key, ($event.target as HTMLInputElement).checked)"
            />

            <!-- 帮助文案 -->
            <div v-if="field.help" class="field-help">{{ field.help }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-panel {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-left: 1px solid #e5e7eb;
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.tab {
  flex: 1;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.tab:hover:not(:disabled) {
  color: #1f2937;
}

.tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  background: white;
}

.tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.section {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.form-label {
  font-size: 12px;
  color: #374151;
}

.required-mark {
  color: #ef4444;
  margin-left: 2px;
}

.form-control {
  height: 28px;
  padding: 0 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #1f2937;
}

.form-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

textarea.form-control {
  height: auto;
  padding: 6px 8px;
  resize: vertical;
  font-family: inherit;
}

select.form-control {
  cursor: pointer;
}

.field-help {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.4;
  margin-top: 2px;
}

.empty-state {
  padding: 40px 16px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  line-height: 1.6;
}

/**
 * 组件操作工具栏：上移/下移/删除
 *
 * 替代 vuedraggable 排序（vuedraggable 直接包裹 body 与 paginate 切片冲突，
 * 故 v1 阶段 3.3.2 改用按钮排序，完整拖拽排序待后续优化）。
 */
.comp-toolbar {
  display: flex;
  gap: 6px;
  padding: 8px 0 12px;
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 12px;
}

.comp-btn {
  flex: 1;
  padding: 6px 8px;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.comp-btn:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.comp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.comp-btn.danger {
  color: #dc2626;
}

.comp-btn.danger:hover {
  background: #fef2f2;
  border-color: #ef4444;
  color: #b91c1c;
}

.empty-hint {
  font-size: 11px;
  color: #9ca3af;
}

@media print {
  .config-panel {
    display: none !important;
  }
}
</style>
