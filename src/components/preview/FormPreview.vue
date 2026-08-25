<script setup lang="ts">
/**
 * 表单预览组件（独立组件，不与弹窗耦合）
 *
 * 接收模板 schema + 数据 data + 权限 rules，渲染填入数据并应用权限。
 * 可独立用于表单详情页，也可被 PreviewDialog 包裹。
 *
 * 渲染流程（design-biz.md §6.2 DOM 操作式）：
 *   1. 复用 FormRenderer 调 paginate(schema) → 渲染纸张 DOM
 *   2. 渲染完成后 → querySelectorAll('[data-field]') → 填入 data[field]
 *   3. 对 p 节点加 contenteditable（原生属性）
 *   4. 按 rules 应用权限（readonly → 去 contenteditable；hidden → display:none）
 *   5. 监听 input 事件 → 回写 data 对象
 *
 * 数据流：
 *   - 渲染时复制：data 对象的值在渲染时复制到 DOM（单向）
 *   - 用户编辑 → input 事件 → 更新 data 对象（双向）
 *   - data 变化不触发重新渲染（避免覆盖用户正在编辑的内容）
 *
 * 设计依据：docs/design-biz.md §6、docs/development-plan.md 阶段 4。
 */
import { nextTick, ref } from 'vue'
import type { FormSchema, RulesMap } from '@/types'
import FormRenderer from '@/components/renderer/FormRenderer.vue'

const props = defineProps<{
  /** 表单模板 schema（数据无关，来自设计器产出） */
  schema: FormSchema
  /** 表单数据：field → value（由外部维护，FormPreview 只读 + 回写） */
  data: Record<string, unknown>
  /** 权限规则（按 field 配置，可选） */
  rules?: RulesMap
}>()

const emit = defineEmits<{
  /** 用户编辑 contenteditable 后触发，回写 data */
  'update:data': [data: Record<string, unknown>]
}>()

/** 根元素 ref（用于 querySelectorAll 访问渲染后的 DOM） */
const rootRef = ref<HTMLElement>()

/**
 * 填入数据 + 加 contenteditable + 应用权限
 *
 * 在 FormRenderer 渲染完成后（paginate 事件 → nextTick）调用。
 * 遍历所有 [data-field] 节点，按 DOM 节点类型填值并设置编辑权限。
 */
function fillData(): void {
  const root = rootRef.value
  if (!root) return

  root.querySelectorAll('[data-field]').forEach(el => {
    const field = el.getAttribute('data-field')
    if (!field) return

    const value = props.data[field]
    const rule = props.rules?.[field]

    // hidden：隐藏节点（display: none）
    if (rule?.hidden) {
      ;(el as HTMLElement).style.display = 'none'
      return
    }

    // 填入数据（渲染时复制）
    if (value !== undefined && value !== null && value !== '') {
      if (el.tagName === 'P') {
        el.textContent = String(value)
      } else if (el.tagName === 'IMG') {
        ;(el as HTMLImageElement).src = String(value)
      }
      // table 数据替换暂不实现（v1 先只做 p）
    }

    // p 节点加 contenteditable（原生属性）
    if (el.tagName === 'P') {
      if (rule?.readonly) {
        el.removeAttribute('contenteditable')
      } else {
        el.setAttribute('contenteditable', 'true')
      }
    }
  })
}

/**
 * 处理 contenteditable 输入事件：回写 data 对象
 *
 * 事件代理：在根元素上监听 input 事件，通过 e.target 找到 [data-field] 节点。
 * 用户编辑 → input 事件 → 更新 data → emit update:data。
 * 不触发重新渲染（避免覆盖用户正在编辑的内容）。
 */
function handleInput(event: Event): void {
  const el = event.target as HTMLElement
  const field = el.getAttribute('data-field')
  if (!field) return

  const newData = { ...props.data, [field]: el.textContent }
  emit('update:data', newData)
}

/**
 * FormRenderer 分页完成回调
 *
 * nextTick 确保 DOM 已更新，再执行数据填入。
 * schema 变化 → FormRenderer debounce 300ms 重算分页 → emit paginate → nextTick → fillData
 */
function handlePaginate(): void {
  nextTick(fillData)
}

// 暴露 fillData 供外部调用（如外部 data 变化时手动触发重新填入）
defineExpose({ fillData })
</script>

<template>
  <div ref="rootRef" class="form-preview" @input="handleInput">
    <FormRenderer
      :schema="props.schema"
      :show-warnings="false"
      @paginate="handlePaginate"
    />
  </div>
</template>

<style scoped>
.form-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* contenteditable 聚焦样式 */
.form-preview :deep([contenteditable='true']) {
  outline: 1px dashed #93c5fd;
  outline-offset: 2px;
  min-height: 1.6em;
  cursor: text;
}

.form-preview :deep([contenteditable='true']:focus) {
  outline: 1px solid #2563eb;
  background: #eff6ff;
}

/* 打印模式：contenteditable 虚线框不输出 */
@media print {
  .form-preview :deep([contenteditable='true']) {
    outline: none !important;
    background: none !important;
  }
}
</style>
