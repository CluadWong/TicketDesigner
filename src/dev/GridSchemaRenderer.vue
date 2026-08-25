<script setup lang="ts">
import { computed } from "vue";
import type { CSSProperties } from "vue";
import type { GridLayoutSchema } from "./grid-layout-schema";
import GridSchemaNode from "./GridSchemaNode.vue";

const props = defineProps<{ schema: GridLayoutSchema }>();

const paperStyle = computed<CSSProperties>(() => {
  const isA4 = props.schema.paper.size === "A4";
  const portrait = props.schema.paper.orientation === "portrait";
  const shortSide = isA4 ? 210 : 297;
  const longSide = isA4 ? 297 : 420;
  return {
    width: `${portrait ? shortSide : longSide}mm`,
    minHeight: `${portrait ? longSide : shortSide}mm`,
    padding: `${props.schema.margin}mm`,
  };
});
</script>

<template>
  <div class="grid-schema-canvas">
    <main class="grid-schema-paper" :style="paperStyle">
      <GridSchemaNode
        v-if="schema.title"
        class="grid-schema-title"
        :node="schema.title"
        :base-row-height="schema.baseRowHeight"
      />
      <GridSchemaNode :node="schema.body" :base-row-height="schema.baseRowHeight" />
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
  margin: 0 auto;
  background: white;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgb(15 23 42 / 14%);
}

.grid-schema-title {
  min-height: 15mm;
  margin-bottom: 2mm;
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
  }
}
</style>
