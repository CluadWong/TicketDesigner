import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { GridFormRenderer } from "@/components/renderer-v2";
import {
  createEmptyFormSchemaV2,
  createGridBySizeV2,
  createTableNodeV2,
  insertRootGridV2,
  appendNodeToCellV2,
} from "@/types";
import type { FormSchemaV2, TableNodeV2, TextStyleV2 } from "@/types";

/**
 * Table 表头样式（headerStyle）：字号(px) / 粗细 / 对齐。
 * 渲染层 `tableHeaderCellStyle` 合并 headerStyle 与列 align，headerStyle.align 优先；
 * 未设 headerStyle 时完全回退到既有默认外观（不影响现存量快照）。
 */
function schemaWithTable(headerStyle?: TextStyleV2): FormSchemaV2 {
  const grid = createGridBySizeV2({ rows: 1, columns: 1, border: "all" });
  const table = createTableNodeV2();
  if (headerStyle) table.headerStyle = headerStyle;
  return appendNodeToCellV2(
    insertRootGridV2(createEmptyFormSchemaV2(), grid),
    grid.rows[0].cells[0].id,
    table,
  );
}

function thStyle(schema: FormSchemaV2): CSSStyleDeclaration {
  const wrapper = mount(GridFormRenderer, { props: { schema } });
  const th = wrapper.find("thead th.layout-table__cell");
  return (th.element as HTMLElement).style;
}

describe("Table 表头样式（字号/粗细/对齐）", () => {
  it("未设 headerStyle：th 回退默认（无内联 fontSize/fontWeight）", () => {
    const style = thStyle(schemaWithTable());
    expect(style.fontSize).toBe("");
    expect(style.fontWeight).toBe("");
  });

  it("headerStyle 应用字号(px)/加粗/居中到 th", () => {
    const style = thStyle(
      schemaWithTable({ fontSize: 14, fontWeight: "bold", align: "center" }),
    );
    expect(style.fontSize).toBe("14px");
    expect(style.fontWeight).toBe("bold");
    expect(style.justifyContent).toBe("center");
  });

  it("headerStyle.align 优先于 column.align", () => {
    const grid = createGridBySizeV2({ rows: 1, columns: 1, border: "all" });
    const table = createTableNodeV2();
    table.columns[0].align = "right";
    table.headerStyle = { align: "left" };
    const schema = appendNodeToCellV2(
      insertRootGridV2(createEmptyFormSchemaV2(), grid),
      grid.rows[0].cells[0].id,
      table,
    );
    expect(thStyle(schema).justifyContent).toBe("flex-start");
  });
});
