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
    return {
      ...node,
      border: node.border ?? "none",
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
      headerHeight: node.headerHeight ?? 1,
      rowHeight: node.rowHeight ?? 1,
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
  throw new SchemaV2SerializationError(`Unknown Schema node type: ${node.type}`);
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
