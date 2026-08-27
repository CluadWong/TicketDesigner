import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import DesignerApp from "@/components/designer/DesignerApp.vue";
import type { FormSchemaV2 } from "@/types";

function schemaOf(wrapper: VueWrapper): FormSchemaV2 {
  return (wrapper.vm as unknown as { schema: FormSchemaV2 }).schema;
}

function gridById(schema: FormSchemaV2, id: string) {
  const node = schema.pages[0].children.find(child => child.id === id);
  if (node?.type !== "grid") throw new Error(`fixture grid missing: ${id}`);
  return node;
}

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

  it("selects the overflowing P when its issue entry is clicked", async () => {
    const wrapper = mount(DesignerApp);
    const schema = schemaOf(wrapper);
    const basic = gridById(schema, "ticket-basic-layout");
    const unitLabel = basic.rows[0].cells[0].children[0];
    if (unitLabel.type !== "p" || unitLabel.mode !== "static") throw new Error("unit label fixture");
    unitLabel.text = "这是一个非常长的固定文本内容，用于触发内容溢出警告";
    await nextTick();

    const issueEntry = wrapper.findAll(".v2-issue").find(entry => entry.text().includes("CONTENT_OVERFLOW"));
    expect(issueEntry).toBeDefined();
    await issueEntry!.trigger("click");

    expect(wrapper.findAll(".v2-inspector-row")[0]?.text()).toContain("unit-label");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("p");
  });

  it("falls back to the nearest selectable Grid for a row-level issue", async () => {
    const wrapper = mount(DesignerApp);
    const schema = schemaOf(wrapper);
    gridById(schema, "ticket-basic-layout").rows[0].cells = [];
    await nextTick();

    const issueEntry = wrapper.findAll(".v2-issue").find(entry => entry.text().includes("INVALID_GRID_CELLS"));
    expect(issueEntry).toBeDefined();
    await issueEntry!.trigger("click");

    expect(wrapper.findAll(".v2-inspector-row")[0]?.text()).toContain("ticket-basic-layout");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("grid");
    expect(wrapper.findAll(".v2-breadcrumb__item")).toHaveLength(2);
  });

  it("falls back to the first Page for a schema-level issue without nodeId", async () => {
    const wrapper = mount(DesignerApp);
    const schema = schemaOf(wrapper);
    schema.baseRowHeight = 0;
    await nextTick();

    const issueEntry = wrapper.findAll(".v2-issue").find(entry => entry.text().includes("INVALID_BASE_ROW_HEIGHT"));
    expect(issueEntry).toBeDefined();
    await issueEntry!.trigger("click");

    expect(wrapper.findAll(".v2-inspector-row")[0]?.text()).toContain("ticket-page-1");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("page");
  });
});
