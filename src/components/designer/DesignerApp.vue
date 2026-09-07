<script setup lang="ts">
import { computed, ref, provide, onMounted, onUnmounted } from "vue";
import CanvasSurface from "./CanvasSurface.vue";
import PaperViewport from "@/components/renderer-v2/PaperViewport.vue";
import { PALETTE_DRAG_MIME } from "@/engine-v2/node-address";
import type { SampleEntry } from "@/samples/types";
/** D2：打印触发收口到渲染内核，设计器不再裸调 `window.print()`。 */
import { printForm } from "@/components/renderer-v2/print-form";
import { validateFormSchemaV2 } from "@/types";
import type { FormDataV2, FormSchemaV2 } from "@/types";
import { paginateSchema } from "@/engine-v2/pagination";
import StatusBar from "./StatusBar.vue";
import NodeTreeItem from "./NodeTreeItem.vue";
import InspectorPanel from "./InspectorPanel.vue";
import { buildBlankSchema, useSchemaDocument } from "./composables/useSchemaDocument";
import { useNodeSelection } from "./composables/useNodeSelection";
import { useSchemaEdits, type NodeKind } from "./composables/useSchemaEdits";
import { useFillData } from "./composables/useFillData";
import { TreeControlKey, type TreeControl } from "./composables/treeControl";

const props = defineProps<{
  initialSchema?: FormSchemaV2;
  /** 可载入的样例集（由外层注入，设计器不依赖 dev 目录，见 B3）。 */
  samples?: SampleEntry[];
  /** 预览/填写态默认种子数据（由外层注入，替代原先写死的 demoData）。 */
  previewData?: FormDataV2;
}>();

/**
 * 本文件是设计器**编排层**（2026-09-07 批次 1 拆分后）：装配四个 composable 并接线到模板，
 * 自身不再持有文档 / 选中 / 编辑 / 填充数据的实现细节。
 * - `useSchemaDocument`：schema、提交与历史、持久化、文件导入导出；
 * - `useNodeSelection`：选中态、层级循环选中、结构树；
 * - `useSchemaEdits`：一切「改 schema」的动作（节点增删、Inspector 属性更新）；
 * - `useFillData`：预览态表单数据的导入 / 导出 / 存本地 / 读本地。
 */

// ── 视图状态 ────────────────────────────────────────────────
/**
 * - `design`：设计态，可编辑结构、可选中/添加组件；
 * - `preview`：**结构只读的交互填充态** —— 带数据渲染，不可添加/选中/重排组件，
 *   但字段 P 仍按同一 `<p>` 路径可编辑（值经 DOM 遍历采集）。
 */
type ViewMode = "design" | "preview";
const viewMode = ref<ViewMode>("design");
/** 非设计态：结构一律不可编辑（不可选中、不可拖拽、不可添加/删除组件）。 */
const previewMode = computed(() => viewMode.value !== "design");
/** 统一编辑闸门（C1）：仅设计态可改结构；结构性编辑动作经此单一判定。 */
const editable = computed(() => !previewMode.value);
/**
 * 分页开关（默认开启）：开启后渲染器按纸张正文高度把超高内容切成多张物理页。
 * 关闭时整页连续渲染（便于整体排版时查看连续结构）。**打印/预览始终分页**，
 * 此开关只影响设计态画布。
 */
const paginate = ref(true);
const canvasEl = ref<HTMLElement | null>(null);

// ── 文档：schema / 历史 / 持久化 ────────────────────────────
// `onDocumentReset` 在装配出 `clearSelection` 后赋值，此处先给空实现避免声明顺序问题。
let onDocumentReset: () => void = () => {};
const schemaDoc = useSchemaDocument(props.initialSchema, {
  onReset: () => onDocumentReset(),
});
const {
  schema,
  dirty,
  canUndo,
  canRedo,
  fileInput,
  commit,
  resetHistory,
  saveToLocal,
  loadFromLocal,
  exportFile,
  importFile,
  triggerImport,
} = schemaDoc;

// ── 选择态 ──────────────────────────────────────────────────
const selection = useNodeSelection(schema, { editable: () => editable.value });
const {
  selectedNodeId,
  selectedNode,
  selectedNodeType,
  selectedCellContext,
  selectedCellBox,
  nodeTree,
  clearSelection,
  selectNode,
  selectNodeById,
  selectIssue,
} = selection;
onDocumentReset = clearSelection;

// ── 结构树全局折叠 / 展开（provide 下发信号，NodeTreeItem 经 inject 接收）──
const treeControl: TreeControl = { token: ref(0), target: ref(true) };
provide(TreeControlKey, treeControl);
/** 折叠全部：置 target=false 并自增 token，驱动所有节点收起。 */
function collapseAll(): void {
  treeControl.target.value = false;
  treeControl.token.value++;
}
/** 展开全部：置 target=true 并自增 token，驱动所有节点展开。 */
function expandAll(): void {
  treeControl.target.value = true;
  treeControl.token.value++;
}

// ── 结构编辑动作 ───────────────────────────────────────────
const edits = useSchemaEdits({
  document: schemaDoc,
  selection,
  editable: () => editable.value,
  clearSelection,
});
const {
  addRootGrid,
  addGrid,
  addNodeToSelectedCell,
  removeSelectedNode,
  copySelected,
  cutSelected,
  pasteClipboard,
  duplicateSelected,
  mergeSelectedCellRight,
  splitSelectedCell,
  onCanvasNodeDragStart,
  onDropNode,
  onDropPalette,
  updateSelectedText,
  updateSelectedField,
  updateSelectedPrefix,
  updateSelectedSuffix,
  updateSelectedWidth,
  updateSelectedDefault,
  updateSelectedInnerBorder,
  updateSelectedAction,
  updateSelectedSafetyField,
  updateGridBorder,
  updateTableBorder,
  updateGridDimensions,
  updateTableRows,
  addTableColumn,
  removeTableColumn,
  renameTableColumnKey,
  updateTableColumn,
  updateGridColumnWidth,
  updateGridCellDefault,
  updateGridGap,
  updateSelectedCellPadding,
  updateSelectedCellAlign,
  updateSelectedCellVerticalAlign,
  updateSelectedCellRowHeight,
  updateSelectedFontSize,
  updateSelectedLineHeight,
  updateSelectedFontWeight,
  updateSelectedColor,
  updateSelectedFontFamily,
  updateSelectedAlign,
  updateSelectedVerticalAlign,
  updateSelectedHtml,
  updateSelectedCss,
  updateSelectedImageSrc,
  updateSelectedImageField,
  updateSelectedImageSize,
  updateSelectedImageFit,
  updateBaseRowHeight,
  updatePaperSize,
  paperMargin,
  updatePaperMargin,
} = edits;

// ── 填充数据（预览态） ─────────────────────────────────────
const fillData = useFillData({
  canvasEl,
  isPreview: () => previewMode.value,
  enterPreview: (data) => enterPreview(data),
});
const {
  previewFormData,
  previewData,
  fillDataFileInput,
  importFillDataFile,
  triggerImportFillData,
  exportFillDataFile,
  saveFillDataToLocal,
  loadFillDataFromLocal,
} = fillData;

/** 载入数据并进入预览态（清选中，避免残留设计态选中）。 */
function enterPreview(data: FormDataV2): void {
  previewFormData.value = data;
  viewMode.value = "preview";
  clearSelection();
}

/** 在「设计 / 预览」之间切换；再次点击同一模式则回到设计态。 */
function toggleViewMode(mode: "preview"): void {
  if (viewMode.value === mode) {
    viewMode.value = "design";
    previewFormData.value = null;
    return;
  }
  enterPreview({ ...(props.previewData ?? {}) });
}

/** 撤销 / 重做：文档回退后清空选中（旧节点可能已不存在）。 */
function undo(): void {
  schemaDoc.undo();
  clearSelection();
}

function redo(): void {
  schemaDoc.redo();
  clearSelection();
}

/**
 * 打印：触发走渲染内核统一入口（`printForm`），呈现（`@page` 纸张 + `@media print` 样式）
 * 亦由渲染内核负责——两者同层，设计器不再各自 `window.print()`（D2）。
 */
function printDocument(): void {
  printForm();
}

/** 载入一个注入的样例（B3：样例来自 props 注册表，设计器不依赖 dev 目录）。 */
function loadSample(sample: SampleEntry): void {
  resetHistory(sample.loadSchema());
  clearSelection();
}

function resetBlank(): void {
  // 空白初始化默认配一个 Grid 作为根部（用户要求），仍从空 page 起算。
  resetHistory(buildBlankSchema());
  clearSelection();
}

/**
 * 模板拖拽起点（落点判定 / 插入指示 / 合法投放格计算在表面层 CanvasSurface，
 * 见 A6 分层重构）：本壳层只写拖拽数据，drop 后由 `onDropPalette` 提交 schema。
 */
function startPaletteDrag(kind: NodeKind, event: DragEvent): void {
  if (!editable.value) return;
  event.dataTransfer?.setData(PALETTE_DRAG_MIME, kind);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
}

// ── 派生：校验与分页（供状态栏与问题列表） ─────────────────
const issues = computed(() => validateFormSchemaV2(schema.value));
const warningCount = computed(() => issues.value.length);
/**
 * 分页结果（纯函数、DOM 无关）：用于状态栏暴露「实际会打印几张纸」与超高告警。
 *
 * 与渲染内核 `GridFormRenderer` 调的是**同一个** `paginateSchema` 且入参口径一致，
 * 因此状态栏数字与画布物理页必然一致，不会两处各算一套而漂移。
 */
const pagination = computed(() => paginateSchema(schema.value, { data: previewData.value }));

// ── 快捷键与离开确认 ───────────────────────────────────────
/** 焦点在表单控件 / 可编辑区内时，快捷键让位给浏览器原生（文本复制、撤销、退格等）。 */
function isTypingTarget(event: KeyboardEvent): boolean {
  const t = event.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

function onKeydown(event: KeyboardEvent): void {
  // 输入框 / contenteditable 内：全部让位原生（含 Ctrl+Z/S/C/V）
  if (isTypingTarget(event)) return;
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (mod) {
    if (key === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if ((key === "z" && event.shiftKey) || key === "y") {
      event.preventDefault();
      redo();
    } else if (key === "s") {
      event.preventDefault();
      saveToLocal();
    } else if (key === "c") {
      event.preventDefault();
      copySelected();
    } else if (key === "x") {
      event.preventDefault();
      cutSelected();
    } else if (key === "v") {
      event.preventDefault();
      pasteClipboard();
    } else if (key === "d") {
      event.preventDefault();
      duplicateSelected();
    }
    return;
  }
  // 无修饰键：Delete / Backspace 删除选中（仅设计态）
  if ((key === "delete" || key === "backspace") && editable.value) {
    event.preventDefault();
    removeSelectedNode();
  }
}

function beforeUnload(event: BeforeUnloadEvent): void {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}

onMounted(() => {
  // 默认选中首个页面节点，使右侧「页面设置」（纸张/边距/行高/分页）开箱即可见
  if (schema.value.pages.length > 0) {
    selectNodeById(schema.value.pages[0].id);
  }
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("beforeunload", beforeUnload);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("beforeunload", beforeUnload);
});
</script>

<template>
  <div class="v2-designer">
    <header class="v2-toolbar">
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
          输入框
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
          格子 Grid
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
          表格 Table
        </button>

        <div class="v2-sidebar__heading v2-sidebar__heading--tree v2-tree-head">
          <span>结构</span>
          <button
            class="v2-tree__delete"
            type="button"
            :disabled="
              !editable ||
              !selectedNodeId ||
              selectedNode?.type === 'page' ||
              selectedNode?.type === 'grid-cell'
            "
            :title="editable ? '删除选中节点' : '预览态不可编辑结构'"
            @click="removeSelectedNode"
          >
            删除
          </button>
        </div>
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
        <div class="v2-tree__buttons">
          <button
            type="button"
            class="v2-tree__btn"
            @click="collapseAll"
          >
            折叠全部
          </button>
          <button
            type="button"
            class="v2-tree__btn"
            @click="expandAll"
          >
            展开全部
          </button>
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

      <InspectorPanel
        v-model:paginate="paginate"
        :node="selectedNode"
        :node-id="selectedNodeId"
        :node-type="selectedNodeType"
        :cell-context="selectedCellContext"
        :cell-box="selectedCellBox"
        :issues="issues"
        :api="edits"
        :paper-size="schema.paper.size"
        :base-row-height="schema.baseRowHeight"
        :paper-margin="paperMargin"
        @select-issue="selectIssue"
      />
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

.v2-toolbar__label {
  align-self: center;
  margin-right: 2px;
  font-size: 12px;
  color: #9fb3c8;
}

.v2-toolbar__file {
  display: none;
}

.v2-designer__body {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr) 360px;
  min-height: 0;
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

/* 结构行：标题居左、删除按钮靠右（节点删除按钮从右侧 Inspector 移入此处） */
.v2-tree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.v2-tree__delete {
  padding: 3px 8px;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  color: #b91c1c;
  background: #fff7f7;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.v2-tree__delete:hover:not(:disabled) {
  background: #fee2e2;
}

.v2-tree__delete:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 结构树底部：折叠全部 / 展开全部 */
.v2-tree__buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.v2-tree__btn {
  flex: 1 1 0;
  padding: 5px 0;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  color: #334155;
  background: #f8fafc;
  font-size: 12px;
  cursor: pointer;
}

.v2-tree__btn:hover {
  background: #eef2f7;
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

.v2-sidebar__group-title {
  margin: 16px 0 8px;
  padding-left: 8px;
  border-left: 3px solid #2563eb;
  color: #1e293b;
  font-size: 12px;
  font-weight: 700;
}

.v2-canvas {
  min-width: 0;
  overflow: hidden;
}

/* 落点高亮样式已随拖拽逻辑一并下沉至 CanvasSurface（A6）。 */

/* 打印纸张尺寸（`@page { size: Wmm Hmm }`）**不在此处写死**：
   它由渲染内核 `GridFormRenderer` 按 `schema.paper` 运行时注入（见 `page-size-style.ts`）。
   此前这里硬编码 `@page { size: A4 }`，导致切到 A3 横向后屏幕渲染 420×297mm 正常、
   打印却仍按 A4 出页、内容被裁切（P11-3 修复）。 */

@media print {
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
