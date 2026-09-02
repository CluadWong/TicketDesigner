import type { FormDataV2 } from "@/types";

/**
 * 通过遍历渲染 DOM 收集字段值（用户需求：预览 / 填写不必逐键回写，改用 DOM 遍历采集）。
 *
 * - 带 `data-field` 的普通文本字段（`<p>` / 复合字段的 `.layout-p__input`）取其文本；
 * - 带 `data-field` 的图片字段（`<img>`）取其 `src`；
 * - 多行（innerBorder 逐行 div）在浏览器中由 `innerText` 还原为带 `\n` 的文本，
 *   jsdom 等无 `innerText` 实现时回退 `textContent`（不含换行分隔）。
 *
 * @param root 渲染根容器，如 `.grid-form-canvas` 或 `GridFormRenderer` 的挂载元素。
 * @returns 字段键 → 字符串值的映射（与 `FormDataV2` 字段兼容；图片字段为 src 字符串）。
 */
export function collectFieldValues(root: ParentNode): FormDataV2 {
  const result: Record<string, string> = {};
  const nodes = root.querySelectorAll<HTMLElement>("[data-field]");
  for (const el of Array.from(nodes)) {
    const field = el.getAttribute("data-field");
    if (!field) continue;
    if (el instanceof HTMLImageElement) {
      result[field] = el.getAttribute("src") ?? "";
      continue;
    }
    const text = el.innerText;
    result[field] = typeof text === "string" ? text : (el.textContent ?? "");
  }
  return result as FormDataV2;
}
