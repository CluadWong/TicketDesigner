<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
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
import {
  bindTableRowCell,
  resolveCellBoxV2,
  resolveGridGapV2,
  resolveTableRowCount,
  NODE_MOVE_MIME,
} from "@/types";

defineOptions({ name: "GridSchemaNodeV2" });

const emit = defineEmits<{
  (e: "node-drag-start", id: string): void;
  (e: "field-change", field: string, value: string): void;
}>();

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
  /**
   * 相邻 Grid 外框去重（Item 2）：当本 Grid 与相邻兄弟 Grid 都配置了外框时，
   * 由父级（页面竖向堆叠 / 单元格横向排布）传入需要隐藏的边框侧，避免重叠成 2px。
   * 仅隐藏「后一个」Grid 的引导侧（页面级 top / 单元格级 left），保留前者的拖尾侧单线。
   */
  suppressBorders?: {
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
  };
  /** 拖拽重排（P9）：当前悬停的合法投放格 id 与插入下标，用于渲染插入指示线。 */
  dragOverCellId?: string | null;
  dragOverIndex?: number | null;
}>();

/** 该节点是否为绘制外框（all/outer）的 Grid。 */
function drawsOuterFrame(node: FormNodeV2): boolean {
  return (
    node.type === "grid" && (node.border === "all" || node.border === "outer")
  );
}

/**
 * 单元格内子节点横向（flex row）排布：相邻且都绘制外框的 Grid，
 * 抑制后一个 Grid 的左边框（保留前一个的右边框单线）。非 Grid / 非外框节点返回 undefined。
 */
function cellSiblingSuppressBorders(
  children: FormNodeV2[],
  index: number,
):
  | { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean }
  | undefined {
  const node = children[index];
  if (!drawsOuterFrame(node)) return undefined;
  const prev = children[index - 1];
  return { left: !!prev && drawsOuterFrame(prev) };
}

const fillMode = computed(() => props.data != null);
/** 是否允许在字段中输入（填充态且非只读预览）。 */
const canFill = computed(() => fillMode.value && props.readonly !== true);

const track = (value: number | `${number}fr` | "auto" | undefined): string => {
  if (value === undefined || value === "auto") return "auto";
  return typeof value === "number" ? `${value}mm` : value;
};

/**
 * Grid 容器（flex column）间距：仅行与行之间（列间距由 `.layout-grid__row` 的
 * `column-gap` 负责）。gap 同时作用于行列（CSS `gap` 语义）。
 */
function gridContainerStyle(node: GridNodeV2): CSSProperties {
  const gap = resolveGridGapV2(node);
  return gap > 0 ? { rowGap: `${gap}mm` } : {};
}

function gridRowStyle(node: GridNodeV2, rowIndex: number): CSSProperties {
  const row = node.rows[rowIndex];
  // 优先使用 Grid 的共享列轨（grid.columns），使跨列合并（colspan）在任意
  // 列宽下都能正确对齐；旧数据无 columns 时回退到逐格 cell.width。
  const tracks =
    node.columns && node.columns.length > 0
      ? node.columns
      : row.cells.map((cell) => cell.width);
  const gap = resolveGridGapV2(node);
  return {
    gridTemplateColumns: tracks.map(track).join(" "),
    minHeight: `${row.height * props.baseRowHeight}mm`,
    // 列间距：gap 同时作用于行列。
    columnGap: gap > 0 ? `${gap}mm` : undefined,
  };
}

function cellStyle(cell: GridCellV2, grid: GridNodeV2): CSSProperties {
  const box = resolveCellBoxV2(cell, grid);
  return {
    gridColumn: cell.colspan ? `span ${cell.colspan}` : undefined,
    // 单元格行高倍数：设置时覆盖所在 Grid 行高（行容器按最高单元格撑开）。
    minHeight: cell.rowHeight
      ? `${cell.rowHeight * props.baseRowHeight}mm`
      : undefined,
    padding: `${box.padding}mm`,
    alignItems:
      box.verticalAlign === "top"
        ? "flex-start"
        : box.verticalAlign === "bottom"
          ? "flex-end"
          : "center",
    justifyContent:
      box.align === "center"
        ? "center"
        : box.align === "right"
          ? "flex-end"
          : "flex-start",
  };
}

function textCss(style?: TextStyleV2): CSSProperties {
  return {
    justifyContent:
      style?.align === "center"
        ? "center"
        : style?.align === "right"
          ? "flex-end"
          : "flex-start",
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
  // 字段 P 默认允许换行（内容超过宽度时自动换行），不再依赖 multiline 配置。
  // 宽度作用于「可输入区域」：无前/后标签时整个 <p> 即输入区，故 width 作用于组件整体；
  // 有前/后标签（复合字段）时，宽度只作用于输入区（见 fieldInputStyle，挂在内层 span/控件），
  // 此时 <p> 不加 width，避免把前缀/后缀也算进宽度。
  return {
    ...textCss(node.style),
    whiteSpace: "pre-wrap",
    width: isCompositeField(node) ? undefined : node.width,
  };
}

/** 复合字段（有前/后标签）可输入区域的宽度样式：仅复合字段且配置了 width 时生效，
 *  挂在内层 `.layout-p__input`（设计态）或 `.layout-p__control`（填充态）。
 *  flexGrow:0 确保显式宽度不被 flex 拉伸（.layout-p__input / .layout-p__control 默认 flex 可增长）。 */
function fieldInputStyle(node: PNodeV2): CSSProperties {
  if (!isCompositeField(node) || !node.width) return {};
  return { width: node.width, flexGrow: 0 };
}

function textStyle(node: TextNodeV2): CSSProperties {
  return textCss(node.style);
}

function tableColumnStyle(columns: TableColumnV2[]): CSSProperties {
  return {
    gridTemplateColumns: columns.map((column) => track(column.width)).join(" "),
  };
}

function tableCellStyle(column: TableColumnV2): CSSProperties {
  return {
    justifyContent:
      column.align === "center"
        ? "center"
        : column.align === "right"
          ? "flex-end"
          : "flex-start",
  };
}

function tableTemplate(node: TableNodeV2, columnKey: string) {
  return node.rowTemplate.find((template) => template.columnKey === columnKey);
}

/**
 * 实例化表格行模板：把单元格内字段 P 的 `field` 绑定到 `列key_行号`（渲染期派生，
 * 见 schema-v2-table-rows.ts 的 `bindTableRowCell`）。
 *
 * 每一行复用同一份 rowTemplate，但字段名按列配置 + 行号自动生成
 * （如第 r 行列 `工作地点` 绑定 `工作地点_r`），逐行不冲突，满足
 * P10「数据回写正确 —— 键与逐行数据一致无错位」。行模板内手写 field 会被覆盖，
 * 故无需（也不应在）schema 中写死字段名。
 */
function bindRowCell(node: FormNodeV2, columnKey: string, rowIndex: number): FormNodeV2 {
  return bindTableRowCell(node, columnKey, rowIndex);
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

/** 该组件在设计态（非只读、非填充）下可作为拖拽源；预览 / 填充态禁用拖拽。 */
const nodeDraggable = computed(() => !props.readonly && !fillMode.value);

/**
 * 拖拽重排（P9）起点：把节点 id 写入 dataTransfer 并向上 emit 同步选中态。
 * - 表格（含嵌套 Grid）内的节点不可作为独立组件拖拽（字段由列配置派生，不单独选中 / 配置）。
 * - 设计态整段可编辑字段（contenteditable）：仅按住 Alt 才允许整节点拖拽，
 *   否则放行文本编辑 / 选择，避免误触拖拽。
 */
function onNodeDragStart(node: FormNodeV2, event: DragEvent): void {
  // 阻止 DOM dragstart 冒泡到祖先节点（grid/page 等也绑定了 @dragstart），
  // 否则祖先的 onNodeDragStart 会覆盖 dataTransfer 并误把自身当作被拖拽节点。
  event.stopPropagation();
  const hostEl = event.currentTarget as HTMLElement | null;
  const tableEl = hostEl?.closest(".layout-table") ?? null;
  // 表格自身的根 <table> 也带 .layout-table，需排除自身（仅拦「祖先」表格内的节点）。
  if (tableEl && tableEl !== hostEl) {
    event.preventDefault();
    return;
  }
  if (node.type === "p" && isEditable(node) && !event.altKey) {
    event.preventDefault();
    return;
  }
  const dt = event.dataTransfer;
  if (!dt) return;
  dt.setData(NODE_MOVE_MIME, node.id);
  dt.setData("text/plain", node.id);
  dt.effectAllowed = "move";
  emit("node-drag-start", node.id);
}

/**
 * 失焦（blur）回写：用户离开字段时 emit 一次 `field-change(field, value)`，
 * 由使用方（FormRenderer / DesignerApp）决定写回响应式 data，满足 P9.1b「数据回写正确」。
 * 输入过程中不实时回写（用户需求：预览 / 填写不必逐键记录）；取值亦可经
 * `collectFieldValues(rootEl)` 直接遍历渲染 DOM 收集（用户需求：DOM 遍历采集）。
 * 内核不再依赖任何字符串 key 的 inject 约定（A4 / G15）。设计态不回写。
 */
/**
 * 读取可编辑区域的文本，保留换行：优先用 innerText（浏览器按渲染返回带 \n 的文本），
 * jsdom 等无 innerText 实现时回退 textContent。满足「字段 P 允许多行」。
 */
function readEditableText(el: HTMLElement): string {
  const inner = el.innerText;
  return typeof inner === "string" ? inner : (el.textContent ?? "");
}
function onFillBlur(field: string | undefined, event: Event): void {
  if (!canFill.value || !field) return;
  emit("field-change", field, readEditableText(event.target as HTMLElement));
}

/**
 * G11（A3 统一渲染路径）：innerBorder 字段在「预览 / 填写」下复用同一套逐行 `.layout-p__line`
 * 结构 —— 仅 `contenteditable` 差异（填写可编辑、预览只读），从而浏览态与填写态版式一致，
 * 且打印命中真实底边框（与 §0.3 已修打印一致）。
 * 填充态用 `v-once` 渲染避免每次输入触发 Vue 重渲染导致光标跳位；外部 data 变化（如 v-model:data 重置）
 * 经此 watch 用 `textContent` 重建（安全、无 HTML 注入），正在输入（焦点在可编辑区）时不打断。
 */
const innerLinesEl = ref<HTMLElement | null>(null);
function syncInnerLinesFromData(): void {
  if (props.node.type !== "p") return;
  const el = innerLinesEl.value;
  if (!el || !canFill.value) return;
  // 用户正在输入时（焦点在可编辑区）不重建，避免光标跳位
  if (el === (el.ownerDocument?.activeElement ?? null)) return;
  while (el.firstChild) el.removeChild(el.firstChild);
  for (const line of fieldLines(props.node)) {
    const d = document.createElement("div");
    d.className = "layout-p__line";
    d.textContent = line;
    el.appendChild(d);
  }
}
watch(
  () => (props.node.type === "p" ? fieldValue(props.node) : ""),
  syncInnerLinesFromData,
);
onMounted(syncInnerLinesFromData);

/**
 * 字段展示值：优先 data 中的填写值。
 * - data 为 null/undefined（设计态）或 data 中**不存在该键**（未填写）→ 回退 `default`；
 * - data 中**存在该键但为空串 `""`**（用户主动清空）→ 返回空串，**不回退 default**，
 *   否则带默认值的字段将无法被清空（G16：清空 → 回写 "" → 回退 default → 又显示默认内容）。
 * - data 中键值为 `null`（显式空）→ 视为未填写，回退 `default`。
 */
function fieldValue(node: PNodeV2): string {
  const data = props.data;
  if (data == null) return node.default ?? "";
  if (!(node.field in data)) return node.default ?? "";
  const raw = data[node.field];
  if (raw == null) return node.default ?? "";
  return String(raw);
}

/** 内部边框：将字段值按换行拆成逐行文本，供静态/预览/打印态渲染为每行一个 <div>，
 *  使 `.layout-p--inner-border :deep(div)` 的底边框规则在打印态也能命中
 *  （设计态 contenteditable 回车生成的 div 同样走该规则）。空值返回 [""] → 至少一行。 */
function fieldLines(node: PNodeV2): string[] {
  return fieldValue(node).split("\n");
}

/** 填充态控件：字段统一为字符串类型，全部用 `<textarea>`（默认自动换行）。 */

const BROKEN_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60'%3E%3Crect width='100%25' height='100%25' fill='%23f1f5f9' stroke='%23cbd5e1'/%3E%3Ctext x='50%25' y='50%25' font-size='10' fill='%2394a3b8' text-anchor='middle' dominant-baseline='middle'%3E图片%3C/text%3E%3C/svg%3E";

const imgError = ref(false);
const imageSrc = computed<string>(() => {
  if (imgError.value) return BROKEN_PLACEHOLDER;
  if (props.node.type !== "image") return BROKEN_PLACEHOLDER;
  const fromData =
    fillMode.value && props.node.field
      ? props.data?.[props.node.field]
      : undefined;
  return fromData != null
    ? String(fromData)
    : (props.node.src ?? BROKEN_PLACEHOLDER);
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
    :style="gridContainerStyle(node)"
    :class="[
      `layout-grid--${node.border}`,
      {
        'layout-node--selected': selectedNodeId === node.id,
        'layout-grid--no-top': suppressBorders?.top,
        'layout-grid--no-right': suppressBorders?.right,
        'layout-grid--no-bottom': suppressBorders?.bottom,
        'layout-grid--no-left': suppressBorders?.left,
      },
    ]"
    :data-node-id="node.id"
    :draggable="nodeDraggable"
    @dragstart="onNodeDragStart(node, $event)"
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
        <template
          v-for="(child, childIndex) in cell.children"
          :key="child.id"
        >
          <div
            v-if="dragOverCellId === cell.id && dragOverIndex === childIndex"
            class="v2-insertion-line"
          ></div>
          <GridSchemaNode
            :node="child"
            :base-row-height="baseRowHeight"
            :selected-node-id="selectedNodeId"
            :data="data"
            :readonly="props.readonly"
            :suppress-borders="
              cellSiblingSuppressBorders(cell.children, childIndex)
            "
            :drag-over-cell-id="dragOverCellId"
            :drag-over-index="dragOverIndex"
            @node-drag-start="(id: string) => emit('node-drag-start', id)"
            @field-change="(field: string, value: string) => emit('field-change', field, value)"
          />
        </template>
        <div
          v-if="dragOverCellId === cell.id && dragOverIndex === cell.children.length"
          class="v2-insertion-line"
        ></div>
      </div>
    </div>
  </div>

  <div
    v-else-if="node.type === 'text'"
    class="layout-text"
    :class="{ 'layout-node--selected': selectedNodeId === node.id }"
    :style="textStyle(node)"
    :data-node-id="node.id"
    :draggable="nodeDraggable"
    @dragstart="onNodeDragStart(node, $event)"
  >
    {{ node.text }}
  </div>

  <p
    v-else-if="node.type === 'p'"
    class="layout-p"
    :class="{
      'layout-p--field': true,
      'layout-p--composite': isCompositeField(node),
      'layout-p--underline': node.underline && !isCompositeField(node),
      'layout-p--inner-border': node.innerBorder,
      'layout-node--selected': selectedNodeId === node.id,
    }"
    :style="pStyle(node)"
    :contenteditable="isCompositeField(node) ? undefined : (canFill ? 'true' : isEditable(node))"
    :data-field="node.field"
    :data-node-id="node.id"
    :draggable="nodeDraggable"
    @dragstart="onNodeDragStart(node, $event)"
    @blur="onFillBlur(node.field, $event)"
  >
    <span v-if="node.prefix" class="layout-p__label">{{ node.prefix }}</span>

    <!-- 复合字段（有前/后标签）：可输入区统一为 .layout-p__input，
         设计/预览/填写共用同一结构，仅 contenteditable 差异。 -->
    <span
      v-if="isCompositeField(node)"
      class="layout-p__input"
      :class="{ 'layout-p--underline': node.underline }"
      :style="fieldInputStyle(node)"
      :contenteditable="canFill ? 'true' : (props.readonly ? undefined : 'true')"
      :data-field="node.field"
      @blur="onFillBlur(node.field, $event)"
      ><template v-if="node.innerBorder"
        ><div
          v-for="(line, li) in fieldLines(node)"
          :key="li"
          class="layout-p__line"
        >{{ line }}</div></template
      ><template v-else>{{ fieldValue(node) }}</template></span
    >

    <!-- 非复合字段：innerBorder 时逐行渲染（v-once 静态 + 填写态 DOM 重建）。 -->
    <span
      v-else-if="node.innerBorder"
      ref="innerLinesEl"
      class="layout-p__lines"
      v-once
    ><div
        v-for="(line, li) in fieldLines(node)"
        :key="li"
        class="layout-p__line"
      >{{ line }}</div></span>

    <!-- 非复合字段：普通展示值。直接作为 <p> 的 v-else 子项（不经 <template v-else>
         包裹，否则 contenteditable <p> 的数据晚到时文本子节点不会重新 patch）。 -->
    <span v-else class="layout-p__value">{{ fieldValue(node) }}</span>

    <span v-if="node.suffix" class="layout-p__label">{{ node.suffix }}</span>
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
    :draggable="nodeDraggable"
    @dragstart="onNodeDragStart(node, $event)"
  >
    <thead>
      <tr
        class="layout-table__row layout-table__header"
        :style="[
          tableColumnStyle(node.columns),
          { minHeight: `${baseRowHeight}mm` },
        ]"
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
        v-for="rowIndex in resolveTableRowCount(node, data)"
        :key="rowIndex"
        class="layout-table__row"
        :style="[
          tableColumnStyle(node.columns),
          { minHeight: `${baseRowHeight}mm` },
        ]"
      >
        <td
          v-for="column in node.columns"
          :key="column.key"
          class="layout-table__cell"
          :style="tableCellStyle(column)"
          :data-layout-id="tableTemplate(node, column.key)?.id"
        >
          <template
            v-for="child in tableTemplate(node, column.key)?.children ?? []"
            :key="`${child.id}-${rowIndex}`"
          >
            <div
              v-if="
                dragOverCellId === tableTemplate(node, column.key)?.id &&
                dragOverIndex === 0
              "
              class="v2-insertion-line"
            ></div>
            <GridSchemaNode
              :node="bindRowCell(child, column.key, rowIndex)"
              :base-row-height="baseRowHeight"
              :selected-node-id="selectedNodeId"
              :data="data"
              :readonly="props.readonly"
              :drag-over-cell-id="dragOverCellId"
              :drag-over-index="dragOverIndex"
              @node-drag-start="(id: string) => emit('node-drag-start', id)"
              @field-change="(field: string, value: string) => emit('field-change', field, value)"
            />
          </template>
          <div
            v-if="
              dragOverCellId === tableTemplate(node, column.key)?.id &&
              dragOverIndex ===
                (tableTemplate(node, column.key)?.children.length ?? 0)
            "
            class="v2-insertion-line"
          ></div>
        </td>
      </tr>
    </tbody>
  </table>

  <HtmlBlock
    v-else-if="node.type === 'html'"
    :node="node"
    :selected-node-id="selectedNodeId"
    :data="data"
    :draggable="nodeDraggable"
    @dragstart="onNodeDragStart(node, $event)"
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
    :draggable="nodeDraggable"
    @dragstart="onNodeDragStart(node, $event)"
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

/* 相邻 Grid 外框去重（Item 2）：当与相邻兄弟 Grid 都绘制外框时，隐藏本 Grid 的
   引导侧边框（页面级 top / 单元格级 left），仅保留前者拖尾侧单线，避免重叠成 2px。
   这些规则位于 --all/--outer 之后，等特异性下靠源码顺序胜出。 */
.layout-grid--no-top {
  border-top: none;
}
.layout-grid--no-right {
  border-right: none;
}
.layout-grid--no-bottom {
  border-bottom: none;
}
.layout-grid--no-left {
  border-left: none;
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
  flex-wrap: wrap;
  width: 100%;
  min-width: 0;
  min-height: 0;
  align-self: center;
  margin: 0 1mm;
  padding: 0;
  align-items: center;
  box-sizing: border-box;
  color: #111827;
  font-size: 13px;
  line-height: 1.35;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  outline: none;
}

/* 设计态直接可编辑的 <p>（无前/后标签）：回车插入的 <div> 默认成为 flex 行内子项、
   被排成一行，导致多行换行失效（前标签非 null 时用 inline-block 的 .layout-p__input
   包裹，无此问题）。强制每个插入的 div 占满整行并换行，使多行换行生效，
   即使空字段下回车也能正常换行。复合字段的可编辑区域在 .layout-p__input（非 <p> 直接子级），
   故不受影响。
   注意：contenteditable 插入的 <div> 是浏览器运行时塞入、不带 scoped 的 data-v 属性，
   普通 `.layout-p > div`（编译为 `.layout-p[data-v] > div[data-v]`）匹配不到——
   故用 :deep() 去掉子选择器的 scope 属性，才能命中这些运行时 div。 */
.layout-p :deep(div) {
  flex: 1 1 100%;
  width: 100%;
  min-width: 0;
}

/* 内部边框（innerBorder）：为 p 标签内每一行画底边框，用于手写表单的「横线」效果。
   默认不显示（无此类）；勾选后设计态（contenteditable 回车生成的 div）/ 预览（静态
   逐行 div）/ 打印（静态渲染产出的 div）均保持显示——规则不放在任何 @media 内，
   且绘制的是真实 border（非背景图），故打印必然命中、不受浏览器「忽略背景图形」影响。 */
.layout-p--inner-border :deep(div) {
  border-bottom: 1px solid #111827;
}

.layout-text {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 0;
  align-self: center;
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

/* 设计态空字段（contenteditable 无内容）时，插入零宽行盒使光标垂直居中，
   避免光标贴着上边框；零宽为伪元素、不可被 contenteditable 删除，故清空文本后光标仍居中。 */
/* .layout-p::before {
  content: "\200b";
}
.layout-p__input::before {
  content: "\200b";
} */

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
  /* 1.35em = .layout-p 的 line-height：空值时也要占满一整行。
     若只给 1em，空的块盒比行盒矮，行盒（含光标）会向下溢出，
     表现为「光标压在底部横线的下方」（见 .layout-p__value 注释）。 */
  min-height: 1.35em;
  outline: none;
}

/* 非复合字段的展示值：原先直接作为 <p> 的文本内容渲染，但 Vue 对
   contenteditable <p> 的直接文本子节点在「数据晚于挂载到达」时不会重新 patch
   （复合字段的值放在 .layout-p__input 内则正常）。统一用 .layout-p__value 承载，
   作为 <p> 的 flex 子项填充整行，既保持版式一致，又让预览/填充态数据变化能正确刷新。 */
.layout-p__value {
  flex: 1 1 auto;
  min-width: 0;
  /* 空值兜底（关键）：该 span 作为 flex 子项会被「块化」，内容为空时高度为 0，
     于是 <p> 的内容盒塌缩成 0，只剩 1px 下边框——在单元格里（align-self:center）
     看起来就是「垂直居中的一条直线」；而光标所在的行盒仍按 line-height 从内容盒
     顶部向下撑开，于是光标落在横线下方。
     给定一个行高（1.35em，与 .layout-p 的 line-height 一致）作为最小高度，
     空字段也能占满一整行：光标在行内垂直居中、底部才是边框线（同普通 input）。
     有内容时以内容高度为准，min-height 仅作下限，不影响多行换行版式。 */
  min-height: 1.35em;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* 字段 P 已统一渲染为可编辑 <p>（预览 / 填写态与设计态同结构，行高一致），
   不再使用 textarea 控件（G11 的 textarea 分支已回退，见十续）。复合字段的可输入区
   为 .layout-p__input（设计/预览/填写共用），见上。 */

/* 内部边框逐行：静态/预览/打印态将字段值拆成每行一个 <div class="layout-p__line">，
   min-height 保证空行也有一行的高度（底边框可见）；通用 `.layout-p :deep(div)` 已让其
   占满整行换行，`.layout-p--inner-border :deep(div)` 再为每个 div 画底边框（真实边框，
   打印必然显示，不依赖背景图形）。 */
.layout-p__line {
  min-height: 1.35em;
  width: 100%;
  text-align: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* G11：innerBorder 字段在预览 / 填写下共用的逐行可编辑容器（仅 contenteditable 差异）。
   内部 .layout-p__line 的底边框由 `.layout-p--inner-border :deep(div)` 绘制，真实边框打印必显示。 */
.layout-p__lines {
  display: block;
  width: 100%;
  outline: none;
  min-height: 1.35em;
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

.v2-insertion-line {
  flex: 0 0 auto;
  width: 100%;
  height: 2px;
  margin: 1px 0;
  background: #2563eb;
  box-shadow: 0 0 0 1px rgb(37 99 235 / 40%);
  border-radius: 1px;
  pointer-events: none;
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
