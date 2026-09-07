import type { InjectionKey, Ref } from "vue";

/**
 * 结构树「折叠全部 / 展开全部」的共享信号。
 *
 * 设计器左侧结构树是 `NodeTreeItem` 递归组件，每个节点默认持有**局部**
 * `expanded` 状态（可单独展开/折叠）。要支持全局「折叠全部 / 展开全部」，
 * 需由一个统一信号驱动所有节点重设展开态：
 *
 * - `token`：每次触发「折叠全部 / 展开全部」自增 1，挂载中的 `NodeTreeItem`
 *   通过 `watch(token)` 把自己的局部 `expanded` 同步到 `target`；
 * - `target`：`true` = 展开，`false` = 折叠。新挂载的节点以当前 `target`
 *   作为初始态（例如「折叠全部」后再新增节点，新节点也应处于折叠态）。
 *
 * 单独的节点点击仍走局部 `onToggle`，与全局信号互不干扰；随后的全局操作
 * 会再次覆盖（符合「点折叠全部后，仍可单独展开某个节点」的预期）。
 */
export interface TreeControl {
  token: Ref<number>;
  target: Ref<boolean>;
}

export const TreeControlKey: InjectionKey<TreeControl> = Symbol(
  "TicketDesigner.TreeControl",
);
