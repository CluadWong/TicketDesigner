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

/** 找到包含指定字段节点的单元格及其所属 Grid（九续：Grid 嵌套测试用）。 */
function findOwnerCellOfField(schema: FormSchemaV2, fieldId: string) {
  for (const child of schema.pages[0].children) {
    if (child.type !== "grid") continue;
    for (const row of child.rows) {
      for (const cell of row.cells) {
        if (cell.children.some(c => c.id === fieldId)) {
          return { cell, gridId: child.id };
        }
      }
    }
  }
  return null;
}

describe("DesignerApp V2 selection and deletion", () => {
  it("cycles from a filled cell component through its cell to ancestors", async () => {
    const wrapper = mount(DesignerApp);
    const field = wrapper.find('[data-node-id="unit-field"]');

    await field.trigger("click");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("p");

    await field.trigger("click");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("grid-cell");

    await field.trigger("click");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("grid");

    await field.trigger("click");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("page");

    await field.trigger("click");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("p");
    expect(wrapper.findAll(".v2-breadcrumb__item")).toHaveLength(4);

    await wrapper.findAll(".v2-breadcrumb__item")[2]?.trigger("click");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("grid");
    expect(wrapper.findAll(".v2-breadcrumb__item")).toHaveLength(4);
  });

  it("removes a selected root grid from the rendered page", async () => {
    const wrapper = mount(DesignerApp);
    const grid = wrapper.find('[data-node-id="ticket-layout"]');

    await grid.trigger("click");

    const deleteButton = wrapper.find(".v2-inspector__delete");
    expect(deleteButton.attributes("disabled")).toBeUndefined();
    await deleteButton.trigger("click");

    expect(wrapper.find('[data-node-id="ticket-layout"]').exists()).toBe(false);
  });

  it("selects a cell but disables its deletion; the Grid itself stays deletable", async () => {
    const wrapper = mount(DesignerApp);
    const addGridButton = wrapper
      .findAll(".v2-palette-item--button")
      .find(button => button.text().includes("Grid"));

    await addGridButton?.trigger("click");
    const grid = wrapper.find('[data-node-id^="grid-"]');
    const cell = grid.find('[data-layout-id^="cell-"]');
    await cell.trigger("click");

    // 选中单元格：删除禁用，检查器显示 grid-cell
    const deleteButton = wrapper.find(".v2-inspector__delete");
    expect(deleteButton.attributes("disabled")).toBeDefined();
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("grid-cell");

    // 选中 Grid 本身仍可删除
    await grid.trigger("click");
    expect(wrapper.find(".v2-inspector__delete").attributes("disabled")).toBeUndefined();
    await wrapper.find(".v2-inspector__delete").trigger("click");

    expect(wrapper.find('[data-node-id^="grid-"]').exists()).toBe(false);
    expect(wrapper.findAll(".v2-issue").some(issue => issue.text().includes("INVALID_GRID_ROWS"))).toBe(false);
  });

  it("updates row and column counts from the selected Grid inspector", async () => {
    const wrapper = mount(DesignerApp);
    await wrapper.find('[data-node-id="ticket-layout"]').trigger("click");

    const rowsInput = wrapper.find('input[data-dimension="rows"]');
    const columnsInput = wrapper.find('input[data-dimension="columns"]');
    await rowsInput.setValue("6");
    await rowsInput.trigger("change");
    await columnsInput.setValue("3");
    await columnsInput.trigger("change");

    const grid = wrapper.find('[data-node-id="ticket-layout"]');
    expect(grid.findAll(":scope > .layout-grid__row")).toHaveLength(6);
    expect(grid.find('[data-layout-id="row-unit-number"]').findAll(":scope > .layout-grid__cell")).toHaveLength(3);
  });

  it("removes a table template default field and inserts a text node in its place", async () => {
    const wrapper = mount(DesignerApp);
    // 选中表格模板里的默认字段 P
    const defaultField = wrapper.find("tbody .layout-p");
    await defaultField.trigger("click");
    // 右侧面板「删除」按钮移除该默认字段
    const deleteButton = wrapper.find(".v2-inspector__delete");
    expect(deleteButton.attributes("disabled")).toBeUndefined();
    await deleteButton.trigger("click");

    // 点击模板单元格，使其成为插入槽
    const templateCell = wrapper.find('[data-layout-id="wt-loc-tpl"]');
    await templateCell.trigger("click");
    // 左侧「文本 Text」按钮插入固定文本节点（type: text，渲染为 .layout-text）
    const textButton = wrapper
      .findAll(".v2-palette-item--button")
      .find(button => button.text().includes("文本"));
    await textButton?.trigger("click");

    expect(wrapper.find("tbody .layout-text").exists()).toBe(true);
    expect(wrapper.find("tbody .layout-text").text()).toBe("固定文本");
  });

  it("selects the overflowing P when its issue entry is clicked", async () => {
    const wrapper = mount(DesignerApp);
    const schema = schemaOf(wrapper);
    const basic = gridById(schema, "ticket-layout");
    const unitRow = basic.rows.find(r => r.id === "row-unit-number")!;
    const unitLabel = unitRow.cells[0].children[0];
    if (unitLabel.type !== "text") throw new Error("unit label fixture");
    unitLabel.text = "这是一个非常长的固定文本内容，用于触发内容溢出警告";
    await nextTick();

    const issueEntry = wrapper.findAll(".v2-issue").find(entry => entry.text().includes("CONTENT_OVERFLOW"));
    expect(issueEntry).toBeDefined();
    await issueEntry!.trigger("click");

    expect(wrapper.findAll(".v2-inspector-row")[0]?.text()).toContain("unit-label");
    expect(wrapper.findAll(".v2-inspector-row")[1]?.text()).toContain("text");
  });

  it("falls back to the nearest selectable Grid for a row-level issue", async () => {
    const wrapper = mount(DesignerApp);
    const schema = schemaOf(wrapper);
    gridById(schema, "ticket-layout").rows.find(r => r.id === "row-unit-number")!.cells = [];
    await nextTick();

    const issueEntry = wrapper.findAll(".v2-issue").find(entry => entry.text().includes("INVALID_GRID_CELLS"));
    expect(issueEntry).toBeDefined();
    await issueEntry!.trigger("click");

    expect(wrapper.findAll(".v2-inspector-row")[0]?.text()).toContain("ticket-layout");
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

  it("renders a structure tree and selects a node by clicking it", async () => {
    const wrapper = mount(DesignerApp);
    const treeRows = wrapper.findAll(".v2-tree-row");
    expect(treeRows.length).toBeGreaterThan(5);

    const titleRow = treeRows.find(row => row.text().includes("云南铝业"));
    expect(titleRow).toBeDefined();
    await titleRow!.trigger("click");

    const selected = (wrapper.vm as unknown as { selectedNodeId: string | null }).selectedNodeId;
    expect(selected).toBe("title-text");
    expect(wrapper.find('[data-node-id="title-text"]').exists()).toBe(true);
  });

  it("edits a cell's padding via the inspector and writes it to the schema", async () => {
    const wrapper = mount(DesignerApp);
    const field = wrapper.find('[data-node-id="unit-field"]');
    await field.trigger("click"); // 选中字段
    await field.trigger("click"); // 循环到所属单元格

    const paddingInput = wrapper.find('input[data-cell-padding]');
    expect(paddingInput.exists()).toBe(true);

    await paddingInput.setValue("5");
    await paddingInput.trigger("change");

    const schema = schemaOf(wrapper);
    const cell = gridById(schema, "ticket-layout").rows.find(r => r.id === "row-unit-number")!.cells[1];
    expect(cell.padding).toBe(5);
  });

  it("sets a Grid-level cell default via the inspector", async () => {
    const wrapper = mount(DesignerApp);
    await wrapper.find('[data-node-id="ticket-layout"]').trigger("click");

    const defaultPadding = wrapper.find('input[data-cell-default="padding"]');
    expect(defaultPadding.exists()).toBe(true);

    await defaultPadding.setValue("4");
    await defaultPadding.trigger("change");

    const schema = schemaOf(wrapper);
    expect(gridById(schema, "ticket-layout").cellPadding).toBe(4);
  });

  it("merges and splits adjacent cells from the cell inspector", async () => {
    const wrapper = mount(DesignerApp);
    // 选中外层 Grid 第一行第 0 格（cell-u-l），其右侧有 cell-u-f 可合并
    await wrapper.find('[data-node-id="cell-u-l"]').trigger("click");

    expect(wrapper.find('[data-cell-merge="true"]').exists()).toBe(true);
    expect(wrapper.find('[data-cell-merge="true"]').attributes("disabled")).toBeUndefined();
    // 初始无合并，拆分按钮禁用
    expect(wrapper.find('[data-cell-split="true"]').attributes("disabled")).toBeDefined();

    await wrapper.find('[data-cell-merge="true"]').trigger("click");

    // 第 0 行原为 4 格（单位标签/单位/编号标签/编号），合并前两格 → 3 格，首格 colspan 2
    const mergedGrid = gridById(schemaOf(wrapper), "ticket-layout");
    const mergedRow = mergedGrid.rows.find(r => r.id === "row-unit-number")!;
    expect(mergedRow.cells).toHaveLength(3);
    expect(mergedRow.cells[0].colspan).toBe(2);

    // 合并后可拆分
    expect(wrapper.find('[data-cell-split="true"]').attributes("disabled")).toBeUndefined();
    await wrapper.find('[data-cell-split="true"]').trigger("click");

    const splitGrid = gridById(schemaOf(wrapper), "ticket-layout");
    expect(splitGrid.rows.find(r => r.id === "row-unit-number")!.cells).toHaveLength(4);
    expect(splitGrid.rows.find(r => r.id === "row-unit-number")!.cells[0].colspan).toBeUndefined();
  });

  it("shows the {row} hint only for P nodes inside a table row template", async () => {
    const wrapper = mount(DesignerApp);

    await wrapper.find('[data-node-id="unit-field"]').trigger("click");
    expect(wrapper.find(".v2-hint").exists()).toBe(false);

    await wrapper.find('[data-node-id="wt-loc"]').trigger("click");
    const hint = wrapper.find(".v2-hint");
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toContain("{row}");

    const fieldInput = wrapper
      .findAll(".v2-control")
      .find(control => control.text().includes("字段名"))
      ?.find("input");
    expect((fieldInput?.element as HTMLInputElement | undefined)?.value).toBe("工作任务_{row}_1");
  });
});

describe("DesignerApp 把 Grid 放进 / 拖进 cell（Grid 嵌套，九续）", () => {
  it("选中某格后点击「添加 Grid」会把 Grid 嵌进该格并渲染嵌套 Grid", async () => {
    const wrapper = mount(DesignerApp);
    // 选中位于外层 Grid 某单元格内的字段，使 insertionSlot 指向其所属 cell
    await wrapper.find('[data-node-id="unit-field"]').trigger("click");
    await nextTick();

    const located = findOwnerCellOfField(schemaOf(wrapper), "unit-field");
    expect(located).not.toBeNull();
    const cellId = located!.cell.id;
    expect(located!.cell.children.some(c => c.type === "grid")).toBe(false);

    const gridButton = wrapper
      .findAll(".v2-palette-item--button")
      .find(b => b.text().includes("Grid"));
    await gridButton?.trigger("click");
    await nextTick();

    // 1. schema 层：该 cell 的子节点新增了一个 grid
    const locatedAfter = findOwnerCellOfField(schemaOf(wrapper), "unit-field");
    expect(locatedAfter!.cell.children.some(c => c.type === "grid")).toBe(true);

    // 2. 渲染层：该 cell 内出现嵌套 Grid 元素
    const ownerCellEl = wrapper.find(`[data-node-id="${cellId}"]`);
    expect(ownerCellEl.exists()).toBe(true);
    expect(ownerCellEl.find('[data-node-id^="grid-"]').exists()).toBe(true);

    // 3. 结构校验不再报错（嵌套 Grid 已纳入索引与校验）
    expect(wrapper.findAll(".v2-issue").some(i => i.text().includes("INVALID_GRID_ROWS"))).toBe(false);
  });

  it("预览态：点击「添加 Grid」被禁用且不改动结构", async () => {
    const wrapper = mount(DesignerApp);
    await wrapper.find('[data-node-id="unit-field"]').trigger("click");
    await nextTick();

    const before = JSON.stringify(schemaOf(wrapper));
    await wrapper.find('[data-view-mode="preview"]').trigger("click");
    await nextTick();

    const gridButton = wrapper
      .findAll(".v2-palette-item--button")
      .find(b => b.text().includes("Grid"));
    expect(gridButton?.attributes("disabled")).toBeDefined();
    await gridButton?.trigger("click");
    await nextTick();

    expect(JSON.stringify(schemaOf(wrapper))).toBe(before);
  });
});

describe("DesignerApp 格内排序与跨格移动（P6.3b / P6.3c）", () => {
  /** 规范样例「工作负责人（监护人）/班组」合并格内的子节点顺序。 */
  const ownerCellChildren = (wrapper: VueWrapper): string[] => {
    const grid = gridById(schemaOf(wrapper), "ticket-layout");
    return grid.rows.find(r => r.id === "row-owner-team")!.cells[0].children.map(c => c.id);
  };

  it("上移 / 下移调整格内子节点顺序（P6.3b，替代拖拽排序）", async () => {
    const wrapper = mount(DesignerApp);
    expect(ownerCellChildren(wrapper)).toEqual([
      "owner-label",
      "owner-field",
      "team-label",
      "team-field",
    ]);

    await wrapper.find('[data-node-id="owner-field"]').trigger("click");
    await wrapper.find('[data-node-move="up"]').trigger("click");
    expect(ownerCellChildren(wrapper)).toEqual([
      "owner-field",
      "owner-label",
      "team-label",
      "team-field",
    ]);

    // 选中态保持在被移动的节点上，可直接继续下移
    await wrapper.find('[data-node-move="down"]').trigger("click");
    expect(ownerCellChildren(wrapper)).toEqual([
      "owner-label",
      "owner-field",
      "team-label",
      "team-field",
    ]);
  });

  it("边界处禁用对应方向按钮", async () => {
    const first = mount(DesignerApp);
    await first.find('[data-node-id="owner-label"]').trigger("click");
    expect(first.find('[data-node-move="up"]').attributes("disabled")).toBeDefined();
    expect(first.find('[data-node-move="down"]').attributes("disabled")).toBeUndefined();

    const last = mount(DesignerApp);
    await last.find('[data-node-id="team-field"]').trigger("click");
    expect(last.find('[data-node-move="down"]').attributes("disabled")).toBeDefined();
    expect(last.find('[data-node-move="up"]').attributes("disabled")).toBeUndefined();
  });

  it("通过目标下拉把组件跨格移动到其它单元格（P6.3c）", async () => {
    const wrapper = mount(DesignerApp);
    await wrapper.find('[data-node-id="owner-field"]').trigger("click");

    const targetSelect = wrapper.find('select[data-move-target="true"]');
    expect(targetSelect.exists()).toBe(true);
    await targetSelect.setValue("cell-u-f");
    await wrapper.find('[data-node-move="target"]').trigger("click");

    const grid = gridById(schemaOf(wrapper), "ticket-layout");
    const ownerCell = grid.rows.find(r => r.id === "row-owner-team")!.cells[0];
    const unitFieldCell = grid.rows.find(r => r.id === "row-unit-number")!.cells[1];
    expect(ownerCell.children.map(c => c.id)).not.toContain("owner-field");
    expect(unitFieldCell.children.map(c => c.id)).toContain("owner-field");
  });

  it("目标下拉不含被移动节点当前所在的格（P6.3c 验收反馈）", async () => {
    const wrapper = mount(DesignerApp);
    await wrapper.find('[data-node-id="owner-field"]').trigger("click");

    const options = wrapper
      .find('select[data-move-target="true"]')
      .findAll("option")
      .map(option => option.attributes("value"));
    // owner-field 位于 cell-o-l，不应出现在可选目标中
    expect(options).not.toContain("cell-o-l");
    expect(options).toContain("cell-u-f");
  });
});

describe("DesignerApp 预览态只读（不可添加组件 / 不可输入）", () => {
  const paletteButtons = (wrapper: VueWrapper) =>
    wrapper.findAll(".v2-palette-item--button");

  it("预览态：模板按钮全部禁用，字段与复合字段输入区均不可编辑", async () => {
    const wrapper = mount(DesignerApp);
    // 设计态基线：模板可用、字段可编辑
    expect(paletteButtons(wrapper).every(b => b.attributes("disabled") === undefined)).toBe(true);
    expect(wrapper.find('[data-node-id="unit-field"]').attributes("contenteditable")).toBe("true");

    await wrapper.find('[data-view-mode="preview"]').trigger("click");

    // 1. 不可添加组件：所有模板按钮禁用
    expect(paletteButtons(wrapper).length).toBeGreaterThan(0);
    for (const button of paletteButtons(wrapper)) {
      expect(button.attributes("disabled")).toBeDefined();
    }
    // 2. 不可输入：普通字段与复合字段（前缀 + 输入区 + 后缀）均无 contenteditable
    expect(wrapper.find('[data-node-id="unit-field"]').attributes("contenteditable")).toBeUndefined();
    expect(
      wrapper.find('[data-node-id="member-count-field"] .layout-p__input')
        .attributes("contenteditable"),
    ).toBeUndefined();
    // 3. 预览仍带数据渲染（只读展示而非清空）
    expect(wrapper.find('[data-node-id="unit-field"]').text()).not.toBe("");
  });

  it("预览态：绕过 UI 直接调用添加函数也不改动结构", async () => {
    const wrapper = mount(DesignerApp);
    const before = JSON.stringify(schemaOf(wrapper));
    await wrapper.find('[data-view-mode="preview"]').trigger("click");

    const vm = wrapper.vm as unknown as {
      addNodeToSelectedCell: (kind: "field") => void;
      addRootGrid: () => void;
    };
    vm.addNodeToSelectedCell("field");
    vm.addRootGrid();
    await nextTick();

    expect(JSON.stringify(schemaOf(wrapper))).toBe(before);
  });

  it("填充态保留字段输入与数据回写（与预览区分）", async () => {
    const wrapper = mount(DesignerApp);
    await wrapper.find('[data-view-mode="fill"]').trigger("click");

    const field = wrapper.find('[data-node-id="unit-field"]');
    // 填充态用真实控件（textarea/input）承接输入，而非 contenteditable 的 p
    const control = field.find(".layout-p__control");
    expect(control.exists()).toBe(true);

    const formData = (wrapper.vm as unknown as { previewData: Record<string, string> | null })
      .previewData;
    expect(formData).not.toBeNull();

    const key = field.attributes("data-field")!;
    // 通过控件输入触发回写
    (control.element as HTMLTextAreaElement).value = "测试值";
    await control.trigger("input");
    expect(formData).toHaveProperty(key);
    expect(formData![key]).toBe("测试值");
  });

  it("再次点击同一模式按钮回到设计态", async () => {
    const wrapper = mount(DesignerApp);
    const toggle = wrapper.find('[data-view-mode="preview"]');
    await toggle.trigger("click");
    expect(paletteButtons(wrapper)[0]?.attributes("disabled")).toBeDefined();

    await toggle.trigger("click");
    expect(paletteButtons(wrapper)[0]?.attributes("disabled")).toBeUndefined();
    expect(wrapper.find('[data-node-id="unit-field"]').attributes("contenteditable")).toBe("true");
  });
});

describe("DesignerApp 排列方向配置隐藏（text/p 分支不再暴露 writingMode）", () => {
  it("选中 text 节点时 Inspector 不再显示「排列方向」", async () => {
    const wrapper = mount(DesignerApp);
    await wrapper.find('[data-node-id="title-text"]').trigger("click");
    // 渲染层仍按节点 style.writingMode 渲染（竖排数据不受影响），仅面板隐藏该配置
    expect(wrapper.text()).not.toContain("排列方向");
  });

  it("选中字段 P 节点时 Inspector 不再显示「排列方向」", async () => {
    const wrapper = mount(DesignerApp);
    await wrapper.find('[data-node-id="unit-field"]').trigger("click");
    expect(wrapper.text()).not.toContain("排列方向");
  });
});
