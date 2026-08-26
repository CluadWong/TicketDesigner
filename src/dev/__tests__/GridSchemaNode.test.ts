import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GridSchemaNode from "@/dev/GridSchemaNode.vue";

describe("GridSchemaNode selection state", () => {
  it("adds a visible selected class without changing the node type", () => {
    const wrapper = mount(GridSchemaNode, {
      props: {
        node: { id: "label", type: "p", mode: "static", text: "单位" },
        baseRowHeight: 8,
        selectedNodeId: "label",
      },
    });

    expect(wrapper.classes()).toContain("layout-node--selected");
    expect(wrapper.attributes("data-node-id")).toBe("label");
    expect(wrapper.text()).toBe("单位");
  });

  it("keeps field P empty while preserving data-field", () => {
    const wrapper = mount(GridSchemaNode, {
      props: {
        node: { id: "field", type: "p", mode: "field", field: "单位" },
        baseRowHeight: 8,
      },
    });

    expect(wrapper.text()).toBe("");
    expect(wrapper.attributes("data-field")).toBe("单位");
  });

  it("renders a field P with optional prefix and suffix labels", () => {
    const wrapper = mount(GridSchemaNode, {
      props: {
        node: {
          id: "member-count",
          type: "p",
          mode: "field",
          field: "工作班成员人数",
          prefix: "共",
          suffix: "人",
          underline: true,
        },
        baseRowHeight: 8,
      },
    });

    expect(wrapper.text()).toBe("共人");
    expect(wrapper.attributes("data-field")).toBe("工作班成员人数");
    expect(wrapper.find(".layout-p__input").text()).toBe("");
    expect(wrapper.find(".layout-p__input").attributes("data-field")).toBe("工作班成员人数");
    expect(wrapper.find(".layout-p__input").classes()).toContain("layout-p--underline");
  });
});
