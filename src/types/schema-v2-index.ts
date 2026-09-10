import type {
  FormSchemaV2,
  GridCellV2,
  GridNodeV2,
  GridRowV2,
  PageSchemaV2,
  EditorNodeV2,
  TableCellTemplateV2,
} from "./schema-v2";

export interface EditorNodeRefV2 {
  node: EditorNodeV2;
  parent: EditorNodeV2 | null;
  path: Array<string | number>;
  ownerCell?: GridCellV2 | TableCellTemplateV2;
}

export type EditorNodeIndexV2 = Map<string, EditorNodeRefV2>;

export function getNodeRefByIdV2(
  schema: FormSchemaV2,
  nodeId: string,
): EditorNodeRefV2 | undefined {
  return buildEditorNodeIndexV2(schema).get(nodeId);
}

export function getNodeByIdV2(
  schema: FormSchemaV2,
  nodeId: string,
): EditorNodeV2 | undefined {
  return getNodeRefByIdV2(schema, nodeId)?.node;
}

export function getOwnerCellV2(
  schema: FormSchemaV2,
  nodeId: string,
): GridCellV2 | TableCellTemplateV2 | undefined {
  return getNodeRefByIdV2(schema, nodeId)?.ownerCell;
}

/** Returns ancestors from the root Page down to the direct parent. */
export function getAncestorsV2(
  schema: FormSchemaV2,
  nodeId: string,
): EditorNodeV2[] {
  const index = buildEditorNodeIndexV2(schema);
  const ref = index.get(nodeId);
  if (!ref) return [];
  const ancestors: EditorNodeV2[] = [];
  let current = ref.parent;
  while (current) {
    ancestors.unshift(current);
    const parentRef = index.get(current.id);
    current = parentRef?.parent ?? null;
  }
  return ancestors;
}

function addNode(
  index: EditorNodeIndexV2,
  node: EditorNodeV2,
  parent: EditorNodeV2 | null,
  path: Array<string | number>,
  ownerCell?: GridCellV2 | TableCellTemplateV2,
): void {
  if (index.has(node.id)) {
    throw new Error(`Duplicate Schema V2 node id: ${node.id}`);
  }
  index.set(node.id, { node, parent, path, ownerCell });
}

function visitFormNode(
  index: EditorNodeIndexV2,
  node: EditorNodeV2,
  parent: EditorNodeV2,
  path: Array<string | number>,
  ownerCell?: GridCellV2 | TableCellTemplateV2,
): void {
  addNode(index, node, parent, path, ownerCell);

  if (node.type === "grid") {
    node.rows.forEach((row, rowIndex) => visitRow(index, row, node, [...path, "rows", rowIndex]));
  } else if (node.type === "table") {
    node.rowTemplate.forEach((template, templateIndex) => {
      const templatePath = [...path, "rowTemplate", templateIndex] as Array<string | number>;
      addNode(index, template, node, templatePath);
      template.children.forEach((child, childIndex) =>
        visitFormNode(index, child, template, [...templatePath, "children", childIndex], template),
      );
    });
  }
}

function visitRow(
  index: EditorNodeIndexV2,
  row: GridRowV2,
  parent: GridNodeV2,
  path: Array<string | number>,
): void {
  addNode(index, row, parent, path);
  row.cells.forEach((cell, cellIndex) => {
    const cellPath = [...path, "cells", cellIndex] as Array<string | number>;
    addNode(index, cell, row, cellPath);
    cell.children.forEach((child, childIndex) =>
      visitFormNode(index, child, cell, [...cellPath, "children", childIndex], cell),
    );
  });
}

export function buildEditorNodeIndexV2(schema: FormSchemaV2): EditorNodeIndexV2 {
  const index: EditorNodeIndexV2 = new Map();
  schema.pages.forEach((page: PageSchemaV2, pageIndex) => {
    const pagePath = ["pages", pageIndex] as Array<string | number>;
    addNode(index, page, null, pagePath);
    page.children.forEach((child, childIndex) =>
      visitFormNode(index, child, page, [...pagePath, "children", childIndex]),
    );
  });
  return index;
}
