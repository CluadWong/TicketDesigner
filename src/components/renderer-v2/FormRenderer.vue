<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { FormDataV2, FormSchemaV2 } from "@/types";
import GridFormRenderer from "./GridFormRenderer.vue";

/** 渲染模式：preview=只读回显（消费页浏览详情）；fill=可填写（消费页录入）。 */
export type FormRendererMode = "preview" | "fill";

/** 渲染形态选项（G10 部分落地：当前支持 `bare`）。 */
export interface FormRendererOptions {
  /** 无外壳：去掉灰底纸张画布，便于嵌入消费页中部（G8 / G10）。 */
  bare?: boolean;
}

/**
 * 公共渲染入口（G8）：消费页引用渲染器的唯一公开组件。
 *
 * 设计器（DesignerApp）仍直接引用内核 `GridFormRenderer`；本组件是在内核之上收敛出的
 * 「消费页友好」包装——props 收敛为 `schema / data / mode / options`，不暴露任何设计器私有状态
 * （`selectedNodeId` / 拖拽态 / `node-drag-start`），从而可被独立引用与库化。
 *
 * 消费页典型流程：拿到 JSON 字符串 → `parseTolerantFormSchemaV2(json).schema` →
 * `<FormRenderer :schema="schema" v-model:data="data" mode="fill" />`。
 */
const props = withDefaults(
  defineProps<{
    /** 设计器导出的 Schema（消费页由 json + 容错解析得到）。 */
    schema: FormSchemaV2;
    /** 字段数据；缺省为空（预览/设计态显示静态内容或 default）。 */
    data?: FormDataV2 | null;
    /** 渲染模式：preview=只读回显，fill=可填写。默认 preview。 */
    mode?: FormRendererMode;
    /** 渲染形态选项（G10 部分落地：当前支持 bare）。 */
    options?: FormRendererOptions;
  }>(),
  { mode: "preview", options: () => ({}) },
);

const emit = defineEmits<{
  (e: "field-change", field: string, value: string): void;
  (e: "update:data", data: FormDataV2): void;
}>();

// 内部持有 data，使填充态输入可回写并被消费页 v-model:data 接管。
const data = ref<FormDataV2>({ ...(props.data ?? {}) });
watch(
  () => props.data,
  (next) => {
    data.value = { ...(next ?? {}) };
  },
);

const readonly = computed(() => props.mode !== "fill");

/**
 * G15（A4）契约化：内核（GridFormRenderer → GridSchemaNode）在填写态 emit `field-change`，
 * 此处统一收口——写回内部响应式 data 并 re-emit `field-change` / `update:data`，
 * 使消费页用 `v-model:data` 即可拿到实时填写结果，无需任何 provide / inject 约定。
 */
function onFieldChange(field: string, value: string): void {
  data.value = { ...data.value, [field]: value };
  emit("update:data", data.value);
  emit("field-change", field, value);
}
</script>

<template>
  <GridFormRenderer
    :schema="schema"
    :data="data"
    :readonly="readonly"
    :bare="options?.bare"
    @field-change="onFieldChange"
  />
</template>
