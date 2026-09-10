<script setup lang="ts">
/** 文本样式字段组（text / p 共用）：字号 / 行高 / 粗细 / 颜色 / 对齐 / 字体。 */
import type { TextStyleV2 } from "@/types";
import type { SchemaEdits } from "../composables/useSchemaEdits";

defineProps<{ style?: TextStyleV2; api: SchemaEdits }>();
</script>

<template>
  <div class="v2-sidebar__subheading">文本样式</div>
  <div class="v2-style-grid">
    <label class="v2-control v2-control--inline">
      <span>字号(px)</span>
      <input
        type="number"
        min="1"
        step="1"
        :value="style?.fontSize ?? ''"
        @change="api.updateSelectedFontSize"
      />
    </label>
    <label class="v2-control v2-control--inline">
      <span>行高</span>
      <input
        type="number"
        min="0"
        step="0.1"
        :value="style?.lineHeight ?? ''"
        @change="api.updateSelectedLineHeight"
      />
    </label>
    <label class="v2-control v2-control--inline">
      <span>粗细</span>
      <select
        :value="style?.fontWeight ?? 'normal'"
        @change="api.updateSelectedFontWeight"
      >
        <option value="normal">常规</option>
        <option value="bold">加粗</option>
      </select>
    </label>
    <label class="v2-control v2-control--inline">
      <span>颜色</span>
      <input
        type="color"
        :value="style?.color ?? '#111827'"
        @input="api.updateSelectedColor"
      />
    </label>
  </div>
  <div class="v2-grid-dimensions">
    <label class="v2-control">
      <span>水平对齐</span>
      <select :value="style?.align ?? 'left'" @change="api.updateSelectedAlign">
        <option value="left">左</option>
        <option value="center">居中</option>
        <option value="right">右</option>
      </select>
    </label>
    <label class="v2-control">
      <span>垂直对齐</span>
      <select
        :value="style?.verticalAlign ?? 'middle'"
        @change="api.updateSelectedVerticalAlign"
      >
        <option value="top">顶部</option>
        <option value="middle">居中</option>
        <option value="bottom">底部</option>
      </select>
    </label>
    <label class="v2-control v2-control--full">
      <span>字体</span>
      <input :value="style?.fontFamily ?? ''" @input="api.updateSelectedFontFamily" />
    </label>
  </div>
</template>
