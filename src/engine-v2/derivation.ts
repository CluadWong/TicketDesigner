import type {
  FormDataV2,
  FormNodeV2,
  FormSchemaV2,
  GridCellV2,
  GridNodeV2,
  ImageNodeV2,
  TableNodeV2,
} from "@/types";

/**
 * 渲染期领域逻辑（B4 归 engine）。
 *
 * 原本这些"派生 / 布局 / 取值计算"散落在 `@/types`（schema-v2-operations /
 * schema-v2-table-rows），导致渲染组件必须 import 类型层才能拿到计算逻辑。
 * 现统一收口到 engine：渲染组件（GridSchemaNode / DesignerApp）只做视图映射，
 * 按 `列key_行号` 派生字段、表格动态行数、字段清单枚举、单元格盒解析均由本模块负责。
 */

// ---------------------------------------------------------------------------
// 单元格盒解析（布局）
// ---------------------------------------------------------------------------

export interface ResolvedCellBoxV2 {
  padding: number;
  align: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
}

/**
 * 解析图片节点的可显示来源（渲染 / 分页高度估算共用同一真相源）。
 *
 * 取值优先级（与渲染层历史行为一致）：
 * 1. 非设计态且配了 `field`、**数据里该字段有值** → 用数据值（可覆盖 `src`）；
 * 2. 否则用 `src`；
 * 3. 都没有 → **`null`（无来源）**，渲染层显示占位灰框、分页按 0 高度计。
 *
 * ⚠️ 渲染层与分页估算必须与本函数同口径：屏幕/打印不显示的东西，就不能在分页里占高度，
 *    否则会出现「图片没打印出来却多出一张空白纸」。
 */
export function resolveImageSourceV2(
  node: ImageNodeV2,
  options: { data?: FormDataV2 | null; isDesign?: boolean } = {},
): string | null {
  if (!options.isDesign && node.field) {
    const fromData = options.data?.[node.field];
    if (fromData != null) return String(fromData);
  }
  return node.src && node.src !== "" ? node.src : null;
}

const DEFAULT_CELL_PADDING = 0;
const DEFAULT_CELL_ALIGN: "left" | "center" | "right" = "center";
const DEFAULT_CELL_VERTICAL_ALIGN: "top" | "middle" | "bottom" = "middle";

/** 解析单元格的内边距 / 对齐：cell 覆盖优先，否则继承 Grid 默认，再否则取引擎常量。 */
export function resolveCellBoxV2(
  cell: GridCellV2,
  grid: GridNodeV2,
): ResolvedCellBoxV2 {
  return {
    padding: cell.padding ?? grid.cellPadding ?? DEFAULT_CELL_PADDING,
    align: cell.align ?? grid.cellAlign ?? DEFAULT_CELL_ALIGN,
    verticalAlign:
      cell.verticalAlign ?? grid.cellVerticalAlign ?? DEFAULT_CELL_VERTICAL_ALIGN,
  };
}

// ---------------------------------------------------------------------------
// 表格字段派生
// ---------------------------------------------------------------------------

/**
 * 表格列内字段的命名规则：`列key_行号`（行号 1-based）。
 * 例：列 key 为 `工作地点`，第 3 行的字段为 `工作地点_3`。
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
 * 表格「可重复 / 动态行」**不是一个 schema 属性**，而是渲染期按 data 推导的行为——
 * 只要 data 里存在超出 `minRows` 的行数据，就要补渲染对应行，保证 data 能被完整看到。
 * 无 data（设计态）、或行模板字段不含有效 `列key_` 前缀时，行数 = `minRows`。
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

// ---------------------------------------------------------------------------
// 字段清单枚举（取值计算，供消费页取数 / 导出 / 校验）
// ---------------------------------------------------------------------------

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
