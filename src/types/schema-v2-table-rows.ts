import type { FormNodeV2 } from "./schema-v2";

/**
 * 表格相关「类型层」辅助。
 *
 * ⚠️ B4 解耦：表格字段派生（`buildTableRowField` / `bindTableRowCell`）、运行时行数
 * （`resolveTableRowCount`）、字段清单枚举（`collectSchemaFields`）与单元格盒解析
 * （`resolveCellBoxV2`）已迁至 `@/engine-v2/derivation`（渲染期领域逻辑归 engine）。
 * 本文件仅保留 schema 级的「手写 field 收集」工具。
 */

/**
 * 收集节点及其后代上出现过的所有 `field` 键（用于非表格字段清单）。
 * 需下潜的容器只有 Grid（rows → cells → children）与 Table（rowTemplate → children）。
 * 注意：table 行模板内字段 P 的 field 由列配置派生，此处收集的是 schema 中写的值，
 * 仅用于非表格场景；推导表格实际字段请用 `buildTableRowField` + `columns`（见 engine-v2/derivation）。
 */
export function collectFieldKeys(node: FormNodeV2, out: string[] = []): string[] {
  if ("field" in node && typeof node.field === "string" && node.field.length > 0) {
    out.push(node.field);
  }
  if (node.type === "grid") {
    for (const row of node.rows) {
      for (const cell of row.cells) {
        for (const child of cell.children) {
          collectFieldKeys(child, out);
        }
      }
    }
  } else if (node.type === "table") {
    for (const template of node.rowTemplate) {
      for (const child of template.children) {
        collectFieldKeys(child, out);
      }
    }
  }
  return out;
}
