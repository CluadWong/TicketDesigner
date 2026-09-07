<script setup lang="ts">
/** 字段 P：字段名 / 前后标签 / 外部组件 action / 文本样式 / 默认值 / 宽度 / 内部边框。 */
import type { FieldPNodeV2 } from "@/types";
import type { SchemaEdits } from "../composables/useSchemaEdits";
import TextStyleFields from "./TextStyleFields.vue";

defineProps<{ node: FieldPNodeV2; api: SchemaEdits }>();
</script>

<template>
  <label class="v2-control">
    <span>字段名</span>
    <input :value="node.field" @input="api.updateSelectedField" />
  </label>
  <div class="v2-grid-dimensions">
    <label class="v2-control">
      <span>前标签（可选）</span>
      <input :value="node.prefix ?? ''" @input="api.updateSelectedPrefix" />
    </label>
    <label class="v2-control">
      <span>后标签（可选）</span>
      <input :value="node.suffix ?? ''" @input="api.updateSelectedSuffix" />
    </label>
  </div>
  <label class="v2-control">
    <span>外部组件（action）</span>
    <select :value="node.action ?? 'text'" @change="api.updateSelectedAction">
      <option value="text">无（纯文本输入）</option>
      <option value="date">日期选择器</option>
      <option value="signature">签名板</option>
      <option value="upload">文件上传</option>
      <option value="safetyGraphic">图形安措</option>
    </select>
  </label>
  <label v-if="node.action === 'safetyGraphic'" class="v2-control">
    <span>安措匹配字段</span>
    <input
      type="text"
      :value="node.actionParams?.matchField ?? ''"
      @change="api.updateSelectedSafetyField"
    />
  </label>
  <TextStyleFields :style="node.style" :api="api" />
  <label class="v2-control v2-control--full">
    <span>默认内容</span>
    <textarea
      class="v2-textarea"
      rows="3"
      data-field-default="true"
      :value="node.default ?? ''"
      @input="api.updateSelectedDefault"
    ></textarea>
  </label>
  <div class="v2-grid-dimensions">
    <label class="v2-control">
      <span>输入区宽度（mm / 1px / %）</span>
      <input
        data-field-width="true"
        :value="node.width ?? ''"
        @input="api.updateSelectedWidth"
      />
    </label>
    <label class="v2-control">
      <span>内部边框</span>
      <input
        type="checkbox"
        data-field-inner-border="true"
        :checked="node.innerBorder ?? false"
        @change="api.updateSelectedInnerBorder"
      />
    </label>
  </div>
</template>
