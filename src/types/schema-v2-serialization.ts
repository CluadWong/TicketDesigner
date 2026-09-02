import { validateFormSchemaV2, type SchemaIssueV2 } from "./schema-v2-validation";
import type { FormNodeV2, FormSchemaV2 } from "./schema-v2";

export class SchemaV2SerializationError extends Error {
  readonly issues: SchemaIssueV2[];

  constructor(message: string, issues: SchemaIssueV2[] = []) {
    super(message);
    this.name = "SchemaV2SerializationError";
    this.issues = issues;
  }
}

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SchemaV2SerializationError(`${label} must be an object`);
  }
  return value as RecordValue;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) {
    throw new SchemaV2SerializationError(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeNode(value: unknown): RecordValue {
  const node = asRecord(value, "Schema node");
  requiredString(node.id, "Schema node id");
  if (typeof node.type !== "string") {
    throw new SchemaV2SerializationError(`Schema node ${node.id} is missing type`);
  }
  if (node.type === "grid") {
    const rawGap = node.gap;
    const gap =
      typeof rawGap === "number" && Number.isFinite(rawGap) && rawGap > 0
        ? rawGap
        : undefined;
    return {
      ...node,
      border: node.border ?? "none",
      gap,
      rows: Array.isArray(node.rows)
        ? node.rows.map(row => normalizeRow(row))
        : [],
    };
  }
  if (node.type === "table") {
    const columns = Array.isArray(node.columns) ? node.columns : [];
    return {
      ...node,
      columns,
      minRows: node.minRows ?? 0,
      rowTemplate: Array.isArray(node.rowTemplate)
        ? node.rowTemplate.map(template => normalizeTemplate(template))
        : [],
    };
  }
  if (node.type === "text") return { ...node, text: node.text ?? "" };
  if (node.type === "p") {
    if (node.mode === "field") return { ...node, field: node.field ?? "" };
    // 兼容旧版：static P 归一化为 text 节点
    return { ...node, type: "text", text: node.text ?? "" };
  }
  if (node.type === "html") return { ...node, html: node.html ?? "" };
  if (node.type === "image") return { ...node, objectFit: node.objectFit ?? "contain" };
  // 未知节点类型：放行（不再整体 throw），保留原样交由校验标记为 UNKNOWN_NODE_TYPE；
  // 严格解析（parseFormSchemaV2）仍会因该校验 error 抛错，容错解析（parseTolerantFormSchemaV2）
  // 收集 issues 后返回 schema，渲染端对未知类型按 v-else-if 链跳过（G6 降级为占位/跳过）。
  return { ...node };
}

function normalizeRow(value: unknown): RecordValue {
  const row = asRecord(value, "Grid row");
  requiredString(row.id, "Grid row id");
  return {
    ...row,
    height: row.height ?? 1,
    cells: Array.isArray(row.cells) ? row.cells.map(cell => normalizeCell(cell)) : [],
  };
}

function normalizeCell(value: unknown): RecordValue {
  const cell = asRecord(value, "Grid cell");
  requiredString(cell.id, "Grid cell id");
  return {
    ...cell,
    children: Array.isArray(cell.children) ? cell.children.map(normalizeNode) : [],
  };
}

function normalizeTemplate(value: unknown): RecordValue {
  const template = asRecord(value, "Table cell template");
  requiredString(template.id, "Table cell template id");
  return {
    ...template,
    children: Array.isArray(template.children) ? template.children.map(normalizeNode) : [],
  };
}

/** Adds defaults for optional V2 fields without changing stable IDs or user content. */
export function normalizeFormSchemaV2(input: unknown): FormSchemaV2 {
  const source = asRecord(input, "Schema");
  if (source.version !== 2) {
    throw new SchemaV2SerializationError("Expected Schema V2");
  }
  if (!Array.isArray(source.pages)) {
    throw new SchemaV2SerializationError("Schema pages must be an array");
  }
  const paper = asRecord(source.paper ?? {}, "Schema paper");
  return {
    version: 2,
    paper: {
      size: (paper.size ?? "A4") as FormSchemaV2["paper"]["size"],
      orientation: (paper.orientation ?? "portrait") as FormSchemaV2["paper"]["orientation"],
    },
    baseRowHeight: (source.baseRowHeight ?? 8) as number,
    pages: source.pages.map(value => {
      const page = asRecord(value, "Page");
      requiredString(page.id, "Page id");
      if (page.type !== undefined && page.type !== "page") {
        throw new SchemaV2SerializationError(`Invalid page type: ${String(page.type)}`);
      }
      const margin = asRecord(page.margin ?? {}, "Page margin");
      return {
        ...page,
        id: page.id as string,
        type: "page" as const,
        mode: "fixed" as const,
        margin: {
          top: (margin.top ?? 10) as number,
          right: (margin.right ?? 10) as number,
          bottom: (margin.bottom ?? 10) as number,
          left: (margin.left ?? 10) as number,
        },
        children: (Array.isArray(page.children) ? page.children.map(normalizeNode) : []) as unknown as FormNodeV2[],
      };
    }),
  };
}

export function serializeFormSchemaV2(schema: FormSchemaV2, pretty = false): string {
  const issues = validateFormSchemaV2(schema);
  const errors = issues.filter(issue => issue.level === "error");
  if (errors.length) throw new SchemaV2SerializationError("Cannot serialize invalid Schema V2", errors);
  return JSON.stringify(schema, null, pretty ? 2 : 0);
}

export function parseFormSchemaV2(input: string | unknown): FormSchemaV2 {
  let value: unknown = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch (error) {
      throw new SchemaV2SerializationError(`Invalid Schema JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const schema = normalizeFormSchemaV2(value);
  const issues = validateFormSchemaV2(schema);
  const errors = issues.filter(issue => issue.level === "error");
  if (errors.length) throw new SchemaV2SerializationError("Schema V2 validation failed", errors);
  return schema;
}

/**
 * 容错解析结果：渲染端 / 消费页使用。
 * - `schema`：能还原出 schema 则为非 null（即便含 error，也已尽力归一化）；
 * - `issues`：JSON 解析 / 结构 / 校验阶段收集的全部问题（含 error 与 warning）；
 * - `ok`：是否至少成功还原出一份 schema（JSON 非法或结构不可用则为 false）。
 */
export interface ParseResultV2 {
  schema: FormSchemaV2 | null;
  issues: SchemaIssueV2[];
  ok: boolean;
}

/**
 * 容错解析（渲染端 / 消费页使用，对照严格的 `parseFormSchemaV2`）：
 * JSON 解析失败、结构非法、或含校验 error 时**均不抛错**，而是返回 schema（能还原则非 null）
 * 与收集到的 issues。坏节点（如未知类型，被校验标记为 `UNKNOWN_NODE_TYPE`）渲染端按未知类型跳过，
 * 实现「局部降级」而非整张表单打不开——满足消费页容忍设计器导出小瑕疵 / 新版本模板的需求（G5）。
 * 设计器保存 / 发布请继续使用严格的 `parseFormSchemaV2`（error 即抛）。
 */
export function parseTolerantFormSchemaV2(input: string | unknown): ParseResultV2 {
  let value: unknown = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch (error) {
      return {
        schema: null,
        issues: [
          {
            level: "error",
            code: "INVALID_JSON",
            message: `Invalid Schema JSON: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        ok: false,
      };
    }
  }
  let schema: FormSchemaV2;
  try {
    schema = normalizeFormSchemaV2(value);
  } catch (error) {
    if (error instanceof SchemaV2SerializationError) {
      return { schema: null, issues: error.issues, ok: false };
    }
    return {
      schema: null,
      issues: [
        {
          level: "error",
          code: "NORMALIZE_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      ],
      ok: false,
    };
  }
  const issues = validateFormSchemaV2(schema);
  return { schema, issues, ok: true };
}
