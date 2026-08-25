<script setup lang="ts">
/**
 * 表单渲染器（只读）
 *
 * 职责：
 *   1. 调用 paginate(schema, measure) 引擎，得到 pages + warnings
 *   2. v-for 渲染 Paper 组件
 *   3. 调用 usePrintStyle 注入 @page 规则
 *   4. 可选渲染警告面板（showWarnings=true 时）
 *
 * 测量时机：
 *   - onMounted 创建 DomMeasure，测完销毁
 *   - schema 变化（deep watch）时重新测量
 *   - DomMeasure 在使用后立即 destroy，避免 measurer 节点残留
 *
 * 设计依据：docs/design.md §4、docs/engine.md §6、docs/development-plan.md 阶段 2。
 */
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { FormSchema, PaginateResult } from '@/types'
import { DomMeasure, paginate } from '@/engine'
import type { MeasureAPI } from '@/engine'
import { usePrintStyle } from '@/composables/usePrintStyle'
import Paper from './Paper.vue'

const props = withDefaults(
  defineProps<{
    /** 表单 schema */
    schema: FormSchema
    /** 是否显示顶部警告面板（默认显示） */
    showWarnings?: boolean
    /**
     * 测量 API 工厂（默认创建 DomMeasure）
     * 测试时注入 mock 工厂便于控制测高
     */
    measureFactory?: () => MeasureAPI
    /**
     * schema 变化后重新分页的 debounce 延迟（毫秒，默认 300）
     *
     * 设计器模式下用户连续修改组件属性时避免频繁重算；
     * 测试时传 0 跳过 debounce 同步执行，便于断言。
     */
    debounceMs?: number
  }>(),
  {
    showWarnings: true,
    measureFactory: () => new DomMeasure(),
    debounceMs: 300,
  }
)

const emit = defineEmits<{
  /** 分页结果变化时触发（供父组件如设计器状态栏读取页数/警告数） */
  paginate: [result: PaginateResult]
}>()

/** 分页结果 */
const result = ref<PaginateResult>({ pages: [], warnings: [] })

/** 测量器实例（仅在 compute 期间持有） */
let measure: MeasureAPI | null = null

/** debounce timer 引用（onUnmounted 时清除 pending） */
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 重新计算分页：创建 measure → paginate → destroy measure
 */
const compute = (): void => {
  if (measure) {
    measure.destroy?.()
    measure = null
  }
  measure = props.measureFactory()
  result.value = paginate(props.schema, { measure })
  measure.destroy?.()
  measure = null
  emit('paginate', result.value)
}

/**
 * debounce 包裹的 compute：schema 变化后延迟 300ms 执行
 *
 * 用户在设计器中连续修改组件属性（拖拽、改文字）时会频繁触发 watch，
 * debounce 避免每次按键都重新测量 DOM + 重算分页（性能损耗）。
 * 首次 onMounted 仍立即 compute 一次，不 debounce。
 */
const computeDebounced = (): void => {
  // debounceMs=0 时同步执行（测试场景）
  if (props.debounceMs <= 0) {
    compute()
    return
  }
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    compute()
  }, props.debounceMs)
}

onMounted(() => {
  // 首次立即计算，避免初始 300ms 空白
  compute()
  // schema 变化时 debounce 300ms 后重新分页（deep 监听 body 内组件变化）
  watch(() => props.schema, computeDebounced, { deep: true })
})

onUnmounted(() => {
  if (measure) {
    measure.destroy?.()
    measure = null
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})

// 注入打印样式（按 schema.paper 动态生成 @page）
usePrintStyle(() => props.schema)
</script>

<template>
  <div class="form-renderer">
    <!-- 警告面板（可选） -->
    <div v-if="showWarnings && result.warnings.length" class="warnings-panel">
      <div class="warnings-title">引擎警告（{{ result.warnings.length }}）</div>
      <div
        v-for="(w, i) in result.warnings"
        :key="i"
        class="warning-item"
      >
        ⚠ {{ w.compId }}：{{ w.message }}
      </div>
    </div>

    <!-- 纸张堆叠 -->
    <div class="papers-stack">
      <Paper
        v-for="page in result.pages"
        :key="page.index"
        :page="page"
        :schema="props.schema"
        :total-pages="result.pages.length"
        :warnings="result.warnings"
      />
    </div>
  </div>
</template>

<style scoped>
.form-renderer {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.warnings-panel {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  padding: 12px 16px;
  margin-bottom: 20px;
  border-radius: 6px;
  width: 210mm;
  max-width: 100%;
  box-sizing: border-box;
}

.warnings-title {
  font-weight: bold;
  margin-bottom: 6px;
  color: #92400e;
}

.warning-item {
  color: #92400e;
  font-size: 13px;
  padding: 2px 0;
}

.papers-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* 打印模式：仅纸张内容 + 强制分页 */
@media print {
  .form-renderer {
    align-items: stretch;
  }
  .warnings-panel {
    display: none !important;
  }
  .papers-stack {
    gap: 0;
    align-items: stretch;
  }
  :deep(.paper) {
    box-shadow: none;
    page-break-after: always;
    break-after: page;
  }
  :deep(.paper:last-child) {
    page-break-after: auto;
    break-after: auto;
  }
}
</style>
