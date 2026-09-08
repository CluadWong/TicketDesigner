import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GridSchemaNode from "@/components/renderer-v2/GridSchemaNode.vue";
import FormRenderer from "@/components/renderer-v2/FormRenderer.vue";
import type {
  FieldActionTriggerV2,
  FieldPNodeV2,
  FormNodeV2,
  FormSchemaV2,
  GridNodeV2,
} from "@/types";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";

/**
 * P9.1c 专用控件触发（用户拍板：**表单不加任何额外元素**）：
 * - 字段配置 `action`（非 text）时，**点击字段元素本身** emit `action-trigger`；
 * - 宿主监听事件召唤外部输入组件（弹窗/选择器），在回调里回写 data，票面自动重渲染；
 * - 内核不做任何弹窗实现（分层：内核不认识宿主 UI）；
 * - 设计态 / 只读态 / action=text（或未配置）不触发；就地输入语义不变（点击与输入并存）。
 */
function fieldNode(overrides: Partial<FieldPNodeV2> = {}): FieldPNodeV2 {
  return {
    id: "field-1",
    type: "p",
    mode: "field",
    field: "测试字段",
    ...overrides,
  };
}

/** 最小格子：Grid(1 行 1 格) 内放给定子节点（字段 p 直接从该结构渲染）。 */
function gridNode(children: FormNodeV2[]): GridNodeV2 {
  return {
    id: "grid-1",
    type: "grid",
    border: "none",
    rows: [
      {
        id: "row-1",
        type: "grid-row",
        height: 1,
        cells: [{ id: "cell-1", type: "grid-cell", width: "1fr", children }],
      },
    ],
  };
}

function mountGrid(children: FormNodeV2[], mode?: "design" | "preview", readonly = false) {
  return mount(GridSchemaNode, {
    props: {
      node: gridNode(children),
      baseRowHeight: 8,
      ...(mode ? { mode } : {}),
      ...(mode === "preview" ? { data: {} } : {}),
      readonly,
    },
  });
}

describe("字段专用控件触发（P9.1c 点击字段 → action-trigger）", () => {
  it("填写态 + action=date：点击字段元素 emit action-trigger（载荷含 field/action/nodeId）", async () => {
    const wrapper = mountGrid([fieldNode({ action: "date" })], "preview");
    const field = wrapper.find('[data-field="测试字段"]');
    expect(field.exists()).toBe(true);

    await field.trigger("click");
    const emitted = wrapper.emitted("action-trigger");
    expect(emitted).toHaveLength(1);
    const payload = emitted?.[0]?.[0] as FieldActionTriggerV2;
    expect(payload.field).toBe("测试字段");
    expect(payload.action).toBe("date");
    expect(payload.nodeId).toBe("field-1");
  });

  it("设计态：点击字段不触发（设计页保持纯设计用途）", async () => {
    const wrapper = mountGrid([fieldNode({ action: "date" })], "design");
    await wrapper.find('[data-field="测试字段"]').trigger("click");
    expect(wrapper.emitted("action-trigger")).toBeUndefined();
  });

  it("只读态：点击字段不触发", async () => {
    const wrapper = mountGrid([fieldNode({ action: "date" })], "preview", true);
    await wrapper.find('[data-field="测试字段"]').trigger("click");
    expect(wrapper.emitted("action-trigger")).toBeUndefined();
  });

  it("action=text / 未配置 action：点击不触发（就地输入不受影响）", async () => {
    const text = mountGrid([fieldNode({ action: "text" })], "preview");
    await text.find('[data-field="测试字段"]').trigger("click");
    expect(text.emitted("action-trigger")).toBeUndefined();

    const none = mountGrid([fieldNode()], "preview");
    await none.find('[data-field="测试字段"]').trigger("click");
    expect(none.emitted("action-trigger")).toBeUndefined();
  });

  it("复合字段（前/后标签）：点击字段任一区域均触发", async () => {
    const wrapper = mountGrid(
      [fieldNode({ action: "date", prefix: "共", suffix: "人" })],
      "preview",
    );
    await wrapper.find('[data-field="测试字段"]').trigger("click");
    expect(wrapper.emitted("action-trigger")).toHaveLength(1);
  });
});

describe("FormRenderer action 事件透传（P9.1c 端到端）", () => {
  it("schema 中 action=date 字段：填写态点击字段 → re-emit action，载荷带字段名", async () => {
    const schema: FormSchemaV2 = makeYunlvSecondTicketFirstFiveRowsSchema();
    // 给「单位」字段配置 action=date（模拟设计器输出的 action 模板）
    const unit = schema.pages[0].children.find(
      c => c.type === "grid" && c.id === "ticket-layout",
    );
    if (unit?.type !== "grid") throw new Error("fixture grid missing");
    const field = unit.rows
      .flatMap(r => r.cells)
      .flatMap(c => c.children)
      .find(n => n.type === "p" && n.id === "unit-field");
    if (field?.type !== "p") throw new Error("fixture field missing");
    field.action = "date";

    const wrapper = mount(FormRenderer, {
      props: { schema, data: {}, options: { readonly: false } },
    });
    await wrapper.find('[data-field="单位"]').trigger("click");
    const emitted = wrapper.emitted("action");
    expect(emitted).toHaveLength(1);
    const payload = emitted?.[0]?.[0] as FieldActionTriggerV2;
    expect(payload.field).toBe("单位");
    expect(payload.action).toBe("date");
  });
});
