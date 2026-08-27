<script setup lang="ts">
import GridSchemaNode from "@/dev/GridSchemaNode.vue";
import type { FormNodeV2 } from "@/types";

defineOptions({ name: "GridSchemaNodeV2" });

defineProps<{
  node: FormNodeV2;
  baseRowHeight: number;
  selectedNodeId?: string | null;
}>();
</script>

<template>
  <GridSchemaNode
    :node="node"
    :base-row-height="baseRowHeight"
    :selected-node-id="selectedNodeId"
  />
</template>
