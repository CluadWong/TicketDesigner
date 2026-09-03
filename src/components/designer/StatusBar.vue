<script setup lang="ts">
/**
 * 底部状态栏
 *
 * 职责（v1 阶段 3.2 骨架 + 2026-09-02 十九续）：
 *   - 显示当前**逻辑**页数
 *   - 显示**物理（打印）页数**：与逻辑页数不同时才提示，用于暴露「内容超高 → 换页」
 *     （此前分页结果只能靠肉眼在画布里找；十九续起由状态栏统一暴露打印张数与分页告警）
 *   - 显示分页警告数（结构校验警告 + 分页超高告警）
 *   - 缩放控件占位（阶段 5 完善）
 *
 * 设计依据：docs/design-biz.md §2.1（设计器界面）、docs/development-plan.md §3（已锁定决策）。
 */

defineProps<{
  /** 当前逻辑页数 */
  pageCount: number
  /** 结构校验警告数 */
  warningCount: number
  /** 物理（打印）页数，由分页引擎算出；等于逻辑页数时不额外展示。 */
  physicalPageCount?: number | null
  /** 分页超高告警数（单个节点比整页还高、被强制放入而可能裁切）。 */
  paginateWarningCount?: number
}>()
</script>

<template>
  <div class="status-bar">
    <div class="status-group">
      <span class="status-item">
        页数：<strong>{{ pageCount }}</strong>
      </span>
      <!-- 物理页数与逻辑页数不一致 ⇒ 内容超高已换页（预览/打印的实际出纸张数）。 -->
      <span
        v-if="physicalPageCount != null && physicalPageCount !== pageCount"
        class="status-item"
        data-physical-page-count="true"
      >
        打印：<strong>{{ physicalPageCount }}</strong> 张
      </span>
      <span
        :class="['status-item', 'warning-count', { 'has-warning': warningCount > 0 }]"
      >
        警告：<strong>{{ warningCount }}</strong>
      </span>
      <span
        v-if="paginateWarningCount"
        class="status-item warning-count has-warning"
        data-paginate-warning-count="true"
      >
        分页告警：<strong>{{ paginateWarningCount }}</strong>
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
