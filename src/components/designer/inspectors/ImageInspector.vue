<script setup lang="ts">
/** 图片：地址 / 数据字段 / 尺寸 / 填充方式。 */
import type { ImageNodeV2 } from "@/types";
import type { SchemaEdits } from "../composables/useSchemaEdits";

defineProps<{ node: ImageNodeV2; api: SchemaEdits }>();
</script>

<template>
  <div class="v2-grid-dimensions">
    <label class="v2-control">
      <span>图片地址 / Base64</span>
      <input :value="node.src ?? ''" @input="api.updateSelectedImageSrc" />
    </label>
    <label class="v2-control">
      <span>数据字段（可选，填充态覆盖 src）</span>
      <input :value="node.field ?? ''" @input="api.updateSelectedImageField" />
    </label>
  </div>
  <div class="v2-grid-dimensions">
    <label class="v2-control">
      <span>宽(mm)</span>
      <input
        type="number"
        min="0"
        :value="node.width ?? ''"
        @change="api.updateSelectedImageSize('width', $event)"
      />
    </label>
    <label class="v2-control">
      <span>高(mm)</span>
      <input
        type="number"
        min="0"
        :value="node.height ?? ''"
        @change="api.updateSelectedImageSize('height', $event)"
      />
    </label>
  </div>
  <label class="v2-control">
    <span>填充方式</span>
    <select :value="node.objectFit ?? 'contain'" @change="api.updateSelectedImageFit">
      <option value="contain">contain</option>
      <option value="cover">cover</option>
      <option value="fill">fill</option>
    </select>
  </label>
</template>
