<script setup lang="ts">
/**
 * 底部状态栏
 *
 * 职责（v1 阶段 3.2 骨架）：
 *   - 显示当前页数
 *   - 显示分页警告数
 *   - 缩放控件占位（阶段 5 完善）
 *
 * 设计依据：docs/design-biz.md §2.1、docs/development-plan.md §3.2.5。
 */

defineProps<{
  /** 当前总页数 */
  pageCount: number
  /** 分页警告数（超高组件等） */
  warningCount: number
}>()
</script>

<template>
  <div class="status-bar">
    <div class="status-group">
      <span class="status-item">
        页数：<strong>{{ pageCount }}</strong>
      </span>
      <span
        :class="['status-item', 'warning-count', { 'has-warning': warningCount > 0 }]"
      >
        警告：<strong>{{ warningCount }}</strong>
      </span>
    </div>
    <div class="status-group status-right">
      <span class="status-item muted">缩放：100%（阶段 5 完善）</span>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #1f2937;
  color: #d1d5db;
  font-size: 12px;
  height: 28px;
}

.status-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-item strong {
  color: #f9fafb;
}

.warning-count.has-warning {
  color: #fbbf24;
}

.warning-count.has-warning strong {
  color: #f59e0b;
}

.muted {
  color: #6b7280;
}

@media print {
  .status-bar {
    display: none !important;
  }
}
</style>
