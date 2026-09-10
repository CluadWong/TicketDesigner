/**
 * 打印触发（D2：打印触发与呈现同归渲染内核）。
 *
 * 背景：`@page` 纸张注入（`page-size-style.ts`）与 `@media print` 呈现样式都在渲染内核，
 * 但「触发打印」此前只有设计器工具栏裸调 `window.print()`——消费页（`<FormRenderer>`）
 * 想打印必须自己再写一遍，于是**触发与呈现分处两层**，宿主各自重复实现（D2）。
 *
 * 做法：由渲染内核统一暴露触发入口 `printForm()`——
 * - **呈现**归内核：`@page` / `@media print` 由渲染实例在挂载期注入；
 * - **触发**也归内核：宿主（设计器 / 消费页）只调用本函数，不再各自 `window.print()`；
 * - 「何时打印」仍由宿主决定：内核不自动打印，只提供能力。
 *
 * 契约：本函数只负责触发浏览器打印，**不会**创建 `@page` 规则。
 * 调用前应已有渲染实例挂载（`GridFormRenderer` / `FormRenderer`），
 * 否则纸张尺寸可能尚未注入、打印会退回浏览器默认纸张。
 *
 * 安全：宿主缺失或不支持 `print`（SSR、jsdom 未实现等）时静默返回 `false`，不抛错；
 * 支持注入宿主对象，便于测试与在非 `window` 环境下复用。
 */

/** 打印宿主的最小契约：只需一个 `print` 方法。 */
export interface PrintHost {
  print?: () => void;
}

/**
 * 触发打印。
 *
 * @param host 可选。指定打印宿主，缺省（`undefined`）取 `window`（SSR 下不存在则安全跳过）；
 *   显式传 `null` 表示「明确无宿主」，不回退 `window`，直接 no-op。
 * @returns 是否真的触发了打印；宿主不可用或未实现 `print` 时为 `false`。
 */
export function printForm(host?: PrintHost | null): boolean {
  // 仅「未显式传参」时才回退 `window`；显式传 `null` 表示调用方明确声明无宿主，
  // 此时不再回退——避免"想禁用却意外触发真实打印"。
  const target: PrintHost | null | undefined =
    host === undefined && typeof window !== "undefined"
      ? (window as unknown as PrintHost)
      : host;
  if (!target || typeof target.print !== "function") return false;
  target.print();
  return true;
}
