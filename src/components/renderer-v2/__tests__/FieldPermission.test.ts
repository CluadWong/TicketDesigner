import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GridSchemaNode from "@/components/renderer-v2/GridSchemaNode.vue";
import FormRenderer from "@/components/renderer-v2/FormRenderer.vue";
import type { FieldPermissionV2, FieldPNodeV2 } from "@/types";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";

/**
 * P9.2a / P9.2b 字段级运行时权限（fieldPermissions，与 data 同轨经 props 注入，不进 schema）：
 * - EDIT（缺省）：可输入（向后兼容——未注明的字段一律可编辑）；
 * - READ：只读回显（渲染值但 contenteditable 不开启）；
 * - HIDDEN：**脱敏显示**——外壳（前/后标签、占位）照常渲染，输入内容以 `***` 替代；
 *   真实值不进 DOM，`collectFieldValues` 跳过该字段（防假值污染），消费页
 *   `getFormData`（响应式数据侧）仍返回真实值。
 *
 * 叠加语义：READ/HIDDEN 是比会话级 `readonly` 更细的闸门——READ/HIDDEN 一律不可就地输入；
 * `readonly=true` 时整体只读不变。
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

function mountField(
  node: FieldPNodeV2,
  fieldPermissions?: Record<string, FieldPermissionV2>,
  data: Record<string, unknown> = { 测试字段: "已填值" },
) {
  // 与消费填写态同口径：mode=preview + readonly=false + 有 data → 可输入基线
  return mount(GridSchemaNode, {
    props: {
      node,
      baseRowHeight: 8,
      mode: "preview",
      data: data as never,
      readonly: false,
      fieldPermissions,
    },
  });
}

describe("字段级权限（P9.2a/P9.2b fieldPermissions）", () => {
  it("缺省（未注明字段）：EDIT 可输入（向后兼容基线）", () => {
    const wrapper = mountField(fieldNode());
    expect(wrapper.attributes("contenteditable")).toBe("true");
    expect(wrapper.classes()).not.toContain("layout-p--hidden");
  });

  it("EDIT 显式声明：与缺省一致，可输入", () => {
    const wrapper = mountField(fieldNode(), { 测试字段: "EDIT" });
    expect(wrapper.attributes("contenteditable")).toBe("true");
  });

  it("READ：只读回显——值仍渲染但不可就地输入", () => {
    const wrapper = mountField(fieldNode(), { 测试字段: "READ" });
    expect(wrapper.attributes("contenteditable")).toBeUndefined();
    expect(wrapper.text()).toBe("已填值");
    expect(wrapper.classes()).not.toContain("layout-p--hidden");
  });

  it("HIDDEN：脱敏显示 ***——外壳占位保留、真实值不进 DOM、不可输入", () => {
    const wrapper = mountField(fieldNode(), { 测试字段: "HIDDEN" });
    // 占位保留（元素在、外壳照常渲染），但内容以 *** 替代（脱敏口径，2026-09-08）
    expect(wrapper.find(".layout-p").exists()).toBe(true);
    expect(wrapper.text()).toBe("***");
    expect(wrapper.text()).not.toContain("已填值");
    expect(wrapper.classes()).toContain("layout-p--hidden");
    expect(wrapper.attributes("contenteditable")).toBeUndefined();
  });

  it("HIDDEN 采集双口径：导出（maskHidden）保持 ***；本机保存回源真实值；两者皆无则省略", async () => {
    const { collectFieldValues } = await import("@/components/renderer-v2");
    const wrapper = mountField(fieldNode(), { 测试字段: "HIDDEN" });

    // 「导出数据」外发：保持脱敏 ***
    expect(
      collectFieldValues(wrapper.element, { maskHidden: true })["测试字段"],
    ).toBe("***");

    // 本机「保存数据」：从响应式数据侧回源真实值（保存→读取不丢数据）
    expect(
      collectFieldValues(wrapper.element, {
        baseData: { 测试字段: "已填值" },
      })["测试字段"],
    ).toBe("已填值");

    // 两者皆无：省略该字段（绝不把 DOM 假值当真值采集）
    expect(collectFieldValues(wrapper.element)["测试字段"]).toBeUndefined();
  });

  it("HIDDEN 空值：不打码，保持空白（无内容可脱敏，*** 反而暗示有隐藏数据）", () => {
    const wrapper = mountField(fieldNode(), { 测试字段: "HIDDEN" }, {
      测试字段: "",
    });
    expect(wrapper.classes()).toContain("layout-p--hidden");
    expect(wrapper.text()).toBe("");
  });

  it("复合字段 READ：前/后标签照常渲染，仅输入区锁定", () => {
    const wrapper = mountField(fieldNode({ prefix: "共", suffix: "人" }), {
      测试字段: "READ",
    });
    expect(wrapper.find(".layout-p__input").attributes("contenteditable")).toBeUndefined();
    expect(wrapper.classes()).not.toContain("layout-p--hidden");
    expect(wrapper.text()).toContain("共");
    expect(wrapper.text()).toContain("人");
  });

  it("复合字段 HIDDEN：外壳与前/后标签照常渲染，输入内容脱敏为 ***", () => {
    const wrapper = mountField(fieldNode({ prefix: "共", suffix: "人" }), {
      测试字段: "HIDDEN",
    });
    expect(wrapper.classes()).toContain("layout-p--hidden");
    expect(wrapper.text()).toContain("共");
    expect(wrapper.text()).toContain("人");
    expect(wrapper.text()).toContain("***");
    expect(wrapper.text()).not.toContain("已填值");
  });
});

describe("FormRenderer 透传 fieldPermissions（G8 消费入口）", () => {
  const schema = makeYunlvSecondTicketFirstFiveRowsSchema();

  it("READ 字段只读、未注明字段可输入（同一实例内并存）", () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema,
        data: { 单位: "121" },
        options: { readonly: false, fieldPermissions: { 单位: "READ" } },
      },
    });
    const readField = wrapper.find('[data-field="单位"]');
    expect(readField.exists()).toBe(true);
    expect(readField.attributes("contenteditable")).toBeUndefined();

    // 未注明 → 缺省 EDIT：仍可输入（向后兼容）
    const editField = wrapper.find('[data-field="编号"]');
    expect(editField.exists()).toBe(true);
    expect(editField.attributes("contenteditable")).toBe("true");
  });

  it("HIDDEN 字段：脱敏为 ***、占位保留；getFormData 仍返回真实值", () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema,
        data: { 单位: "121" },
        options: { readonly: false, fieldPermissions: { 单位: "HIDDEN" } },
      },
    });
    const hiddenField = wrapper.find('[data-field="单位"]');
    expect(hiddenField.exists()).toBe(true);
    expect(hiddenField.classes()).toContain("layout-p--hidden");
    expect(hiddenField.text()).toBe("***");

    // 响应式数据侧不受脱敏影响：提交/校验拿到的仍是真实值
    const vm = wrapper.vm as unknown as { getFormData: () => Record<string, unknown> };
    expect(vm.getFormData()["单位"]).toBe("121");
  });
});
