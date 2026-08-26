import { describe, expect, it } from "vitest";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";
import {
  appendNodeToCellV2,
  createEmptyFormSchemaV2,
  createGridNodeV2,
  createGridRowV2,
  createStaticPNodeV2,
  createTableNodeV2,
  insertRootGridV2,
  moveGridRowV2,
  removeNodeV2,
  resizeGridV2,
  resizeGridRowV2,
  resizeGridCellLayoutV2,
  splitGridCellRowsV2,
  splitGridRowV2,
  updateGridRowHeightV2,
  updateTableMinRowsV2,
  updateSchemaNodeV2,
} from "@/types/schema-v2-operations";
import { validateFormSchemaV2 } from "@/types/schema-v2-validation";

describe("Schema V2 operations", () => {
  const sampleGrid = (schema: ReturnType<typeof makeYunlvSecondTicketFirstFiveRowsSchema>, id: string) => {
    const grid = schema.pages[0].children.find(node => node.id === id);
    if (!grid || grid.type !== "grid") throw new Error(`sample grid missing: ${id}`);
    return grid;
  };

  it("creates a regular grid from row and column counts", () => {
    const grid = createGridNodeV2({ rows: 3, columns: 4, rowHeight: 2, cellWidth: 24 });

    expect(grid.rows).toHaveLength(3);
    expect(grid.rows[0].cells).toHaveLength(4);
    expect(grid.rows.every(row => row.height === 2)).toBe(true);
    expect(grid.rows.every(row => row.cells.every(cell => cell.width === 24))).toBe(true);
    expect(grid.rows.every(row => row.cells.every(cell => cell.children.length === 0))).toBe(true);
  });

  it("creates table templates with one default field P per column", () => {
    const table = createTableNodeV2();

    expect(table.rowTemplate).toHaveLength(table.columns.length);
    expect(table.rowTemplate.map(template => template.children)).toEqual(
      table.columns.map(column => [expect.objectContaining({
        type: "p",
        mode: "field",
        field: column.key,
      })]),
    );
  });

  it("allows replacing a table cell P with another component", () => {
    const source = createEmptyFormSchemaV2();
    const grid = createGridNodeV2({ rows: 1, columns: 1 });
    const table = createTableNodeV2();
    const withTable = appendNodeToCellV2(
      insertRootGridV2(source, grid),
      grid.rows[0].cells[0].id,
      table,
    );
    const templateId = table.rowTemplate[0].id;
    const defaultPId = table.rowTemplate[0].children[0].id;
    const withoutDefault = removeNodeV2(withTable, defaultPId);
    const withReplacement = appendNodeToCellV2(withoutDefault, templateId, createStaticPNodeV2("特殊内容"));
    const resultGrid = withReplacement.pages[0].children[0];
    if (resultGrid.type !== "grid") throw new Error("grid missing");
    const resultTable = resultGrid.rows[0].cells[0].children[0];
    if (resultTable.type !== "table") throw new Error("table missing");
    expect(resultTable.rowTemplate[0].children).toEqual([
      expect.objectContaining({ type: "p", text: "特殊内容" }),
    ]);
  });

  it("updates a nested row without mutating the source schema", () => {
    const schema = makeYunlvSecondTicketFirstFiveRowsSchema();
    const next = updateGridRowHeightV2(schema, "work-task", 6);
    expect(sampleGrid(next, "ticket-work-task-layout").rows[0].height).toBe(6);
    expect(sampleGrid(schema, "ticket-work-task-layout").rows[0].height).toBe(5);
  });

  it("resizes a selected grid while preserving existing cells and children", () => {
    const source = createEmptyFormSchemaV2();
    const grid = createGridNodeV2({ rows: 2, columns: 2 });
    const withGrid = insertRootGridV2(source, grid);
    const withP = appendNodeToCellV2(withGrid, grid.rows[0].cells[1].id, createStaticPNodeV2("keep"));
    const resized = resizeGridV2(withP, grid.id, 3, 3);
    const resizedGrid = resized.pages[0].children[0];

    if (resizedGrid.type !== "grid") throw new Error("grid missing");
    expect(resizedGrid.rows).toHaveLength(3);
    expect(resizedGrid.rows[0].cells).toHaveLength(3);
    expect(resizedGrid.rows[0].cells[1].children[0]).toMatchObject({ type: "p", text: "keep" });
    expect(resizedGrid.rows[2].cells).toHaveLength(3);
  });

  it("resizes an individual row independently of the parent Grid", () => {
    const source = createEmptyFormSchemaV2();
    const grid = createGridNodeV2({ rows: 2, columns: 2 });
    const withGrid = insertRootGridV2(source, grid);
    const resized = updateSchemaNodeV2(withGrid, grid.rows[1].id, node =>
      node.type === "grid-row" ? resizeGridRowV2(node, 4) : node,
    );
    const nextGrid = resized.pages[0].children[0];
    if (nextGrid.type !== "grid") throw new Error("grid missing");
    expect(nextGrid.rows[0].cells).toHaveLength(2);
    expect(nextGrid.rows[1].cells).toHaveLength(4);
  });

  it("splits a Cell into a one-column nested Grid", () => {
    const source = createEmptyFormSchemaV2();
    const grid = createGridNodeV2({ rows: 1, columns: 2 });
    const withGrid = insertRootGridV2(source, grid);
    const withTable = appendNodeToCellV2(withGrid, grid.rows[0].cells[1].id, createStaticPNodeV2("table"));
    const split = splitGridCellRowsV2(withTable, grid.rows[0].cells[1].id, 3);
    const parent = split.pages[0].children[0];

    if (parent.type !== "grid") throw new Error("grid missing");
    const nested = parent.rows[0].cells[1].children[0];
    expect(nested.type).toBe("grid");
    if (nested.type !== "grid") throw new Error("nested grid missing");
    expect(nested.rows).toHaveLength(3);
    expect(nested.rows[0].cells[0].children[0]).toMatchObject({ type: "p", text: "table" });
  });

  it("configures both rows and columns inside a Cell", () => {
    const source = createEmptyFormSchemaV2();
    const grid = createGridNodeV2({ rows: 1, columns: 2 });
    const withGrid = insertRootGridV2(source, grid);
    const resized = resizeGridCellLayoutV2(withGrid, grid.rows[0].cells[1].id, 2, 3);
    const parent = resized.pages[0].children[0];
    if (parent.type !== "grid") throw new Error("grid missing");
    const nested = parent.rows[0].cells[1].children[0];
    if (nested.type !== "grid") throw new Error("nested grid missing");
    expect(nested.rows).toHaveLength(2);
    expect(nested.rows[0].cells).toHaveLength(3);
  });

  it("updates table minimum rows through the nested tree", () => {
    const schema = makeYunlvSecondTicketFirstFiveRowsSchema();
    const next = updateTableMinRowsV2(schema, "work-task-table", 6);
    const grid = sampleGrid(next, "ticket-work-task-layout");
    const table = grid.rows[0].cells[1].children[0];
    if (table.type !== "table") throw new Error("fixture table missing");
    expect(table.minRows).toBe(6);
  });

  it("creates a blank page, adds a grid, splits a row, and inserts a static P", () => {
    const blank = createEmptyFormSchemaV2();
    const grid = createGridNodeV2(createGridRowV2(1));
    const withGrid = insertRootGridV2(blank, grid);
    const rowId = grid.rows[0].id;
    const split = splitGridRowV2(withGrid, rowId, 2);
    const gridAfterSplit = split.pages[0].children[0];
    if (gridAfterSplit.type !== "grid") throw new Error("grid missing");
    const withP = appendNodeToCellV2(split, gridAfterSplit.rows[0].cells[0].id, createStaticPNodeV2("单位"));
    const finalGrid = withP.pages[0].children[0];
    if (finalGrid.type !== "grid") throw new Error("grid missing");
    expect(finalGrid.rows[0].cells).toHaveLength(2);
    expect(finalGrid.rows[0].cells[0].children[0]).toMatchObject({ type: "p", mode: "static", text: "单位" });
  });

  it("moves rows and removes a nested node without mutating the source", () => {
    const schema = makeYunlvSecondTicketFirstFiveRowsSchema();
    const moved = moveGridRowV2(schema, "basic-station", "up");
    const movedGrid = sampleGrid(moved, "ticket-member-layout");
    expect(movedGrid.rows[0].id).toBe("basic-station");
    const removed = removeNodeV2(schema, "station-field");
    expect(sampleGrid(schema, "ticket-member-layout").rows[1].cells[1].children).toHaveLength(1);
    expect(sampleGrid(removed, "ticket-member-layout").rows[1].cells[1].children).toHaveLength(0);
  });

  it("removes grid, row, and cell structure nodes", () => {
    const schema = makeYunlvSecondTicketFirstFiveRowsSchema();

    const withoutCell = removeNodeV2(schema, "station-field-cell");
    const cellGrid = sampleGrid(withoutCell, "ticket-member-layout");
    expect(cellGrid.rows[1].cells).toHaveLength(1);

    const withoutRow = removeNodeV2(schema, "basic-station");
    const rowGrid = sampleGrid(withoutRow, "ticket-member-layout");
    expect(rowGrid.rows.some(row => row.id === "basic-station")).toBe(false);

    const withoutGrid = removeNodeV2(schema, "ticket-basic-layout");
    expect(withoutGrid.pages[0].children.some(node => node.id === "ticket-basic-layout")).toBe(false);
  });

  it("prunes empty rows and grids after deleting the last cell", () => {
    const schema = createEmptyFormSchemaV2();
    const grid = createGridNodeV2(createGridRowV2(1));
    const withGrid = insertRootGridV2(schema, grid);
    const withoutCell = removeNodeV2(withGrid, grid.rows[0].cells[0].id);

    expect(withoutCell.pages[0].children).toHaveLength(0);
    expect(validateFormSchemaV2(withoutCell).some(issue => issue.code === "INVALID_GRID_ROWS")).toBe(false);
  });
});
