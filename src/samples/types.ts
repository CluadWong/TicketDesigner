import type { FormSchemaV2, FormDataV2 } from "@/types";

/**
 * 可由外层（dev 入口 / 测试）注入设计器的样例条目。
 *
 * 设计器核心不直接依赖 `dev` 样例目录（B3）：样例与预览数据统一通过 props 注入，
 * 因此任何宿主都能传入自己的样例集，而无需改动 `DesignerApp`。
 */
export interface SampleEntry {
  /** 稳定标识，用于 key 与回溯。 */
  id: string;
  /** 工具栏按钮文案（渲染为「载入{label}」）。 */
  label: string;
  /** 惰性构造样例 schema（每次调用返回新实例，配合不可变操作）。 */
  loadSchema: () => FormSchemaV2;
  /** 该样例对应的预览/填写数据（可选）。 */
  previewData?: FormDataV2;
}
