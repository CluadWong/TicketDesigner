<script setup lang="ts">
import { computed, onUnmounted, watch } from "vue";
import type { CSSProperties } from "vue";
import {
  resolvePaperSizeV2,
  type FormSchemaV2,
  type FormDataV2,
  type FormNodeV2,
} from "@/types";
import GridSchemaNode from "./GridSchemaNode.vue";
import { registerPageSizeStyle, setPageSizeStyle } from "./page-size-style";

defineOptions({ name: "GridFormRenderer" });

const emit = defineEmits<{
  (e: "node-drag-start", id: string): void;
  (e: "field-change", field: string, value: string): void;
}>();

const props = defineProps<{
  schema: FormSchemaV2;
  selectedNodeId?: string | null;
  /** 填充态数据；为空时进入设计态（字段可编辑）。 */
  data?: FormDataV2 | null;
  /**
   * 只读预览：带数据渲染但字段不可输入（预览态）。
   * 与 `data` 同时传入时用于「预览」而非「填充」——两者都显示数据，
   * 区别只在于是否允许编辑。
   */
  readonly?: boolean;
  /** 拖拽重排（P9）：当前悬停投放格与插入下标，透传给渲染树绘制插入指示线。 */
  dragOverCellId?: string | null;
  dragOverIndex?: number | null;
  /**
   * 无外壳模式（G8/G10）：去掉灰底纸张画布外壳（padding / 背景 / 阴影），
   * 仅渲染纸张 `<main>`，便于消费页把表单嵌入自身页面中部（而非模拟整张纸）。
   */
  bare?: boolean;
}>();

/** 纸张物理尺寸（mm），方向由纸张尺寸派生（A4 纵向 / A3 横向）。
 *  与打印 `@page`、溢出校验共用 `resolvePaperSizeV2`，避免各处硬编码。 */
const paperSize = computed(() => resolvePaperSizeV2(props.schema.paper));

/**
 * 打印纸张尺寸（P11-3 修复）：把当前纸张宽高写入全局 `@page` 规则。
 * `@page` 是页面级规则，无法写成 scoped 样式也无法用 Vue 绑定，故由内核在运行时注入；
 * 纸张切换（A4 ↔ A3）时同步更新，实例卸载时释放（见 `page-size-style.ts`）。
 * 修复前该规则在设计器里写死 `size: A4`，导致选 A3 横向时渲染正常、打印仍按 A4 出页而内容被裁。
 */
watch(
  paperSize,
  (size) => setPageSizeStyle(size.widthMm, size.heightMm),
  { immediate: true },
);
onUnmounted(registerPageSizeStyle());

function paperStyle(page: FormSchemaV2["pages"][number]): CSSProperties {
  const size = paperSize.value;
  return {
    width: `${size.widthMm}mm`,
    minHeight: `${size.heightMm}mm`,
    padding: `${page.margin.top}mm ${page.margin.right}mm ${page.margin.bottom}mm ${page.margin.left}mm`,
  };
}

/** 相邻 Grid 外框去重（Item 2）：页面子节点竖向堆叠，相邻且都绘制外框的 Grid，
 *  抑制后一个 Grid 的上边框（保留前一个的下边框单线）。非 Grid / 非外框节点返回 undefined。 */
function pageSiblingSuppressBorders(children: FormNodeV2[], index: number): { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean } | undefined {
  const node = children[index];
  const draws = node.type === "grid" && (node.border === "all" || node.border === "outer");
  if (!draws) return undefined;
  const prev = children[index - 1];
  const prevBordered = !!prev && prev.type === "grid" && (prev.border === "all" || prev.border === "outer");
  return { top: prevBordered };
}
</script>

<template>
  <div class="grid-form-canvas" :class="{ 'grid-form-canvas--bare': bare }">
    <main
      v-for="page in schema.pages"
      :key="page.id"
      class="grid-form-paper"
      :class="{ 'grid-form-paper--selected': selectedNodeId === page.id }"
      :style="paperStyle(page)"
      :data-node-id="page.id"
    >
      <GridSchemaNode
        v-for="(node, index) in page.children"
        :key="node.id"
        :node="node"
        :base-row-height="schema.baseRowHeight"
        :selected-node-id="selectedNodeId"
        :data="data"
        :readonly="props.readonly"
        :suppress-borders="pageSiblingSuppressBorders(page.children, index)"
        :drag-over-cell-id="dragOverCellId"
        :drag-over-index="dragOverIndex"
        @node-drag-start="(id) => emit('node-drag-start', id)"
        @field-change="(field, value) => emit('field-change', field, value)"
      />
    </main>
  </div>
</template>

<style scoped>
.grid-form-canvas {
  height: 100%;
  overflow: auto;
  padding: 24px;
  background: #e5e7eb;
  box-sizing: border-box;
}

/* 无外壳模式（G8/G10）：消费页嵌入场景，去掉灰底画布与留白，仅渲染纸张。 */
.grid-form-canvas--bare {
  height: auto;
  padding: 0;
  background: transparent;
  overflow: visible;
}

.grid-form-paper {
  margin: 0 auto 24px;
  background: white;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgb(15 23 42 / 14%);
}

.grid-form-paper--selected {
  box-shadow: inset 0 0 0 3px #2563eb, 0 4px 12px rgb(15 23 42 / 14%);
}

@media print {
  .grid-form-canvas {
    height: auto;
    padding: 0;
    overflow: visible;
    background: white;
  }

  .grid-form-paper {
    margin: 0;
    box-shadow: none;
    break-after: page;
  }

  .grid-form-paper--selected {
    box-shadow: none;
  }

  .grid-form-paper:last-child {
    break-after: auto;
  }
}
</style>
