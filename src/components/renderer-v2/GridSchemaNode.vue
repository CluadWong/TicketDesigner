<script setup lang="ts">
import { computed, ref, watch, inject } from "vue";
import type { CSSProperties } from "vue";
import type {
  FormNodeV2,
  GridCellV2,
  GridNodeV2,
  PNodeV2,
  TextNodeV2,
  TextStyleV2,
  TableColumnV2,
  TableNodeV2,
  FormDataV2,
} from "@/types";
import HtmlBlock from "./HtmlBlock.vue";
import { resolveCellBoxV2 } from "@/types";

defineOptions({ name: "GridSchemaNodeV2" });

const props = defineProps<{
  node: FormNodeV2;
  baseRowHeight: number;
  selectedNodeId?: string | null;
  data?: FormDataV2 | null;
  /**
   * 只读预览（预览态）：带数据渲染，但字段一律不可输入。
   * 与 `data` 同时传入时表示「预览」；仅传 `data` 表示「填充」（可输入）。
   */
  readonly?: boolean;
}>();

const fillMode = computed(() => props.data != null);
/** 是否允许在字段中输入（填充态且非只读预览）。 */
const canFill = computed(() => fillMode.value && props.readonly !== true);

const track = (value: number | `${number}fr` | "auto" | undefined): string => {
  if (value === undefined || value === "auto") return "auto";
  return typeof value === "number" ? `${value}mm` : value;
};

function gridRowStyle(node: GridNodeV2, rowIndex: number): CSSProperties {
  const row = node.rows[rowIndex];
  // 优先使用 Grid 的共享列轨（grid.columns），使跨列合并（colspan）在任意
  // 列宽下都能正确对齐；旧数据无 columns 时回退到逐格 cell.width。
  const tracks =
    node.columns && node.columns.length > 0
      ? node.columns
      : row.cells.map(cell => cell.width);
  return {
    gridTemplateColumns: tracks.map(track).join(" "),
    minHeight: `${row.height * props.baseRowHeight}mm`,
  };
}

function cellStyle(cell: GridCellV2, grid: GridNodeV2): CSSProperties {
  const box = resolveCellBoxV2(cell, grid);
  return {
    gridColumn: cell.colspan ? `span ${cell.colspan}` : undefined,
    padding: `${box.padding}mm`,
    alignItems:
      box.verticalAlign === "top"
        ? "flex-start"
        : box.verticalAlign === "bottom"
          ? "flex-end"
          : "center",
    justifyContent:
      box.align === "center" ? "center" : box.align === "right" ? "flex-end" : "flex-start",
  };
}

function textCss(style?: TextStyleV2): CSSProperties {
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
    color: style?.color,
    fontFamily: style?.fontFamily,
  };
}

function pStyle(node: PNodeV2): CSSProperties {
  // 字段 P 默认允许换行（multiline !== false 时 pre-wrap），便于填写态多行输入。
  return {
    ...textCss(node.style),
    whiteSpace: node.multiline === false ? "nowrap" : "pre-wrap",
  };
}

function textStyle(node: TextNodeV2): CSSProperties {
  return textCss(node.style);
}

function tableColumnStyle(columns: TableColumnV2[]): CSSProperties {
  return {
    gridTemplateColumns: columns.map(column => track(column.width)).join(" "),
  };
}

function tableCellStyle(column: TableColumnV2): CSSProperties {
  return {
    justifyContent:
      column.align === "center" ? "center" : column.align === "right" ? "flex-end" : "flex-start",
  };
}

function tableTemplate(node: TableNodeV2, columnKey: string) {
  return node.rowTemplate.find(template => template.columnKey === columnKey);
}

/** 表格行模板中的行号占位符，渲染时替换为该行的 1-based 序号。 */
const ROW_PLACEHOLDER = /\{row\}/g;

/**
 * 实例化表格行模板：把节点及其后代 `field` 中的 `{row}` 替换为实际行号。
 *
 * `minRows` 生成的每一行复用同一份 rowTemplate，若字段键写死则多行共用同一数据键、
 * 无法区分行。用占位符（如 `工作任务_{row}_1`）可让第 r 行绑定到 `工作任务_r_1`，
 * 从而与 demoData 的逐行键一致，满足 P10「数据回写正确 —— 键与 demoData 一致无错位」。
 * 不含占位符时原样返回同一引用，不产生额外对象。
 */
function withRowIndex(node: FormNodeV2, rowIndex: number): FormNodeV2 {
  const bound =
    "field" in node && typeof node.field === "string" && node.field.includes("{row}")
      ? ({ ...node, field: node.field.replace(ROW_PLACEHOLDER, String(rowIndex)) } as FormNodeV2)
      : node;
  if (bound.type === "grid") {
    return {
      ...bound,
      rows: bound.rows.map(row => ({
        ...row,
        cells: row.cells.map(cell => ({
          ...cell,
          children: cell.children.map(child => withRowIndex(child, rowIndex)),
        })),
      })),
    };
  }
  return bound;
}

function isCompositeField(node: PNodeV2): boolean {
  return node.mode === "field" && Boolean(node.prefix || node.suffix);
}

/** 设计态可编辑（contenteditable 临时文本，不回写）；填充态交由真实控件处理。 */
function isEditable(node: PNodeV2): "true" | undefined {
  return !fillMode.value && node.mode === "field" && !isCompositeField(node)
    ? "true"
    : undefined;
}

/**
 * 填写态输入回调：仅当 fillMode 且字段存在时，把文本回写到上层 provide 的
 * formFill（响应式 data），满足 P9.1b「数据回写正确」。设计态不回写。
 */
const formFill = inject<(field: string, value: string) => void>("formFill", () => {});
/**
 * 读取可编辑区域的文本，保留换行：优先用 innerText（浏览器按渲染返回带 \n 的文本），
 * jsdom 等无 innerText 实现时回退 textContent。满足「字段 P 允许多行」。
 */
function readEditableText(el: HTMLElement): string {
  // 填充态真实控件（input/textarea）直接取 .value，换行/预设多行均保留。
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value;
  }
  const inner = el.innerText;
  return typeof inner === "string" ? inner : (el.textContent ?? "");
}
function onFillInput(field: string | undefined, event: Event): void {
  if (!canFill.value || !field) return;
  formFill(field, readEditableText(event.target as HTMLElement));
}

/** 字段展示值：优先 data 中的填写值，为空时回退到节点预设 `default`（支持 \n 多行）。 */
function fieldValue(node: PNodeV2): string {
  const raw = props.data?.[node.field];
  if (raw == null || raw === "") return node.default ?? "";
  return String(raw);
}

/** 多行：填充态渲染 `<textarea>`（默认，换行/预设多行）；false → 单行 `<input>`。 */
function isMultiline(node: PNodeV2): boolean {
  return node.multiline !== false;
}

/** 单行控件的 input type（number/date/text）；`<textarea>` 忽略 type。 */
function inputElType(node: PNodeV2): string {
  if (node.inputType === "number" || node.inputType === "date") return node.inputType;
  return "text";
}

const BROKEN_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60'%3E%3Crect width='100%25' height='100%25' fill='%23f1f5f9' stroke='%23cbd5e1'/%3E%3Ctext x='50%25' y='50%25' font-size='10' fill='%2394a3b8' text-anchor='middle' dominant-baseline='middle'%3E图片%3C/text%3E%3C/svg%3E";

const imgError = ref(false);
const imageSrc = computed<string>(() => {
  if (imgError.value) return BROKEN_PLACEHOLDER;
  if (props.node.type !== "image") return BROKEN_PLACEHOLDER;
  const fromData =
    fillMode.value && props.node.field ? props.data?.[props.node.field] : undefined;
  return fromData != null ? String(fromData) : (props.node.src ?? BROKEN_PLACEHOLDER);
});
watch(
  () => [
    props.node.type === "image" ? props.node.src : null,
    props.node.type === "image" ? props.node.field : null,
    props.data,
  ],
  () => {
    imgError.value = false;
  },
  { deep: true },
);
function onImgError(): void {
  imgError.value = true;
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
        :class="{ 'layout-node--selected': selectedNodeId === cell.id }"
        :style="cellStyle(cell, node)"
        :data-layout-id="cell.id"
        :data-node-id="cell.id"
      >
        <GridSchemaNode
          v-for="child in cell.children"
          :key="child.id"
          :node="child"
          :base-row-height="baseRowHeight"
          :selected-node-id="selectedNodeId"
          :data="data"
          :readonly="props.readonly"
        />
      </div>
    </div>
  </div>

  <div
    v-else-if="node.type === 'text'"
    class="layout-text"
    :class="{ 'layout-node--selected': selectedNodeId === node.id }"
    :style="textStyle(node)"
    :data-node-id="node.id"
  >{{ node.text }}</div>

  <p
    v-else-if="node.type === 'p'"
    class="layout-p"
    :class="{
      'layout-p--field': true,
      'layout-p--composite': isCompositeField(node),
      'layout-p--underline': node.underline && !isCompositeField(node),
      'layout-p--multiline': node.multiline === true,
      'layout-node--selected': selectedNodeId === node.id,
    }"
    :style="pStyle(node)"
    :contenteditable="canFill ? undefined : isEditable(node)"
    :data-field="node.field"
    :data-node-id="node.id"
  >
    <template v-if="isCompositeField(node)">
      <template v-if="canFill">
        <span v-if="node.prefix" class="layout-p__label">{{ node.prefix }}</span>
        <component
          :is="isMultiline(node) ? 'textarea' : 'input'"
          class="layout-p__control"
          :class="{ 'layout-p--underline': node.underline, 'layout-p__control--multiline': isMultiline(node) }"
          :type="inputElType(node)"
          :value="fieldValue(node)"
          :data-field="node.field"
          @input="onFillInput(node.field, $event)"
        ></component>
        <span v-if="node.suffix" class="layout-p__label">{{ node.suffix }}</span>
      </template>
      <template v-else>
        <span v-if="node.prefix" class="layout-p__label">{{ node.prefix }}</span>
        <span
          class="layout-p__input"
          :class="{ 'layout-p--underline': node.underline }"
          :contenteditable="props.readonly ? undefined : 'true'"
          :data-field="node.field"
          @input="onFillInput(node.field, $event)"
        >{{ fieldValue(node) }}</span>
        <span v-if="node.suffix" class="layout-p__label">{{ node.suffix }}</span>
      </template>
    </template>

    <template v-else>
      <template v-if="canFill">
        <component
          :is="isMultiline(node) ? 'textarea' : 'input'"
          class="layout-p__control"
          :class="{ 'layout-p--underline': node.underline, 'layout-p__control--multiline': isMultiline(node) }"
          :type="inputElType(node)"
          :value="fieldValue(node)"
          :data-field="node.field"
          @input="onFillInput(node.field, $event)"
        ></component>
      </template>
      <template v-else>{{ fieldValue(node) }}</template>
    </template>
  </p>

  <table
    v-else-if="node.type === 'table'"
    class="layout-table"
    :class="[
      `layout-table--${node.border ?? 'all'}`,
      { 'layout-node--selected': selectedNodeId === node.id },
    ]"
    :data-node-id="node.id"
    :data-field="node.field"
  >
    <thead>
      <tr
        class="layout-table__row layout-table__header"
        :style="[tableColumnStyle(node.columns), { minHeight: `${node.headerHeight * baseRowHeight}mm` }]"
      >
        <th
          v-for="column in node.columns"
          :key="column.key"
          class="layout-table__cell"
          :style="tableCellStyle(column)"
        >
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
          :style="tableCellStyle(column)"
          :data-layout-id="tableTemplate(node, column.key)?.id"
        >
          <GridSchemaNode
            v-for="child in tableTemplate(node, column.key)?.children ?? []"
            :key="`${child.id}-${rowIndex}`"
            :node="withRowIndex(child, rowIndex)"
            :base-row-height="baseRowHeight"
            :selected-node-id="selectedNodeId"
            :data="data"
            :readonly="props.readonly"
          />
        </td>
      </tr>
    </tbody>
  </table>

  <HtmlBlock
    v-else-if="node.type === 'html'"
    :node="node"
    :selected-node-id="selectedNodeId"
    :data="data"
  />

  <img
    v-else
    class="layout-image"
    :class="{ 'layout-node--selected': selectedNodeId === node.id }"
    :data-node-id="node.id"
    :data-field="node.field"
    :src="imageSrc"
    :alt="node.field ?? node.src ?? ''"
    :style="{
      width: node.width ? `${node.width}mm` : undefined,
      height: node.height ? `${node.height}mm` : undefined,
      objectFit: node.objectFit,
    }"
    @error="onImgError"
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

/* 单边归属规则（P4.3）：外框仅由 Grid 容器绘制；内部水平分隔线画在
   非首行 cell 的上边框、内部垂直分隔线画在非首列 cell 的左边框。
   这样每条线只被一个元素拥有，嵌套 Grid、以及 Grid 与 Table 相邻时
   都不会出现双边框——旧规则让每格画 right/bottom，导致最外列/行与
   容器外框叠加成 2px（见 §17「嵌套边框变粗」）。
   border 语义：all = 外框 + 内部线；outer = 仅外框（不画内部线）；
   inner = 仅内部线（无外框，由外层 Grid 承担）；none = 无。 */
.layout-grid--all,
.layout-grid--outer {
  border: 1px solid #111827;
}

/* 内部水平分隔线：非首行的 cell 上边框 = 上一行的下边界。
   仅 all / inner 绘制；outer（仅外框）与 none 不画内部线。 */
.layout-grid--all > .layout-grid__row:not(:first-child) > .layout-grid__cell,
.layout-grid--inner > .layout-grid__row:not(:first-child) > .layout-grid__cell {
  border-top: 1px solid #111827;
}

/* 内部垂直分隔线：非首列的 cell 左边框 = 左一列的右边界。
   仅 all / inner 绘制；outer（仅外框）与 none 不画内部线。 */
.layout-grid--all > .layout-grid__row > .layout-grid__cell:not(:first-child),
.layout-grid--inner > .layout-grid__row > .layout-grid__cell:not(:first-child) {
  border-left: 1px solid #111827;
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
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  outline: none;
}

.layout-text {
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
  white-space: pre-wrap;
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

/* 填充态真实控件（input/textarea）：继承字段字体，去边框/背景，flex 填充，
   与静态文本视觉一致；多行 textarea 预留手写高度。仅填充态出现，不影响
   设计/预览/打印的静态渲染。 */
.layout-p__control {
  display: block;
  flex: 1 1 auto;
  width: 100%;
  min-width: 12mm;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  letter-spacing: inherit;
  white-space: pre-wrap;
  box-sizing: border-box;
  outline: none;
  resize: none;
}

.layout-p__control.layout-p--underline {
  border-bottom: 1px solid #111827;
}

.layout-p--multiline {
  min-height: 2.6em;
}

.layout-p__control--multiline {
  min-height: 2.6em;
  overflow: auto;
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

/* 外框：仅 all / outer 绘制（与 Grid 边框语义一致：none/inner 不画外框）。 */
.layout-table--all,
.layout-table--outer {
  border: 1px solid #111827;
}

/* 内部线：仅 all / inner 绘制（非末行底边 + 非末列右边 + 表头/表体分隔线）；
   outer / none 不画内部线。每条线单一归属，避免与外层 Grid 重复（P4.3）。 */
.layout-table--all .layout-table__row:not(:last-child),
.layout-table--inner .layout-table__row:not(:last-child) {
  border-bottom: 1px solid #111827;
}

.layout-table--all .layout-table__cell:not(:last-child),
.layout-table--inner .layout-table__cell:not(:last-child) {
  border-right: 1px solid #111827;
}

.layout-table--all .layout-table__header,
.layout-table--inner .layout-table__header {
  border-bottom: 1px solid #111827;
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

.layout-table__header {
  align-items: center;
  font-weight: 600;
  text-align: center;
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
  /* 打印时去除字段 P 及其复合输入的下划线（屏幕预览仍保留，便于设计者定位填值线）。 */
  .layout-p--underline {
    border-bottom: none !important;
  }
}
</style>
