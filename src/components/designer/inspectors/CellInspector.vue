<script setup lang="ts">
/** 单元格（grid-cell）：仅样式覆盖（padding / 行高 / 对齐）+ 合并拆分。 */
import type { GridCellV2 } from "@/types";
import type { SchemaEdits } from "../composables/useSchemaEdits";

defineProps<{
  node: GridCellV2;
  cellContext: {
    rowIndex: number;
    columnIndex: number;
    hasNextSibling: boolean;
    canSplit: boolean;
  } | null;
  cellBox: { align?: string; verticalAlign?: string } | null;
  api: SchemaEdits;
}>();
</script>

<template>
  <label class="v2-control v2-control--inline">
    <span>弹性布局</span>
    <input
      type="checkbox"
      data-flex="true"
      :checked="!!node.flex"
      @change="api.updateSelectedCellFlex"
    />
  </label>
  <div class="v2-sidebar__subheading">合并 / 拆分</div>
  <div class="v2-toolbar v2-toolbar--row">
    <button
      class="v2-toolbar__button"
      type="button"
      data-cell-merge="true"
      :disabled="!cellContext?.hasNextSibling"
      @click="api.mergeSelectedCellRight"
    >
      合并右侧相邻格
    </button>
    <button
      class="v2-toolbar__button"
      type="button"
      data-cell-split="true"
      :disabled="!cellContext?.canSplit"
      @click="api.splitSelectedCell"
    >
      拆分此格
    </button>
  </div>
  <div class="v2-grid-dimensions">
    <label class="v2-control">
      <span>内边距(padding, mm)</span>
      <input
        type="number"
        min="0"
        step="1"
        data-cell-padding="true"
        :value="node.padding ?? ''"
        @change="api.updateSelectedCellPadding"
      />
    </label>
    <label class="v2-control">
      <span>行高倍数</span>
      <input
        type="number"
        min="0"
        step="1"
        :value="node.rowHeight ?? ''"
        @change="api.updateSelectedCellRowHeight"
      />
    </label>
    <label class="v2-control">
      <span>水平对齐</span>
      <select :value="node.align ?? ''" @change="api.updateSelectedCellAlign">
        <option value="">默认（居中）</option>
        <option value="left">左</option>
        <option value="center">居中</option>
        <option value="right">右</option>
      </select>
    </label>
    <label class="v2-control">
      <span>垂直对齐</span>
      <select
        :value="node.verticalAlign ?? ''"
        @change="api.updateSelectedCellVerticalAlign"
      >
        <option value="">默认（继承 Grid）</option>
        <option value="top">顶部</option>
        <option value="middle">居中</option>
        <option value="bottom">底部</option>
      </select>
    </label>
  </div>
</template>
