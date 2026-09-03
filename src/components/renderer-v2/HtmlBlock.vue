<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import DOMPurify from "dompurify";
import type { HtmlNodeV2, FormDataV2 } from "@/types";

const props = defineProps<{
  node: HtmlNodeV2;
  data?: FormDataV2 | null;
}>();

const host = ref<HTMLDivElement | null>(null);

/** 用户 CSS 仅写入 Shadow DOM，并禁用可能逃逸样式的 @import。 */
function safeCss(css?: string): string {
  if (!css) return "";
  return css
    .replace(/@import[^;]+;?/gi, "")
    .replace(/<\/style>/gi, "");
}

/** 将 {{field}} 占位替换为带 data-bind 的 <span>，交给引擎原地填充。 */
function withBindings(html: string): string {
  return html.replace(
    /\{\{\s*([\w.$-]+)\s*\}\}/g,
    (_match: string, field: string) => `<span data-bind="${field}"></span>`,
  );
}

function buildMarkup(): string {
  const clean = DOMPurify.sanitize(withBindings(props.node.html ?? ""), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "data-bind"],
    FORBID_TAGS: ["style", "script"],
  });
  return `<style>${safeCss(props.node.css)}</style>${clean}`;
}

function inject(): void {
  const el = host.value;
  if (!el) return;
  if (!el.shadowRoot) el.attachShadow({ mode: "open" });
  el.shadowRoot!.innerHTML = buildMarkup();
  fill();
}

function fill(): void {
  const root = host.value?.shadowRoot;
  if (!root || !props.data) return;
  root.querySelectorAll<HTMLElement>("[data-bind]").forEach((span) => {
    const key = span.dataset.bind;
    if (!key) return;
    const value = props.data?.[key];
    span.textContent = value == null ? "" : String(value);
  });
}

onMounted(inject);
watch(() => [props.node.html, props.node.css], inject);
watch(() => props.data, fill, { deep: true });
</script>

<template>
  <div
    ref="host"
    class="layout-html"
    :data-node-id="node.id"
  ></div>
</template>

<style scoped>
.layout-html {
  width: 100%;
  min-width: 0;
}
</style>
