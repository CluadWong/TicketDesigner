<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import GridFormRenderer from "../renderer-v2/GridFormRenderer.vue";
import {
  NODE_ID_ATTR,
  LAYOUT_ID_ATTR,
  PALETTE_DRAG_MIME,
} from "@/engine-v2/node-address";
import { NODE_MOVE_MIME, buildEditorNodeIndexV2 } from "@/types";
import type { FormSchemaV2, FormDataV2, FormNodeV2 } from "@/types";

/**
 * 设计表面层（A5 + A6 分层重构 · Batch 2 + Batch 3）
 *
 * 渲染内核（renderer-v2）只负责 schema + data → 版式 DOM，不认识「选中 / 拖拽 / 落点」。
 * 本组件是内核之上的「设计表面」，承接来自设计态的全部交互关注点：
 * - 选中高亮（A5）：在渲染 DOM 上加 `.is-design-selected`（MutationObserver）。
 * - 拖拽（A6）：落点（dragover / drop / dragend）与**源**（dragstart）均在本层以事件委托处理。
 *   原生 dragstart 冒泡到表面层根后，由本层确定被拖节点、套用拦截规则（表格内部节点 /
 *   设计态字段 p 需 Alt）、写入 NODE_MOVE_MIME，再计算合法投放格与插入下标；
 *   内核只按本层下传的 `dragOverCellId` / `dragOverIndex` 渲染插入指示线（不感知交互）。
 * - 透传 `node-drag-start` / `field-change` 给上层 DesignerApp；
 *   落点结果以语义事件 `drop-node` / `drop-palette` / `drag-end` 上抛，由 DesignerApp 提交 schema。
 *
 * 关键拆分：内核不再持有 `selectedNodeId`、不处理拖拽 DOM 事件（A5/A6）；
 * 选中与拖拽交互均在本表面层完成，内核保持纯净（见 docs/architecture-layering-review.md §6.5）。
 */
type CanvasSurfaceMode = "design" | "preview" | "fill";
type NodeKind = "text" | "field" | "table" | "html" | "image" | "grid";

const props = withDefaults(
  defineProps<{
    schema: FormSchemaV2;
    /** 渲染模式，透传给内核（design / preview / fill）。仅 design 态允许拖拽交互。 */
    mode?: CanvasSurfaceMode;
    data?: FormDataV2 | null;
    readonly?: boolean;
    /** 当前选中的节点 id（设计态）；预览/填充态传 null（选中高亮仅设计态出现）。 */
    selectedNodeId?: string | null;
    /** 无外壳模式（嵌入消费页）。 */
    bare?: boolean;
    /** 分页开关（预览/填写/打印强制分页；设计态可关为整页连续）。 */
    paginate?: boolean;
  }>(),
  { paginate: true },
);

const emit = defineEmits<{
  (e: "node-drag-start", id: string): void;
  (e: "field-change", field: string, value: string): void;
  (e: "drop-node", detail: { moveId: string; cellId: string; index: number }): void;
  (e: "drop-palette", detail: { kind: NodeKind; cellId: string }): void;
  (e: "drag-end"): void;
}>();

// ── 选中高亮（A5） ──
const root = ref<HTMLElement | null>(null);
let observer: MutationObserver | null = null;

function applySelectionHighlight(): void {
  const el = root.value;
  if (!el) return;
  const target = props.selectedNodeId
    ? el.querySelector<HTMLElement>(`[${NODE_ID_ATTR}="${props.selectedNodeId}"]`)
    : null;
  el.querySelectorAll<HTMLElement>(".is-design-selected").forEach((n) => {
    if (n !== target) n.classList.remove("is-design-selected");
  });
  if (target) target.classList.add("is-design-selected");
}

function scheduleApply(): void {
  observer?.disconnect();
  nextTick(() => {
    applySelectionHighlight();
    if (root.value) {
      observer?.observe(root.value, { childList: true, subtree: true });
    }
  });
}

watch(
  () => [
    props.selectedNodeId,
    props.schema,
    props.data,
    props.mode,
    props.readonly,
  ],
  scheduleApply,
  { deep: true, immediate: true },
);

onMounted(() => {
  observer = new MutationObserver(scheduleApply);
  scheduleApply();
});

onUnmounted(() => observer?.disconnect());

const hostClass = computed(() => ({
  "v2-canvas-surface--preview": props.mode === "preview" || props.mode === "fill",
}));

// ── 拖拽落点（A6） ──
/** 当前悬停投放格与插入下标（内核据此渲染 `.v2-insertion-line`）。 */
const dragOverCellId = ref<string | null>(null);
const dragOverIndex = ref<number>(-1);
/** 合法投放格集合：拖拽起点（node-drag-start）时按被拖拽节点计算，排除其自身及后代容器。 */
const legalDropCellIds = ref<Set<string>>(new Set());
let dragTargetEl: HTMLElement | null = null;

const dragEnabled = computed(
  () => props.mode !== "preview" && props.mode !== "fill",
);

function setDropHighlight(cell: HTMLElement | null): void {
  if (dragTargetEl && dragTargetEl !== cell) {
    dragTargetEl.classList.remove("v2-drop-target");
  }
  if (cell && cell !== dragTargetEl) {
    cell.classList.add("v2-drop-target");
  }
  dragTargetEl = cell;
}

function clearDropHighlight(): void {
  if (dragTargetEl) {
    dragTargetEl.classList.remove("v2-drop-target");
    dragTargetEl = null;
  }
}

function computeInsertionIndex(cellEl: HTMLElement, clientY: number): number {
  const childEls = Array.from(cellEl.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && el.hasAttribute(NODE_ID_ATTR),
  );
  for (let i = 0; i < childEls.length; i += 1) {
    const rect = childEls[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return i;
  }
  return childEls.length;
}

/**
 * 拖拽源（内核 GridSchemaNode 的 dragstart）冒泡到表面层：记录被拖拽节点，
 * 计算「合法投放格」集合（排除被拖拽节点自身及其后代容器，含嵌套 Grid / Table 内部格），
 * 并向上透传选中态给 DesignerApp。
 */
function onNodeDragStart(id: string): void {
  const index = buildEditorNodeIndexV2(props.schema);
  const legal: string[] = [];
  const isDescendantOfDragged = (cellId: string): boolean => {
    let cursor: string | undefined = cellId;
    while (cursor) {
      if (cursor === id) return true;
      cursor = index.get(cursor)?.parent?.id;
    }
    return false;
  };
  props.schema.pages.forEach((page) => {
    const walk = (children: FormNodeV2[]): void => {
      children.forEach((child) => {
        if (child.type === "grid") {
          child.rows.forEach((row) =>
            row.cells.forEach((cell) => {
              if (!isDescendantOfDragged(cell.id)) legal.push(cell.id);
              walk(cell.children);
            }),
          );
        } else if (child.type === "table") {
          child.rowTemplate.forEach((tpl) => {
            if (!isDescendantOfDragged(tpl.id)) legal.push(tpl.id);
          });
        }
      });
    };
    walk(page.children);
  });
  legalDropCellIds.value = new Set(legal);
  emit("node-drag-start", id);
}

/**
 * 拖拽源下沉（A6 二十七续）：原生 `dragstart` 经事件委托冒泡到表面层根。
 * 内核不再绑定 @dragstart（仅保留 :draggable 属性——浏览器要求 draggable 必须是被拖元素自身的属性，且仅设计态为 true）。
 * 此处确定被拖节点、套用与旧内核一致的拦截规则（表格内部节点 / 设计态字段 p 需 Alt），
 * 写入 NODE_MOVE_MIME，再复用 onNodeDragStart 计算合法投放格并向上透传选中态。
 */
function onSurfaceDragStart(event: DragEvent): void {
  if (!dragEnabled.value) return;
  const target = event.target as HTMLElement | null;
  const nodeEl = target?.closest<HTMLElement>("[data-node-id]") ?? null;
  if (!nodeEl) return;
  // 表格（含嵌套 Grid）内部的节点不可作为独立拖拽源（字段由列配置派生，不单独选中 / 配置）。
  const tableEl = nodeEl.closest(".layout-table");
  if (tableEl && tableEl !== nodeEl) {
    event.preventDefault();
    return;
  }
  const nodeId = nodeEl.getAttribute("data-node-id") ?? "";
  if (!nodeId) return;
  const node = buildEditorNodeIndexV2(props.schema).get(nodeId)?.node;
  const p = node
    ? (node as unknown as {
        type?: string;
        mode?: string;
        prefix?: string;
        suffix?: string;
      })
    : undefined;
  // 设计态整段可编辑字段 p：仅按住 Alt 才允许整节点拖拽，否则放行文本编辑 / 选择。
  if (
    p &&
    p.type === "p" &&
    props.mode === "design" &&
    p.mode === "field" &&
    !p.prefix &&
    !p.suffix &&
    !event.altKey
  ) {
    event.preventDefault();
    return;
  }
  const dt = event.dataTransfer;
  if (!dt) return;
  dt.setData(NODE_MOVE_MIME, nodeId);
  dt.setData("text/plain", nodeId);
  dt.effectAllowed = "move";
  onNodeDragStart(nodeId);
}

function onDragOver(event: DragEvent): void {
  if (!dragEnabled.value) return;
  const dt = event.dataTransfer;
  if (!dt) return;
  const hasPalette = Array.from(dt.types).includes(PALETTE_DRAG_MIME);
  const hasMove = Array.from(dt.types).includes(NODE_MOVE_MIME);
  if (!hasPalette && !hasMove) return;
  if (hasPalette) {
    event.preventDefault();
    const cell = (event.target as HTMLElement).closest<HTMLElement>(
      `[${LAYOUT_ID_ATTR}]`,
    );
    setDropHighlight(cell ?? null);
    dragOverCellId.value = null;
    dragOverIndex.value = -1;
    return;
  }
  // 已有节点拖拽重排：仅在合法投放格上允许投放，并计算插入指示下标。
  setDropHighlight(null);
  const cell = (event.target as HTMLElement).closest<HTMLElement>(
    `[${LAYOUT_ID_ATTR}]`,
  );
  const cellId = cell?.dataset.layoutId ?? null;
  if (cell && cellId && legalDropCellIds.value.has(cellId)) {
    event.preventDefault();
    dragOverCellId.value = cellId;
    dragOverIndex.value = computeInsertionIndex(cell, event.clientY);
  } else {
    dragOverCellId.value = null;
    dragOverIndex.value = -1;
  }
}

function onDragLeave(event: DragEvent): void {
  const related = event.relatedTarget as HTMLElement | null;
  if (!related || !related.closest(`[${LAYOUT_ID_ATTR}]`)) {
    clearDropHighlight();
    dragOverCellId.value = null;
    dragOverIndex.value = -1;
  }
}

function resetDragState(): void {
  dragOverCellId.value = null;
  dragOverIndex.value = -1;
  legalDropCellIds.value = new Set();
  clearDropHighlight();
}

function onDrop(event: DragEvent): void {
  if (!dragEnabled.value) return;
  const dt = event.dataTransfer;
  if (!dt) return;
  clearDropHighlight();
  event.preventDefault();
  const kind = (dt.getData(PALETTE_DRAG_MIME) ?? "") as NodeKind;
  if (kind) {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(
      `[${LAYOUT_ID_ATTR}]`,
    );
    const cellId = cell?.dataset.layoutId ?? null;
    resetDragState();
    if (!cellId) return;
    emit("drop-palette", { kind, cellId });
    return;
  }
  const moveId = dt.getData(NODE_MOVE_MIME) ?? "";
  const cellId = dragOverCellId.value;
  const idx = dragOverIndex.value;
  resetDragState();
  if (!moveId || !cellId || idx < 0) return;
  emit("drop-node", { moveId, cellId, index: idx });
}

function onDragEnd(): void {
  resetDragState();
  emit("drag-end");
}
</script>

<template>
  <div
    ref="root"
    class="v2-canvas-surface"
    :class="hostClass"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @dragend="onDragEnd"
    @dragstart="onSurfaceDragStart"
  >
    <GridFormRenderer
      :schema="schema"
      :mode="mode"
      :data="data"
      :readonly="readonly"
      :drag-over-cell-id="dragOverCellId"
      :drag-over-index="dragOverIndex"
      :bare="bare"
      :paginate="paginate"
      @field-change="(field: string, value: string) => emit('field-change', field, value)"
    />
  </div>
</template>

<style scoped>
.v2-canvas-surface {
  /* 表面层容器：仅承载选中高亮 / 拖拽落点高亮的 DOM 钩子，不引入任何版式样式 */
  width: 100%;
  height: 100%;
}

.v2-canvas-surface--preview :deep(.grid-form-canvas) {
  /* 预览/填充态灰底画布与编辑态一致，保证所见即所得 */
  padding: 24px;
}

/* 选中高亮（A5）：由表面层注入，内核不感知。
   复刻原内核 .layout-node--selected 的视觉效果（淡蓝底 + 内描边）。 */
.v2-canvas-surface :deep(.is-design-selected) {
  position: relative;
  z-index: 2;
  background-color: rgb(37 99 235 / 12%) !important;
  box-shadow: inset 0 0 0 2px #2563eb !important;
}

/* 落点高亮（A6）：拖拽悬停的合法投放格。 */
.v2-canvas-surface :deep(.v2-drop-target) {
  outline: 2px dashed #2563eb;
  outline-offset: -2px;
  background: #eff6ff;
}

@media print {
  .v2-canvas-surface :deep(.is-design-selected) {
    background-color: transparent !important;
    box-shadow: none !important;
  }
  .v2-canvas-surface :deep(.v2-drop-target) {
    outline: none !important;
    background: transparent !important;
  }
}
</style>
