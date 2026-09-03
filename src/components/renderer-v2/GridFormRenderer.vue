<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
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
import { paginatePage, paginateSchema } from "@/engine-v2/pagination";

defineOptions({ name: "GridFormRenderer" });

const emit = defineEmits<{
  (e: "field-change", field: string, value: string): void;
}>();

const props = withDefaults(
  defineProps<{
    schema: FormSchemaV2;
    /**
     * 渲染模式（A1 / A5 分层重构）：显式声明调用方意图，取代旧版靠 `data != null` 推断三态。
     * - design：设计态，字段以 contenteditable 就地占位（不回写 schema），结构可编辑。
     * - preview：只读回显，带数据但字段不可输入。
     * - fill：可填写，带数据且字段为真实可编辑控件。
     * 未传时向后兼容：有 `data` 且非 `readonly` → fill，有 `data` 且 `readonly` → preview，否则 design。
     */
    mode?: "design" | "preview" | "fill";
    /** 填充/预览态数据；用于字段取值与 Table 行数推导。设计态可为空（字段显示 default/占位）。 */
    data?: FormDataV2 | null;
    /**
     * 只读预览：带数据渲染但字段不可输入（预览态）。与 `mode` 同时传入时以 `mode` 为准，
     * 此属性保留作向后兼容的兜底闸门。
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
 * 纸张尺寸：
 * - **分页开启**（`height` 固定为整纸高）：分页引擎已保证每页内容 ≤ 正文可用高
 *   （`heightMm − margin.top − margin.bottom`），纸张恰好等于一张纸；配合 `box-sizing: border-box`，
 *   内容盒高度恰为正文可用高，与分页引擎的 `bodyHeightMm` 口径一致。
 * - **分页关闭**（设计态整页连续编辑）：改用 `min-height`。此时不做切分，内容可能远超一张纸；
 *   用 `min-height` 让纸张随内容长高，内容落在纸内（而非溢出纸外、跑到灰底上）。
 *
 * 之所以分页开启用 `height` 而非 `min-height`：`min-height` 只设下限，会让单物理页被无限撑开、
 * 看不出「已超出一张纸」；而分页本就会把内容切走，固定高度恰为一张纸。
 */
function paperStyle(margin: EdgeInsetsV2): CSSProperties {
  const size = paperSize.value;
  const useFixed = props.paginate;
  return {
    width: `${size.widthMm}mm`,
    ...(useFixed
      ? { height: `${size.heightMm}mm` }
      : { minHeight: `${size.heightMm}mm` }),
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
 * 自动分页校正（2026-09-03 二十续）：确定性分页按 `row.height × baseRowHeight` 估算行高，
 * 多行字段、换行文本、超大图片等实际渲染高度往往更高，导致「本应换页」的页被判定为放得下、
 * 实际渲染却溢出纸外。这里在浏览器里测量每个 Grid 行的真实渲染高度，用测量结果二次分页，
 * 保证内容超高一律自动换页、永不溢出纸外（设计态与渲染态共用同一通道，因都在本内核内）。
 *
 * 纯测试 / SSR 环境无真实布局 → `getBoundingClientRect().height` 为 0，测量跳过，
 * 回退到确定性分页（测试即基于此路径，结果稳定可断言）。
 */
const PX_PER_MM = 96 / 25.4;
const measuredPages = ref<PhysicalPage[] | null>(null);

function measureRowHeights(): Map<string, number> | null {
  if (typeof document === "undefined") return null;
  const map = new Map<string, number>();
  document
    .querySelectorAll<HTMLElement>(".grid-form-paper .layout-grid__row")
    .forEach((el) => {
      const id = el.dataset.layoutId;
      if (!id) return;
      const h = el.getBoundingClientRect().height / PX_PER_MM;
      if (Number.isFinite(h) && h > 0) map.set(id, h);
    });
  return map.size ? map : null;
}

function correctPagination(): void {
  if (!props.paginate || typeof document === "undefined") {
    measuredPages.value = null;
    return;
  }
  const rowHeights = measureRowHeights();
  if (!rowHeights) return;
  const result = paginateSchema(props.schema, {
    data: props.data ?? null,
    measureRow: (row) => rowHeights.get(row.id),
  });
  measuredPages.value = result.pages;
}

// 确定性分页结果渲染到 DOM 后，按真实测量高度校正一次（flush:'post' + nextTick 确保已绘制）。
watch(renderedPages, () => nextTick(correctPagination), { flush: "post" });
onMounted(() => nextTick(correctPagination));

/** 最终渲染的物理页：浏览器里经真实高度校正，否则用确定性分页（测试 / SSR 回退）。 */
const displayedPages = computed<PhysicalPage[]>(() => measuredPages.value ?? renderedPages.value);

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
      v-for="pp in displayedPages"
      :key="pp.id"
      class="grid-form-paper"
      :style="paperStyle(pp.margin)"
      :data-node-id="pp.id"
    >
      <GridSchemaNode
        v-for="(child, index) in pp.children"
        :key="child.node.id"
        :node="child.node"
        :base-row-height="schema.baseRowHeight"
        :mode="props.mode"
        :data="data"
        :readonly="props.readonly"
        :suppress-borders="suppressFor(pp, index, child.suppressBorders)"
        :drag-over-cell-id="dragOverCellId"
        :drag-over-index="dragOverIndex"
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

  .grid-form-paper:last-child {
    break-after: auto;
  }
}
</style>
