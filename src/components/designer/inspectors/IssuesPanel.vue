<script setup lang="ts">
/** 结构校验结果列表：点击问题定位到节点。 */
import type { SchemaIssueV2 } from "@/types";

defineProps<{ issues: SchemaIssueV2[] }>();
const emit = defineEmits<{ select: [issue: SchemaIssueV2] }>();
</script>

<template>
  <div class="v2-issues" :class="{ 'v2-issues--ok': issues.length === 0 }">
    <strong>{{
      issues.length === 0 ? "结构校验通过" : issues.length + " 个结构问题"
    }}</strong>
    <div
      v-for="issue in issues"
      :key="issue.code + '-' + (issue.nodeId || 'schema')"
      class="v2-issue v2-issue--selectable"
      @click="emit('select', issue)"
    >
      {{ issue.code }}：{{ issue.message }}
    </div>
  </div>
</template>

<style scoped>
.v2-issues {
  margin-top: 18px;
  padding: 10px;
  border: 1px solid #f0b7b7;
  border-radius: 4px;
  color: #991b1b;
  background: #fff5f5;
  font-size: 12px;
}

.v2-issues--ok {
  border-color: #b7dfc5;
  color: #166534;
  background: #f0fdf4;
}

.v2-issue {
  margin-top: 6px;
  line-height: 1.45;
}

.v2-issue--selectable {
  cursor: pointer;
}

.v2-issue--selectable:hover {
  color: #1d4ed8;
  text-decoration: underline;
}
</style>
