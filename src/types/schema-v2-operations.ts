import type {
  FormNodeV2,
  FormSchemaV2,
  GridCellV2,
  GridNodeV2,
  GridRowV2,
  GridTrackV2,
  PageSchemaV2,
  EditorNodeV2,
  TableCellTemplateV2,
  TableNodeV2,
  HtmlNodeV2,
  ImageNodeV2,
} from "./schema-v2";
import { buildEditorNodeIndexV2 } from "./schema-v2-index";

export function createSchemaNodeIdV2(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function cloneWithFreshIds(node: EditorNodeV2): EditorNodeV2 {
  const nextId = (prefix: string) => createSchemaNodeIdV2(prefix);
  if (node.type === "grid-row") {
    return {
      ...node,
      id: nextId("row"),
      cells: node.cells.map(cell => cloneWithFreshIds(cell) as GridCellV2),
    };
  }
  if (node.type === "grid-cell") {
    return {
      ...node,
      id: nextId("cell"),
      children: node.children.map(cloneWithFreshIds) as FormNodeV2[],
    };
  }
  if (node.type === "table-cell-template") {
    return {
      ...node,
      id: nextId("template"),
      children: node.children.map(cloneWithFreshIds) as FormNodeV2[],
    };
  }
  if (node.type === "page") {
    return { ...node, id: nextId("page"), children: node.children.map(cloneWithFreshIds) as FormNodeV2[] };
  }
  if (node.type === "grid") {
    return {
      ...node,
      id: nextId("grid"),
      rows: node.rows.map(row => ({
        ...row,
        id: nextId("row"),
        cells: row.cells.map(cell => ({
          ...cell,
          id: nextId("cell"),
          children: cell.children.map(cloneWithFreshIds) as FormNodeV2[],
        })),
      })),
    };
  }
  if (node.type === "table") {
    return {
      ...node,
      id: nextId("table"),
      rowTemplate: node.rowTemplate.map(template => ({
        ...template,
        id: nextId("template"),
        children: template.children.map(cloneWithFreshIds) as FormNodeV2[],
      })),
    };
  }
  return { ...node, id: nextId(node.type) };
}

export function cloneNodeWithFreshIdsV2<T extends EditorNodeV2>(node: T): T {
  return cloneWithFreshIds(node) as T;
}

type NodeUpdater = (node: EditorNodeV2) => EditorNodeV2;

function updateNode(node: FormNodeV2, id: string, updater: NodeUpdater): FormNodeV2 {
  const updated = node.id === id ? (updater(node) as FormNodeV2) : node;
  if (updated.type === "grid") {
    return {
      ...updated,
      rows: updated.rows.map(row => updateRow(row, id, updater)),
    };
  }
  if (updated.type === "table") {
    return {
      ...updated,
      rowTemplate: updated.rowTemplate.map(template => updateTemplate(template, id, updater)),
    };
  }
  return updated;
}

function updateRow(row: GridRowV2, id: string, updater: NodeUpdater): GridRowV2 {
  const updated = row.id === id ? (updater(row) as GridRowV2) : row;
  return {
    ...updated,
    cells: updated.cells.map(cell => updateCell(cell, id, updater)),
  };
}

function updateCell(cell: GridCellV2, id: string, updater: NodeUpdater): GridCellV2 {
  const updated = cell.id === id ? (updater(cell) as GridCellV2) : cell;
  return {
    ...updated,
    children: updated.children.map(child => updateNode(child, id, updater)),
  };
}

function updateTemplate(
  template: TableCellTemplateV2,
  id: string,
  updater: NodeUpdater,
): TableCellTemplateV2 {
  const updated = template.id === id ? (updater(template) as TableCellTemplateV2) : template;
  return {
    ...updated,
    children: updated.children.map(child => updateNode(child, id, updater)),
  };
}

function updatePage(page: PageSchemaV2, id: string, updater: NodeUpdater): PageSchemaV2 {
  const updated = page.id === id ? (updater(page) as PageSchemaV2) : page;
  return {
    ...updated,
    children: updated.children.map(child => updateNode(child, id, updater)),
  };
}

export function updateSchemaNodeV2(
  schema: FormSchemaV2,
  id: string,
  updater: NodeUpdater,
): FormSchemaV2 {
  return {
    ...schema,
    pages: schema.pages.map(page => updatePage(page, id, updater)),
  };
}

export function insertGridRowV2(
  schema: FormSchemaV2,
  gridId: string,
  row: GridRowV2,
  at?: number,
): FormSchemaV2 {
  return updateSchemaNodeV2(schema, gridId, node => {
    if (node.type !== "grid") return node;
    const index = Math.max(0, Math.min(at ?? node.rows.length, node.rows.length));
    const rows = [...node.rows];
    rows.splice(index, 0, row);
    return { ...node, rows };
  });
}

export function appendTableRowsV2(
  schema: FormSchemaV2,
  tableId: string,
  count = 1,
): FormSchemaV2 {
  return updateSchemaNodeV2(schema, tableId, node => {
    if (node.type !== "table") return node;
    return { ...node, minRows: Math.max(0, node.minRows + count) };
  });
}

export function updateGridBorderV2(
  schema: FormSchemaV2,
  gridId: string,
  border: GridNodeV2["border"],
): FormSchemaV2 {
  return updateSchemaNodeV2(schema, gridId, node =>
    node.type === "grid" ? { ...node, border } : node,
  );
}

export function updateGridRowHeightV2(
  schema: FormSchemaV2,
  rowId: string,
  height: number,
): FormSchemaV2 {
  return updateSchemaNodeV2(schema, rowId, node =>
    node.type === "grid-row" ? { ...node, height } : node,
  );
}

export function updateCellWidthV2(
  schema: FormSchemaV2,
  cellId: string,
  width: GridCellV2["width"],
): FormSchemaV2 {
  return updateSchemaNodeV2(schema, cellId, node =>
    node.type === "grid-cell" ? { ...node, width } : node,
  );
}

export function updateTableMinRowsV2(
  schema: FormSchemaV2,
  tableId: string,
  minRows: number,
): FormSchemaV2 {
  return updateSchemaNodeV2(schema, tableId, node =>
    node.type === "table" ? { ...node, minRows: Math.max(0, Math.floor(minRows)) } : node,
  );
}

export function createEmptyFormSchemaV2(): FormSchemaV2 {
  return {
    version: 2,
    paper: { size: "A4", orientation: "portrait" },
    baseRowHeight: 8,
    pages: [
      {
        id: createSchemaNodeIdV2("page"),
        type: "page",
        mode: "fixed",
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        children: [],
      },
    ],
  };
}

export function createGridRowV2(
  cellCount = 1,
  height = 1,
): GridRowV2 {
  const count = Math.max(1, Math.floor(cellCount));
  return {
    id: createSchemaNodeIdV2("row"),
    type: "grid-row",
    height: Math.max(1, Math.floor(height)),
    cells: Array.from({ length: count }, (_, index) => ({
      id: createSchemaNodeIdV2(`cell-${index + 1}`),
      type: "grid-cell" as const,
      width: "1fr" as const,
      children: [],
    })),
  };
}

export function appendNodeToCellV2(
  schema: FormSchemaV2,
  cellId: string,
  child: FormNodeV2,
): FormSchemaV2 {
  return updateSchemaNodeV2(schema, cellId, node =>
    node.type === "grid-cell" || node.type === "table-cell-template"
      ? { ...node, children: [...node.children, child] }
      : node,
  );
}

export function mergeGridCellsV2(
  schema: FormSchemaV2,
  firstCellId: string,
  secondCellId: string,
): FormSchemaV2 {
  const index = buildEditorNodeIndexV2(schema);
  const first = index.get(firstCellId);
  const second = index.get(secondCellId);
  if (first?.node.type !== "grid-cell" || second?.node.type !== "grid-cell") return schema;
  if (first.parent?.type !== "grid-row" || first.parent.id !== second.parent?.id) return schema;
  const rowId = first.parent.id;
  return updateSchemaNodeV2(schema, rowId, node => {
    if (node.type !== "grid-row") return node;
    const firstIndex = node.cells.findIndex(cell => cell.id === firstCellId);
    const secondIndex = node.cells.findIndex(cell => cell.id === secondCellId);
    if (firstIndex < 0 || secondIndex < 0 || firstIndex === secondIndex) return node;
    const left = node.cells[firstIndex];
    const right = node.cells[secondIndex];
    const merged = {
      ...left,
      colspan: (left.colspan ?? 1) + (right.colspan ?? 1),
      children: [...left.children, ...right.children],
    };
    return {
      ...node,
      cells: node.cells.filter(cell => cell.id !== secondCellId).map(cell =>
        cell.id === firstCellId ? merged : cell,
      ),
    };
  });
}

export function wrapCellChildrenWithGridV2(schema: FormSchemaV2, cellId: string): FormSchemaV2 {
  return updateSchemaNodeV2(schema, cellId, node => {
    if (node.type !== "grid-cell" || node.children.length === 0) return node;
    const nested = createGridBySizeV2({ rows: 1, columns: 1, border: "none" });
    nested.rows[0].cells[0].children = node.children;
    return { ...node, children: [nested] };
  });
}

export function moveNodeV2(
  schema: FormSchemaV2,
  nodeId: string,
  targetCellId: string,
): FormSchemaV2 {
  const index = buildEditorNodeIndexV2(schema);
  const source = index.get(nodeId);
  const target = index.get(targetCellId);
  if (!source || !target || (target.node.type !== "grid-cell" && target.node.type !== "table-cell-template")) return schema;
  if (source.node.type === "page" || source.node.type === "grid-row" || source.node.type === "grid-cell" || source.node.type === "table-cell-template") return schema;
  let ancestor = target.parent;
  while (ancestor) {
    if (ancestor.id === nodeId) return schema;
    ancestor = index.get(ancestor.id)?.parent ?? null;
  }
  let moved: FormNodeV2 | undefined;
  const detach = (node: FormNodeV2): FormNodeV2 => {
    if (node.type === "grid") {
      return {
        ...node,
        rows: node.rows.map(row => ({
          ...row,
          cells: row.cells.map(cell => ({
            ...cell,
            children: cell.children.filter(child => {
              if (child.id === nodeId) { moved = child; return false; }
              return true;
            }).map(detach),
          })),
        })),
      };
    }
    if (node.type === "table") {
      return {
        ...node,
        rowTemplate: node.rowTemplate.map(template => ({
          ...template,
          children: template.children.filter(child => {
            if (child.id === nodeId) { moved = child; return false; }
            return true;
          }).map(detach),
        })),
      };
    }
    return node;
  };
  const detached = {
    ...schema,
    pages: schema.pages.map(page => ({ ...page, children: page.children.filter(child => {
      if (child.id === nodeId) { moved = child; return false; }
      return true;
    }).map(detach) })),
  };
  return moved ? appendNodeToCellV2(detached, targetCellId, moved) : schema;
}

export function insertRootGridV2(
  schema: FormSchemaV2,
  grid: GridNodeV2,
): FormSchemaV2 {
  const page = schema.pages[0];
  if (!page) return schema;
  return {
    ...schema,
    pages: schema.pages.map((current, index) =>
      index === 0 ? { ...current, children: [...current.children, grid] } : current,
    ),
  };
}

export function appendGridRowV2(
  schema: FormSchemaV2,
  gridId: string,
  row: GridRowV2,
): FormSchemaV2 {
  return insertGridRowV2(schema, gridId, row);
}

export function copyGridRowV2(schema: FormSchemaV2, rowId: string, at?: number): FormSchemaV2 {
  const copyInNode = (node: FormNodeV2): FormNodeV2 => {
    if (node.type === "grid") {
      const rowIndex = node.rows.findIndex(row => row.id === rowId);
      if (rowIndex >= 0) {
        const rows = [...node.rows];
        const clone = cloneNodeWithFreshIdsV2(node.rows[rowIndex]);
        const insertionIndex = Math.max(0, Math.min(at ?? rowIndex + 1, rows.length));
        rows.splice(insertionIndex, 0, clone);
        return { ...node, rows };
      }
      return {
        ...node,
        rows: node.rows.map(row => ({
          ...row,
          cells: row.cells.map(cell => ({ ...cell, children: cell.children.map(copyInNode) })),
        })),
      };
    }
    if (node.type === "table") {
      return {
        ...node,
        rowTemplate: node.rowTemplate.map(template => ({
          ...template,
          children: template.children.map(copyInNode),
        })),
      };
    }
    return node;
  };
  return {
    ...schema,
    pages: schema.pages.map(page => ({ ...page, children: page.children.map(copyInNode) })),
  };
}

export function removeGridRowV2(schema: FormSchemaV2, rowId: string): FormSchemaV2 {
  const removeFromNode = (node: FormNodeV2): FormNodeV2 => {
    if (node.type === "grid") {
      return {
        ...node,
        rows: node.rows
          .filter(row => row.id !== rowId)
          .map(row => ({
            ...row,
            cells: row.cells.map(cell => ({
              ...cell,
              children: cell.children.map(removeFromNode),
            })),
          })),
      };
    }
    if (node.type === "table") {
      return {
        ...node,
        rowTemplate: node.rowTemplate.map(template => ({
          ...template,
          children: template.children.map(removeFromNode),
        })),
      };
    }
    return node;
  };
  return {
    ...schema,
    pages: schema.pages.map(page => ({ ...page, children: page.children.map(removeFromNode) })),
  };
}

function removeNodeFromForm(node: FormNodeV2, id: string): FormNodeV2 | null {
  if (node.id === id) return null;
  if (node.type === "grid") {
    const rows = node.rows
      .filter(row => row.id !== id)
      .map(row => ({
        ...row,
        cells: row.cells
          .filter(cell => cell.id !== id)
          .map(cell => ({
            ...cell,
            children: cell.children
              .map(child => removeNodeFromForm(child, id))
              .filter((child): child is FormNodeV2 => child !== null),
          })),
      }))
      .filter(row => row.cells.length > 0);
    return rows.length > 0 ? {
      ...node,
      rows,
    } : null;
  }
  if (node.type === "table") {
    return {
      ...node,
      rowTemplate: node.rowTemplate
        .filter(template => template.id !== id)
        .map(template => ({
          ...template,
          children: template.children
            .map(child => removeNodeFromForm(child, id))
            .filter((child): child is FormNodeV2 => child !== null),
        })),
    };
  }
  return node;
}

export function removeNodeV2(schema: FormSchemaV2, nodeId: string): FormSchemaV2 {
  return {
    ...schema,
    pages: schema.pages
      .filter(page => page.id !== nodeId)
      .map(page => ({
        ...page,
        children: page.children
          .map(child => removeNodeFromForm(child, nodeId))
          .filter((child): child is FormNodeV2 => child !== null),
      })),
  };
}

export function moveGridRowV2(
  schema: FormSchemaV2,
  rowId: string,
  direction: "up" | "down",
): FormSchemaV2 {
  return {
    ...schema,
    pages: schema.pages.map(page => ({
      ...page,
      children: page.children.map(node => {
        if (node.type !== "grid") return node;
        const index = node.rows.findIndex(row => row.id === rowId);
        if (index < 0) return node;
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= node.rows.length) return node;
        const rows = [...node.rows];
        [rows[index], rows[target]] = [rows[target], rows[index]];
        return { ...node, rows };
      }),
    })),
  };
}

export function splitGridRowV2(
  schema: FormSchemaV2,
  rowId: string,
  cellCount: number,
): FormSchemaV2 {
  const count = Math.max(1, Math.floor(cellCount));
  return updateSchemaNodeV2(schema, rowId, node => {
    if (node.type !== "grid-row") return node;
    const existing = node.cells;
    const cells = Array.from({ length: count }, (_, index) => existing[index] ?? {
      id: createSchemaNodeIdV2(`cell-${index + 1}`),
      type: "grid-cell" as const,
      width: "1fr" as const,
      children: [],
    });
    return { ...node, cells };
  });
}

function createGridCellV2(width: GridTrackV2 = "1fr"): GridCellV2 {
  return {
    id: createSchemaNodeIdV2("cell"),
    type: "grid-cell",
    width,
    children: [],
  };
}

export function resizeGridRowV2(row: GridRowV2, columnCount: number): GridRowV2 {
  const cells = row.cells.slice(0, columnCount);
  while (cells.length < columnCount) cells.push(createGridCellV2());
  if (row.cells.length > columnCount && cells.length > 0) {
    const overflow = row.cells.slice(columnCount).flatMap(cell => cell.children);
    cells[cells.length - 1] = {
      ...cells[cells.length - 1],
      children: [...cells[cells.length - 1].children, ...overflow],
    };
  }
  return { ...row, cells };
}

export function resizeGridV2(
  schema: FormSchemaV2,
  gridId: string,
  rowCount: number,
  columnCount: number,
): FormSchemaV2 {
  const rowsTarget = Math.max(1, Math.floor(rowCount));
  const columnsTarget = Math.max(1, Math.floor(columnCount));
  return updateSchemaNodeV2(schema, gridId, node => {
    if (node.type !== "grid") return node;
    const rows = node.rows.slice(0, rowsTarget).map(row => resizeGridRowV2(row, columnsTarget));
    const defaultHeight = node.rows[0]?.height ?? 1;
    while (rows.length < rowsTarget) {
      rows.push(createGridRowV2(columnsTarget, defaultHeight));
    }
    if (node.rows.length > rowsTarget && rows.length > 0) {
      const overflow = node.rows
        .slice(rowsTarget)
        .flatMap(row => row.cells.flatMap(cell => cell.children));
      const lastRow = rows[rows.length - 1];
      const lastCell = lastRow.cells[lastRow.cells.length - 1];
      lastRow.cells[lastRow.cells.length - 1] = {
        ...lastCell,
        children: [...lastCell.children, ...overflow],
      };
    }
    return { ...node, rows };
  });
}

/** Configures a Cell's internal layout through a nested Grid. */
export function resizeGridCellLayoutV2(
  schema: FormSchemaV2,
  cellId: string,
  rowCount: number,
  columnCount: number,
): FormSchemaV2 {
  const rowsTarget = Math.max(1, Math.floor(rowCount));
  const columnsTarget = Math.max(1, Math.floor(columnCount));
  return updateSchemaNodeV2(schema, cellId, node => {
    if (node.type !== "grid-cell") return node;
    const existing = node.children.length === 1 && node.children[0]?.type === "grid"
      ? node.children[0]
      : undefined;
    if (existing) {
      const rows = existing.rows.slice(0, rowsTarget).map(row => resizeGridRowV2(row, columnsTarget));
      const defaultHeight = existing.rows[0]?.height ?? 1;
      while (rows.length < rowsTarget) rows.push(createGridRowV2(columnsTarget, defaultHeight));
      if (existing.rows.length > rowsTarget) {
        const overflow = existing.rows.slice(rowsTarget).flatMap(row => row.cells.flatMap(cell => cell.children));
        const lastRow = rows[rows.length - 1];
        const lastCell = lastRow.cells[lastRow.cells.length - 1];
        lastRow.cells[lastRow.cells.length - 1] = { ...lastCell, children: [...lastCell.children, ...overflow] };
      }
      return {
        ...node,
        children: [{ ...existing, rows }],
      };
    }
    const nested = createGridBySizeV2({ rows: rowsTarget, columns: columnsTarget, border: "none" });
    nested.rows[0].cells[0].children = node.children;
    return { ...node, children: [nested] };
  });
}

export function splitGridCellRowsV2(schema: FormSchemaV2, cellId: string, rowCount: number): FormSchemaV2 {
  return resizeGridCellLayoutV2(schema, cellId, rowCount, 1);
}

export function createGridNodeV2(
  row?: GridRowV2,
  border?: GridNodeV2["border"],
): GridNodeV2;
export function createGridNodeV2(options?: GridSizeOptionsV2): GridNodeV2;
export function createGridNodeV2(
  value: GridRowV2 | GridSizeOptionsV2 = createGridRowV2(),
  border: GridNodeV2["border"] = "all",
): GridNodeV2 {
  if (!("type" in value)) return createGridBySizeV2(value);
  return {
    id: createSchemaNodeIdV2("grid"),
    type: "grid",
    border,
    rows: [value],
  };
}

export interface GridSizeOptionsV2 {
  rows?: number;
  columns?: number;
  rowHeight?: number;
  border?: GridNodeV2["border"];
  cellWidth?: GridTrackV2;
}

/** Creates a regular grid for the editor; the persisted shape remains rows/cells/children. */
export function createGridBySizeV2(options: GridSizeOptionsV2 = {}): GridNodeV2 {
  const rowCount = Math.max(1, Math.floor(options.rows ?? 1));
  const columnCount = Math.max(1, Math.floor(options.columns ?? 1));
  const rowHeight = Math.max(1, Math.floor(options.rowHeight ?? 1));
  const cellWidth = options.cellWidth ?? "1fr";

  return {
    id: createSchemaNodeIdV2("grid"),
    type: "grid",
    border: options.border ?? "all",
    rows: Array.from({ length: rowCount }, () => {
      const row = createGridRowV2(columnCount, rowHeight);
      return {
        ...row,
        cells: row.cells.map(cell => ({ ...cell, width: cellWidth })),
      };
    }),
  };
}

export function createStaticPNodeV2(text = "固定文本"): FormNodeV2 {
  return { id: createSchemaNodeIdV2("p-static"), type: "p", mode: "static", text };
}

export function createFieldPNodeV2(field = "字段"): FormNodeV2 {
  return { id: createSchemaNodeIdV2("p-field"), type: "p", mode: "field", field, underline: true };
}

export function createTableNodeV2(): TableNodeV2 {
  const id = createSchemaNodeIdV2("table");
  const columns: TableNodeV2["columns"] = [
    { key: "col1", title: "列 1", width: "1fr" },
    { key: "col2", title: "列 2", width: "1fr" },
  ];
  return {
    id,
    type: "table",
    columns,
    headerHeight: 1,
    rowHeight: 1,
    minRows: 4,
    repeatable: false,
    rowTemplate: columns.map(column => ({
      id: createSchemaNodeIdV2(`${id}-${column.key}`),
      type: "table-cell-template" as const,
      columnKey: column.key,
      children: [{
        id: createSchemaNodeIdV2(`${id}-${column.key}-p`),
        type: "p" as const,
        mode: "field" as const,
        field: column.key,
        underline: true,
      }],
    })),
  };
}

export function createHtmlNodeV2(html = ""): HtmlNodeV2 {
  return {
    id: createSchemaNodeIdV2("html"),
    type: "html",
    html,
  };
}

export function createImageNodeV2(): ImageNodeV2 {
  return {
    id: createSchemaNodeIdV2("image"),
    type: "image",
    objectFit: "contain",
  };
}
