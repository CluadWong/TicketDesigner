import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { FormSchemaV2 } from "@/types";
import { GridFormRenderer } from "@/components/renderer-v2";

/**
 * Grid 单元格间距（gap）：同时作用于行间距（`.layout-grid` 的 `row-gap`）
 * 与列间距（`.layout-grid__row` 的 `column-gap`，等价于 CSS `gap`）。
 */
function makeGridSchema(gap?: number): FormSchemaV2 {
  return {
    version: 2,
    paper: { size: "A4", orientation: "portrait" },
    baseRowHeight: 8,
    pages: [
      {
        id: "page-1",
        type: "page",
        mode: "fixed",
        margin: { top: 5, right: 5, bottom: 5, left: 5 },
        children: [
          {
            id: "grid-1",
            type: "grid",
            border: "all",
            gap,
            rows: [
              {
                id: "r1",
                type: "grid-row",
                height: 1,
                cells: [
                  { id: "c1", type: "grid-cell", children: [] },
                  { id: "c2", type: "grid-cell", children: [] },
                ],
              },
              {
                id: "r2",
                type: "grid-row",
                height: 1,
                cells: [
                  { id: "c3", type: "grid-cell", children: [] },
                  { id: "c4", type: "grid-cell", children: [] },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("Grid 单元格间距 gap", () => {
  it("无 gap：容器与行均不含 row/column-gap", () => {
    const wrapper = mount(GridFormRenderer, { props: { schema: makeGridSchema() } });
    const gridEl = wrapper.find(".layout-grid").element as HTMLElement;
    const rowEl = wrapper.find(".layout-grid__row").element as HTMLElement;
    expect(gridEl.style.rowGap).toBe("");
    expect(rowEl.style.columnGap).toBe("");
    wrapper.unmount();
  });

  it("gap=6：容器 row-gap 与行 column-gap 均为 6mm", () => {
    const wrapper = mount(GridFormRenderer, { props: { schema: makeGridSchema(6) } });
    const gridEl = wrapper.find(".layout-grid").element as HTMLElement;
    const rowEl = wrapper.find(".layout-grid__row").element as HTMLElement;
    expect(gridEl.style.rowGap).toBe("6mm");
    expect(rowEl.style.columnGap).toBe("6mm");
    // 两行都应用列间距
    const secondRow = wrapper.findAll(".layout-grid__row")[1];
    expect((secondRow.element as HTMLElement).style.columnGap).toBe("6mm");
    wrapper.unmount();
  });

  it("gap + border=all：列/行间距生效且所有 cell 均渲染（边框归属修正不丢 cell）", () => {
    const wrapper = mount(GridFormRenderer, { props: { schema: makeGridSchema(4) } });
    const cells = wrapper.findAll(".layout-grid__cell");
    expect(cells.length).toBe(4); // 2 行 × 2 列
    const rowEl = wrapper.find(".layout-grid__row").element as HTMLElement;
    expect(rowEl.style.columnGap).toBe("4mm");
    // 内部垂直分隔线现已归属「非末列 cell 的右边框」、水平线归属「非末行 cell 的下边框」，
    // gap 下每条线紧贴该列/行自身边缘，留白落在外侧，不再出现前一格视觉无边框的错觉。
    wrapper.unmount();
  });

  it("嵌套 Grid 也继承自身 gap（独立计算）", () => {
    const outer = makeGridSchema(4);
    // 内部 Grid（无 gap）嵌进 outer 的 c1
    (outer.pages[0].children[0] as { rows: any[] }).rows[0].cells[0].children = [
      {
        id: "inner",
        type: "grid",
        border: "all",
        rows: [
          {
            id: "ir1",
            type: "grid-row",
            height: 1,
            cells: [{ id: "ic1", type: "grid-cell", children: [] }],
          },
        ],
      },
    ];
    const wrapper = mount(GridFormRenderer, { props: { schema: outer } });
    const innerEl = wrapper.find('.layout-grid .layout-grid[data-node-id="inner"]').element as HTMLElement;
    // 内部 Grid 未配 gap → row-gap 空
    expect(innerEl.style.rowGap).toBe("");
    wrapper.unmount();
  });
});
