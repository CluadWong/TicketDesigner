<script setup lang="ts">
import type { CSSProperties } from "vue";
import type {
  GridCell,
  GridLayoutNode,
  GridNode,
  GridPNode,
  GridRow,
  GridTableNode,
  GridTrack,
} from "./grid-layout-schema";

defineOptions({ name: "GridSchemaNode" });

const props = defineProps<{
  node: GridLayoutNode;
  baseRowHeight: number;
}>();

const track = (value: GridTrack): string =>
  typeof value === "number" ? `${value}mm` : value;

function gridStyle(node: GridNode): CSSProperties {
  return { gridTemplateColumns: node.columns.map(track).join(" ") };
}

function rowStyle(row: GridRow): CSSProperties {
  return { height: `${row.height * props.baseRowHeight}mm` };
}

function cellStyle(cell: GridCell): CSSProperties {
  return {
    gridColumn: cell.colspan ? `span ${cell.colspan}` : undefined,
    padding: `${cell.padding ?? 0}mm`,
  };
}

function pStyle(node: GridPNode): CSSProperties {
  const style = node.style;
  const vertical = style?.verticalAlign ?? "middle";
  return {
    justifyContent:
      vertical === "top" ? "flex-start" : vertical === "bottom" ? "flex-end" : "center",
    textAlign: style?.align,
    fontSize: style?.fontSize ? `${style.fontSize}px` : undefined,
    fontWeight: style?.fontWeight,
    writingMode: style?.writingMode,
    whiteSpace: style?.whiteSpace,
  };
}

function tableColumnStyle(node: GridTableNode): CSSProperties {
  return { gridTemplateColumns: node.columns.map(column => track(column.width)).join(" ") };
}
</script>

<template>
  <div
    v-if="node.type === 'grid'"
    class="layout-grid"
    :class="`layout-grid--${node.border ?? 'none'}`"
  >
    <div
      v-for="row in node.rows"
      :key="row.id"
      class="layout-grid__row"
      :style="[gridStyle(node), rowStyle(row)]"
    >
      <div
        v-for="cell in row.cells"
        :key="cell.id"
        class="layout-grid__cell"
        :style="cellStyle(cell)"
      >
        <GridSchemaNode
          v-for="child in cell.children"
          :key="child.id"
          :node="child"
          :base-row-height="baseRowHeight"
        />
      </div>
    </div>
  </div>

  <p
    v-else-if="node.type === 'p'"
    class="layout-p"
    :class="{
      'layout-p--editable': node.editable,
      'layout-p--underline': node.underline,
    }"
    :style="pStyle(node)"
    :contenteditable="node.editable ? 'true' : 'false'"
    :data-field="node.field"
    :data-placeholder="node.placeholder ?? node.field"
  >
    {{ node.text }}
  </p>

  <div v-else-if="node.type === 'table'" class="layout-table" :data-field="node.field">
    <div
      class="layout-table__row layout-table__header"
      :style="[tableColumnStyle(node), { minHeight: `${baseRowHeight}mm` }]"
    >
      <div v-for="column in node.columns" :key="column.key" class="layout-table__cell">
        {{ column.title }}
      </div>
    </div>
    <div
      v-for="(row, rowIndex) in node.rows"
      :key="rowIndex"
      class="layout-table__row"
      :style="[
        tableColumnStyle(node),
        { height: `${node.rowHeight * baseRowHeight}mm` },
      ]"
    >
      <div v-for="column in node.columns" :key="column.key" class="layout-table__cell">
        <GridSchemaNode
          v-for="child in row[column.key] ?? []"
          :key="child.id"
          :node="child"
          :base-row-height="baseRowHeight"
        />
      </div>
    </div>
  </div>

  <div v-else class="layout-html" v-html="node.html"></div>
</template>

<style scoped>
.layout-grid {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.layout-grid__row {
  display: grid;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.layout-grid__cell {
  display: flex;
  min-width: 0;
  min-height: 0;
  align-items: stretch;
  box-sizing: border-box;
}

.layout-grid--all {
  border-top: 1px solid #111827;
  border-left: 1px solid #111827;
}

.layout-grid--all > .layout-grid__row > .layout-grid__cell {
  border-right: 1px solid #111827;
  border-bottom: 1px solid #111827;
}

.layout-grid--inner > .layout-grid__row > .layout-grid__cell:not(:last-child) {
  border-right: 1px solid #111827;
}

.layout-grid--inner > .layout-grid__row:not(:last-child) > .layout-grid__cell {
  border-bottom: 1px solid #111827;
}

.layout-p {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  margin: 0;
  padding: 0 1mm;
  align-items: stretch;
  box-sizing: border-box;
  color: #111827;
  font-size: 13px;
  line-height: 1.35;
  overflow-wrap: anywhere;
  outline: none;
}

.layout-p--editable {
  cursor: text;
}

.layout-p--editable:empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
}

.layout-p--underline {
  border-bottom: 1px solid #111827;
}

.layout-table {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

.layout-table__row {
  display: grid;
  width: 100%;
  min-width: 0;
  flex: 0 0 auto;
}

.layout-table__row:not(:last-child) {
  border-bottom: 1px solid #111827;
}

.layout-table__cell {
  display: flex;
  min-width: 0;
  align-items: stretch;
  justify-content: center;
  box-sizing: border-box;
}

.layout-table__cell:not(:last-child) {
  border-right: 1px solid #111827;
}

.layout-table__header {
  flex: 0 0 auto;
  font-weight: 600;
  text-align: center;
}

.layout-table__header .layout-table__cell {
  align-items: center;
}

.layout-html {
  width: 100%;
  min-width: 0;
}
</style>
