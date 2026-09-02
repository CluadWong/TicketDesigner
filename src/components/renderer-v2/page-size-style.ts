/**
 * 打印纸张尺寸注入（P11-3 修复）：把当前 Schema 的纸张尺寸写进全局 `@page` 规则。
 *
 * 背景：`@page` 是**页面级**规则，无法写成组件的 scoped 样式、也无法用 Vue 绑定，
 * 历史上被硬编码在设计器里（`@page { size: A4 }`）——于是屏幕上选 A3 横向
 * （纸张元素 420×297mm）渲染正常，打印却仍按 A4 出页，内容被裁掉。
 *
 * 做法：由渲染内核（`GridFormRenderer`）把 `@page { size: Wmm Hmm; margin: 0 }`
 * 注入到 `document.head` 的单例 `<style>`，纸张切换时更新、最后一个使用者释放后移除。
 * 这样设计器与消费页（`<FormRenderer>`）打印都跟随 Schema，无需各写一遍。
 *
 * 说明：写具体毫米值（`420mm 297mm`）而非 `A3 landscape`——后者在各浏览器
 * 对「关键字 + 方向」的组合支持不一致，指定物理尺寸最稳且与纸张元素完全对齐。
 */

const STYLE_ELEMENT_ID = "grid-form-page-size";

let styleEl: HTMLStyleElement | null = null;
/** 持有者集合：最后一个释放时才移除注入的样式（多个渲染实例并存时互不影响）。 */
const owners = new Set<object>();

function ensureStyleEl(): HTMLStyleElement | null {
  if (typeof document === "undefined") return null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ELEMENT_ID;
    styleEl.setAttribute("data-generated-by", "GridFormRenderer");
    document.head.appendChild(styleEl);
  }
  return styleEl;
}

/**
 * 设置打印纸张尺寸（幂等，可随纸张切换反复调用）。
 * @param widthMm 纸张宽度（mm），如 A4 纵向 210、A3 横向 420。
 * @param heightMm 纸张高度（mm），如 A4 纵向 297、A3 横向 297。
 */
export function setPageSizeStyle(widthMm: number, heightMm: number): void {
  const el = ensureStyleEl();
  if (!el) return;
  el.textContent = `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`;
}

/**
 * 登记一个使用者（每个渲染实例在 setup 中调用一次），返回释放函数（交给 `onUnmounted`）。
 * 与 `setPageSizeStyle` 分开，避免「每次更新都计数」导致计数虚高、样式卸不掉。
 */
export function registerPageSizeStyle(): () => void {
  const token = {};
  owners.add(token);
  return () => {
    owners.delete(token);
    if (owners.size === 0 && styleEl) {
      styleEl.remove();
      styleEl = null;
    }
  };
}

/** 当前注入的 `@page` 文本（测试 / 调试用）；未注入时返回空串。 */
export function currentPageSizeStyle(): string {
  return styleEl?.textContent ?? "";
}
