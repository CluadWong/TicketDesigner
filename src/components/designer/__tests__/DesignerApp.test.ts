import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DesignerApp from "@/components/designer/DesignerApp.vue";

describe("DesignerApp V2 selection and deletion", () => {
  it("cycles from a filled cell component to its ancestors", async () => {
    const wrapper = mount(DesignerApp);
    const field = wrapper.find('[data-node-id="unit-field"]');

    await field.trigger("click");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("p");

    await field.trigger("click");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("grid");

    await field.trigger("click");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("page");

    await field.trigger("click");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("p");
    expect(wrapper.findAll(".v2-breadcrumb__item")).toHaveLength(3);

    await wrapper.findAll(".v2-breadcrumb__item")[1]?.trigger("click");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("grid");
    expect(wrapper.findAll(".v2-breadcrumb__item")).toHaveLength(3);
  });

  it("removes a selected root grid from the rendered page", async () => {
    const wrapper = mount(DesignerApp);
    const grid = wrapper.find('[data-node-id="ticket-basic-layout"]');

    await grid.trigger("click");

    const deleteButton = wrapper.find(".v2-palette-item--danger");
    expect(deleteButton.attributes("disabled")).toBeUndefined();
    await deleteButton.trigger("click");

    expect(wrapper.find('[data-node-id="ticket-basic-layout"]').exists()).toBe(false);
  });

  it("removes a newly added grid after its cell is deleted", async () => {
    const wrapper = mount(DesignerApp);
    const addGridButton = wrapper.findAll(".v2-palette-item--button")[0];

    await addGridButton?.trigger("click");
    const grid = wrapper.find('[data-node-id^="grid-"]');
    const cell = grid.find('[data-layout-id^="cell-"]');
    await cell.trigger("click");
    await wrapper.find(".v2-palette-item--danger").trigger("click");

    const remainingGrid = wrapper.find('[data-node-id^="grid-"]');
    expect(remainingGrid.exists()).toBe(false);
    expect(wrapper.find('[data-node-id^="grid-"]').exists()).toBe(false);
    expect(wrapper.findAll(".v2-issue").some(issue => issue.text().includes("INVALID_GRID_ROWS"))).toBe(false);
  });

  it("updates row and column counts from the selected Grid inspector", async () => {
    const wrapper = mount(DesignerApp);
    await wrapper.find('[data-node-id="ticket-basic-layout"]').trigger("click");

    const rowsInput = wrapper.find('input[data-dimension="rows"]');
    const columnsInput = wrapper.find('input[data-dimension="columns"]');
    await rowsInput.setValue("6");
    await rowsInput.trigger("change");
    await columnsInput.setValue("3");
    await columnsInput.trigger("change");

    const grid = wrapper.find('[data-node-id="ticket-basic-layout"]');
    expect(grid.findAll(":scope > .layout-grid__row")).toHaveLength(6);
    expect(grid.find('[data-layout-id="basic-unit-number"]').findAll(":scope > .layout-grid__cell")).toHaveLength(3);
  });

  it("inserts into a table template after its default P is removed", async () => {
    const wrapper = mount(DesignerApp);
    await wrapper.find('[data-node-id="work-task-location"]').trigger("click");
    await wrapper.find(".v2-palette-item--danger").trigger("click");

    const templateCell = wrapper.find('[data-layout-id="work-task-location-template"]');
    await templateCell.trigger("click");
    const staticButton = wrapper.findAll(".v2-palette-item--button").find(button => button.text().includes("固定文字"));
    await staticButton?.trigger("click");

    expect(wrapper.find("tbody .layout-p").exists()).toBe(true);
    expect(wrapper.find("tbody .layout-p").text()).toBe("固定文本");
  });
});
