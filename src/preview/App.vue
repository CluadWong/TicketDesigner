<script setup lang="ts">
import { computed, ref } from "vue";
import type { FormDataV2, FormSchemaV2 } from "@/types";
import FormRenderer from "@/components/renderer-v2/FormRenderer.vue";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";
import { makeFiftyRowGridSchema } from "@/dev/gridPaginationDemo";
import demoData from "@/dev/demoData";

// 消费页典型流程：服务器返回 JSON 字符串 → parseTolerantFormSchemaV2(json).schema →
// 传给 <FormRenderer>；此处直接用内存中的样例 schema + demo data 演示（真实场景用容错解析）。
type DemoKey = "yunlv" | "pagination";

const demoOptions: { value: DemoKey; label: string }[] = [
  { value: "yunlv", label: "云铝工作票（五行，单页）" },
  { value: "pagination", label: "50 行 Grid 分页演示（超高换页）" },
];
const demoKey = ref<DemoKey>("pagination");

const schemaSource: Record<DemoKey, () => FormSchemaV2> = {
  yunlv: makeYunlvSecondTicketFirstFiveRowsSchema,
  pagination: makeFiftyRowGridSchema,
};
const schema = computed<FormSchemaV2>(() => schemaSource[demoKey.value]());

const data = ref<FormDataV2>({ ...(demoData as Record<string, unknown>) } as FormDataV2);
const mode = ref<"preview" | "fill">("fill");
const bare = ref(false);

function onFieldChange(field: string, value: string): void {
  // 真实消费页可在此把改动 POST 回服务器；此处仅打印。
  console.log("[field-change]", field, value);
}
</script>

<template>
  <div class="preview-page">
    <header>
      <h3>消费页演示：渲染器 + schema + data（G8 独立运行）</h3>
      <label>
        样例：
        <select v-model="demoKey">
          <option v-for="opt in demoOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </label>
      <label>
        模式：
        <select v-model="mode">
          <option value="preview">预览（只读）</option>
          <option value="fill">填写</option>
        </select>
      </label>
      <label><input v-model="bare" type="checkbox" /> 无外壳（嵌入）</label>
    </header>
    <FormRenderer
      :schema="schema"
      v-model:data="data"
      :mode="mode"
      :options="{ bare }"
      @field-change="onFieldChange"
    />
  </div>
</template>

<style>
.preview-page {
  font-family: system-ui, sans-serif;
  padding: 16px;
}
.preview-page header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
}
</style>
