<script setup lang="ts">
/**
 * 超高警告叠加层
 *
 * 当某 block 对应组件在引擎警告列表中时，由 Paper 在其上叠加此组件：
 *   - 右上角红色角标显示警告消息
 *   - 不影响组件本身的渲染
 *
 * 设计依据：docs/development-plan.md 阶段 2.6 超高警告提示。
 */
import type { Warning } from '@/types'

const props = defineProps<{
  /** 该组件的所有警告 */
  warnings: Warning[]
}>()
</script>

<template>
  <div class="warning-overlay">
    <div v-for="(w, i) in props.warnings" :key="i" class="warning-badge">
      ⚠ {{ w.message }}
    </div>
  </div>
</template>

<style scoped>
.warning-overlay {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
  z-index: 10;
}

.warning-badge {
  background: #ef4444;
  color: white;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
