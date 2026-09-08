<script setup lang="ts">
/**
 * 顶部工具栏（批次 3 壳层拆件，2026-09-08）：**纯展示 + 事件上抛**，不持有文档状态。
 * - 样例集 / dirty / 撤销重做可用性 / 预览态由宿主（DesignerApp 编排层）注入；
 * - 一切动作（保存/读取/导入导出/打印/帮助…）经 emit 回宿主编排层执行；
 * - 两个隐藏 file input 留在宿主（`useSchemaDocument` / `useFillData` 直接持有其 ref），
 *   不随工具栏下放；`.v2-toolbar` 基础样式在非 scoped `styles/designer-ui.css`。
 * - `data-view-mode` / `data-help-toggle` 为测试钩子，拆件时必须原样保留。
 */
import type { SampleEntry } from "@/samples/types";

defineProps<{
  /** 可载入样例集（B3 注入，正式版可为空数组）。 */
  samples?: SampleEntry[];
  /** 模板脏标记（左上「未保存 / 已保存」）。 */
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  /** 预览态：决定「导出/保存数据」禁用、预览按钮激活态与文案。 */
  previewMode: boolean;
}>();

const emit = defineEmits<{
  (e: "reset-blank"): void;
  (e: "load-sample", sample: SampleEntry): void;
  (e: "undo"): void;
  (e: "redo"): void;
  (e: "save-template"): void;
  (e: "load-template"): void;
  (e: "export-template"): void;
  (e: "import-template"): void;
  (e: "import-fill-data"): void;
  (e: "export-fill-data"): void;
  (e: "load-fill-data"): void;
  (e: "save-fill-data"): void;
  (e: "toggle-preview"): void;
  (e: "print"): void;
  (e: "help"): void;
}>();
</script>

<template>
  <header class="v2-toolbar">
    <span
      class="v2-toolbar__dirty"
      :class="{ 'v2-toolbar__dirty--on': dirty }"
      >{{ dirty ? "● 未保存" : "已保存" }}</span
    >
    <div class="v2-toolbar__group">
      <button class="v2-toolbar__button" type="button" @click="emit('reset-blank')">
        新建空白
      </button>
      <button
        v-for="sample in samples"
        :key="sample.id"
        class="v2-toolbar__button"
        type="button"
        @click="emit('load-sample', sample)"
      >
        载入{{ sample.label }}
      </button>
    </div>
    <div class="v2-toolbar__group">
      <button
        class="v2-toolbar__button"
        type="button"
        :disabled="!canUndo"
        @click="emit('undo')"
      >
        撤销
      </button>
      <button
        class="v2-toolbar__button"
        type="button"
        :disabled="!canRedo"
        @click="emit('redo')"
      >
        重做
      </button>
    </div>
    <div class="v2-toolbar__group">
      <span class="v2-toolbar__label">模板</span>
      <button class="v2-toolbar__button" type="button" @click="emit('save-template')">
        保存
      </button>
      <button class="v2-toolbar__button" type="button" @click="emit('load-template')">
        读取
      </button>
      <button class="v2-toolbar__button" type="button" @click="emit('export-template')">
        导出文件
      </button>
      <button class="v2-toolbar__button" type="button" @click="emit('import-template')">
        导入文件
      </button>
    </div>
    <div class="v2-toolbar__group">
      <span class="v2-toolbar__label">填充数据</span>
      <button
        class="v2-toolbar__button"
        type="button"
        title="选择填写数据 JSON 文件并进入预览态"
        @click="emit('import-fill-data')"
      >
        导入数据
      </button>
      <button
        class="v2-toolbar__button"
        type="button"
        title="需先进入预览态填写，再导出当前填写值"
        :disabled="!previewMode"
        @click="emit('export-fill-data')"
      >
        导出数据
      </button>
      <button
        class="v2-toolbar__button"
        type="button"
        title="读取本地已保存的填写数据并进入预览态"
        @click="emit('load-fill-data')"
      >
        读取数据
      </button>
      <button
        class="v2-toolbar__button"
        type="button"
        title="需先进入预览态填写，再保存到本地"
        :disabled="!previewMode"
        @click="emit('save-fill-data')"
      >
        保存数据
      </button>
    </div>
    <div class="v2-toolbar__group">
      <button
        class="v2-toolbar__button"
        type="button"
        data-view-mode="preview"
        :class="{ 'v2-toolbar__button--active': previewMode }"
        title="查看表单的实际填写效果；预览中可直接输入内容，并可导出为填写数据"
        @click="emit('toggle-preview')"
      >
        {{ previewMode ? "退出预览" : "预览" }}
      </button>
      <button class="v2-toolbar__button" type="button" @click="emit('print')">
        打印
      </button>
      <button
        class="v2-toolbar__button"
        type="button"
        data-help-toggle
        title="查看使用说明"
        @click="emit('help')"
      >
        帮助
      </button>
    </div>
  </header>
</template>

<style scoped>
.v2-toolbar__dirty {
  padding: 1px 8px;
  border-radius: 10px;
  color: #94a3b8;
  background: rgb(255 255 255 / 8%);
  font-size: 11px;
}

.v2-toolbar__dirty--on {
  color: #fde68a;
  background: rgb(253 230 138 / 18%);
}

.v2-toolbar__label {
  align-self: center;
  margin-right: 2px;
  font-size: 12px;
  color: #9fb3c8;
}
</style>
