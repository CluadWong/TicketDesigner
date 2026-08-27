<script setup lang="ts">
import type { CSSProperties } from "vue";
import type {
  FormNodeV2,
  GridCellV2,
  GridNodeV2,
  PNodeV2,
  TableColumnV2,
  TableNodeV2,
} from "@/types";

defineOptions({ name: "GridSchemaNodeV2" });

const props = defineProps<{
  node: FormNodeV2;
  baseRowHeight: number;
  selectedNodeId?: string | null;
}>();

const track = (value: number | `${number}fr` | "auto" | undefined): string => {
  if (value === undefined || value === "auto") return "auto";
  return typeof value === "number" ? `${value}mm` : value;
};

function gridRowStyle(node: GridNodeV2, rowIndex: number): CSSProperties {
  const row = node.rows[rowIndex];
  return {
    gridTemplateColumns: row.cells.map(cell => track(cell.width)).join(" "),
    minHeight: `${row.height * props.baseRowHeight}mm`,
  };
}

function cellStyle(cell: GridCellV2): CSSProperties {
  return {
    gridColumn: cell.colspan ? `span ${cell.colspan}` : undefined,
    padding: `${cell.padding ?? 0}mm`,
    alignItems:
      cell.verticalAlign === "top"
        ? "flex-start"
        : cell.verticalAlign === "bottom"
          ? "flex-end"
          : "center",
    justifyContent:
      cell.align === "center" ? "center" : cell.align === "right" ? "flex-end" : "flex-start",
  };
}

function pStyle(node: PNodeV2): CSSProperties {
  const style = node.style;
  return {
    justifyContent:
      style?.align === "center" ? "center" : style?.align === "right" ? "flex-end" : "flex-start",
    alignItems:
      style?.verticalAlign === "top"
        ? "flex-start"
        : style?.verticalAlign === "bottom"
          ? "flex-end"
          : "center",
    textAlign: style?.align,
    fontSize: style?.fontSize ? `${style.fontSize}px` : undefined,
    lineHeight: style?.lineHeight,
    fontWeight: style?.fontWeight,
    writingMode: style?.writingMode,
    whiteSpace: style?.whiteSpace,
  };
}

function tableColumnStyle(columns: TableColumnV2[]): CSSProperties {
  return {
    gridTemplateColumns: columns.map(column => track(column.width)).join(" "),
  };
}

function tableTemplate(node: TableNodeV2, columnKey: string) {
  return node.rowTemplate.find(template => template.columnKey === columnKey);
}

function isCompositeField(node: PNodeV2): boolean {
  return node.mode === "field" && Boolean(node.prefix || node.suffix);
}

</script>

<template>
  <div
    v-if="node.type === 'grid'"
    class="layout-grid"
    :class="[`layout-grid--${node.border}`, { 'layout-node--selected': selectedNodeId === node.id }]"
    :data-node-id="node.id"
  >
    <div
      v-for="(row, rowIndex) in node.rows"
      :key="row.id"
      class="layout-grid__row"
      :style="gridRowStyle(node, rowIndex)"
      :data-layout-id="row.id"
    >
      <div
        v-for="cell in row.cells"
        :key="cell.id"
        class="layout-grid__cell"
        :style="cellStyle(cell)"
        :data-layout-id="cell.id"
      >
        <GridSchemaNode
          v-for="child in cell.children"
          :key="child.id"
          :node="child"
          :base-row-height="baseRowHeight"
          :selected-node-id="selectedNodeId"
        />
      </div>
    </div>
  </div>

  <p
    v-else-if="node.type === 'p'"
    class="layout-p"
    :class="{
      'layout-p--field': node.mode === 'field',
      'layout-p--composite': isCompositeField(node),
      'layout-p--underline': node.mode === 'field' && node.underline && !isCompositeField(node),
      'layout-node--selected': selectedNodeId === node.id,
    }"
    :style="pStyle(node)"
    :contenteditable="node.mode === 'field' && !isCompositeField(node) ? 'true' : undefined"
    :data-field="node.mode === 'field' ? node.field : undefined"
    :data-node-id="node.id"
  >
    <template v-if="node.mode === 'static'">{{ node.text }}</template>
    <template v-else-if="isCompositeField(node)">
      <span v-if="node.prefix" class="layout-p__label">{{ node.prefix }}</span>
      <span
        class="layout-p__input"
        :class="{ 'layout-p--underline': node.underline }"
        contenteditable="true"
        :data-field="node.field"
      ></span>
      <span v-if="node.suffix" class="layout-p__label">{{ node.suffix }}</span>
    </template>
  </p>

  <table
    v-else-if="node.type === 'table'"
    class="layout-table"
    :class="{ 'layout-node--selected': selectedNodeId === node.id }"
    :data-node-id="node.id"
    :data-field="node.field"
  >
    <thead>
      <tr
        class="layout-table__row layout-table__header"
        :style="[tableColumnStyle(node.columns), { minHeight: `${node.headerHeight * baseRowHeight}mm` }]"
      >
        <th v-for="column in node.columns" :key="column.key" class="layout-table__cell">
          {{ column.title }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="rowIndex in node.minRows"
        :key="rowIndex"
        class="layout-table__row"
        :style="[tableColumnStyle(node.columns), { minHeight: `${node.rowHeight * baseRowHeight}mm` }]"
      >
        <td
          v-for="column in node.columns"
          :key="column.key"
          class="layout-table__cell"
          :data-layout-id="tableTemplate(node, column.key)?.id"
        >
          <GridSchemaNode
            v-for="child in tableTemplate(node, column.key)?.children ?? []"
            :key="`${child.id}-${rowIndex}`"
            :node="child"
            :base-row-height="baseRowHeight"
            :selected-node-id="selectedNodeId"
          />
        </td>
      </tr>
    </tbody>
  </table>

  <div
    v-else-if="node.type === 'html'"
    class="layout-html"
    :class="{ 'layout-node--selected': selectedNodeId === node.id }"
    :data-node-id="node.id"
    v-html="node.html"
  ></div>

  <img
    v-else
    class="layout-image"
    :class="{ 'layout-node--selected': selectedNodeId === node.id }"
    :data-node-id="node.id"
    :data-field="node.field"
    :src="node.src"
    :alt="node.field ?? ''"
    :style="{ width: node.width ? `${node.width}mm` : undefined, height: node.height ? `${node.height}mm` : undefined, objectFit: node.objectFit }"
  />
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
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.layout-grid__cell {
  display: flex;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.layout-grid--all,
.layout-grid--outer {
  border: 1px solid #111827;
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
  min-height: 0;
  align-self: stretch;
  margin: 0;
  padding: 0 1mm;
  align-items: center;
  box-sizing: border-box;
  color: #111827;
  font-size: 13px;
  line-height: 1.35;
  overflow-wrap: anywhere;
  outline: none;
}

.layout-p--field {
  cursor: text;
}

.layout-p--composite {
  gap: 1mm;
}

.layout-p__label {
  flex: 0 0 auto;
  white-space: nowrap;
}

.layout-p__input {
  display: inline-block;
  flex: 1 1 auto;
  min-width: 12mm;
  min-height: 1em;
  outline: none;
}

.layout-p--underline {
  border-bottom: 1px solid #111827;
}

.layout-table {
  display: block;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border-collapse: collapse;
}

.layout-table > thead,
.layout-table > tbody {
  display: block;
  width: 100%;
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
  min-height: 0;
  margin: 0;
  padding: 0 1mm;
  align-items: stretch;
  justify-content: center;
  box-sizing: border-box;
}

.layout-table__cell:not(:last-child) {
  border-right: 1px solid #111827;
}

.layout-table__header {
  align-items: center;
  font-weight: 600;
  text-align: center;
}

.layout-html {
  width: 100%;
  min-width: 0;
}

.layout-image {
  max-width: 100%;
  object-position: center;
}

.layout-node--selected {
  position: relative;
  z-index: 2;
  background-color: rgb(37 99 235 / 12%) !important;
  box-shadow: inset 0 0 0 2px #2563eb !important;
}

@media print {
  .layout-node--selected {
    background-color: transparent !important;
    box-shadow: none !important;
  }
}
</style>
