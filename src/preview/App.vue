<script setup lang="ts">
import FormRenderer from "@/components/renderer-v2/FormRenderer.vue";
import { makeYunlvSecondTicketFullSchema } from "@/dev/yunlv-second-ticket-full";

/**
 * 消费页演示（G8 独立运行，最简形态）：schema → 渲染，
 * 只验证渲染内核可脱离设计器独立运行。
 * 设计页（DesignerApp）保持纯设计用途。
 */
const schema = makeYunlvSecondTicketFullSchema();
</script>

<template>
  <div class="preview-page">
    <FormRenderer :schema="schema" />
  </div>
</template>

<style>
.preview-page {
  font-family: system-ui, sans-serif;
}
</style>
