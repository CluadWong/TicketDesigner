<script setup lang="ts">
import { computed } from "vue";
import type { CSSProperties } from "vue";
import type { FormSchemaV2, FormDataV2, FormNodeV2 } from "@/types";
import GridSchemaNode from "./GridSchemaNode.vue";

defineOptions({ name: "GridFormRenderer" });

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
}>();

const paperSize = computed(() => {
  const isA4 = props.schema.paper.size === "A4";
  const shortSide = isA4 ? 210 : 297;
  const longSide = isA4 ? 297 : 420;
  // 方向由纸张尺寸派生（去掉方向选择）：A4 → 纵向，A3 → 横向。
  const orientation = isA4 ? "portrait" : "landscape";
  return orientation === "portrait"
    ? { width: shortSide, height: longSide }
    : { width: longSide, height: shortSide };
});

function paperStyle(page: FormSchemaV2["pages"][number]): CSSProperties {
  const size = paperSize.value;
  return {
    width: `${size.width}mm`,
    minHeight: `${size.height}mm`,
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
  <div class="grid-form-canvas">
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
