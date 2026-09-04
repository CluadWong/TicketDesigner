<script setup lang="ts">
import type { FormDataV2 } from "@/types";
import FormRenderer from "@/components/renderer-v2/FormRenderer.vue";
import { makeYunlvSecondTicketFullSchema } from "@/dev/yunlv-second-ticket-full";
import demoData from "@/dev/demoData";

/**
 * 消费页演示（G8 独立运行）：直接预览「云铝电气第二种工作票」完整样例。
 *
 * 刻意不提供工具栏——本页只回答一个问题：**渲染组件能否脱离设计器独立运行**。
 * 形态与出页全部由渲染内核负责：
 * - 纸张尺寸 `@page` 由渲染实例按 `schema.paper` 运行时注入（`page-size-style.ts`）；
 * - 屏幕与打印的呈现样式（`@media print`）同样在渲染内核。
 *
 * 打印：直接用浏览器打印（Ctrl/Cmd + P）即可，无需页面按钮。
 * 若要**以代码**触发，取组件引用调 `print()`——打印能力收口在渲染层（D2），
 * 消费页无需自己写 `window.print()`。
 */
const schema = makeYunlvSecondTicketFullSchema();
const data = { ...(demoData as Record<string, unknown>) } as FormDataV2;
</script>

<template>
  <div class="preview-page">
    <FormRenderer :schema="schema" :data="data" mode="preview" />
  </div>
</template>

<style>
.preview-page {
  font-family: system-ui, sans-serif;
}
</style>
