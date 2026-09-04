<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { FormDataV2, FormSchemaV2 } from "@/types";
import GridFormRenderer from "./GridFormRenderer.vue";
import PaperViewport from "./PaperViewport.vue";
import { printForm } from "./print-form";

/** 渲染模式：preview=消费模板预览（默认可输入数据，配合业务流程流转）；fill=可填写（消费页录入）。两者口径一致，是否只读由 `options.readonly` 决定。 */
export type FormRendererMode = "preview" | "fill";

/** 渲染形态选项（G10 部分落地：当前支持 `bare` / `zoom` / `readonly`）。 */
export interface FormRendererOptions {
  /** 无外壳：去掉灰底纸张画布，便于嵌入消费页中部（G8 / G10）。 */
  bare?: boolean;
  /**
   * 启用纸张视口缩放（浏览 / 移动端查看）：包一层可平移缩放的视口。
   * 启用时强制 `bare`（缩放态由视口管理，内核画布不再自带滚动/灰底），
   * 缩放条与滚轮 / 双指捏合由视口提供；打印时缩放被 `@media print` 复位，走真实 mm。
   */
  zoom?: boolean;
  /**
   * 缩放视口挂载后自动适应宽度（窄屏 / 移动端查看场景）。仅当 `zoom` 为真时生效。
   * 默认 false（保持 100%）；窄屏传 true 可让表单自动铺满视口宽度。
   */
  fitOnMount?: boolean;
  /**
   * 只读闸门（与 `mode` **正交**）：默认 false —— preview / fill 两种模式都允许字段输入
   * （契合「预览即消费模板、输入数据以配合业务流程流转」的语义，三态口径一致）。
   * 设为 true 时强制只读回显（字段不可编辑），用于「仅浏览详情、不录入」的消费场景。
   */
  readonly?: boolean;
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

// 只读闸门与 mode 正交：默认 false → preview / fill 都可输入（消费态口径一致）。
// 需要「仅浏览详情」时由消费页显式传 options.readonly=true。
const readonly = computed(() => props.options?.readonly ?? false);

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

/**
 * D2：向消费页暴露打印能力，使「触发」与「呈现」同归渲染层。
 * 消费页 `ref.value.print()` 即可打印，无需自己 `window.print()`、也无需关心
 * `@page` 纸张注入（由本组件持有内核渲染实例在挂载期完成）。
 * @returns 是否真的触发了打印（宿主不支持时为 `false`）。
 */
function print(): boolean {
  return printForm();
}

defineExpose({ print });
</script>

<template>
  <PaperViewport v-if="options?.zoom" :fit-on-mount="options?.fitOnMount ?? false">
    <GridFormRenderer
      :schema="schema"
      :mode="props.mode"
      :data="data"
      :readonly="readonly"
      :bare="true"
      @field-change="onFieldChange"
    />
  </PaperViewport>
  <GridFormRenderer
    v-else
    :schema="schema"
    :mode="props.mode"
    :data="data"
    :readonly="readonly"
    :bare="options?.bare"
    @field-change="onFieldChange"
  />
</template>
