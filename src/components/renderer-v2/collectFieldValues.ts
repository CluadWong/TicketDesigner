import type { FormDataV2 } from "@/types";

export interface CollectFieldValuesOptions {
  /**
   * 脱敏字段（HIDDEN）的真实值来源（响应式数据侧，如 `previewFormData`）：
   * 本机「保存数据」时回源真实数据，保证 保存→读取 循环不丢值。
   */
  baseData?: FormDataV2 | null;
  /**
   * 脱敏导出口径（P9.2b，用户拍板）：为 `true` 时 HIDDEN 字段采集为 `***`
   * （**保持脱敏**，用于「导出数据」外发场景），优先于 `baseData` 回源。
   */
  maskHidden?: boolean;
}

/**
 * 通过遍历渲染 DOM 收集字段值（用户需求：预览 / 填写不必逐键回写，改用 DOM 遍历采集）。
 *
 * - 带 `data-field` 的普通文本字段（`<p>` / 复合字段的 `.layout-p__input`）取其文本；
 * - 带 `data-field` 的图片字段（`<img>`）取其 `src`；
 * - 多行（innerBorder 逐行 div）在浏览器中由 `innerText` 还原为带 `\n` 的文本，
 *   jsdom 等无 `innerText` 实现时回退 `textContent`（不含换行分隔）；
 * - **HIDDEN 脱敏字段**（`.layout-p--hidden`）：DOM 中显示的是假值 `***`，按调用方
 *   口径二选一——`maskHidden: true`（「导出数据」外发）→ 采集为 `***` 保持脱敏；
 *   否则从 `baseData` 回源真实数据（本机「保存数据」循环）；两者皆无 → 省略该字段
 *   （绝不把 DOM 假值当真值采集）。
 *
 * @param root 渲染根容器，如 `.grid-form-canvas` 或 `GridFormRenderer` 的挂载元素。
 */
export function collectFieldValues(
  root: ParentNode,
  options: CollectFieldValuesOptions = {},
): FormDataV2 {
  const { baseData, maskHidden } = options;
  const result: Record<string, string> = {};
  // root 自身即字段（如直接挂载 GridSchemaNode 时根就是 <p data-field>）也要纳入：
  // querySelectorAll 只匹配后代、不含根，故先单独检查根。
  const self = root instanceof Element && root.matches("[data-field]")
    ? [root as HTMLElement]
    : [];
  const nodes = [
    ...self,
    ...root.querySelectorAll<HTMLElement>("[data-field]"),
  ];
  for (const el of Array.from(nodes)) {
    const field = el.getAttribute("data-field");
    if (!field) continue;
    // HIDDEN 脱敏字段：DOM 值是假值 ***，按调用口径回源真实值或保持脱敏导出
    if (el.closest(".layout-p--hidden")) {
      if (maskHidden) {
        result[field] = "***";
      } else {
        const real = baseData?.[field];
        if (real != null) result[field] = String(real);
      }
      continue;
    }
    if (el instanceof HTMLImageElement) {
      result[field] = el.getAttribute("src") ?? "";
      continue;
    }
    const text = el.innerText;
    result[field] = typeof text === "string" ? text : (el.textContent ?? "");
  }
  return result as FormDataV2;
}
