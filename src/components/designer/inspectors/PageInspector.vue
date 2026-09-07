<script setup lang="ts">
/** 页面设置：纸张 / 边距 / 基础行高 / 分页开关（Inspector 组件化，2026-09-07 批次 2）。 */
import type { FormSchemaV2 } from "@/types";
import type { SchemaEdits } from "../composables/useSchemaEdits";

defineProps<{
  paperSize: FormSchemaV2["paper"]["size"];
  baseRowHeight: number;
  paperMargin: number;
  api: SchemaEdits;
}>();

const paginate = defineModel<boolean>("paginate", { required: true });
</script>

<template>
  <div class="v2-sidebar__subheading">页面设置</div>
  <label class="v2-control v2-control--inline">
    <span>纸张类型</span>
    <select :value="paperSize" @change="api.updatePaperSize">
      <option value="A4">A4（纵向）</option>
      <option value="A3">A3（横向）</option>
    </select>
  </label>
  <label class="v2-control v2-control--inline">
    <span>纸张边距(mm)</span>
    <input
      type="number"
      min="0"
      max="99"
      step="1"
      :value="paperMargin"
      @change="api.updatePaperMargin"
    />
  </label>
  <label class="v2-control v2-control--inline">
    <span>行高(mm)</span>
    <input
      type="number"
      min="1"
      max="99"
      step="1"
      :value="baseRowHeight"
      @change="api.updateBaseRowHeight"
    />
  </label>
  <label class="v2-control v2-control--toggle">
    <input v-model="paginate" type="checkbox" data-paginate="true" />
    <span>分页（仅设计态生效）</span>
  </label>
</template>
