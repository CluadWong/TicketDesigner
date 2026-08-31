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
import type { BorderModeV2, FormSchemaV2, TableNodeV2 } from "@/types";

/**
 * Table 边框配置（与 Grid 对齐）：all=外框+内部线（默认）、inner=仅内部线、
 * outer=仅外框、none=无。渲染层只加 `layout-table--{mode}` 修饰类，边框由 scoped CSS 单边绘制。
 */
function schemaWithTable(border: BorderModeV2 | undefined): FormSchemaV2 {
  const grid = createGridBySizeV2({ rows: 1, columns: 1, border: "all" });
  const table = createTableNodeV2();
  if (border) (table as TableNodeV2 & { border?: BorderModeV2 }).border = border;
  return appendNodeToCellV2(
    insertRootGridV2(createEmptyFormSchemaV2(), grid),
    grid.rows[0].cells[0].id,
    table,
  );
}

describe("Table 边框模式（P11 边框配置）", () => {
  it("未设 border 时默认渲染 layout-table--all（外框 + 内部线）", () => {
    const wrapper = mount(GridFormRenderer, { props: { schema: schemaWithTable(undefined) } });
    expect(wrapper.find("table.layout-table").classes()).toContain("layout-table--all");
  });

  it("border=none 仅加 layout-table--none 类（无外框、无内部线）", () => {
    const wrapper = mount(GridFormRenderer, { props: { schema: schemaWithTable("none") } });
    const cls = wrapper.find("table.layout-table").classes();
    expect(cls).toContain("layout-table--none");
    expect(cls).not.toContain("layout-table--all");
  });

  it("border=inner 渲染 layout-table--inner（仅内部线，无外框）", () => {
    const wrapper = mount(GridFormRenderer, { props: { schema: schemaWithTable("inner") } });
    expect(wrapper.find("table.layout-table").classes()).toContain("layout-table--inner");
  });

  it("border=outer 渲染 layout-table--outer（仅外框，无内部线）", () => {
    const wrapper = mount(GridFormRenderer, { props: { schema: schemaWithTable("outer") } });
    const cls = wrapper.find("table.layout-table").classes();
    expect(cls).toContain("layout-table--outer");
    expect(cls).not.toContain("layout-table--inner");
  });
});
