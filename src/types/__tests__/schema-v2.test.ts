import { describe, expect, it } from "vitest";
import type { FormSchemaV2 } from "@/types/schema-v2";
import { buildEditorNodeIndexV2 } from "@/types/schema-v2-index";
import { validateFormSchemaV2 } from "@/types/schema-v2-validation";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";

function rootGrid(schema: FormSchemaV2) {
  const node = schema.pages[0].children[0];
  if (node.type !== "grid") throw new Error("fixture root is not a grid");
  return node;
}

function makeSchema(overrides: Partial<FormSchemaV2> = {}): FormSchemaV2 {
  return {
    version: 2,
    paper: { size: "A4", orientation: "portrait" },
    baseRowHeight: 8,
    pages: [
      {
        id: "page-1",
        type: "page",
        mode: "fixed",
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        children: [
          {
            id: "grid-1",
            type: "grid",
            border: "all",
            rows: [
              {
                id: "row-1",
                type: "grid-row",
                height: 1,
                cells: [
                  {
                    id: "cell-1",
                    type: "grid-cell",
                    children: [
                      { id: "label-1", type: "p", mode: "static", text: "单位" },
                    ],
                  },
                  {
                    id: "cell-2",
                    type: "grid-cell",
                    children: [
                      { id: "field-1", type: "p", mode: "field", field: "单位" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("Schema V2 index", () => {
  it("indexes nested nodes with parent and path", () => {
    const index = buildEditorNodeIndexV2(makeSchema());
    const field = index.get("field-1");
    expect(field?.parent?.id).toBe("cell-2");
    expect(field?.ownerCell?.id).toBe("cell-2");
    expect(field?.path).toEqual([
      "pages",
      0,
      "children",
      0,
      "rows",
      0,
      "cells",
      1,
      "children",
      0,
    ]);
  });

  it("rejects duplicate IDs while indexing", () => {
    const schema = makeSchema();
    schema.pages[0].children.push({
      id: "grid-1",
      type: "grid",
      border: "none",
      rows: [],
    });
    expect(() => buildEditorNodeIndexV2(schema)).toThrow(/Duplicate Schema V2 node id/);
  });
});

describe("Schema V2 validation", () => {
  it("accepts a minimal nested schema", () => {
    expect(validateFormSchemaV2(makeSchema())).toEqual([]);
  });

  it("reports duplicate fields and invalid dimensions", () => {
    const schema = makeSchema();
    const cell = rootGrid(schema).rows[0].cells[1];
    cell.children.push({ id: "field-2", type: "p", mode: "field", field: "单位" });
    schema.baseRowHeight = 0;
    const issues = validateFormSchemaV2(schema);
    expect(issues.some(issue => issue.code === "DUPLICATE_FIELD")).toBe(true);
    expect(issues.some(issue => issue.code === "INVALID_BASE_ROW_HEIGHT")).toBe(true);
  });

  it("reports invalid table templates and empty field names", () => {
    const schema = makeSchema();
    const cell = rootGrid(schema).rows[0].cells[0];
    cell.children = [
      { id: "field-empty", type: "p", mode: "field", field: "" },
      {
        id: "table-1",
        type: "table",
        columns: [{ key: "location", title: "地点" }],
        headerHeight: 1,
        rowHeight: 1,
        minRows: 1,
        repeatable: false,
        rowTemplate: [
          {
            id: "template-1",
            type: "table-cell-template",
            columnKey: "missing",
            children: [],
          },
        ],
      },
    ];
    const issues = validateFormSchemaV2(schema);
    expect(issues.some(issue => issue.code === "EMPTY_FIELD")).toBe(true);
    expect(issues.some(issue => issue.code === "INVALID_TABLE_TEMPLATE")).toBe(true);
  });
});

describe("Yunlv sample schema layout", () => {
  it("keeps the page as four sibling Grid components", () => {
    const schema = makeYunlvSecondTicketFirstFiveRowsSchema();
    const children = schema.pages[0].children;
    expect(children).toHaveLength(4);
    expect(children.every(node => node.type === "grid")).toBe(true);

    const workGrid = children[3];
    if (workGrid.type !== "grid") throw new Error("work grid missing");
    const workCellChildren = workGrid.rows[0].cells.flatMap(cell => cell.children);
    expect(workCellChildren.map(node => node.type)).toEqual(["p", "table"]);
  });
});
