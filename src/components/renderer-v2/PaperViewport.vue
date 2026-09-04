<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Panzoom from "@panzoom/panzoom";
import type { PanzoomObject, PanzoomGlobalOptions } from "@panzoom/panzoom";

/**
 * 纸张视口（表面层 · 浏览缩放）
 *
 * 纯「视图/浏览」外壳：把渲染内核（GridFormRenderer）或设计表面层（CanvasSurface）
 * 包进一个可平移 / 缩放的视口，内核与表面层保持纯净（schema + 交互，不含缩放态）。
 *
 * 选型：@panzoom/panzoom（timmywil，v4）——
 * - 拖拽平移 + 滚轮缩放（`zoomWithWheel` 需手动绑定，v4 不自动绑 wheel）+ 触屏双指捏合（`pinch` 内置）；
 * - 通过 `excludeClass`（默认 `panzoom-exclude`）排除指定元素上的「平移手势」：被排除元素的指针按下不触发 pan，
 *   从而表单字段可正常编辑/选中、设计态可拖拽节点；其余空白区域照常平移。
 * - 缩放变化（滚轮 / 捏合 / 按钮 / reset）统一经原生事件 `panzoomchange`（`detail.scale`）同步百分比显示。
 *
 * 打印安全：`@media print` 下 `.paper-viewport__scaler { transform: none !important }` 覆盖 panzoom 内联 transform，
 * 配合内核 `@media print`（`grid-form-canvas` 转 `overflow:visible`、纸张 `margin:0`）走真实 mm 出页，缩放被完全忽略。
 *
 * 注意：panzoom 会在 `onMounted` 时给 scaler（`userSelect:none`）与 parent（`.paper-viewport` `overflow:hidden`、
 * `touchAction:none`）写内联样式；本组件在挂载后把 scaler/parent 的 `userSelect` 复位为 `''`（被排除的字段单独设为 text），
 * 否则字段内文本无法选中；打印时由 `!important` 复位 `overflow` / `transform`。
 */
const props = withDefaults(
  defineProps<{
    /** 初始缩放比例（默认 1 = 100%）。 */
    initialScale?: number;
    /** 挂载后自动适应宽度（窄屏 / 移动端查看场景）。 */
    fitOnMount?: boolean;
    /** 允许的最小缩放（默认 0.2）。 */
    minScale?: number;
    /** 允许的最大缩放（默认 4）。 */
    maxScale?: number;
  }>(),
  { initialScale: 1, fitOnMount: false, minScale: 0.2, maxScale: 4 },
);

const emit = defineEmits<{
  (e: "scale-change", scale: number): void;
}>();

const viewport = ref<HTMLElement | null>(null);
const scaler = ref<HTMLElement | null>(null);
const scale = ref(props.initialScale);
let pz: PanzoomObject | null = null;
let observer: MutationObserver | null = null;

const scaleText = computed(() => `${Math.round(scale.value * 100)}%`);

/**
 * 给表单控件与「可拖拽节点」打 `panzoom-exclude` 标记（isExcluded 会向上查祖先），
 * 使这些元素上的指针手势不触发平移——字段可编辑/选中、设计态可拖拽节点，其余区域照常平移。
 * 同时把表单控件的 `user-select` 恢复为 `text`（抵消 panzoom 对整体的 `user-select:none`）。
 */
const EXCLUDE_SELECTOR = "input, textarea, select, [contenteditable], [draggable='true']";
/**
 * 给表单控件与「可拖拽节点」打 `panzoom-exclude` 标记（isExcluded 会向上查祖先），
 * 使这些元素上的指针手势不触发平移——字段可编辑/选中、设计态可拖拽节点，其余区域照常平移。
 *
 * ⚠️ 必须「先清后打」（reconcile），不能只 `add`：设计态 `CanvasSurface` 会给所有节点设
 * `draggable="true"`（被本选择器命中 → 打标记）；切到预览态时 `draggable` 被移除，
 * 若只 add 则过期标记残留，`panzoom-exclude` 类永不消失 —— 于是预览态「拖拽非输入组件」
 * 仍被误判为排除区、无法平移（即 design→preview 切换后平移失效的回归）。
 * 先清掉全部 `panzoom-exclude`，再按当前 EXCLUDE_SELECTOR 重新打标，保证 draggable 移除后
 * 节点即时恢复可平移；字段（contenteditable）始终命中、持续排除，输入不被平移吞掉。
 */
function tagExclusions(): void {
  const root = scaler.value;
  if (!root) return;
  // 先清除全部 panzoom-exclude（含 design→preview 切回后残留的过期标记）。
  root
    .querySelectorAll<HTMLElement>(".panzoom-exclude")
    .forEach((el) => el.classList.remove("panzoom-exclude"));
  // 再按当前选择器重新打标。
  root
    .querySelectorAll<HTMLElement>(EXCLUDE_SELECTOR)
    .forEach((el) => {
      el.classList.add("panzoom-exclude");
      if (el.matches("input, textarea, select, [contenteditable]")) {
        el.style.userSelect = "text";
      }
    });
}

function onPanChange(e: Event): void {
  const detail = (e as CustomEvent<{ scale: number }>).detail;
  if (typeof detail?.scale === "number" && detail.scale !== scale.value) {
    scale.value = detail.scale;
    emit("scale-change", detail.scale);
  }
}

/** 滚轮缩放（v4 不自动绑 wheel）：表单控件上交给原生滚动，其余区域交给 panzoom。 */
function onWheel(e: WheelEvent): void {
  if (!pz) return;
  const t = e.target as HTMLElement | null;
  if (t && t.closest("input, textarea, select, [contenteditable]")) return;
  pz.zoomWithWheel(e);
}

function clampScale(s: number): number {
  return Math.min(props.maxScale, Math.max(props.minScale, s));
}

function zoomIn(): void {
  const cur = pz?.getScale() ?? scale.value;
  pz?.zoom(clampScale(cur * 1.2));
}

function zoomOut(): void {
  const cur = pz?.getScale() ?? scale.value;
  pz?.zoom(clampScale(cur / 1.2));
}

function reset(): void {
  pz?.reset({ animate: false });
}

/** 适应宽度：按视口可见宽 / 内容自然宽算缩放；jsdom / 未布局时回退初始比例，不抛错。 */
function fitWidth(): void {
  const vp = viewport.value;
  const el = scaler.value;
  if (!vp || !el || !pz) return;
  const content = (el.firstElementChild as HTMLElement | null) ?? el;
  const contentW = content.scrollWidth || 0;
  if (contentW <= 0 || vp.clientWidth <= 0) {
    pz.zoom(props.initialScale);
    return;
  }
  pz.zoom(clampScale(vp.clientWidth / contentW));
}

function getScaleValue(): number {
  return pz?.getScale() ?? scale.value;
}

defineExpose({ zoomIn, zoomOut, reset, fitWidth, getScale: getScaleValue });

onMounted(() => {
  const el = scaler.value;
  const vp = viewport.value;
  if (!el || !vp) return;
  const options: PanzoomGlobalOptions = {
    minScale: props.minScale,
    maxScale: props.maxScale,
    startScale: props.initialScale,
    step: 0.3,
    cursor: "grab",
    touchAction: "none",
  };
  pz = Panzoom(el, options);
  // 抵消 panzoom 对整体的 user-select:none，保证字段内可选中文本（被排除元素已单独恢复 text）。
  el.style.userSelect = "";
  vp.style.userSelect = "";
  tagExclusions();
  observer = new MutationObserver(tagExclusions);
  observer.observe(el, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["draggable", "contenteditable"],
  });
  el.addEventListener("panzoomchange", onPanChange);
  vp.addEventListener("wheel", onWheel, { passive: false });
  if (props.fitOnMount) fitWidth();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  const el = scaler.value;
  const vp = viewport.value;
  el?.removeEventListener("panzoomchange", onPanChange);
  vp?.removeEventListener("wheel", onWheel);
  // 复位 panzoom 写入的 parent/elem 内联样式，并移除指针监听。
  pz?.resetStyle();
  pz?.destroy();
  pz = null;
});
</script>

<template>
  <div ref="viewport" class="paper-viewport">
    <div ref="scaler" class="paper-viewport__scaler">
      <slot />
    </div>
    <div class="paper-viewport__bar" role="toolbar" aria-label="缩放控制">
      <button type="button" class="paper-viewport__btn" title="缩小" @click="zoomOut">−</button>
      <span class="paper-viewport__scale">{{ scaleText }}</span>
      <button type="button" class="paper-viewport__btn" title="放大" @click="zoomIn">+</button>
      <button
        type="button"
        class="paper-viewport__btn paper-viewport__btn--text"
        title="适应宽度"
        @click="fitWidth"
      >
        适应
      </button>
      <button
        type="button"
        class="paper-viewport__btn paper-viewport__btn--text"
        title="重置为 100%"
        @click="reset"
      >
        重置
      </button>
    </div>
  </div>
</template>

<style scoped>
.paper-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  background: #e5e7eb;
  /* overflow 由 panzoom 设为 hidden；打印时经 @media print 复位 */
}

.paper-viewport__scaler {
  transform-origin: 50% 50%;
  will-change: transform;
}

.paper-viewport__bar {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: rgb(255 255 255 / 92%);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(15 23 42 / 12%);
  font-size: 13px;
  user-select: none;
}

.paper-viewport__btn {
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.paper-viewport__btn:hover {
  background: #f1f5f9;
}

.paper-viewport__btn--text {
  font-size: 12px;
}

.paper-viewport__scale {
  min-width: 44px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: #334155;
}

@media print {
  .paper-viewport {
    overflow: visible !important;
    height: auto !important;
    background: white !important;
  }

  .paper-viewport__scaler {
    /* 覆盖 panzoom 内联 transform，打印走真实 mm */
    transform: none !important;
  }

  .paper-viewport__bar {
    display: none !important;
  }
}
</style>
