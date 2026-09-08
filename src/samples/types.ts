import type { FormSchemaV2 } from "@/types";

/**
 * 可由外层（dev 入口 / 测试）注入设计器的样例条目。
 *
 * 设计器核心不直接依赖 `dev` 样例目录（B3）：样例统一通过 props 注入，
 * 因此任何宿主都能传入自己的样例集，而无需改动 `DesignerApp`。
 * 注：预览态不再注入预置种子数据（2026-09-08），样例只携带 schema；
 * 原样例级 `previewData` 字段已随死代码清理移除（P12 二次盘点）。
 */
export interface SampleEntry {
  /** 稳定标识，用于 key 与回溯。 */
  id: string;
  /** 工具栏按钮文案（渲染为「载入{label}」）。 */
  label: string;
  /** 惰性构造样例 schema（每次调用返回新实例，配合不可变操作）。 */
  loadSchema: () => FormSchemaV2;
}
