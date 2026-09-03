<script setup lang="ts">
import { computed, onUnmounted, watch } from "vue";
import type { CSSProperties } from "vue";
import {
  resolvePaperSizeV2,
  type FormSchemaV2,
  type FormDataV2,
  type FormNodeV2,
  type EdgeInsetsV2,
} from "@/types";
import GridSchemaNode from "./GridSchemaNode.vue";
import { registerPageSizeStyle, setPageSizeStyle } from "./page-size-style";
import type { PhysicalPage } from "@/engine-v2/pagination";
import { paginatePage } from "@/engine-v2/pagination";

defineOptions({ name: "GridFormRenderer" });

const emit = defineEmits<{
  (e: "node-drag-start", id: string): void;
  (e: "field-change", field: string, value: string): void;
}>();

const props = withDefaults(
  defineProps<{
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
    /**
     * 分页开关（默认 true）：预览/填写/打印时按纸张正文高度把超高内容切成多个物理页；
     * 设计态传 false，整页连续渲染便于编辑（不切分）。
     */
    paginate?: boolean;
  }>(),
  { paginate: true },
);

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

/**
 * 纸张尺寸：**高度固定为整纸高**（`height`，而非 `min-height`）。
 *
 * 之所以不用 `min-height`：`min-height` 只设下限，内容超高时纸张会被无限撑开，
 * 永远看不出「内容已经超出一张纸」——这正是分页要解决的问题。
 * 固定高度后：
 * - 分页开启（预览/填写/打印）：分页引擎已保证每页内容 ≤ 正文可用高
 *   （`heightMm − margin.top − margin.bottom`），纸张恰好等于一张纸；
 * - 分页关闭（设计态整页编辑）：超高内容会溢出到纸张之外的灰底上，
 *   即「内容超出纸张」的可见反馈，而不是把纸悄悄撑长。
 *
 * 配合 `.grid-form-paper` 的 `box-sizing: border-box`，内容盒高度恰为正文可用高，
 * 与分页引擎的 `bodyHeightMm` 口径一致。
 */
function paperStyle(margin: EdgeInsetsV2): CSSProperties {
  const size = paperSize.value;
  return {
    width: `${size.widthMm}mm`,
    height: `${size.heightMm}mm`,
    padding: `${margin.top}mm ${margin.right}mm ${margin.bottom}mm ${margin.left}mm`,
  };
}

/**
 * 渲染用物理页列表：
 * - 分页开启（预览/填写/打印）：对每个逻辑页跑分页引擎，得到若干物理页，每页只放得下的节点/网格片段。
 * - 分页关闭（设计态）：每个逻辑页原样作为一页，整页连续渲染（不切分，便于编辑）。
 *
 * 物理页的 `children` 为节点或裁剪了 rows 的 Grid 片段（`FormNodeV2`），可直接喂给 `GridSchemaNode`。
 */
const renderedPages = computed<PhysicalPage[]>(() => {
  const size = paperSize.value;
  if (!props.paginate) {
    return props.schema.pages.map((page, i) => ({
      id: page.id,
      sourcePageId: page.id,
      sourceIndex: i,
      index: i + 1,
      margin: page.margin,
      children: page.children.map((node) => ({ node })),
    }));
  }
  const pages: PhysicalPage[] = [];
  for (const page of props.schema.pages) {
    const bodyHeightMm = size.heightMm - page.margin.top - page.margin.bottom;
    const contentWidthMm = size.widthMm - page.margin.left - page.margin.right;
    const result = paginatePage(page, {
      baseRowHeight: props.schema.baseRowHeight,
      bodyHeightMm,
      contentWidthMm,
      data: props.data ?? null,
    });
    pages.push(...result.pages);
  }
  pages.forEach((p, i) => (p.index = i + 1));
  return pages;
});

/**
 * 合并边框抑制：兄弟级去重（相邻外框 Grid 抑制后一个 top）与跨页片段的连续外观抑制。
 * 跨页片段自身的 top/bottom 抑制优先（连续外观），兄弟去重仅补充其未涉及的侧。
 */
function suppressFor(
  pp: PhysicalPage,
  ci: number,
  own?: PhysicalPage["children"][number]["suppressBorders"],
) {
  const sibling = pageSiblingSuppressBorders(pp.children.map((c) => c.node), ci);
  return { ...sibling, ...(own ?? {}) };
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
      v-for="pp in renderedPages"
      :key="pp.id"
      class="grid-form-paper"
      :class="{ 'grid-form-paper--selected': selectedNodeId === pp.id }"
      :style="paperStyle(pp.margin)"
      :data-node-id="pp.id"
    >
      <GridSchemaNode
        v-for="(child, index) in pp.children"
        :key="child.node.id"
        :node="child.node"
        :base-row-height="schema.baseRowHeight"
        :selected-node-id="selectedNodeId"
        :data="data"
        :readonly="props.readonly"
        :suppress-borders="suppressFor(pp, index, child.suppressBorders)"
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
