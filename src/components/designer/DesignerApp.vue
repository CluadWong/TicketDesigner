<script setup lang="ts">
import { computed, ref } from "vue";
import GridSchemaRenderer from "@/dev/GridSchemaRenderer.vue";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";
import {
  buildEditorNodeIndexV2,
  appendNodeToCellV2,
  createEmptyFormSchemaV2,
  createFieldPNodeV2,
  createGridNodeV2,
  createStaticPNodeV2,
  createTableNodeV2,
  insertRootGridV2,
  removeNodeV2,
  resizeGridV2,
  updateGridBorderV2,
  updateSchemaNodeV2,
  updateTableMinRowsV2,
  validateFormSchemaV2,
} from "@/types";
import type { BorderModeV2, SchemaNodeV2, EditorNodeV2 } from "@/types";
import { isSelectableSchemaNodeV2 } from "@/types";
import StatusBar from "./StatusBar.vue";

const schema = ref(makeYunlvSecondTicketFirstFiveRowsSchema());
const selectedNodeId = ref<string | null>(null);
const selectedInsertionSlotId = ref<string | null>(null);
const selectionPathIds = ref<string[]>([]);
const selectionPathIndex = ref(0);

const issues = computed(() => validateFormSchemaV2(schema.value));
const warningCount = computed(() => issues.value.length);
const nodeIndex = computed(() => buildEditorNodeIndexV2(schema.value));
const selectedNode = computed<EditorNodeV2 | null>(() => {
  const id = selectedNodeId.value;
  const node = id ? nodeIndex.value.get(id)?.node : undefined;
  return isSelectableSchemaNodeV2(node) ? node : null;
});
const selectedPath = computed<SchemaNodeV2[]>(() => {
  return selectionPathIds.value
    .map((id) => nodeIndex.value.get(id)?.node)
    .filter(isSelectableSchemaNodeV2);
});
const selectedNodeType = computed(() => selectedNode.value?.type ?? "未选择");
const selectedOwnerCell = computed(() => selectedNodeId.value ? nodeIndex.value.get(selectedNodeId.value)?.ownerCell ?? null : null);
const insertionSlot = computed(() => {
  const slotId = selectedInsertionSlotId.value;
  const slot = slotId ? nodeIndex.value.get(slotId)?.node : undefined;
  return slot?.type === "grid-cell" || slot?.type === "table-cell-template"
    ? slot
    : selectedOwnerCell.value;
});
let lastClickedLeafId: string | null = null;
let selectionDepth = 0;

function reloadSample(): void {
  schema.value = makeYunlvSecondTicketFirstFiveRowsSchema();
  selectedNodeId.value = null;
  selectedInsertionSlotId.value = null;
  selectionPathIds.value = [];
  selectionPathIndex.value = 0;
  lastClickedLeafId = null;
  selectionDepth = 0;
}

function resetBlank(): void {
  schema.value = createEmptyFormSchemaV2();
  selectedNodeId.value = null;
  selectedInsertionSlotId.value = null;
  selectionPathIds.value = [];
  selectionPathIndex.value = 0;
  lastClickedLeafId = null;
  selectionDepth = 0;
}

function addRootGrid(): void {
  const grid = createGridNodeV2();
  schema.value = insertRootGridV2(schema.value, grid);
  selectedNodeId.value = grid.id;
  selectedInsertionSlotId.value = null;
  selectionPathIds.value = [schema.value.pages[0].id, grid.id];
  selectionPathIndex.value = 1;
}

function addNodeToSelectedCell(kind: "static" | "field" | "table"): void {
  const ownerCell = insertionSlot.value;
  if (!ownerCell) return;
  const child =
    kind === "static"
      ? createStaticPNodeV2()
      : kind === "field"
        ? createFieldPNodeV2()
        : createTableNodeV2();
  schema.value = appendNodeToCellV2(schema.value, ownerCell.id, child);
  selectedNodeId.value = child.id;
}

function removeSelectedNode(): void {
  if (!selectedNodeId.value || selectedNode.value?.type === "page") return;
  schema.value = removeNodeV2(schema.value, selectedNodeId.value);
  selectedNodeId.value = null;
  selectedInsertionSlotId.value = null;
  selectionPathIds.value = [];
  selectionPathIndex.value = 0;
  lastClickedLeafId = null;
  selectionDepth = 0;
}

function selectNode(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  selectedInsertionSlotId.value = target.closest<HTMLElement>("[data-layout-id]")?.dataset.layoutId ?? null;
  const ids: string[] = [];
  let cursor = target.closest<HTMLElement>("[data-node-id]");
  while (cursor) {
    const id = cursor.dataset.nodeId;
    if (id) ids.push(id);
    cursor =
      cursor.parentElement?.closest<HTMLElement>("[data-node-id]") ?? null;
  }
  const selectableIds = ids.filter((id) => {
    return isSelectableSchemaNodeV2(nodeIndex.value.get(id)?.node);
  });
  const leafId = selectableIds[0] ?? null;
  if (!leafId) {
    selectedNodeId.value = null;
    selectedInsertionSlotId.value = null;
    selectionPathIds.value = [];
    selectionPathIndex.value = 0;
    lastClickedLeafId = null;
    selectionDepth = 0;
    return;
  }
  if (
    leafId === lastClickedLeafId &&
    selectionPathIds.value.join("/") === selectableIds.join("/")
  ) {
    selectionDepth = (selectionDepth + 1) % selectableIds.length;
  } else {
    lastClickedLeafId = leafId;
    selectionDepth = 0;
    selectionPathIds.value = selectableIds;
  }
  selectionPathIndex.value = selectionDepth;
  selectedNodeId.value = selectableIds[selectionDepth] ?? leafId;
}

function selectFromPath(id: string): void {
  const index = selectionPathIds.value.indexOf(id);
  if (index < 0) return;
  selectionPathIndex.value = index;
  selectedNodeId.value = id;
  selectionDepth = index;
}

function updateSelectedNode(
  updater: (node: EditorNodeV2) => EditorNodeV2,
): void {
  if (!selectedNodeId.value) return;
  schema.value = updateSchemaNodeV2(
    schema.value,
    selectedNodeId.value,
    updater,
  );
}

function updateSelectedText(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedNode((node) =>
    node.type === "p" && node.mode === "static"
      ? { ...node, text: value }
      : node,
  );
}

function updateSelectedField(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedNode((node) =>
    node.type === "p" && node.mode === "field"
      ? { ...node, field: value }
      : node,
  );
}

function updateSelectedPrefix(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedNode((node) =>
    node.type === "p" && node.mode === "field"
      ? { ...node, prefix: value || undefined }
      : node,
  );
}

function updateSelectedSuffix(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedNode((node) =>
    node.type === "p" && node.mode === "field"
      ? { ...node, suffix: value || undefined }
      : node,
  );
}

function updateGridBorder(event: Event): void {
  if (selectedNode.value?.type !== "grid") return;
  schema.value = updateGridBorderV2(
    schema.value,
    selectedNode.value.id,
    (event.target as HTMLSelectElement).value as BorderModeV2,
  );
}

function updateGridDimensions(event: Event): void {
  if (selectedNode.value?.type !== "grid") return;
  const input = event.target as HTMLInputElement;
  const value = Math.max(1, Math.floor(Number(input.value) || 1));
  const rowCount =
    input.dataset.dimension === "rows" ? value : selectedNode.value.rows.length;
  const columnCount =
    input.dataset.dimension === "columns"
      ? value
      : (selectedNode.value.rows[0]?.cells.length ?? 1);
  schema.value = resizeGridV2(
    schema.value,
    selectedNode.value.id,
    rowCount,
    columnCount,
  );
}

function updateTableRows(event: Event): void {
  if (selectedNode.value?.type !== "table") return;
  schema.value = updateTableMinRowsV2(
    schema.value,
    selectedNode.value.id,
    Number((event.target as HTMLInputElement).value),
  );
}
</script>

<template>
  <div class="v2-designer">
    <header class="v2-toolbar">
      <div class="v2-toolbar__title">固定版式表单设计器 V2</div>
      <div class="v2-toolbar__meta">
        嵌套 Schema · A4 · 基础行高 {{ schema.baseRowHeight }}mm
      </div>
      <button class="v2-toolbar__button" type="button" @click="resetBlank">
        新建空白模板
      </button>
      <button class="v2-toolbar__button" type="button" @click="reloadSample">
        载入前五行样例
      </button>
    </header>

    <div class="v2-designer__body">
      <aside class="v2-sidebar v2-sidebar--left">
        <div class="v2-sidebar__heading">组件库</div>
        <div v-if="false" class="v2-grid-size-control">
          <label>
            <span>行</span>
            <input :value="1" type="number" min="1" step="1" />
          </label>
          <label>
            <span>列</span>
            <input :value="1" type="number" min="1" step="1" />
          </label>
        </div>
        <button
          class="v2-palette-item v2-palette-item--button"
          type="button"
          @click="addRootGrid"
        >
          添加 Grid
        </button>
        <div class="v2-sidebar__subheading">向组件所在格子插入</div>
        <button
          class="v2-palette-item v2-palette-item--button"
          type="button"
          :disabled="!insertionSlot"
          @click="addNodeToSelectedCell('static')"
        >
          固定文字 P
        </button>
        <button
          class="v2-palette-item v2-palette-item--button"
          type="button"
          :disabled="!insertionSlot"
          @click="addNodeToSelectedCell('field')"
        >
          可输入字段 P
        </button>
        <button
          class="v2-palette-item v2-palette-item--button"
          type="button"
          :disabled="!insertionSlot"
          @click="addNodeToSelectedCell('table')"
        >
          明细 Table
        </button>
        <button
          class="v2-palette-item v2-palette-item--button v2-palette-item--danger"
          type="button"
          :disabled="!selectedNodeId || selectedNode?.type === 'page'"
          @click="removeSelectedNode"
        >
          删除选中节点
        </button>
        <p class="v2-sidebar__hint">
          先选择要操作的组件；Row 和 Cell 只作为 Grid 的内部布局数据，不会进入节点链。
        </p>
      </aside>

      <main class="v2-canvas" @click="selectNode">
        <GridSchemaRenderer
          :schema="schema"
          :selected-node-id="selectedNodeId"
        />
      </main>

      <aside class="v2-sidebar v2-sidebar--right">
        <div class="v2-sidebar__heading">节点检查</div>
        <div class="v2-inspector-row">
          <span>当前节点</span>
          <code>{{ selectedNodeId ?? "未选择" }}</code>
        </div>
        <div class="v2-inspector-row">
          <span>节点类型</span>
          <strong>{{ selectedNodeType }}</strong>
        </div>
        <nav
          v-if="selectedPath.length"
          class="v2-breadcrumb"
          aria-label="节点路径"
        >
          <button
            v-for="node in selectedPath"
            :key="node.id"
            type="button"
            class="v2-breadcrumb__item"
            :class="{
              'v2-breadcrumb__item--active': node.id === selectedNodeId,
            }"
            @click.stop="selectFromPath(node.id)"
          >
            {{ node.type }}
          </button>
        </nav>
        <div class="v2-inspector-row">
          <span>Schema 版本</span>
          <strong>{{ schema.version }}</strong>
        </div>
        <template v-if="selectedNode?.type === 'grid'">
          <div class="v2-grid-dimensions">
            <label class="v2-control">
              <span>行数</span>
              <input
                type="number"
                min="1"
                step="1"
                :value="selectedNode.rows.length"
                data-dimension="rows"
                @change="updateGridDimensions"
              />
            </label>
            <label class="v2-control">
              <span>列数</span>
              <input
                type="number"
                min="1"
                step="1"
                :value="selectedNode.rows[0]?.cells.length ?? 1"
                data-dimension="columns"
                @change="updateGridDimensions"
              />
            </label>
          </div>
          <label class="v2-control">
            <span>边框</span>
            <select :value="selectedNode.border" @change="updateGridBorder">
              <option value="all">外框 + 内部</option>
              <option value="outer">仅外框</option>
              <option value="inner">仅内部</option>
              <option value="none">无边框</option>
            </select>
          </label>
        </template>
        <template
          v-else-if="
            selectedNode?.type === 'p' && selectedNode.mode === 'static'
          "
        >
          <label class="v2-control">
            <span>固定文本</span>
            <input :value="selectedNode.text" @input="updateSelectedText" />
          </label>
        </template>
        <template
          v-else-if="
            selectedNode?.type === 'p' && selectedNode.mode === 'field'
          "
        >
          <label class="v2-control">
            <span>字段名</span>
            <input :value="selectedNode.field" @input="updateSelectedField" />
          </label>
          <label class="v2-control">
            <span>前标签（可选）</span>
            <input :value="selectedNode.prefix ?? ''" @input="updateSelectedPrefix" />
          </label>
          <label class="v2-control">
            <span>后标签（可选）</span>
            <input :value="selectedNode.suffix ?? ''" @input="updateSelectedSuffix" />
          </label>
        </template>
        <template v-else-if="selectedNode?.type === 'table'">
          <label class="v2-control">
            <span>最小行数</span>
            <input
              type="number"
              min="0"
              step="1"
              :value="selectedNode.minRows"
              @change="updateTableRows"
            />
          </label>
        </template>
        <div
          class="v2-issues"
          :class="{ 'v2-issues--ok': issues.length === 0 }"
        >
          <strong>{{
            issues.length === 0 ? "结构校验通过" : issues.length + " 个结构问题"
          }}</strong>
          <div
            v-for="issue in issues"
            :key="issue.code + '-' + (issue.nodeId || 'schema')"
            class="v2-issue"
          >
            {{ issue.code }}：{{ issue.message }}
          </div>
        </div>
      </aside>
    </div>

    <StatusBar
      :page-count="schema.pages.length"
      :warning-count="warningCount"
    />
  </div>
</template>

<style scoped>
.v2-designer {
  display: grid;
  grid-template-rows: 48px 1fr 28px;
  height: 100vh;
  overflow: hidden;
  background: #f3f4f6;
}

.v2-toolbar {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 18px;
  color: #f8fafc;
  background: #172033;
}

.v2-toolbar__title {
  font-size: 14px;
  font-weight: 700;
}

.v2-toolbar__meta {
  color: #a9b5c7;
  font-size: 12px;
}

.v2-toolbar__button {
  margin-left: auto;
  height: 28px;
  padding: 0 12px;
  border: 1px solid #4c6484;
  border-radius: 4px;
  color: #f8fafc;
  background: #263957;
  cursor: pointer;
  font-size: 12px;
}

.v2-designer__body {
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr) 280px;
  min-height: 0;
}

.v2-sidebar {
  min-width: 0;
  padding: 16px;
  overflow: auto;
  background: #fff;
  border-right: 1px solid #d8dee8;
}

.v2-sidebar--right {
  border-right: 0;
  border-left: 1px solid #d8dee8;
}

.v2-sidebar__heading {
  margin-bottom: 14px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.v2-palette-item {
  display: block;
  width: 100%;
  margin-bottom: 8px;
  padding: 9px 10px;
  border: 1px solid #d8dee8;
  border-radius: 4px;
  color: #334155;
  background: #f8fafc;
  font-size: 12px;
}

.v2-palette-item--button {
  text-align: left;
  cursor: pointer;
}

.v2-palette-item--button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.v2-grid-size-control {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

.v2-grid-size-control label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #64748b;
  font-size: 11px;
}

.v2-grid-size-control input {
  width: 100%;
  min-height: 28px;
  padding: 0 6px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  box-sizing: border-box;
  color: #1e293b;
  background: #fff;
  font-size: 12px;
}

.v2-palette-item--danger {
  color: #991b1b;
  border-color: #fecaca;
  background: #fff7f7;
}

.v2-sidebar__subheading {
  margin: 16px 0 8px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.v2-sidebar__hint {
  margin: 18px 2px 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.6;
}

.v2-canvas {
  min-width: 0;
  overflow: hidden;
}

.v2-inspector-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #64748b;
  font-size: 12px;
}

.v2-inspector-row code {
  max-width: 150px;
  overflow: hidden;
  color: #334155;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.v2-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 8px 0 14px;
}

.v2-breadcrumb__item {
  padding: 3px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  color: #475569;
  background: #f8fafc;
  cursor: pointer;
  font-size: 10px;
}

.v2-breadcrumb__item--active {
  border-color: #2563eb;
  color: #1d4ed8;
  background: #eff6ff;
}

.v2-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 14px 0;
  color: #475569;
  font-size: 12px;
}

.v2-grid-dimensions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.v2-control input,
.v2-control select {
  width: 100%;
  min-height: 30px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  box-sizing: border-box;
  color: #1e293b;
  background: #fff;
  font-size: 12px;
}

.v2-issues {
  margin-top: 18px;
  padding: 10px;
  border: 1px solid #f0b7b7;
  border-radius: 4px;
  color: #991b1b;
  background: #fff5f5;
  font-size: 12px;
}

.v2-issues--ok {
  border-color: #b7dfc5;
  color: #166534;
  background: #f0fdf4;
}

.v2-issue {
  margin-top: 6px;
  line-height: 1.45;
}

@media print {
  .v2-toolbar,
  .v2-sidebar,
  :deep(.status-bar) {
    display: none !important;
  }

  .v2-designer,
  .v2-designer__body,
  .v2-canvas {
    display: block;
    height: auto;
    overflow: visible;
  }
}
</style>
