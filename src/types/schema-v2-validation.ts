import type {
  FormNodeV2,
  FormSchemaV2,
  GridCellV2,
  GridNodeV2,
  GridRowV2,
  EditorNodeV2,
  TableNodeV2,
} from "./schema-v2";
import { buildEditorNodeIndexV2 } from "./schema-v2-index";

export interface SchemaIssueV2 {
  level: "error" | "warning";
  code: string;
  nodeId?: string;
  path?: Array<string | number>;
  message: string;
}

function issue(
  issues: SchemaIssueV2[],
  level: SchemaIssueV2["level"],
  code: string,
  node: EditorNodeV2 | undefined,
  path: Array<string | number> | undefined,
  message: string,
): void {
  issues.push({ level, code, nodeId: node?.id, path, message });
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidTrack(value: unknown): boolean {
  if (value === "auto") return true;
  if (typeof value === "number") return isPositiveNumber(value);
  return typeof value === "string" && /^\d+(?:\.\d+)?fr$/.test(value);
}

function validateGrid(
  node: GridNodeV2,
  path: Array<string | number>,
  issues: SchemaIssueV2[],
): void {
  if (!Array.isArray(node.rows) || node.rows.length === 0) {
    issue(issues, "error", "INVALID_GRID_ROWS", node, path, "Grid must contain at least one row");
    return;
  }
  node.rows.forEach((row, rowIndex) => validateRow(row, node, [...path, "rows", rowIndex], issues));
}

function validateRow(
  row: GridRowV2,
  grid: GridNodeV2,
  path: Array<string | number>,
  issues: SchemaIssueV2[],
): void {
  if (!isPositiveNumber(row.height)) {
    issue(issues, "error", "INVALID_ROW_HEIGHT", row, path, "Grid row height must be positive");
  }
  if (!Array.isArray(row.cells) || row.cells.length === 0) {
    issue(issues, "error", "INVALID_GRID_CELLS", row, path, "Grid row must contain at least one cell");
    return;
  }
  let occupiedColumns = 0;
  row.cells.forEach((cell, cellIndex) => {
    validateCell(cell, [...path, "cells", cellIndex], issues);
    const span = cell.colspan ?? 1;
    if (!Number.isInteger(span) || span < 1) {
      issue(issues, "error", "INVALID_COLSPAN", cell, [...path, "cells", cellIndex], "colspan must be a positive integer");
    }
    occupiedColumns += Number.isInteger(span) && span > 0 ? span : 0;
  });
  if (grid.rows.some(current => current.cells.length > 0) && occupiedColumns < 1) {
    issue(issues, "error", "INVALID_GRID_COLUMNS", grid, path, "Grid row has no occupied columns");
  }
}

function validateCell(cell: GridCellV2, path: Array<string | number>, issues: SchemaIssueV2[]): void {
  if (cell.width !== undefined && !isValidTrack(cell.width)) {
    issue(issues, "error", "INVALID_CELL_WIDTH", cell, path, "Cell width must be a positive mm value, fr track, or auto");
  }
  if (cell.padding !== undefined && (!Number.isFinite(cell.padding) || cell.padding < 0)) {
    issue(issues, "error", "INVALID_CELL_PADDING", cell, path, "Cell padding must be non-negative");
  }
}

function validateTable(node: TableNodeV2, path: Array<string | number>, issues: SchemaIssueV2[]): void {
  if (!Array.isArray(node.columns) || node.columns.length === 0) {
    issue(issues, "error", "INVALID_TABLE_COLUMNS", node, path, "Table must contain at least one column");
    return;
  }
  const keys = new Set<string>();
  node.columns.forEach((column, columnIndex) => {
    const columnPath = [...path, "columns", columnIndex];
    if (!column.key.trim() || keys.has(column.key)) {
      issue(issues, "error", "DUPLICATE_TABLE_COLUMN", node, columnPath, `Duplicate or empty table column key: ${column.key}`);
    }
    keys.add(column.key);
    if (column.width !== undefined && !isValidTrack(column.width)) {
      issue(issues, "error", "INVALID_TABLE_COLUMN_WIDTH", node, columnPath, `Invalid width for table column ${column.key}`);
    }
  });
  if (!isPositiveNumber(node.headerHeight) || !isPositiveNumber(node.rowHeight)) {
    issue(issues, "error", "INVALID_TABLE_ROW_HEIGHT", node, path, "Table headerHeight and rowHeight must be positive");
  }
  if (!Number.isInteger(node.minRows) || node.minRows < 0) {
    issue(issues, "error", "INVALID_TABLE_MIN_ROWS", node, path, "Table minRows must be a non-negative integer");
  }
  const templateKeys = new Set<string>();
  node.rowTemplate.forEach((template, templateIndex) => {
    const templatePath = [...path, "rowTemplate", templateIndex];
    if (!keys.has(template.columnKey) || templateKeys.has(template.columnKey)) {
      issue(issues, "error", "INVALID_TABLE_TEMPLATE", template, templatePath, `Invalid table template column: ${template.columnKey}`);
    }
    templateKeys.add(template.columnKey);
  });
  for (const key of keys) {
    if (!templateKeys.has(key)) {
      issue(issues, "warning", "MISSING_TABLE_TEMPLATE", node, path, `Table has no row template for column: ${key}`);
    }
  }
}

function scanNode(
  node: FormNodeV2,
  path: Array<string | number>,
  issues: SchemaIssueV2[],
  fields: Map<string, string>,
): void {
  if (node.type === "p") {
    if (node.mode === "static" && !node.text.trim()) {
      issue(issues, "warning", "EMPTY_STATIC_TEXT", node, path, "Static P has empty text");
    }
    if (node.mode === "field") {
      if (!node.field.trim()) {
        issue(issues, "warning", "EMPTY_FIELD", node, path, "Field P has an empty field name");
      } else if (fields.has(node.field)) {
        issue(issues, "warning", "DUPLICATE_FIELD", node, path, `Field is already used by ${fields.get(node.field)}`);
      } else {
        fields.set(node.field, node.id);
      }
    }
  } else if (node.type === "grid") {
    validateGrid(node, path, issues);
    node.rows.forEach((row, rowIndex) => row.cells.forEach((cell, cellIndex) =>
      cell.children.forEach((child, childIndex) =>
        scanNode(child, [...path, "rows", rowIndex, "cells", cellIndex, "children", childIndex], issues, fields),
      ),
    ));
  } else if (node.type === "table") {
    validateTable(node, path, issues);
    node.rowTemplate.forEach((template, templateIndex) => template.children.forEach((child, childIndex) =>
      scanNode(child, [...path, "rowTemplate", templateIndex, "children", childIndex], issues, fields),
    ));
  } else if (node.type === "image") {
    if (!node.src && !node.field) issue(issues, "warning", "IMAGE_WITHOUT_SOURCE", node, path, "Image has neither src nor field");
    if ((node.width !== undefined && !isPositiveNumber(node.width)) || (node.height !== undefined && !isPositiveNumber(node.height))) {
      issue(issues, "error", "INVALID_IMAGE_DIMENSION", node, path, "Image dimensions must be positive");
    }
  } else if (node.type === "html" && !node.trusted) {
    issue(issues, "warning", "UNTRUSTED_HTML", node, path, "HTML will be sanitized before rendering");
  }
}

export function validateFormSchemaV2(schema: FormSchemaV2): SchemaIssueV2[] {
  const issues: SchemaIssueV2[] = [];
  if (schema.version !== 2) {
    issue(issues, "error", "INVALID_VERSION", undefined, undefined, "Expected Schema V2");
  }
  if (!isPositiveNumber(schema.baseRowHeight)) {
    issue(issues, "error", "INVALID_BASE_ROW_HEIGHT", undefined, ["baseRowHeight"], "baseRowHeight must be positive");
  }
  const seenIds = new Set<string>();
  const fields = new Map<string, string>();
  const visit = (node: EditorNodeV2, path: Array<string | number>): void => {
    if (seenIds.has(node.id)) issue(issues, "error", "DUPLICATE_ID", node, path, `Duplicate node id: ${node.id}`);
    seenIds.add(node.id);
  };
  schema.pages.forEach((page, pageIndex) => {
    const pagePath = ["pages", pageIndex] as Array<string | number>;
    visit(page, pagePath);
    if (!page.children.length) issue(issues, "warning", "EMPTY_PAGE", page, pagePath, "Page has no children");
    page.children.forEach((child, childIndex) => scanNode(child, [...pagePath, "children", childIndex], issues, fields));
  });
  // buildEditorNodeIndexV2 verifies duplicate IDs and parent paths independently.
  try {
    buildEditorNodeIndexV2(schema);
  } catch (error) {
    issue(issues, "error", "INDEX_BUILD_FAILED", undefined, undefined, error instanceof Error ? error.message : String(error));
  }
  return issues;
}
