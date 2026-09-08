<script setup lang="ts">
/** 页面设置：纸张 / 四边边距 / 基础行高 / 分页开关 / 页眉 / 页脚（Inspector 组件化，2026-09-07 批次 2）。 */
import type { FormSchemaV2, HeaderFooterV2 } from "@/types";
import type { SchemaEdits } from "../composables/useSchemaEdits";
import HeaderFooterFields from "./HeaderFooterFields.vue";

defineProps<{
  paperSize: FormSchemaV2["paper"]["size"];
  baseRowHeight: number;
  /** 四边边距（mm），独立配置。 */
  paperMarginTop: number;
  paperMarginRight: number;
  paperMarginBottom: number;
  paperMarginLeft: number;
  /** 页眉（paper 级全局配置，作用于所有物理页）。 */
  header?: HeaderFooterV2;
  /** 页脚（paper 级全局配置，作用于所有物理页）。 */
  footer?: HeaderFooterV2;
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
  <div class="v2-grid-dimensions">
    <label class="v2-control v2-control--inline">
      <span>上边距(mm)</span>
      <input
        type="number"
        min="0"
        max="99"
        step="1"
        :value="paperMarginTop"
        @change="api.updatePaperMarginSide('top', $event)"
      />
    </label>
    <label class="v2-control v2-control--inline">
      <span>右边距(mm)</span>
      <input
        type="number"
        min="0"
        max="99"
        step="1"
        :value="paperMarginRight"
        @change="api.updatePaperMarginSide('right', $event)"
      />
    </label>
    <label class="v2-control v2-control--inline">
      <span>下边距(mm)</span>
      <input
        type="number"
        min="0"
        max="99"
        step="1"
        :value="paperMarginBottom"
        @change="api.updatePaperMarginSide('bottom', $event)"
      />
    </label>
    <label class="v2-control v2-control--inline">
      <span>左边距(mm)</span>
      <input
        type="number"
        min="0"
        max="99"
        step="1"
        :value="paperMarginLeft"
        @change="api.updatePaperMarginSide('left', $event)"
      />
    </label>
  </div>
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
    <span>分页显示（仅影响编辑画面，打印始终分页）</span>
  </label>
  <HeaderFooterFields
    label="页眉"
    kind="header"
    :band="header"
    :margin="paperMarginTop"
    :api="api"
  />
  <HeaderFooterFields
    label="页脚"
    kind="footer"
    :band="footer"
    :margin="paperMarginBottom"
    :api="api"
  />
</template>
