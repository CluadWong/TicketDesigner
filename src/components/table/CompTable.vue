<script setup lang="ts">
/**
 * 表格组件渲染器
 *
 * 渲染 `<table data-field="...">`：
 *   - 列定义来自 comp.columns，每列可选 width（mm）
 *   - 表头每个切片都重复输出（支持跨页表格）
 *   - 行数据：渲染切片时由 prop.rows 传入本页承载行；
 *     设计器画布直接渲染整表时 rows 缺省，回退到 comp.rows
 *
 * v1 不做数据填充；v2 由流程运行时按 data-field 替换 rows。
 *
 * 设计依据：docs/design.md §3、docs/design-biz.md §3.3。
 */
import { computed } from 'vue'
import type { TableComponent, TableRow } from '@/types'

const props = defineProps<{
  /** 表格组件 */
  comp: TableComponent
  /** 本页承载的行（分页切片用）；缺省时用 comp.rows */
  rows?: TableRow[]
}>()

/** 实际渲染的行 */
const renderRows = computed<TableRow[]>(() => props.rows ?? props.comp.rows)
</script>

<template>
  <table :data-field="props.comp.field">
    <thead>
      <tr>
        <th
          v-for="col in props.comp.columns"
          :key="col.key"
          :style="col.width ? { width: col.width + 'mm' } : undefined"
        >
          {{ col.title }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, idx) in renderRows" :key="idx">
        <td v-for="col in props.comp.columns" :key="col.key">
          {{ row[col.key] ?? '' }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<!-- 样式由全局 components.css 的 .form-renderer table/th/td 提供 -->
