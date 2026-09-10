import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { GridFormRenderer } from "@/components/renderer-v2";
import {
  createEmptyFormSchemaV2,
  createGridBySizeV2,
  insertRootGridV2,
  appendNodeToCellV2,
} from "@/types";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";

/**
 * P4.3 边框单边归属：
 * - 外层 Grid 与嵌套 Grid 各自带 `layout-grid--all` 外框；
 * - 所有 cell / table-cell 的边框一律由 scoped CSS 的「单边归属规则」绘制，
 *   渲染层从不把 `border` 写进内联 style —— 这是「嵌套/相邻不出现双边框」的结构前提；
 * - Table 自包含 `layout-table` 外框，不依赖外层 GridCell 的 right/bottom。
 * （真实像素级「无双边框」需在 Chrome/Edge 人工截图核验，见 §17 / P9.3f。）
 */
describe("Grid 边框单边归属（P4.3）", () => {
  it("嵌套 Grid：内外 Grid 各自带 all 外框，cell 不内联 border", () => {
    const outer = createGridBySizeV2({ rows: 2, columns: 2, border: "all" });
    const inner = createGridBySizeV2({ rows: 2, columns: 2, border: "all" });
    const schema = appendNodeToCellV2(
      insertRootGridV2(createEmptyFormSchemaV2(), outer),
      outer.rows[0].cells[0].id,
      inner,
    );

    const wrapper = mount(GridFormRenderer, { props: { schema } });
    const grids = wrapper.findAll(".layout-grid");
    expect(grids).toHaveLength(2);
    expect(grids.every(g => g.classes().includes("layout-grid--all"))).toBe(true);

    const cells = wrapper.findAll(".layout-grid__cell");
    expect(cells.length).toBe(8); // 外层 4 + 内层 4
    for (const cell of cells) {
      const style = cell.attributes("style") ?? "";
      expect(style).not.toContain("border");
    }
  });

  it("Table 自包含外框：表格元素带 layout-table 类，单元格不内联 border", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: makeYunlvSecondTicketFirstFiveRowsSchema() },
    });
    const table = wrapper.find("table.layout-table");
    expect(table.exists()).toBe(true);

    const tableCells = wrapper.findAll("table.layout-table td, table.layout-table th");
    expect(tableCells.length).toBeGreaterThan(0);
    for (const cell of tableCells) {
      const style = cell.attributes("style") ?? "";
      expect(style).not.toContain("border");
    }
  });

  it("border=outer 映射为 layout-grid--outer（仅外框，内部线由 CSS 单侧绘制）", () => {
    const outer = createGridBySizeV2({ rows: 2, columns: 2, border: "outer" });
    const schema = insertRootGridV2(createEmptyFormSchemaV2(), outer);
    const wrapper = mount(GridFormRenderer, { props: { schema } });
    expect(wrapper.find(".layout-grid").classes()).toContain("layout-grid--outer");
  });

  it("相邻 Grid 都带外框：页面竖向堆叠时后一个隐藏上边框（避免 2px 重叠，Item 2）", () => {
    const g1 = createGridBySizeV2({ rows: 1, columns: 1, border: "all" });
    const g2 = createGridBySizeV2({ rows: 1, columns: 1, border: "all" });
    const schema = insertRootGridV2(insertRootGridV2(createEmptyFormSchemaV2(), g1), g2);

    const wrapper = mount(GridFormRenderer, { props: { schema } });
    const grids = wrapper.findAll(".layout-grid");
    expect(grids).toHaveLength(2);
    // 前一个正常绘制外框，且不隐藏上边框
    expect(grids[0].classes()).toContain("layout-grid--all");
    expect(grids[0].classes()).not.toContain("layout-grid--no-top");
    // 后一个保留外框，但上边框被抑制（与前者的下边框合并为单线）
    expect(grids[1].classes()).toContain("layout-grid--all");
    expect(grids[1].classes()).toContain("layout-grid--no-top");
  });

  it("相邻 Grid 都带外框：单元格内横向排布时后一个隐藏左边框（Item 2）", () => {
    const root = createGridBySizeV2({ rows: 1, columns: 1, border: "all" });
    const schema = insertRootGridV2(createEmptyFormSchemaV2(), root);
    const cellId = root.rows[0].cells[0].id;
    const a = createGridBySizeV2({ rows: 1, columns: 1, border: "all" });
    const b = createGridBySizeV2({ rows: 1, columns: 1, border: "all" });
    const withBoth = appendNodeToCellV2(appendNodeToCellV2(schema, cellId, a), cellId, b);

    const wrapper = mount(GridFormRenderer, { props: { schema: withBoth } });
    const rootCell = wrapper.find(".layout-grid__cell");
    const innerGrids = rootCell.findAll(".layout-grid");
    expect(innerGrids).toHaveLength(2);
    expect(innerGrids[0].classes()).not.toContain("layout-grid--no-left");
    expect(innerGrids[1].classes()).toContain("layout-grid--no-left");
  });
});
