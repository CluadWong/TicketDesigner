<script setup lang="ts">
import { ref } from "vue";
import type { FieldActionTriggerV2, FormDataV2 } from "@/types";
import FormRenderer from "@/components/renderer-v2/FormRenderer.vue";
import { formatDateValue, parseDateValue, formatHasTime } from "@/utils/date-format";
import { makeYunlvSecondTicketFullSchema } from "@/dev/yunlv-second-ticket-full";
import {
  htmlComplexTableData,
  htmlComplexTablePermissions,
  makeHtmlComplexTableSchema,
  makeNativeHtmlComplexTableSchema,
} from "@/dev/html-complex-table";
import demoData from "@/dev/demoData";
import demoPermissions from "@/dev/demoPermissions";
import demoRules from "@/dev/demoRules";

/**
 * 消费页演示（G8 独立运行）：直接预览「云铝电气第二种工作票」完整样例。
 *
 * 刻意不提供工具栏——本页只回答四个问题：
 * 1. **渲染组件能否脱离设计器独立运行**（schema + data → 渲染）；
 * 2. **纸张视口缩放是否可用**（含移动端效果）——本页默认开启缩放视口，
 *    窄屏（≤ 768px）自动 `fitOnMount` 适应宽度，可双指捏合 / 滚轮缩放 / 拖动平移；
 * 3. **字段级权限 / 校验规则 / 数据写入如何接入**（P9.2a/b/c 示例）——
 *    - `fieldPermissions`：与 data 同轨经 props 注入（示例见 `dev/demoPermissions.ts`），
 *      READ 只读回显、EDIT 可输入、HIDDEN 脱敏为 ***（占位保留）；
 *    - `rules`：必填规则同样经 props 注入（见 `dev/demoRules.ts`），点「校验必填」
 *      调 `validate()` 查看结果；填写结果经 `v-model:data` / `field-change` 回写；
 * 4. **专用控件（P9.1c）如何接入**——字段配置 `action`（如 date）时，填写态**点击字段
 *    元素本身**（表单不加任何额外按钮）即经 `@action` 事件把触发权交给宿主；本页示范用
 *    原生日期选择器选完后回写 data，票面自动重渲染。签名板等复杂控件同理接入。
 *
 * 设计页（DesignerApp）保持纯设计用途，不接权限/规则/专用控件——它们是消费会话关注点。
 *
 * 形态与出页全部由渲染内核负责：
 * - 纸张尺寸 `@page` 由渲染实例按 `schema.paper` 运行时注入（`page-size-style.ts`）；
 * - 屏幕与打印的呈现样式（`@media print`）同样在渲染内核；缩放视口在打印时复位为真实 mm。
 *
 * 打印：直接用浏览器打印（Ctrl/Cmd + P）即可，无需页面按钮。
 * 若要**以代码**触发，取组件引用调 `print()`——打印能力收口在渲染层（D2），
 * 消费页无需自己写 `window.print()`。
 */
const schema = makeYunlvSecondTicketFullSchema();
const data = ref<FormDataV2>({ ...(demoData as FormDataV2) });

/** 字段级权限示例：键 = 字段名，值 = READ / EDIT / HIDDEN（夹具见 dev/demoPermissions.ts）。 */
const fieldPermissions = demoPermissions;

/** 必填规则示例（P9.2c）：经 options.rules 注入，validate() 按当前数据校验（夹具见 dev/demoRules.ts）。 */
const fieldRules = demoRules;

/** P9.2d HTML 模块权限边界演示：复杂签名时间表（双层 colspan 表头 + 多行），
 *  用 HTML 模块渲染，{{字段名}} 中文字段在填写态变为可编辑 input、READ 只读、
 *  HIDDEN 脱敏 ***。与上方完整票共用同一 onAction 回写机制。 */
const signSchema = makeHtmlComplexTableSchema();
const signData = ref<FormDataV2>({ ...htmlComplexTableData });

/** P9.2d 原生 [data-field] 变体演示：作者直接写 `<p contenteditable data-field>`，
 *  引擎仅按权限设可编辑性/脱敏、按 data 回填，[data-field] 即通用采集钩子。 */
const signNativeSchema = makeNativeHtmlComplexTableSchema();
const signNativeData = ref<FormDataV2>({ ...htmlComplexTableData });

// ── 校验演示（P9.2c）：点按钮调 validate()，展示值为空的必填字段 ──
const rendererRef = ref<InstanceType<typeof FormRenderer> | null>(null);
const missingRequired = ref<string[] | null>(null);
function runValidate(): void {
  missingRequired.value = rendererRef.value?.validate() ?? [];
}

// ── 专用控件演示（P9.1c）：date 字段点击字段元素 → 原生日期选择器 → 回写 data ──
function onAction(payload: FieldActionTriggerV2): void {
  if (payload.action !== "date") return; // signature/upload 等复杂控件由宿主自行实现
  // 日期格式（actionParams.format）：含时间 token → datetime-local，否则 date 选择器
  const format = payload.actionParams?.format;
  const input = document.createElement("input");
  input.type = formatHasTime(format) ? "datetime-local" : "date";
  // 回填已填值：把 data 中已格式化的串还原为原生控件值，再次打开时定位到已填项
  const existing = data.value?.[payload.field];
  if (typeof existing === "string" && existing) {
    const iso = parseDateValue(existing, format);
    if (iso) input.value = iso;
  }
  input.style.position = "fixed";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  document.body.appendChild(input);
  input.addEventListener("change", () => {
    if (input.value) {
      // 按格式串套成中文显示串写回 data（无 format 则原样存原生值，向后兼容）
      const formatted = formatDateValue(input.value, format);
      data.value = { ...data.value, [payload.field]: formatted };
    }
    input.remove();
  });
  input.addEventListener("cancel", () => input.remove());
  // showPicker 需用户手势（此处处于点击回调链中）；不支持时兜底 focus+click
  try {
    input.showPicker();
  } catch {
    input.focus();
    input.click();
  }
}

// 窄屏默认适应宽度（移动端查看场景），桌面端保持 100% 便于直接对比参考图。
const isNarrow =
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 768px)").matches;
</script>

<template>
  <div class="preview-page">
    <FormRenderer
      ref="rendererRef"
      v-model:data="data"
      :schema="schema"
      :options="{
        zoom: true,
        fitOnMount: isNarrow,
        readonly: false,
        fieldPermissions,
        rules: fieldRules,
      }"
      @action="onAction"
    />
    <h2 class="preview-demo-heading">P9.2d HTML 模块示例：复杂签名时间表</h2>
    <FormRenderer
      v-model:data="signData"
      :schema="signSchema"
      :options="{
        zoom: true,
        fitOnMount: isNarrow,
        readonly: false,
        fieldPermissions: htmlComplexTablePermissions,
      }"
      @action="onAction"
    />
    <h2 class="preview-demo-heading">P9.2d HTML 模块示例：原生 data-field 变体</h2>
    <FormRenderer
      v-model:data="signNativeData"
      :schema="signNativeSchema"
      :options="{
        zoom: true,
        fitOnMount: isNarrow,
        readonly: false,
        fieldPermissions: htmlComplexTablePermissions,
      }"
      @action="onAction"
    />
    <div class="preview-demo-bar">
      <button type="button" class="preview-demo-bar__btn" @click="runValidate">
        校验必填
      </button>
      <span v-if="missingRequired !== null" class="preview-demo-bar__result">
        {{
          missingRequired.length
            ? `未填必填：${missingRequired.join("、")}`
            : "必填项全部已填 ✓"
        }}
      </span>
    </div>
  </div>
</template>

<style>
.preview-page {
  font-family: system-ui, sans-serif;
}

.preview-demo-heading {
  margin: 24px 0 8px;
  padding: 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

/* 校验演示条（非工具栏）：固定在页尾，仅演示 validate() 接入方式。 */
.preview-demo-bar {
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid #e2e8f0;
  font-size: 13px;
  color: #334155;
}

.preview-demo-bar__btn {
  padding: 4px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  color: #1e293b;
  background: #f8fafc;
  font-size: 13px;
  cursor: pointer;
}

.preview-demo-bar__btn:hover {
  background: #eef2f7;
}
</style>
