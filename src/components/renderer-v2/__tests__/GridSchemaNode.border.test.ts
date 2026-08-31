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
});
