<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, reactive } from "vue";
import CanvasSurface from "./CanvasSurface.vue";
import PaperViewport from "@/components/renderer-v2/PaperViewport.vue";
import { NODE_ID_ATTR, LAYOUT_ID_ATTR, PALETTE_DRAG_MIME } from "@/engine-v2/node-address";
import type { SampleEntry } from "@/samples/types";
import { resolveCellBoxV2 } from "@/engine-v2/derivation";
/** D2：打印触发收口到渲染内核，设计器不再裸调 `window.print()`。 */
import { printForm } from "@/components/renderer-v2/print-form";
import {
  buildEditorNodeIndexV2,
  appendNodeToCellV2,
  createEmptyFormSchemaV2,
  createFieldPNodeV2,
  createGridNodeV2,
  createHtmlNodeV2,
  createImageNodeV2,
  createTextNodeV2,
  createTableNodeV2,
  insertRootGridV2,
  removeNodeV2,
  resizeGridV2,
  setGridColumnWidthV2,
  mergeGridCellsV2,
  splitGridCellV2,
  moveNodeToIndexV2,
  updateGridBorderV2,
  updateTableBorderV2,
  updateGridCellDefaultsV2,
  updateGridGapV2,
  updateSchemaNodeV2,
  updateTableMinRowsV2,
  addTableColumnV2,
  removeTableColumnV2,
  renameTableColumnKeyV2,
  updateTableColumnV2,
  updateBaseRowHeightV2,
  updatePaperConfigV2,
  validateFormSchemaV2,
  serializeFormSchemaV2,
  parseFormSchemaV2,
} from "@/types";
import type {
  BorderModeV2,
  FieldPNodeV2,
  FormNodeV2,
  GridCellV2,
  GridNodeV2,
  GridRowV2,
  GridTrackV2,
  EditorNodeV2,
  SchemaIssueV2,
  FormSchemaV2,
  FormDataV2,
  TextStyleV2,
  TextNodeV2,
  TableColumnV2,
} from "@/types";
import { isSelectableSchemaNodeV2 } from "@/types";
import { paginateSchema } from "@/engine-v2/pagination";
import StatusBar from "./StatusBar.vue";
import NodeTreeItem, { type TreeNode } from "./NodeTreeItem.vue";
import { collectFieldValues } from "@/components/renderer-v2";

const props = defineProps<{
  initialSchema?: FormSchemaV2;
  /** 可载入的样例集（由外层注入，设计器不依赖 dev 目录，见 B3）。 */
  samples?: SampleEntry[];
  /** 预览/填写态默认种子数据（由外层注入，替代原先写死的 demoData）。 */
  previewData?: FormDataV2;
}>();

/** 空白初始化：空 page + 一个根 Grid，便于用户从空白开始设计（用户要求默认空白）。 */
function buildBlankSchema(): FormSchemaV2 {
  const blank = createEmptyFormSchemaV2();
  const grid = createGridNodeV2();
  return insertRootGridV2(blank, grid);
}

const schema = ref<FormSchemaV2>(
  props.initialSchema
    ? (JSON.parse(JSON.stringify(props.initialSchema)) as FormSchemaV2)
    : buildBlankSchema(),
);
const selectedNodeId = ref<string | null>(null);
const selectedInsertionSlotId = ref<string | null>(null);
const selectionPathIds = ref<string[]>([]);
const selectionPathIndex = ref(0);

const issues = computed(() => validateFormSchemaV2(schema.value));
const warningCount = computed(() => issues.value.length);
/**
 * 分页结果（纯函数、DOM 无关）：用于状态栏暴露「实际会打印几张纸」与超高告警。
 *
 * 与渲染内核 `GridFormRenderer` 调的是**同一个** `paginateSchema` 且入参口径一致
 * （`data` 同为 `previewData`，body/内宽同由 `resolvePaperSizeV2` 派生），
 * 因此状态栏数字与画布物理页必然一致，不会出现两处各算一套而漂移。
 *
 * 注意：这里始终按**分页开启**计算 —— 工具栏「分页」开关只影响设计态画布是否切分，
 * 预览/打印永远分页，所以状态栏显示的就是真实出纸张数。
 */
const pagination = computed(() =>
  paginateSchema(schema.value, { data: previewData.value }),
);
const nodeIndex = computed(() => buildEditorNodeIndexV2(schema.value));
// 单元格（grid-cell）作为「仅样式可编辑」实体可被选中，但不可删除、不进入节点树。
/** 节点是否位于某个 Table 的行模板内（含嵌套 Grid）。表格内节点不可单独选中/配置，
 *  其字段 P 由列配置派生，故选中时归到所属 Table。 */
function isInsideTable(id: string): boolean {
  let cursor = nodeIndex.value.get(id)?.parent ?? null;
  while (cursor) {
    if (cursor.type === "table") return true;
    cursor = nodeIndex.value.get(cursor.id)?.parent ?? null;
  }
  return false;
}

/** 节点是否可作为独立组件选中并配置。Table 行模板内的节点（字段 P 等）不可选中。 */
function isStyleEditableNodeId(id: string): boolean {
  const node = nodeIndex.value.get(id)?.node;
  if (!node) return false;
  if (isInsideTable(id)) return false;
  return isSelectableSchemaNodeV2(node) || node.type === "grid-cell";
}
const selectedNode = computed<EditorNodeV2 | null>(() => {
  const id = selectedNodeId.value;
  return id && isStyleEditableNodeId(id)
    ? (nodeIndex.value.get(id)?.node ?? null)
    : null;
});
const selectedPath = computed<EditorNodeV2[]>(() => {
  return selectionPathIds.value
    .map((id) => nodeIndex.value.get(id)?.node)
    .filter((n): n is EditorNodeV2 => n != null && isStyleEditableNodeId(n.id));
});
const selectedNodeType = computed(() => selectedNode.value?.type ?? "未选择");
const selectedOwnerCell = computed(() =>
  selectedNodeId.value
    ? (nodeIndex.value.get(selectedNodeId.value)?.ownerCell ?? null)
    : null,
);
// 选中单元格（grid-cell）时，取其所属 Grid 以计算生效值与「清除覆盖」。
const selectedCell = computed(() =>
  selectedNode.value?.type === "grid-cell"
    ? (selectedNode.value as GridCellV2)
    : null,
);
const selectedOwnerGridOfCell = computed<GridNodeV2 | null>(() => {
  const id = selectedNodeId.value;
  if (!id) return null;
  let cursor = nodeIndex.value.get(id)?.parent ?? null;
  while (cursor && cursor.type !== "grid") {
    cursor = nodeIndex.value.get(cursor.id)?.parent ?? null;
  }
  return cursor?.type === "grid" ? (cursor as GridNodeV2) : null;
});
const selectedCellBox = computed(() => {
  const cell = selectedCell.value;
  const grid = selectedOwnerGridOfCell.value;
  if (!cell || !grid) return null;
  return resolveCellBoxV2(cell, grid);
});
/** 选中 grid-cell 时的上下文：所在行、列索引、是否可合并右侧、是否可拆分。 */
const selectedCellContext = computed<{
  rowIndex: number;
  columnIndex: number;
  hasNextSibling: boolean;
  canSplit: boolean;
} | null>(() => {
  const id = selectedNodeId.value;
  if (!id) return null;
  const entry = nodeIndex.value.get(id);
  if (entry?.node.type !== "grid-cell" || entry.parent?.type !== "grid-row")
    return null;
  const row = entry.parent as GridRowV2;
  const rowIndex = (nodeIndex.value.get(row.id)?.node as GridRowV2 | undefined)
    ? (selectedOwnerGridOfCell.value?.rows ?? []).findIndex(
        (r) => r.id === row.id,
      )
    : -1;
  const columnIndex = row.cells.findIndex((cell) => cell.id === id);
  if (columnIndex < 0) return null;
  return {
    rowIndex,
    columnIndex,
    hasNextSibling: columnIndex < row.cells.length - 1,
    canSplit: (entry.node.colspan ?? 1) > 1,
  };
});
// 选中组件位置信息现由拖拽重排（P9）在 drop 时通过 moveNodeToIndexV2 处理，不再维护 canMoveUp/Down 计算。
// 拖拽重排（P9）：跨格 / 跨 Grid 移动的目标投放点由 CanvasSurface 在拖拽起始时
// 计算（legalDropCellIds，现位于 CanvasSurface 内部状态），不再维护独立下拉列表；
// 同格重排也允许（仅排除自身后代容器）。本组件只负责在 drop 时提交 schema。

const insertionSlot = computed(() => {
  const slotId = selectedInsertionSlotId.value;
  const slot = slotId ? nodeIndex.value.get(slotId)?.node : undefined;
  return slot?.type === "grid-cell" || slot?.type === "table-cell-template"
    ? slot
    : selectedOwnerCell.value;
});

// 结构树：仅展示可选节点（Page / Grid / 实际组件），跳过 Row/Cell 布局记录。
function selectableChildrenOf(node: EditorNodeV2): EditorNodeV2[] {
  if (node.type === "page") return node.children;
  if (node.type === "grid") {
    const out: EditorNodeV2[] = [];
    for (const row of node.rows)
      for (const cell of row.cells) out.push(...cell.children);
    return out;
  }
  if (node.type === "table")
    // 表格内字段 P 由列配置派生、不可作为独立组件选中/配置，故结构树不展开其子节点。
    return [];
  return [];
}

function nodeLabel(node: EditorNodeV2): string {
  switch (node.type) {
    case "page":
      return "页面";
    case "grid":
      return node.id;
    case "text":
      return node.text ? `“${node.text}”` : "(空文本)";
    case "p":
      return `字段:${node.field}`;
    case "table":
      return node.field ? `表格:${node.field}` : "表格";
    case "image":
      return "图片";
    case "html":
      return "HTML 模块";
    default:
      return node.type;
  }
}

function buildTreeNode(node: EditorNodeV2): TreeNode {
  return {
    id: node.id,
    type: node.type,
    label: nodeLabel(node),
    children: selectableChildrenOf(node).map(buildTreeNode),
  };
}

const nodeTree = computed(() =>
  schema.value.pages.map((page) => buildTreeNode(page)),
);

const STORAGE_KEY = "ticket-designer-schema-v2";
const DATA_STORAGE_KEY = "ticket-designer-fill-data-v2";
const MAX_HISTORY = 100;
const dirty = ref(false);
const undoStack = ref<FormSchemaV2[]>([]);
const redoStack = ref<FormSchemaV2[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const fillDataFileInput = ref<HTMLInputElement | null>(null);
const canvasEl = ref<HTMLElement | null>(null);
/**
 * 视图模式：
 * - `design`：设计态，可编辑结构、可选中/添加组件；
 * - `preview`：**结构只读的交互填充态** —— 带数据渲染，不可添加/选中/重排组件，
 *   但字段 P 仍按同一 `<p>` 路径可编辑（值经 DOM 遍历采集，见十续）；
 * - `fill`：填充态（已移除，字段回写改由预览态 DOM 遍历采集）。
 */
type ViewMode = "design" | "preview";
const viewMode = ref<ViewMode>("design");
/**
 * 分页开关（默认开启）：开启后渲染器按纸张正文高度把超高内容切成多张物理页。
 *
 * 关闭时整页连续渲染（纸张高度固定为整纸高，超出部分溢出到纸张外的灰底，
 * 便于整体排版时查看连续结构）。注意：**打印/预览始终分页**，此开关只影响设计态画布，
 * 因为设计态下分页会把跨页的 Grid 切成两个片段（同一个 grid id 出现在两张纸上）。
 */
const paginate = ref(true);
/** 非设计态：结构一律不可编辑（不可选中、不可拖拽、不可添加/删除组件）。 */
const previewMode = computed(() => viewMode.value !== "design");
/** 统一编辑闸门（C1，二十七续续）：仅设计态可改结构；所有结构性编辑动作经此单一判定，
 * 避免逐处手写 `if (previewMode) return` 遗漏守卫（新增编辑操作只需在此闸门下登记）。 */
const editable = computed(() => !previewMode.value);
// 预览/填写态的表单数据。使用响应式对象，字段输入可即时回写并被渲染层读取。
const previewFormData = reactive<{ value: FormDataV2 | null }>({ value: null });
const previewData = computed<FormDataV2 | null>(() => previewFormData.value);

/** 在「设计 / 预览」之间切换；再次点击同一模式则回到设计态。 */
function toggleViewMode(mode: "preview"): void {
  viewMode.value = viewMode.value === mode ? "design" : mode;
  if (viewMode.value === "design") {
    previewFormData.value = null;
    return;
  }
  previewFormData.value = { ...(props.previewData ?? {}) };
  clearSelection();
}

/**
 * 打印：触发走渲染内核统一入口（`printForm`），呈现（`@page` 纸张 + `@media print` 样式）
 * 亦由渲染内核负责——两者同层，设计器不再各自 `window.print()`（D2）。
 */
function printDocument(): void {
  printForm();
}

let lastClickedLeafId: string | null = null;
let selectionDepth = 0;
let lastCommitTag = "";
let lastCommitTime = 0;

// Any schema assignment (all ops are immutable) marks the document dirty.
watch(
  schema,
  () => {
    dirty.value = true;
  },
  { flush: "sync" },
);

function clearSelection(): void {
  selectedNodeId.value = null;
  selectedInsertionSlotId.value = null;
  selectionPathIds.value = [];
  selectionPathIndex.value = 0;
  lastClickedLeafId = null;
  selectionDepth = 0;
}

/**
 * Apply a schema change. Structural edits omit `tag` so each becomes its own
 * undo step; inspector text edits pass a per-node `tag` so consecutive
 * keystrokes within 800ms coalesce into a single undo step.
 */
function commit(next: FormSchemaV2, tag?: string): void {
  const now = Date.now();
  if (tag && tag === lastCommitTag && now - lastCommitTime < 800) {
    schema.value = next;
  } else {
    undoStack.value.push(schema.value);
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift();
    redoStack.value = [];
    schema.value = next;
    lastCommitTag = tag ?? "";
  }
  lastCommitTime = now;
}

/** Replace the whole document (load/sample/blank) and reset history. */
function resetHistory(next: FormSchemaV2): void {
  undoStack.value = [];
  redoStack.value = [];
  lastCommitTag = "";
  schema.value = next;
  dirty.value = false;
}

function undo(): void {
  const prev = undoStack.value.pop();
  if (!prev) return;
  redoStack.value.push(schema.value);
  schema.value = prev;
  lastCommitTag = "";
  dirty.value = true;
  clearSelection();
}

function redo(): void {
  const next = redoStack.value.pop();
  if (!next) return;
  undoStack.value.push(schema.value);
  schema.value = next;
  lastCommitTag = "";
  dirty.value = true;
  clearSelection();
}

const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);

function saveToLocal(): void {
  try {
    const text = serializeFormSchemaV2(schema.value, true);
    localStorage.setItem(STORAGE_KEY, text);
    dirty.value = false;
  } catch (error) {
    alert(
      `保存失败：${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function loadFromLocal(): void {
  const text = localStorage.getItem(STORAGE_KEY);
  if (!text) {
    alert("本地没有已保存的模板");
    return;
  }
  try {
    resetHistory(parseFormSchemaV2(text));
    clearSelection();
  } catch (error) {
    alert(
      `读取失败：${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function exportFile(): void {
  try {
    const text = serializeFormSchemaV2(schema.value, true);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ticket-schema-v2-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(
      `导出失败：${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function importFile(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      resetHistory(parseFormSchemaV2(String(reader.result)));
      clearSelection();
    } catch (error) {
      alert(
        `导入失败：${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      input.value = "";
    }
  };
  reader.onerror = () => {
    alert("文件读取失败");
    input.value = "";
  };
  reader.readAsText(file);
}

function triggerImport(): void {
  fileInput.value?.click();
}

/** 填充数据导入（B2 数据入口）：解析 FormDataV2 JSON，进入预览态展示填写结果。 */
function importFillDataFile(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result)) as FormDataV2;
      previewFormData.value = parsed;
      // 直接进预览态，避免 toggleViewMode 用 demoData 覆盖刚导入的数据。
      viewMode.value = "preview";
      clearSelection();
    } catch (error) {
      alert(`导入数据失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      input.value = "";
    }
  };
  reader.onerror = () => {
    alert("数据文件读取失败");
    input.value = "";
  };
  reader.readAsText(file);
}

function triggerImportFillData(): void {
  fillDataFileInput.value?.click();
}

/** 填充数据导出（B2 结果出口）：遍历渲染 DOM 采集当前填写值并下载 JSON。仅预览态可用。 */
function exportFillDataFile(): void {
  const root = canvasEl.value;
  if (!root || !previewMode.value) return;
  try {
    const values = collectFieldValues(root);
    const blob = new Blob([JSON.stringify(values, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ticket-fill-data-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(`导出数据失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

/** 保存当前填写数据到本地（仅数据，与 schema 存储键隔离）。 */
function saveFillDataToLocal(): void {
  const root = canvasEl.value;
  if (!root || !previewMode.value) return;
  try {
    const values = collectFieldValues(root);
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(values));
  } catch (error) {
    alert(`保存数据失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

/** 从本地读取填写数据并进入预览态。 */
function loadFillDataFromLocal(): void {
  const text = localStorage.getItem(DATA_STORAGE_KEY);
  if (!text) {
    alert("本地没有已保存的填写数据");
    return;
  }
  try {
    const parsed = JSON.parse(text) as FormDataV2;
    previewFormData.value = parsed;
    viewMode.value = "preview";
    clearSelection();
  } catch (error) {
    alert(`读取数据失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

function onKeydown(event: KeyboardEvent): void {
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return;
  const key = event.key.toLowerCase();
  if (key === "z" && !event.shiftKey) {
    event.preventDefault();
    undo();
  } else if ((key === "z" && event.shiftKey) || key === "y") {
    event.preventDefault();
    redo();
  } else if (key === "s") {
    event.preventDefault();
    saveToLocal();
  }
}

function beforeUnload(event: BeforeUnloadEvent): void {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("beforeunload", beforeUnload);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("beforeunload", beforeUnload);
});

/** 载入一个注入的样例（B3：样例来自 props 注册表，设计器不依赖 dev 目录）。 */
function loadSample(sample: SampleEntry): void {
  resetHistory(sample.loadSchema());
  clearSelection();
}

function resetBlank(): void {
  // 空白初始化默认配一个 Grid 作为根部（用户要求），仍从空 page 起算，
  // 便于用户在「添加 Grid」前就有一个可编辑的容器。
  resetHistory(buildBlankSchema());
  clearSelection();
}

function addRootGrid(): void {
  // 预览/填充态一律不允许改动结构（预览态本身也不可添加组件）。
  if (!editable.value) return;
  const grid = createGridNodeV2();
  commit(insertRootGridV2(schema.value, grid));
  selectedNodeId.value = grid.id;
  selectedInsertionSlotId.value = null;
  selectionPathIds.value = [schema.value.pages[0].id, grid.id];
  selectionPathIndex.value = 1;
}

/**
 * 添加 Grid：若当前已选中某个 cell（insertionSlot 存在），则把 Grid 嵌进该 cell；
 * 否则退化为在页面根追加一个新 Grid（与旧「添加 Grid」行为一致）。
 * 同时支持从模板拖拽到任意 cell（startPaletteDrag 写 PALETTE_DRAG_MIME，
 * CanvasSurface 的 onDrop 触发本组件 onDropPalette 完成落点提交）。
 */
function addGrid(): void {
  if (!editable.value) return;
  if (insertionSlot.value) {
    addNodeToSelectedCell("grid");
  } else {
    addRootGrid();
  }
}

function createNodeByKind(
  kind: "text" | "field" | "table" | "html" | "image" | "grid",
): FormNodeV2 {
  return kind === "text"
    ? createTextNodeV2()
    : kind === "field"
      ? createFieldPNodeV2()
      : kind === "table"
        ? createTableNodeV2()
        : kind === "html"
          ? createHtmlNodeV2()
          : kind === "grid"
            ? createGridNodeV2()
            : createImageNodeV2();
}

function addNodeToSelectedCell(
  kind: "text" | "field" | "table" | "html" | "image" | "grid",
): void {
  // 预览/填充态不允许添加组件。
  if (!editable.value) return;
  const ownerCell = insertionSlot.value;
  if (!ownerCell) return;
  const child = createNodeByKind(kind);
  commit(appendNodeToCellV2(schema.value, ownerCell.id, child));
  selectedNodeId.value = child.id;
}

// ── 拖拽生成：从模板拖到画布指定格 ──
// 落点判定 / 插入指示 / 落点高亮 / 合法投放格计算已下沉至 CanvasSurface 表面层（A6 分层重构，
// 见 docs/architecture-layering-review.md §6.5 Batch 3）。本文件仅保留「模板拖拽起点」与
// 「落点后提交 schema」两处薄逻辑，设计交互不再由壳层直接处理 DOM 拖拽事件。
function startPaletteDrag(
  kind: "text" | "field" | "table" | "html" | "image" | "grid",
  event: DragEvent,
): void {
  if (!editable.value) return;
  event.dataTransfer?.setData(PALETTE_DRAG_MIME, kind);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
}

// ── 拖拽落点逻辑（onCanvasDragOver / computeInsertionIndex / onCanvasDragLeave /
//    onCanvasDrop）已整体下沉至 CanvasSurface 表面层（A6，§6.5 Batch 3）。
// 本壳层只通过 @drop-node / @drop-palette 接收表面层语义事件并提交 schema（见下方 onDropNode / onDropPalette）。

function removeSelectedNode(): void {
  if (
    !selectedNodeId.value ||
    selectedNode.value?.type === "page" ||
    selectedNode.value?.type === "grid-cell"
  )
    return;
  commit(removeNodeV2(schema.value, selectedNodeId.value));
  clearSelection();
}

// ── 单元格合并 / 拆分（P6.2c / P6.2d）──
function mergeSelectedCellRight(): void {
  const id = selectedNodeId.value;
  const ctx = selectedCellContext.value;
  if (!id || !ctx || !ctx.hasNextSibling) return;
  const row = nodeIndex.value.get(id)?.parent as GridRowV2 | undefined;
  if (!row) return;
  const rightId = row.cells[ctx.columnIndex + 1].id;
  commit(mergeGridCellsV2(schema.value, id, rightId), `merge:${id}`);
  selectedNodeId.value = id;
}

function splitSelectedCell(): void {
  const id = selectedNodeId.value;
  const ctx = selectedCellContext.value;
  if (!id || !ctx || !ctx.canSplit) return;
  commit(splitGridCellV2(schema.value, id), `split:${id}`);
  selectedNodeId.value = id;
}

// ── 格内排序 / 跨格移动（P6.3b / P6.3c）──
// UI 拖拽推迟；此处用「配置面板按钮 + 目标下拉」替代，底层结构纯函数与拖拽版一致。
// ── 拖拽重排已有节点（P9）──
// 取代旧的「上/下排序按钮 + 移动到目标格下拉」：选中即同步到拖拽源，
// 跨格 / 跨 Grid / 格内排序统一由 moveNodeToIndexV2 在 drop 时提交。
// ── 拖拽重排（P9）：落点判定 / 合法投放格由 CanvasSurface 表面层完成；此处只接收语义事件并提交 schema ──
function onCanvasNodeDragStart(id: string): void {
  // 拖拽起点：同步选中态（落点逻辑在表面上处理）。
  selectedNodeId.value = id;
}

function onDropNode(detail: {
  moveId: string;
  cellId: string;
  index: number;
}): void {
  const next = moveNodeToIndexV2(schema.value, detail.moveId, detail.cellId, detail.index);
  if (next === schema.value) return; // 原位 / 非法：不产生新结构
  commit(next, "move:" + detail.moveId);
  selectedNodeId.value = detail.moveId;
}

function onDropPalette(detail: {
  kind: "text" | "field" | "table" | "html" | "image" | "grid";
  cellId: string;
}): void {
  const slot = nodeIndex.value.get(detail.cellId)?.node;
  if (
    !slot ||
    (slot.type !== "grid-cell" && slot.type !== "table-cell-template")
  )
    return;
  const child = createNodeByKind(detail.kind);
  commit(appendNodeToCellV2(schema.value, detail.cellId, child));
  selectedNodeId.value = child.id;
}

function selectNode(event: MouseEvent): void {
  if (!editable.value) return;
  const target = event.target as HTMLElement;
  selectedInsertionSlotId.value =
    target.closest<HTMLElement>(`[${LAYOUT_ID_ATTR}]`)?.dataset.layoutId ?? null;
  const ids: string[] = [];
  let cursor = target.closest<HTMLElement>(`[${NODE_ID_ATTR}]`);
  while (cursor) {
    const id = cursor.dataset.nodeId;
    if (id) ids.push(id);
    cursor =
      cursor.parentElement?.closest<HTMLElement>(`[${NODE_ID_ATTR}]`) ?? null;
  }
  const selectableIds = ids.filter((id) => {
    return isStyleEditableNodeId(id);
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

function selectIssue(issue: SchemaIssueV2): void {
  const index = nodeIndex.value;
  // Walk from the issue node up through the index, keeping only selectable
  // nodes (innermost first) so Row/Cell/Template never become active.
  const selectableIds: string[] = [];
  let cursor = issue.nodeId ? index.get(issue.nodeId)?.node : undefined;
  while (cursor) {
    if (isSelectableSchemaNodeV2(cursor)) selectableIds.push(cursor.id);
    cursor = index.get(cursor.id)?.parent ?? undefined;
  }
  // Schema-level issues without a nodeId fall back to the first Page.
  if (selectableIds.length === 0) {
    const pageId = schema.value.pages[0]?.id;
    if (!pageId) return;
    selectableIds.push(pageId);
  }
  selectedNodeId.value = selectableIds[0];
  selectedInsertionSlotId.value = null;
  selectionPathIds.value = selectableIds;
  selectionPathIndex.value = 0;
  selectionDepth = 0;
  lastClickedLeafId = selectableIds[0];
}

function selectNodeById(id: string): void {
  if (!editable.value) return;
  const ref = nodeIndex.value.get(id);
  if (!ref || !isSelectableSchemaNodeV2(ref.node)) return;
  selectedNodeId.value = id;
  selectedInsertionSlotId.value = null;
  const ancestors: string[] = [];
  let cursor = ref.parent;
  while (cursor) {
    if (isSelectableSchemaNodeV2(cursor)) ancestors.unshift(cursor.id);
    cursor = nodeIndex.value.get(cursor.id)?.parent ?? null;
  }
  selectionPathIds.value = [...ancestors, id];
  selectionPathIndex.value = selectionPathIds.value.length - 1;
  selectionDepth = selectionPathIds.value.length - 1;
  lastClickedLeafId = id;
}

function updateSelectedNode(
  updater: (node: EditorNodeV2) => EditorNodeV2,
  tag?: string,
): void {
  if (!selectedNodeId.value) return;
  commit(updateSchemaNodeV2(schema.value, selectedNodeId.value, updater), tag);
}

function updateSelectedText(event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value;
  updateSelectedNode(
    (node) => (node.type === "text" ? { ...node, text: value } : node),
    selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedField(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedNode(
    (node) =>
      node.type === "p" && node.mode === "field"
        ? { ...node, field: value }
        : node,
    selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedPrefix(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedNode(
    (node) =>
      node.type === "p" && node.mode === "field"
        ? { ...node, prefix: value || undefined }
        : node,
    selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedSuffix(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedNode(
    (node) =>
      node.type === "p" && node.mode === "field"
        ? { ...node, suffix: value || undefined }
        : node,
    selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedWidth(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedNode(
    (node) =>
      node.type === "p" && node.mode === "field"
        ? { ...node, width: value.trim() || undefined }
        : node,
    selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedDefault(event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value;
  updateSelectedNode(
    (node) =>
      node.type === "p" && node.mode === "field"
        ? { ...node, default: value || undefined }
        : node,
    selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedInnerBorder(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  updateSelectedNode(
    (node) =>
      node.type === "p" && node.mode === "field"
        ? { ...node, innerBorder: checked || undefined }
        : node,
    selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
  );
}

function updateGridBorder(event: Event): void {
  if (selectedNode.value?.type !== "grid") return;
  commit(
    updateGridBorderV2(
      schema.value,
      selectedNode.value.id,
      (event.target as HTMLSelectElement).value as BorderModeV2,
    ),
  );
}

function updateTableBorder(event: Event): void {
  if (selectedNode.value?.type !== "table") return;
  commit(
    updateTableBorderV2(
      schema.value,
      selectedNode.value.id,
      (event.target as HTMLSelectElement).value as BorderModeV2,
    ),
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
  commit(
    resizeGridV2(schema.value, selectedNode.value.id, rowCount, columnCount),
  );
}

function updateTableRows(event: Event): void {
  if (selectedNode.value?.type !== "table") return;
  commit(
    updateTableMinRowsV2(
      schema.value,
      selectedNode.value.id,
      Number((event.target as HTMLInputElement).value),
    ),
  );
}

function addTableColumn(): void {
  if (selectedNode.value?.type !== "table") return;
  commit(addTableColumnV2(schema.value, selectedNode.value.id));
}

function removeTableColumn(columnKey: string): void {
  if (selectedNode.value?.type !== "table") return;
  commit(removeTableColumnV2(schema.value, selectedNode.value.id, columnKey));
}

function renameTableColumnKey(oldKey: string, event: Event): void {
  if (selectedNode.value?.type !== "table") return;
  const newKey = (event.target as HTMLInputElement).value.trim();
  if (!newKey || newKey === oldKey) return;
  commit(
    renameTableColumnKeyV2(schema.value, selectedNode.value.id, oldKey, newKey),
  );
}

function updateTableColumn(
  columnKey: string,
  field: "title" | "width" | "align",
  event: Event,
): void {
  if (selectedNode.value?.type !== "table") return;
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  const patch: Partial<TableColumnV2> =
    field === "width"
      ? { width: parseColumnWidth(target.value) }
      : ({ [field]: target.value || undefined } as Partial<TableColumnV2>);
  commit(
    updateTableColumnV2(schema.value, selectedNode.value.id, columnKey, patch),
    `tblcol:${columnKey}:${field}`,
  );
}

function parseColumnWidth(raw: string): GridTrackV2 {
  const value = raw.trim().toLowerCase();
  if (value === "auto") return "auto";
  if (/^\d+(\.\d+)?fr$/.test(value)) return value as `${number}fr`;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 24;
}

function updateGridColumnWidth(columnIndex: number, event: Event): void {
  if (selectedNode.value?.type !== "grid") return;
  commit(
    setGridColumnWidthV2(
      schema.value,
      selectedNode.value.id,
      columnIndex,
      parseColumnWidth((event.target as HTMLInputElement).value),
    ),
    `col:${selectedNode.value.id}:${columnIndex}`,
  );
}

// ── 单元格（grid-cell）样式：仅覆盖，可清除回归 Grid 默认 ──
function updateSelectedCellPadding(event: Event): void {
  const value = Math.max(
    0,
    Number((event.target as HTMLInputElement).value) || 0,
  );
  updateSelectedNode(
    (node) => (node.type === "grid-cell" ? { ...node, padding: value } : node),
    selectedNodeId.value ? `cellpad:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedCellAlign(event: Event): void {
  const raw = (event.target as HTMLSelectElement).value;
  updateSelectedNode(
    (node) =>
      node.type === "grid-cell"
        ? { ...node, align: (raw || undefined) as GridCellV2["align"] }
        : node,
    selectedNodeId.value ? `cellalign:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedCellVerticalAlign(event: Event): void {
  const raw = (event.target as HTMLSelectElement).value;
  updateSelectedNode(
    (node) =>
      node.type === "grid-cell"
        ? {
            ...node,
            verticalAlign: (raw || undefined) as GridCellV2["verticalAlign"],
          }
        : node,
    selectedNodeId.value ? `cellvalign:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedCellRowHeight(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  const value = raw === "" ? undefined : Math.max(0, Math.floor(Number(raw)));
  updateSelectedNode(
    (node) =>
      node.type === "grid-cell" ? { ...node, rowHeight: value } : node,
    selectedNodeId.value ? `cellrowh:${selectedNodeId.value}` : undefined,
  );
}

function clearCellOverride(): void {
  updateSelectedNode(
    (node) =>
      node.type === "grid-cell"
        ? {
            ...node,
            padding: undefined,
            align: undefined,
            verticalAlign: undefined,
            rowHeight: undefined,
          }
        : node,
    selectedNodeId.value ? `cellclear:${selectedNodeId.value}` : undefined,
  );
}

// ── Grid 级单元格默认（padding / 对齐） ──
function updateGridCellDefault(
  field: "cellPadding" | "cellAlign" | "cellVerticalAlign",
  event: Event,
): void {
  if (selectedNode.value?.type !== "grid") return;
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  const raw = target.value;
  const patch =
    field === "cellPadding"
      ? { cellPadding: raw === "" ? undefined : Math.max(0, Number(raw) || 0) }
      : ({ [field]: raw === "" ? undefined : raw } as Partial<
          Pick<GridNodeV2, "cellAlign" | "cellVerticalAlign">
        >);
  commit(
    updateGridCellDefaultsV2(schema.value, selectedNode.value.id, patch),
    `gridcell:${field}`,
  );
}

/** 设置 Grid 单元格间距（mm，等价于 CSS gap，同时作用于行与列）。 */
function updateGridGap(event: Event): void {
  if (selectedNode.value?.type !== "grid") return;
  const raw = (event.target as HTMLInputElement).value;
  const gap = raw === "" ? undefined : Math.max(0, Number(raw) || 0);
  commit(updateGridGapV2(schema.value, selectedNode.value.id, gap), "gridgap");
}

/** 统一设置 text / p 节点的文本样式字段（字号/粗细/颜色/对齐/字体等）。 */
function updateSelectedTextStyle(patch: Partial<TextStyleV2>): void {
  updateSelectedNode(
    (node) =>
      node.type === "p" || node.type === "text"
        ? { ...node, style: { ...node.style, ...patch } }
        : node,
    selectedNodeId.value ? `style:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedFontSize(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  const value = Math.max(1, Math.floor(Number(raw) || 1));
  updateSelectedTextStyle({ fontSize: value });
}

function updateSelectedLineHeight(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  const value = Number(raw);
  updateSelectedTextStyle({
    lineHeight: Number.isFinite(value) && value > 0 ? value : undefined,
  });
}

function updateSelectedFontWeight(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  updateSelectedTextStyle({
    fontWeight: (value || undefined) as "normal" | "bold" | undefined,
  });
}

function updateSelectedColor(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedTextStyle({ color: value || undefined });
}

function updateSelectedFontFamily(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedTextStyle({ fontFamily: value || undefined });
}

function updateSelectedAlign(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  updateSelectedTextStyle({
    align: (value || undefined) as "left" | "center" | "right" | undefined,
  });
}

function updateSelectedVerticalAlign(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  updateSelectedTextStyle({
    verticalAlign: (value || undefined) as
      | "top"
      | "middle"
      | "bottom"
      | undefined,
  });
}

function updateSelectedHtml(event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value;
  updateSelectedNode(
    (node) => (node.type === "html" ? { ...node, html: value } : node),
    selectedNodeId.value ? `html:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedCss(event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value;
  updateSelectedNode(
    (node) =>
      node.type === "html" ? { ...node, css: value || undefined } : node,
    selectedNodeId.value ? `css:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedImageSrc(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedNode(
    (node) =>
      node.type === "image" ? { ...node, src: value || undefined } : node,
    selectedNodeId.value ? `imgsrc:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedImageField(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  updateSelectedNode(
    (node) =>
      node.type === "image" ? { ...node, field: value || undefined } : node,
    selectedNodeId.value ? `imgfield:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedImageSize(
  dimension: "width" | "height",
  event: Event,
): void {
  const value = Number((event.target as HTMLInputElement).value);
  updateSelectedNode(
    (node) =>
      node.type === "image"
        ? {
            ...node,
            [dimension]:
              Number.isFinite(value) && value > 0 ? value : undefined,
          }
        : node,
    selectedNodeId.value ? `imgsize:${selectedNodeId.value}` : undefined,
  );
}

function updateSelectedImageFit(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as
    | "contain"
    | "cover"
    | "fill";
  updateSelectedNode(
    (node) => (node.type === "image" ? { ...node, objectFit: value } : node),
    selectedNodeId.value ? `imgfit:${selectedNodeId.value}` : undefined,
  );
}

// ── Toolbar: 基础行高 / 纸张设置 ──────────────────────────────

function updateBaseRowHeight(event: Event): void {
  const value = Math.max(
    1,
    Math.floor(Number((event.target as HTMLInputElement).value) || 8),
  );
  commit(updateBaseRowHeightV2(schema.value, value));
}

function updatePaperSize(event: Event): void {
  const size = (event.target as HTMLSelectElement)
    .value as FormSchemaV2["paper"]["size"];
  // 方向由纸张尺寸派生（去掉方向选择）：A4 → 纵向，A3 → 横向。
  const orientation = size === "A3" ? "landscape" : "portrait";
  commit(updatePaperConfigV2(schema.value, { size, orientation }));
}

/** 纸张边距（mm）：统一作用于四边，展示为单一数值（取首页 top）。 */
const paperMargin = computed<number>(
  () => schema.value.pages[0]?.margin.top ?? 10,
);

/** 设置纸张边距（mm）：统一写入所有页的上下左右。 */
function updatePaperMargin(event: Event): void {
  const raw = Number((event.target as HTMLInputElement).value);
  const value = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  commit({
    ...schema.value,
    pages: schema.value.pages.map((page) => ({
      ...page,
      margin: { top: value, right: value, bottom: value, left: value },
    })),
  });
}

// ── Field P: action 属性（外部组件触发） ───────────────────────

function updateSelectedAction(event: Event): void {
  const value = (event.target as HTMLSelectElement)
    .value as FieldPNodeV2["action"];
  updateSelectedNode(
    (node) =>
      node.type === "p" && node.mode === "field"
        ? { ...node, action: value || undefined }
        : node,
    selectedNodeId.value ? `action:${selectedNodeId.value}` : undefined,
  );
}

/** 图形安措（action=safetyGraphic）的「安措匹配字段」：写入 actionParams.matchField；
 *  清空时移除该键，actionParams 为空则置 undefined（避免残留空对象）。 */
function updateSelectedSafetyField(event: Event): void {
  const raw = (event.target as HTMLInputElement).value.trim();
  updateSelectedNode(
    (node) => {
      if (node.type !== "p" || node.mode !== "field") return node;
      const params: Record<string, string> = { ...(node.actionParams ?? {}) };
      if (raw) params.matchField = raw;
      else delete params.matchField;
      return {
        ...node,
        actionParams: Object.keys(params).length ? params : undefined,
      };
    },
    selectedNodeId.value ? `actionParams:${selectedNodeId.value}` : undefined,
  );
}
</script>

<template>
  <div class="v2-designer">
    <header class="v2-toolbar">
      <div class="v2-toolbar__title">固定版式表单设计器 V2</div>
      <div class="v2-toolbar__meta">
        <label class="v2-toolbar__control">
          <span>纸张</span>
          <select :value="schema.paper.size" @change="updatePaperSize">
            <option value="A4">A4（纵向）</option>
            <option value="A3">A3（横向）</option>
          </select>
        </label>
        <label class="v2-toolbar__control">
          <span>纸张边距(mm)</span>
          <input
            type="number"
            min="0"
            max="99"
            step="1"
            :value="paperMargin"
            @change="updatePaperMargin"
          />
        </label>
        <label class="v2-toolbar__control">
          <span>行高(mm)</span>
          <input
            type="number"
            min="1"
            max="99"
            step="1"
            :value="schema.baseRowHeight"
            @change="updateBaseRowHeight"
          />
        </label>
      </div>
      <span
        class="v2-toolbar__dirty"
        :class="{ 'v2-toolbar__dirty--on': dirty }"
        >{{ dirty ? "● 未保存" : "已保存" }}</span
      >
      <div class="v2-toolbar__group">
        <button class="v2-toolbar__button" type="button" @click="resetBlank">
          新建空白
        </button>
        <button
          v-for="sample in samples"
          :key="sample.id"
          class="v2-toolbar__button"
          type="button"
          @click="loadSample(sample)"
        >
          载入{{ sample.label }}
        </button>
      </div>
      <div class="v2-toolbar__group">
        <button
          class="v2-toolbar__button"
          type="button"
          :disabled="!canUndo"
          @click="undo"
        >
          撤销
        </button>
        <button
          class="v2-toolbar__button"
          type="button"
          :disabled="!canRedo"
          @click="redo"
        >
          重做
        </button>
      </div>
      <div class="v2-toolbar__group">
        <span class="v2-toolbar__label">模板</span>
        <button class="v2-toolbar__button" type="button" @click="saveToLocal">
          保存
        </button>
        <button class="v2-toolbar__button" type="button" @click="loadFromLocal">
          读取
        </button>
        <button class="v2-toolbar__button" type="button" @click="exportFile">
          导出文件
        </button>
        <button class="v2-toolbar__button" type="button" @click="triggerImport">
          导入文件
        </button>
      </div>
      <div class="v2-toolbar__group">
        <span class="v2-toolbar__label">填充数据</span>
        <button
          class="v2-toolbar__button"
          type="button"
          title="选择填写数据 JSON 文件并进入预览态"
          @click="triggerImportFillData"
        >
          导入数据
        </button>
        <button
          class="v2-toolbar__button"
          type="button"
          title="需先进入预览态填写，再导出当前填写值"
          :disabled="!previewMode"
          @click="exportFillDataFile"
        >
          导出数据
        </button>
        <button
          class="v2-toolbar__button"
          type="button"
          title="读取本地已保存的填写数据并进入预览态"
          @click="loadFillDataFromLocal"
        >
          读取数据
        </button>
        <button
          class="v2-toolbar__button"
          type="button"
          title="需先进入预览态填写，再保存到本地"
          :disabled="!previewMode"
          @click="saveFillDataToLocal"
        >
          保存数据
        </button>
      </div>
      <div class="v2-toolbar__group">
        <button
          class="v2-toolbar__button"
          type="button"
          data-view-mode="preview"
          :class="{ 'v2-toolbar__button--active': viewMode === 'preview' }"
          @click="toggleViewMode('preview')"
        >
          {{ viewMode === "preview" ? "退出预览" : "预览" }}
        </button>
        <button class="v2-toolbar__button" type="button" @click="printDocument">
          打印
        </button>
        <label class="v2-toolbar__control v2-toolbar__control--toggle">
          <input v-model="paginate" type="checkbox" data-paginate="true" />
          <span>分页</span>
        </label>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="v2-toolbar__file"
        @change="importFile"
      />
      <input
        ref="fillDataFileInput"
        type="file"
        accept=".json,application/json"
        class="v2-toolbar__file"
        @change="importFillDataFile"
      />
    </header>

    <div class="v2-designer__body">
      <aside class="v2-sidebar v2-sidebar--left">
        <div class="v2-sidebar__heading">模板</div>

        <div class="v2-sidebar__group-title">基础组件</div>
        <button
          class="v2-palette-item v2-palette-item--button"
          type="button"
          draggable="true"
          data-palette="text"
          :disabled="!editable"
          @dragstart="startPaletteDrag('text', $event)"
          @click="addNodeToSelectedCell('text')"
        >
          文本 Text
        </button>
        <button
          class="v2-palette-item v2-palette-item--button"
          type="button"
          draggable="true"
          data-palette="field"
          :disabled="!editable"
          @dragstart="startPaletteDrag('field', $event)"
          @click="addNodeToSelectedCell('field')"
        >
          字段 Field
        </button>
        <button
          class="v2-palette-item v2-palette-item--button"
          type="button"
          draggable="true"
          data-palette="image"
          :disabled="!editable"
          @dragstart="startPaletteDrag('image', $event)"
          @click="addNodeToSelectedCell('image')"
        >
          图片 Image
        </button>
        <button
          class="v2-palette-item v2-palette-item--button"
          type="button"
          draggable="true"
          data-palette="html"
          :disabled="!editable"
          @dragstart="startPaletteDrag('html', $event)"
          @click="addNodeToSelectedCell('html')"
        >
          HTML 模块
        </button>

        <div class="v2-sidebar__group-title">布局组件</div>
        <button
          class="v2-palette-item v2-palette-item--button"
          type="button"
          draggable="true"
          data-palette="grid"
          :disabled="!editable"
          @dragstart="startPaletteDrag('grid', $event)"
          @click="addGrid"
        >
          添加 Grid
        </button>
        <button
          class="v2-palette-item v2-palette-item--button"
          type="button"
          draggable="true"
          data-palette="table"
          :disabled="!editable"
          @dragstart="startPaletteDrag('table', $event)"
          @click="addNodeToSelectedCell('table')"
        >
          明细 Table
        </button>

        <p class="v2-sidebar__hint">
          1.点击插入到选中格，或拖动模板到任意格子；<br />
          2.选中组件后可在右侧面板配置并删除。<br />
          3.预览/填充态为只读展示，不可添加或改动结构。
        </p>

        <div class="v2-sidebar__heading v2-sidebar__heading--tree">结构</div>
        <div class="v2-tree">
          <NodeTreeItem
            v-for="root in nodeTree"
            :key="root.id"
            :node="root"
            :selected-id="selectedNodeId"
            :depth="0"
            @select="selectNodeById"
          />
        </div>
      </aside>

      <main
        ref="canvasEl"
        class="v2-canvas"
        :class="{ 'v2-canvas--preview': previewMode }"
        @click="selectNode"
      >
        <PaperViewport :fit-on-mount="false">
          <CanvasSurface
            :schema="schema"
            :mode="previewMode ? 'preview' : 'design'"
            :selected-node-id="previewMode ? null : selectedNodeId"
            :data="previewData"
            :readonly="false"
            :bare="true"
            :paginate="previewMode || paginate"
            @node-drag-start="onCanvasNodeDragStart"
            @drop-node="onDropNode"
            @drop-palette="onDropPalette"
          />
        </PaperViewport>
      </main>

      <aside v-if="editable" class="v2-sidebar v2-sidebar--right">
        <div class="v2-sidebar__heading">节点检查</div>
        <div class="v2-inspector-row v2-inspector-row--head">
          <span>当前节点</span>
          <code>{{ selectedNodeId ?? "未选择" }}</code>
          <button
            class="v2-inspector__delete"
            type="button"
            :disabled="
              !selectedNodeId ||
              selectedNode?.type === 'page' ||
              selectedNode?.type === 'grid-cell'
            "
            @click="removeSelectedNode"
          >
            删除
          </button>
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
        <template
          v-if="
            selectedNode &&
            selectedNode.type !== 'page' &&
            selectedNode.type !== 'grid-cell'
          "
        >
          <div class="v2-sidebar__subheading">位置（拖拽重排）</div>
          <div class="v2-inspector-row v2-inspector-row--hint">
            在设计画布中拖拽节点即可重排：同格内拖动调整顺序；拖到其它格 / 嵌套
            Grid 即跨格移动。整段可编辑字段请按住 Alt 再拖拽。
          </div>
        </template>
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
          <div class="v2-sidebar__subheading">列宽（mm / fr / auto）</div>
          <div class="v2-grid-dimensions">
            <label
              v-for="(cell, columnIndex) in selectedNode.rows[0].cells"
              :key="columnIndex"
              class="v2-control v2-control--inline"
            >
              <span>第 {{ columnIndex + 1 }} 列</span>
              <input
                :value="selectedNode.columns?.[columnIndex] ?? cell.width ?? 24"
                @change="updateGridColumnWidth(columnIndex, $event)"
              />
            </label>
          </div>
          <div class="v2-sidebar__subheading">单元格默认（padding / 对齐）</div>
          <div class="v2-grid-dimensions">
            <label class="v2-control v2-control--inline">
              <span>单元格间距(mm)</span>
              <input
                type="number"
                min="0"
                step="1"
                data-grid="gap"
                :value="selectedNode.gap ?? ''"
                @change="updateGridGap"
              />
            </label>
            <label class="v2-control v2-control--inline">
              <span>默认内边距(mm)</span>
              <input
                type="number"
                min="0"
                step="1"
                data-cell-default="padding"
                :value="selectedNode.cellPadding ?? ''"
                @change="updateGridCellDefault('cellPadding', $event)"
              />
            </label>
            <label class="v2-control v2-control--inline">
              <span>默认水平对齐</span>
              <select
                data-cell-default="align"
                :value="selectedNode.cellAlign ?? ''"
                @change="updateGridCellDefault('cellAlign', $event)"
              >
                <option value="">左（默认）</option>
                <option value="left">左</option>
                <option value="center">居中</option>
                <option value="right">右</option>
              </select>
            </label>
            <label class="v2-control v2-control--inline v2-control--full">
              <span>默认垂直对齐</span>
              <select
                data-cell-default="valign"
                :value="selectedNode.cellVerticalAlign ?? ''"
                @change="updateGridCellDefault('cellVerticalAlign', $event)"
              >
                <option value="">居中（默认）</option>
                <option value="top">顶部</option>
                <option value="middle">居中</option>
                <option value="bottom">底部</option>
              </select>
            </label>
          </div>
        </template>
        <template v-else-if="selectedNode?.type === 'text'">
          <label class="v2-control v2-control--full">
            <span>文本内容</span>
            <textarea
              class="v2-textarea"
              rows="3"
              :value="selectedNode.text"
              @input="updateSelectedText"
            ></textarea>
          </label>
          <div class="v2-sidebar__subheading">文本样式</div>
          <div class="v2-style-grid">
            <label class="v2-control v2-control--inline">
              <span>字号(px)</span>
              <input
                type="number"
                min="1"
                step="1"
                :value="selectedNode.style?.fontSize ?? ''"
                @change="updateSelectedFontSize"
              />
            </label>
            <label class="v2-control v2-control--inline">
              <span>行高</span>
              <input
                type="number"
                min="0"
                step="0.1"
                :value="selectedNode.style?.lineHeight ?? ''"
                @change="updateSelectedLineHeight"
              />
            </label>
            <label class="v2-control v2-control--inline">
              <span>粗细</span>
              <select
                :value="selectedNode.style?.fontWeight ?? 'normal'"
                @change="updateSelectedFontWeight"
              >
                <option value="normal">常规</option>
                <option value="bold">加粗</option>
              </select>
            </label>
            <label class="v2-control v2-control--inline">
              <span>颜色</span>
              <input
                type="color"
                :value="selectedNode.style?.color ?? '#111827'"
                @input="updateSelectedColor"
              />
            </label>
          </div>
          <div class="v2-grid-dimensions">
            <label class="v2-control">
              <span>水平对齐</span>
              <select
                :value="selectedNode.style?.align ?? 'left'"
                @change="updateSelectedAlign"
              >
                <option value="left">左</option>
                <option value="center">居中</option>
                <option value="right">右</option>
              </select>
            </label>
            <label class="v2-control">
              <span>垂直对齐</span>
              <select
                :value="selectedNode.style?.verticalAlign ?? 'middle'"
                @change="updateSelectedVerticalAlign"
              >
                <option value="top">顶部</option>
                <option value="middle">居中</option>
                <option value="bottom">底部</option>
              </select>
            </label>
            <label class="v2-control v2-control--full">
              <span>字体</span>
              <input
                :value="selectedNode.style?.fontFamily ?? ''"
                @input="updateSelectedFontFamily"
              />
            </label>
          </div>
        </template>

        <template v-else-if="selectedNode?.type === 'p'">
          <label class="v2-control">
            <span>字段名</span>
            <input :value="selectedNode.field" @input="updateSelectedField" />
          </label>
          <div class="v2-grid-dimensions">
            <label class="v2-control">
              <span>前标签（可选）</span>
              <input
                :value="selectedNode.prefix ?? ''"
                @input="updateSelectedPrefix"
              />
            </label>
            <label class="v2-control">
              <span>后标签（可选）</span>
              <input
                :value="selectedNode.suffix ?? ''"
                @input="updateSelectedSuffix"
              />
            </label>
          </div>
          <label class="v2-control">
            <span>外部组件（action）</span>
            <select
              :value="selectedNode.action ?? 'text'"
              @change="updateSelectedAction"
            >
              <option value="text">无（纯文本输入）</option>
              <option value="date">日期选择器</option>
              <option value="signature">签名板</option>
              <option value="upload">文件上传</option>
              <option value="safetyGraphic">图形安措</option>
            </select>
          </label>
          <label
            v-if="selectedNode.action === 'safetyGraphic'"
            class="v2-control"
          >
            <span>安措匹配字段</span>
            <input
              type="text"
              :value="selectedNode.actionParams?.matchField ?? ''"
              @change="updateSelectedSafetyField"
            />
          </label>
          <div class="v2-sidebar__subheading">文本样式</div>
          <div class="v2-style-grid">
            <label class="v2-control v2-control--inline">
              <span>字号(px)</span>
              <input
                type="number"
                min="1"
                step="1"
                :value="selectedNode.style?.fontSize ?? ''"
                @change="updateSelectedFontSize"
              />
            </label>
            <label class="v2-control v2-control--inline">
              <span>行高</span>
              <input
                type="number"
                min="0"
                step="0.1"
                :value="selectedNode.style?.lineHeight ?? ''"
                @change="updateSelectedLineHeight"
              />
            </label>
            <label class="v2-control v2-control--inline">
              <span>粗细</span>
              <select
                :value="selectedNode.style?.fontWeight ?? 'normal'"
                @change="updateSelectedFontWeight"
              >
                <option value="normal">常规</option>
                <option value="bold">加粗</option>
              </select>
            </label>
            <label class="v2-control v2-control--inline">
              <span>颜色</span>
              <input
                type="color"
                :value="selectedNode.style?.color ?? '#111827'"
                @input="updateSelectedColor"
              />
            </label>
          </div>
          <div class="v2-grid-dimensions">
            <label class="v2-control">
              <span>水平对齐</span>
              <select
                :value="selectedNode.style?.align ?? 'left'"
                @change="updateSelectedAlign"
              >
                <option value="left">左</option>
                <option value="center">居中</option>
                <option value="right">右</option>
              </select>
            </label>
            <label class="v2-control">
              <span>垂直对齐</span>
              <select
                :value="selectedNode.style?.verticalAlign ?? 'middle'"
                @change="updateSelectedVerticalAlign"
              >
                <option value="top">顶部</option>
                <option value="middle">居中</option>
                <option value="bottom">底部</option>
              </select>
            </label>
            <label class="v2-control v2-control--full">
              <span>字体</span>
              <input
                :value="selectedNode.style?.fontFamily ?? ''"
                @input="updateSelectedFontFamily"
              />
            </label>
          </div>
          <label class="v2-control v2-control--full">
            <span>默认内容</span>
            <textarea
              class="v2-textarea"
              rows="3"
              data-field-default="true"
              :value="selectedNode.default ?? ''"
              @input="updateSelectedDefault"
            ></textarea>
          </label>
          <div class="v2-grid-dimensions">
            <label class="v2-control">
              <span>输入区宽度（mm / 1px / %）</span>
              <input
                data-field-width="true"
                :value="selectedNode.width ?? ''"
                @input="updateSelectedWidth"
              />
            </label>
            <label class="v2-control">
              <span>内部边框</span>
              <input
                type="checkbox"
                data-field-inner-border="true"
                :checked="selectedNode.innerBorder ?? false"
                @change="updateSelectedInnerBorder"
              />
            </label>
          </div>
        </template>
        <template v-else-if="selectedNode?.type === 'grid-cell'">
          <p class="v2-sidebar__hint">
            单元格仅可设置内边距与对齐；删除已禁用，请删除所在 Grid
            或先清空内容。
          </p>
          <div class="v2-sidebar__subheading">合并 / 拆分</div>
          <div class="v2-toolbar v2-toolbar--row">
            <button
              class="v2-toolbar__button"
              type="button"
              data-cell-merge="true"
              :disabled="!selectedCellContext?.hasNextSibling"
              @click="mergeSelectedCellRight"
            >
              合并右侧相邻格
            </button>
            <button
              class="v2-toolbar__button"
              type="button"
              data-cell-split="true"
              :disabled="!selectedCellContext?.canSplit"
              @click="splitSelectedCell"
            >
              拆分此格（colspan {{ selectedNode.colspan ?? 1 }}）
            </button>
          </div>
          <div class="v2-grid-dimensions">
            <label class="v2-control">
              <span>内边距(padding, mm)</span>
              <input
                type="number"
                min="0"
                step="1"
                data-cell-padding="true"
                :value="selectedNode.padding ?? ''"
                @change="updateSelectedCellPadding"
              />
            </label>
            <label class="v2-control">
              <span>行高倍数</span>
              <input
                type="number"
                min="0"
                step="1"
                :value="selectedNode.rowHeight ?? ''"
                @change="updateSelectedCellRowHeight"
              />
            </label>
            <label class="v2-control">
              <span
                >水平对齐{{
                  selectedCellBox ? `（生效：${selectedCellBox.align}）` : ""
                }}</span
              >
              <select
                :value="selectedNode.align ?? ''"
                @change="updateSelectedCellAlign"
              >
                <option value="">默认（继承 Grid）</option>
                <option value="left">左</option>
                <option value="center">居中</option>
                <option value="right">右</option>
              </select>
            </label>
            <label class="v2-control">
              <span
                >垂直对齐{{
                  selectedCellBox
                    ? `（生效：${selectedCellBox.verticalAlign}）`
                    : ""
                }}</span
              >
              <select
                :value="selectedNode.verticalAlign ?? ''"
                @change="updateSelectedCellVerticalAlign"
              >
                <option value="">默认（继承 Grid）</option>
                <option value="top">顶部</option>
                <option value="middle">居中</option>
                <option value="bottom">底部</option>
              </select>
            </label>
          </div>
          <button
            class="v2-toolbar__button"
            type="button"
            :disabled="
              !selectedNode.padding &&
              !selectedNode.align &&
              !selectedNode.verticalAlign &&
              !selectedNode.rowHeight
            "
            @click="clearCellOverride"
          >
            清除覆盖（恢复 Grid 默认）
          </button>
        </template>
        <template v-else-if="selectedNode?.type === 'html'">
          <label class="v2-control v2-control--full">
            <span>HTML 片段（不含脚本）</span>
            <textarea
              class="v2-textarea"
              rows="6"
              :value="selectedNode.html"
              @input="updateSelectedHtml"
            ></textarea>
          </label>
          <label class="v2-control v2-control--full">
            <span>CSS（仅 Shadow DOM 内生效）</span>
            <textarea
              class="v2-textarea"
              rows="4"
              :value="selectedNode.css ?? ''"
              @input="updateSelectedCss"
            ></textarea>
          </label>
          <p class="v2-sidebar__hint" v-pre>
            支持
            {{ 字段 }}
            占位符，渲染时由引擎原地填充；样式仅在模块内部生效，不污染整张表单。
          </p>
        </template>
        <template v-else-if="selectedNode?.type === 'image'">
          <div class="v2-grid-dimensions">
            <label class="v2-control">
              <span>图片地址 / Base64</span>
              <input
                :value="selectedNode.src ?? ''"
                @input="updateSelectedImageSrc"
              />
            </label>
            <label class="v2-control">
              <span>数据字段（可选，填充态覆盖 src）</span>
              <input
                :value="selectedNode.field ?? ''"
                @input="updateSelectedImageField"
              />
            </label>
          </div>
          <div class="v2-grid-dimensions">
            <label class="v2-control">
              <span>宽(mm)</span>
              <input
                type="number"
                min="0"
                :value="selectedNode.width ?? ''"
                @change="updateSelectedImageSize('width', $event)"
              />
            </label>
            <label class="v2-control">
              <span>高(mm)</span>
              <input
                type="number"
                min="0"
                :value="selectedNode.height ?? ''"
                @change="updateSelectedImageSize('height', $event)"
              />
            </label>
          </div>
          <label class="v2-control">
            <span>填充方式</span>
            <select
              :value="selectedNode.objectFit ?? 'contain'"
              @change="updateSelectedImageFit"
            >
              <option value="contain">contain</option>
              <option value="cover">cover</option>
              <option value="fill">fill</option>
            </select>
          </label>
        </template>
        <template v-else-if="selectedNode?.type === 'table'">
          <div class="v2-grid-dimensions">
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
            <label class="v2-control">
              <span>边框</span>
              <select
                :value="selectedNode.border ?? 'all'"
                @change="updateTableBorder"
              >
                <option value="all">外框 + 内部</option>
                <option value="outer">仅外框</option>
                <option value="inner">仅内部</option>
                <option value="none">无边框</option>
              </select>
            </label>
          </div>
          <div class="v2-sidebar__subheading">列配置</div>
          <div class="v2-col-table">
            <!-- 表头 -->
            <div class="v2-col-table__row v2-col-table__head">
              <span class="v2-col-table__th">标题</span>
              <span class="v2-col-table__th">字段</span>
              <span class="v2-col-table__th v2-col-table__th--action"></span>
            </div>
            <!-- 各列行 -->
            <div
              v-for="column in selectedNode.columns"
              :key="column.key"
              class="v2-col-table__row"
            >
              <input
                class="v2-col-table__input"
                :value="column.title"
                placeholder="列标题"
                @input="updateTableColumn(column.key, 'title', $event)"
              />
              <input
                class="v2-col-table__input v2-col-table__input--mono"
                :value="column.key"
                placeholder="字段名"
                @input="renameTableColumnKey(column.key, $event)"
              />
              <button
                class="v2-inspector__delete v2-inspector__delete--small"
                type="button"
                :disabled="selectedNode.columns.length <= 1"
                :title="`删除列 ${column.key}`"
                @click="removeTableColumn(column.key)"
              >
                ✕
              </button>
            </div>
          </div>
          <p class="v2-hint">
            表格内字段由列配置自动生成，格式为「列key_行号」（1-based）：列
            <code>工作地点</code> 第 2 行绑定为 <code>工作地点_2</code>。表格内
            字段不可单独选中或配置，增删列即增删对应字段。
          </p>
          <button
            class="v2-toolbar__button v2-add-col"
            type="button"
            @click="addTableColumn"
          >
            + 添加列
          </button>
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
            class="v2-issue v2-issue--selectable"
            @click="selectIssue(issue)"
          >
            {{ issue.code }}：{{ issue.message }}
          </div>
        </div>
      </aside>
    </div>

    <StatusBar
      :page-count="schema.pages.length"
      :warning-count="warningCount"
      :physical-page-count="pagination.pages.length"
      :paginate-warning-count="pagination.warnings.length"
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
  display: flex;
  align-items: center;
  gap: 10px;
  color: #a9b5c7;
  font-size: 12px;
}

.v2-toolbar__control {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #a9b5c7;
  font-size: 11px;
}

.v2-toolbar__control span {
  white-space: nowrap;
}

.v2-toolbar__control select,
.v2-toolbar__control input {
  height: 24px;
  padding: 0 4px;
  border: 1px solid #4c6484;
  border-radius: 3px;
  color: #f8fafc;
  background: #263957;
  font-size: 11px;
}

.v2-toolbar__control input {
  width: 44px;
  text-align: center;
}

/* 分页开关：复选框不套用普通输入框的 44px 定宽与居中排版。 */
.v2-toolbar__control--toggle {
  cursor: pointer;
  user-select: none;
}

.v2-toolbar__control--toggle input {
  width: auto;
  height: auto;
  padding: 0;
  cursor: pointer;
}

.v2-toolbar__dirty {
  padding: 1px 8px;
  border-radius: 10px;
  color: #94a3b8;
  background: rgb(255 255 255 / 8%);
  font-size: 11px;
}

.v2-toolbar__dirty--on {
  color: #fde68a;
  background: rgb(253 230 138 / 18%);
}

.v2-toolbar__group {
  display: flex;
  gap: 6px;
}

.v2-toolbar__label {
  align-self: center;
  margin-right: 2px;
  font-size: 12px;
  color: #9fb3c8;
}

.v2-toolbar__group:first-of-type {
  margin-left: auto;
}

.v2-toolbar__button {
  height: 28px;
  padding: 0 12px;
  border: 1px solid #4c6484;
  border-radius: 4px;
  color: #f8fafc;
  background: #263957;
  cursor: pointer;
  font-size: 12px;
}

.v2-toolbar__button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.v2-toolbar__file {
  display: none;
}

.v2-designer__body {
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr) 400px;
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

.v2-sidebar__heading--tree {
  margin-top: 16px;
  margin-bottom: 8px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.v2-tree {
  max-height: 42vh;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 4px 2px;
  background: #fcfdff;
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

.v2-sidebar__subheading {
  margin: 16px 0 8px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.v2-sidebar__group-title {
  margin: 16px 0 8px;
  padding-left: 8px;
  border-left: 3px solid #2563eb;
  color: #1e293b;
  font-size: 12px;
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

/* 落点高亮样式已随拖拽逻辑一并下沉至 CanvasSurface（A6）。 */

.v2-inspector-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #64748b;
  font-size: 12px;
}

.v2-inspector-row--head {
  position: sticky;
  top: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
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

.v-inspector__delete--small {
  padding: 2px 8px;
  font-size: 11px;
}

.v-table-col {
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #f8fafc;
}

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

.v2-style-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  margin-bottom: 4px;
}

.v2-style-grid .v2-control {
  margin-bottom: 0;
}

.v2-style-grid .v2-control--inline input[type="color"] {
  width: 100%;
  height: 26px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  background: #fff;
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

.v2-hint {
  margin: -6px 0 12px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.6;
}

.v2-hint code {
  padding: 1px 4px;
  border-radius: 3px;
  background: #f1f5f9;
  font-size: 11px;
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

/* 复选框不套用文本框的全宽边框样式：保持上下结构（标签在上、勾选框在下）并左对齐 */
.v2-control input[type="checkbox"] {
  width: 16px;
  min-height: 16px;
  height: 16px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  align-self: flex-start;
  accent-color: #2563eb;
  cursor: pointer;
}

.v2-textarea {
  width: 100%;
  min-height: 30px;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  box-sizing: border-box;
  color: #1e293b;
  background: #fff;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  resize: vertical;
}

.v2-control--inline {
  /* 统一为上下结构：标签在上、输入在下（与 .v2-control 一致） */
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  margin: 0;
}

.v2-control--inline input {
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

/* 长文本控件独占一整行（在 2 列网格中横跨两列） */
.v2-control--full {
  grid-column: 1 / -1;
}

/* 网格容器内的控件去掉上下外边距，由网格 gap 控制间距 */
.v2-grid-dimensions .v2-control {
  margin: 0;
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

.v2-issue--selectable {
  cursor: pointer;
}

.v2-issue--selectable:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

/* 打印纸张尺寸（`@page { size: Wmm Hmm }`）**不在此处写死**：
   它由渲染内核 `GridFormRenderer` 按 `schema.paper` 运行时注入（见 `page-size-style.ts`）。
   此前这里硬编码 `@page { size: A4 }`，导致切到 A3 横向后屏幕渲染 420×297mm 正常、
   打印却仍按 A4 出页、内容被裁切（P11-3 修复）。 */

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
