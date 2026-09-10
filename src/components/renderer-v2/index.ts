export { default as GridFormRenderer } from "./GridFormRenderer.vue";
export { default as GridSchemaNode } from "./GridSchemaNode.vue";
export { collectFieldValues } from "./collectFieldValues";
export {
  setPageSizeStyle,
  registerPageSizeStyle,
  currentPageSizeStyle,
} from "./page-size-style";
/** D2：打印触发入口（呈现 + 触发同归渲染内核，宿主不再各自 `window.print()`）。 */
export { printForm } from "./print-form";
export type { PrintHost } from "./print-form";
