import type { FormDataV2, FormNodeV2, FormSchemaV2, TableNodeV2 } from "./schema-v2";

/**
 * 表格列内字段的命名规则：`列key_行号`（行号 1-based）。
 *
 * 例：列 key 为 `工作地点`，第 3 行的字段为 `工作地点_3`；两列 `工作地点`/`工作内容`
 * 第 r 行即 `工作地点_r`/`工作内容_r`。该字段由**渲染期**按列配置 + 行号自动派生，
 * 因而表格行模板内的字段 P **不手写 field**（schema 中留空即可），保证配置列后字段名
 * 自动跟随、逐行不冲突（与需求「字段根据列配置生成」一致）。
 */
export function buildTableRowField(columnKey: string, rowIndex: number): string {
  return `${columnKey}_${rowIndex}`;
}

/**
 * 把表格单元格节点（及其后代 Grid 内的字段 P）的字段绑定到派生名 `列key_行号`。
 * 仅字段 P（`mode: "field"`）被重写；Text / HTML / Image / Table 等保持原样。
 * 嵌套 Grid 内的字段 P 也一并派生（沿用同一 `列key_行号`），保持与表格行一致。
 * 空字符串 field 会被覆盖（派生名非空），故 schema 中手写值无影响。
 */
export function bindTableRowCell(
  node: FormNodeV2,
  columnKey: string,
  rowIndex: number,
): FormNodeV2 {
  const field = buildTableRowField(columnKey, rowIndex);
  const bound: FormNodeV2 =
    node.type === "p" && node.mode === "field"
      ? ({ ...node, field } as FormNodeV2)
      : node;
  if (bound.type === "grid") {
    return {
      ...bound,
      rows: bound.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          children: cell.children.map((child) => bindTableRowCell(child, columnKey, rowIndex)),
        })),
      })),
    };
  }
  return bound;
}

/**
 * 收集节点及其后代上出现过的所有 `field` 键（用于非表格字段清单）。
 * 需下潜的容器只有 Grid（rows → cells → children）与 Table（rowTemplate → children）。
 * 注意：table 行模板内字段 P 的 field 由列配置派生，此处收集的是 schema 中写的值，
 * 仅用于非表格场景；推导表格实际字段请用 `buildTableRowField` + `columns`。
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

/** 解析 `列key_行号` 中的行号；非该格式返回 null。用于从 data 键反推最大行号。 */
function parseTableRowIndex(dataKey: string, columnKey: string): number | null {
  const prefix = `${columnKey}_`;
  if (!dataKey.startsWith(prefix)) return null;
  const tail = dataKey.slice(prefix.length);
  if (!/^\d+$/.test(tail)) return null;
  const row = Number(tail);
  return Number.isFinite(row) ? row : null;
}

/**
 * 表格运行时行数 = max(配置行数 `minRows`, data 中实际出现过的最大行号)。
 *
 * 需求背景：表格「可重复 / 动态行」**不是一个 schema 属性**，而是渲染期按 data 推导的行为——
 * 只要 data 里存在超出 `minRows` 的行数据，就要补渲染对应行，保证 data 能被完整看到。
 *
 * 例：表格配置 `minRows = 4`，data 中含 `工作内容_5`，说明曾录入过第 5 行，
 * 则再次渲染时应渲染 5 行（第 5 行显示该数据，中间未填的行留空）。
 *
 * 回退：无 data（设计态）、或行模板字段不含有效 `列key_` 前缀时，行数 = `minRows`。
 */
export function resolveTableRowCount(
  node: TableNodeV2,
  data: FormDataV2 | null | undefined,
): number {
  const configured = Number.isFinite(node.minRows) ? Math.max(0, Math.floor(node.minRows)) : 0;
  if (!data) return configured;
  let maxRow = 0;
  for (const column of node.columns) {
    for (const dataKey of Object.keys(data)) {
      const row = parseTableRowIndex(dataKey, column.key);
      if (row != null && row > maxRow) maxRow = row;
    }
  }
  return Math.max(configured, maxRow);
}

/**
 * 单个字段的元信息（供消费页面按字段取数 / 导出 / 校验 / 生成录入页）。
 * - `kind: "field"`：普通字段 P（非表格），`key` 即手写 field；
 * - `kind: "table-field"`：表格派生字段，`key` 为 `列key_行号`，并带 `tableField`（列 key）与 `row`（1-based 行号）。
 * `label` 预留给 G13（字段级元数据），当前 schema 无该字段，恒为 undefined。
 */
export interface SchemaFieldInfo {
  key: string;
  kind: "field" | "table-field";
  tableField?: string;
  row?: number;
  label?: string;
}

/**
 * 收集整张 Schema 的完整字段清单（替代 `collectFieldKeys` 仅收手写 field 的局限）。
 *
 * 遍历口径与渲染期 `bindTableRowCell` / `tableTemplate` 完全一致：
 * - 普通字段 P（不在表格内）→ 直接取 `node.field`；
 * - 表格 → 对每列 × `resolveTableRowCount(node, data)` 行，按 `template.columnKey` 配对模板单元格，
 *   生成派生字段 `列key_行号`（kind=table-field）；模板内（含嵌套 Grid）的字段 P 同样绑定到该 `列key_行号`；
 * - 嵌套 Grid / 嵌套 Table 递归处理（嵌套 Table 独立派生自身列字段）。
 *
 * 这是消费页面「按字段取数 / 导出 / 校验」能力的基础——表格主体字段不再遗漏。
 */
export function collectSchemaFields(
  schema: FormSchemaV2,
  data?: FormDataV2 | null,
): SchemaFieldInfo[] {
  const out: SchemaFieldInfo[] = [];
  const visit = (node: FormNodeV2, tableCtx?: { columnKey: string; rowIndex: number }): void => {
    if (node.type === "p" && node.mode === "field") {
      if (tableCtx) {
        out.push({
          key: buildTableRowField(tableCtx.columnKey, tableCtx.rowIndex),
          kind: "table-field",
          tableField: tableCtx.columnKey,
          row: tableCtx.rowIndex,
        });
      } else if (node.field) {
        out.push({ key: node.field, kind: "field" });
      }
      return;
    }
    if (node.type === "table") {
      const rowCount = resolveTableRowCount(node, data ?? null);
      for (const column of node.columns) {
        const template = node.rowTemplate.find(t => t.columnKey === column.key);
        if (!template) continue;
        for (let r = 1; r <= rowCount; r += 1) {
          for (const child of template.children) {
            visit(child, { columnKey: column.key, rowIndex: r });
          }
        }
      }
      return;
    }
    if (node.type === "grid") {
      for (const row of node.rows) {
        for (const cell of row.cells) {
          for (const child of cell.children) {
            visit(child, tableCtx);
          }
        }
      }
    }
  };
  for (const page of schema.pages) {
    for (const child of page.children) {
      visit(child);
    }
  }
  return out;
}
