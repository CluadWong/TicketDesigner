<script setup lang="ts">
/** 表格：最小行数 / 边框 / 列配置（增删列即增删派生字段）。 */
import type { TableNodeV2 } from "@/types";
import type { SchemaEdits } from "../composables/useSchemaEdits";

defineProps<{ node: TableNodeV2; api: SchemaEdits }>();
</script>

<template>
  <div class="v2-grid-dimensions">
    <label class="v2-control">
      <span>最小行数</span>
      <input
        type="number"
        min="0"
        step="1"
        :value="node.minRows"
        @change="api.updateTableRows"
      />
    </label>
    <label class="v2-control">
      <span>边框</span>
      <select :value="node.border ?? 'all'" @change="api.updateTableBorder">
        <option value="all">外框 + 内部</option>
        <option value="outer">仅外框</option>
        <option value="inner">仅内部</option>
        <option value="none">无边框</option>
      </select>
    </label>
  </div>
  <div class="v2-sidebar__subheading">列配置</div>
  <div class="v2-col-table">
    <div class="v2-col-table__row v2-col-table__head">
      <span class="v2-col-table__th">标题</span>
      <span class="v2-col-table__th">字段</span>
      <span class="v2-col-table__th v2-col-table__th--action"></span>
    </div>
    <div
      v-for="column in node.columns"
      :key="column.key"
      class="v2-col-table__row"
    >
      <input
        class="v2-col-table__input"
        :value="column.title"
        placeholder="列标题"
        @input="api.updateTableColumn(column.key, 'title', $event)"
      />
      <input
        class="v2-col-table__input v2-col-table__input--mono"
        :value="column.key"
        placeholder="字段名"
        @input="api.renameTableColumnKey(column.key, $event)"
      />
      <button
        class="v2-inspector__delete v2-inspector__delete--small"
        type="button"
        :disabled="node.columns.length <= 1"
        :title="`删除列 ${column.key}`"
        @click="api.removeTableColumn(column.key)"
      >
        ✕
      </button>
    </div>
  </div>
  <button
    class="v2-toolbar__button v2-add-col"
    type="button"
    @click="api.addTableColumn"
  >
    + 添加列
  </button>
</template>

<style scoped>
/* ── 列配置：表格行式布局 ── */
.v2-col-table {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.v2-col-table__row {
  display: grid;
  grid-template-columns: 1fr 1fr 32px;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid #f1f5f9;
}

.v2-col-table__row:last-child {
  border-bottom: none;
}

.v2-col-table__head {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0 !important;
}

.v2-col-table__th {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: none;
}

.v2-col-table__th--action {
  padding: 6px 4px;
}

.v2-col-table__input {
  width: 100%;
  min-height: 32px;
  padding: 4px 8px;
  border: none;
  border-right: 1px solid #f1f5f9;
  background: #fff;
  font-size: 12px;
  color: #1e293b;
  outline: none;
  box-sizing: border-box;
}

.v2-col-table__input:focus {
  background: #eff6ff;
  box-shadow: inset 0 0 0 1px #93c5fd;
}

.v2-col-table__input--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  color: #475569;
}

.v2-inspector__delete {
  margin-left: auto;
  padding: 4px 8px;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  color: #b91c1c;
  background: #fff7f7;
  font-size: 12px;
  cursor: pointer;
}

.v2-inspector__delete:hover:not(:disabled) {
  background: #fee2e2;
}

.v2-inspector__delete:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.v2-inspector__delete--small {
  padding: 2px 8px;
  font-size: 11px;
}

.v2-add-col {
  width: 100%;
  margin-top: 8px;
  border-color: #93c5fd;
  color: #1d4ed8;
  background: #eff6ff;
}

.v2-add-col:hover {
  background: #dbeafe;
}
</style>
