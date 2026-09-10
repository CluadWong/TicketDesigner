import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GridSchemaNode from "@/components/renderer-v2/GridSchemaNode.vue";

describe("GridSchemaNode row sizing", () => {
  it("renders GridRow and Table row heights as minimum heights", () => {
    const wrapper = mount(GridSchemaNode, {
      props: {
        node: {
          id: "grid",
          type: "grid",
          border: "all",
          rows: [{
            id: "work-task",
            type: "grid-row",
            height: 5,
            cells: [{
              id: "table-cell",
              type: "grid-cell",
              children: [{
                id: "table",
                type: "table",
                columns: [{ key: "content", title: "content", width: "1fr" }],
                minRows: 6,
                rowTemplate: [],
              }],
            }],
          }],
        },
        baseRowHeight: 8,
      },
    });

    expect(wrapper.find('[data-layout-id="work-task"]').attributes("style")).toContain("min-height: 40mm");
    expect(wrapper.find('[data-layout-id="work-task"]').attributes("data-node-id")).toBeUndefined();
    expect(wrapper.find(".layout-table__header").attributes("style")).toContain("min-height: 8mm");
    expect(wrapper.find(".layout-table__row:not(.layout-table__header)").attributes("style")).toContain("min-height: 8mm");
    expect(wrapper.find("thead .layout-table__header").exists()).toBe(true);
    expect(wrapper.find("tbody .layout-table__row").exists()).toBe(true);
    expect(wrapper.find("tbody td").exists()).toBe(true);
  });
});
