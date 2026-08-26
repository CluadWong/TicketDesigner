<script setup lang="ts">
import { computed } from "vue";
import type { CSSProperties } from "vue";
import type { FormSchemaV2 } from "@/types";
import GridSchemaNode from "./GridSchemaNode.vue";

const props = defineProps<{
  schema: FormSchemaV2;
  selectedNodeId?: string | null;
}>();

const paperSize = computed(() => {
  const isA4 = props.schema.paper.size === "A4";
  const shortSide = isA4 ? 210 : 297;
  const longSide = isA4 ? 297 : 420;
  return props.schema.paper.orientation === "portrait"
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
</script>

<template>
  <div class="grid-schema-canvas">
    <main
      v-for="page in schema.pages"
      :key="page.id"
      class="grid-schema-paper"
      :class="{ 'grid-schema-paper--selected': selectedNodeId === page.id }"
      :style="paperStyle(page)"
      :data-node-id="page.id"
    >
      <GridSchemaNode
        v-for="node in page.children"
        :key="node.id"
        :node="node"
        :base-row-height="schema.baseRowHeight"
        :selected-node-id="selectedNodeId"
      />
    </main>
  </div>
</template>

<style scoped>
.grid-schema-canvas {
  height: 100%;
  overflow: auto;
  padding: 24px;
  background: #e5e7eb;
  box-sizing: border-box;
}

.grid-schema-paper {
  margin: 0 auto 24px;
  background: white;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgb(15 23 42 / 14%);
}

.grid-schema-paper--selected {
  box-shadow: inset 0 0 0 3px #2563eb, 0 4px 12px rgb(15 23 42 / 14%);
}

@media print {
  .grid-schema-canvas {
    height: auto;
    padding: 0;
    overflow: visible;
    background: white;
  }

  .grid-schema-paper {
    margin: 0;
    box-shadow: none;
    break-after: page;
  }

  .grid-schema-paper--selected {
    box-shadow: none;
  }

  .grid-schema-paper:last-child {
    break-after: auto;
  }
}
</style>
