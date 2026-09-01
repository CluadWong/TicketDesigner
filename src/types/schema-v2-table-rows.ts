import type { FormDataV2, FormNodeV2, TableNodeV2 } from "./schema-v2";

/**
 * 表格行模板中的行号占位符。行模板内字段写作 `工作任务_{row}_1`，
 * 渲染第 r 行时替换为 `工作任务_r_1`（1-based），与 data 的逐行键对应。
 */
export const ROW_PLACEHOLDER = "{row}";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 把字段键中的 `{row}` 全部替换为行号（1-based）；不含占位符时原样返回。 */
export function bindRowPlaceholder(field: string, rowIndex: number): string {
  return field.includes(ROW_PLACEHOLDER)
    ? field.split(ROW_PLACEHOLDER).join(String(rowIndex))
    : field;
}

/**
 * 收集节点及其后代上出现过的所有 `field` 键。
 *
 * 需要下潜的容器只有 Grid（rows → cells → children）与 Table（rowTemplate → children）；
 * P / Text / HTML / Image 均为叶子节点。
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

/**
 * 表格运行时行数 = max(配置行数 `minRows`, data 中实际出现过的最大行号)。
 *
 * 需求背景：表格「可重复/动态行」**不是一个 schema 属性**，而是渲染期按 data 推导的行为——
 * 只要 data 里存在超出 `minRows` 的行数据，就要补渲染对应行，保证 data 能被完整看到。
 *
 * 例：表格配置 `minRows = 4`，data 中含 `工作内容_5_2`，说明曾录入过第 5 行，
 * 则再次渲染时应渲染 5 行（第 5 行显示该数据，中间未填的行留空）。
 *
 * 回退：无 data（设计态）、或行模板字段不含 `{row}` 占位符时，行数 = `minRows`。
 */
export function resolveTableRowCount(
  node: TableNodeV2,
  data: FormDataV2 | null | undefined,
): number {
  const configured = Number.isFinite(node.minRows) ? Math.max(0, Math.floor(node.minRows)) : 0;
  if (!data) return configured;

  const templateKeys: string[] = [];
  for (const template of node.rowTemplate) {
    for (const child of template.children) {
      collectFieldKeys(child, templateKeys);
    }
  }

  const escapedPlaceholder = escapeRegExp(ROW_PLACEHOLDER);
  let maxRow = 0;
  for (const key of templateKeys) {
    if (!key.includes(ROW_PLACEHOLDER)) continue;
    const pattern = new RegExp(
      `^${escapeRegExp(key).split(escapedPlaceholder).join("(\\d+)")}$`,
    );
    for (const dataKey of Object.keys(data)) {
      const matched = pattern.exec(dataKey);
      if (!matched) continue;
      const row = Number(matched[1]);
      if (Number.isFinite(row) && row > maxRow) maxRow = row;
    }
  }

  return Math.max(configured, maxRow);
}
