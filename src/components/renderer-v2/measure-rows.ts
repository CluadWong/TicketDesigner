/** CSS px → mm（96dpi）。 */
export const PX_PER_MM = 96 / 25.4;

/**
 * 测量元素真实渲染高度（mm）。
 *
 * ⚠️ **必须用 `offsetHeight`（布局高度），不能用 `getBoundingClientRect().height`**：
 * 后者包含祖先 CSS `transform`，而纸张被 `PaperViewport`（panzoom）以 `transform: scale()`
 * 包裹 —— 缩放 60% 时，10mm 的行会被量成 6mm，分页引擎据此判定「还放得下」，
 * 于是内容溢出纸张却永不换页（内容跑到纸外 / 盖住页脚）。`offsetHeight` 不受 transform 影响。
 */
export function measureHeightMm(el: HTMLElement): number {
  return el.offsetHeight / PX_PER_MM;
}
