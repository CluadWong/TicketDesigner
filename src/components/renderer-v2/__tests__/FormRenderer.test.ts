import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import FormRenderer from "@/components/renderer-v2/FormRenderer.vue";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";
import demoData from "@/dev/demoData";
import { parseTolerantFormSchemaV2 } from "@/types";

/**
 * FormRenderer（G8 公共渲染入口）测试：
 * - 消费态 `readonly` 默认 true → 字段只读回显（仅浏览详情）；
 * - `options.readonly=false` → 进入填写态，字段可输入，失焦 emit field-change / update:data；
 * - `getFormData()` 返回整个表单当前输入数据（与 update:data 同口径）；
 * - 消费页典型流程：JSON 字符串 → parseTolerantFormSchemaV2().schema → FormRenderer。
 *
 * 设计态（内核 `mode="design"`）与消费态由「isDesign + readonly」两正交轴区分，
 * FormRenderer 自身不再持有 preview/fill 模式（永远是消费态、对内传固定非设计 mode）。
 */
const sampleSchema = makeYunlvSecondTicketFirstFiveRowsSchema();

describe("FormRenderer（G8 公共入口）", () => {
  it("默认（readonly 默认 true）：携带数据回显，字段只读不可编辑", () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema: sampleSchema,
        data: { ...(demoData as Record<string, unknown>) } as never,
      },
    });
    expect(wrapper.text()).toContain("云南铝业股份有限公司 电气第二种工作票");
    const field = wrapper.find('[data-field="单位"]');
    expect(field.exists()).toBe(true);
    expect(field.text()).toContain("121");
    // 默认只读：contenteditable 未设置
    expect(field.attributes("contenteditable")).toBeUndefined();
  });

  it("options.readonly=false：进入填写态，字段可编辑", () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema: sampleSchema,
        data: { ...(demoData as Record<string, unknown>) } as never,
        options: { readonly: false },
      },
    });
    const field = wrapper.find('[data-field="单位"]');
    expect(field.exists()).toBe(true);
    expect(field.text()).toContain("121");
    expect(field.attributes("contenteditable")).toBe("true");
  });

  it("options.readonly=true：显式强制只读回显，字段不可编辑", () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema: sampleSchema,
        data: { ...(demoData as Record<string, unknown>) } as never,
        options: { readonly: true },
      },
    });
    const field = wrapper.find('[data-field="单位"]');
    expect(field.exists()).toBe(true);
    expect(field.text()).toContain("121");
    expect(field.attributes("contenteditable")).toBeUndefined();
  });

  it("填写态：输入触发 field-change 与 update:data，且字段键正确", async () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema: sampleSchema,
        data: { ...(demoData as Record<string, unknown>) } as never,
        options: { readonly: false },
      },
    });
    const field = wrapper.find('[data-field="单位"]');
    field.element.textContent = "新单位值";
    await field.trigger("blur");

    const fieldChange = wrapper.emitted("field-change");
    const updateData = wrapper.emitted("update:data");
    expect(fieldChange).toBeTruthy();
    expect(fieldChange?.[0]).toEqual(["单位", "新单位值"]);
    expect(updateData).toBeTruthy();
    const payload = updateData?.[0]?.[0] as Record<string, unknown>;
    expect(payload["单位"]).toBe("新单位值");
  });

  it("getFormData()：返回整个表单当前输入数据（与 update:data 同口径）", async () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema: sampleSchema,
        data: { ...(demoData as Record<string, unknown>) } as never,
        options: { readonly: false },
      },
    });
    // 初始：回显数据中的「单位」= 121
    const exposed0 = wrapper.vm as unknown as { getFormData: () => Record<string, string> };
    expect(exposed0.getFormData()["单位"]).toBe("121");

    // 改一个字段后，getFormData 反映新值
    const field = wrapper.find('[data-field="单位"]');
    field.element.textContent = "新单位值";
    await field.trigger("blur");
    expect(exposed0.getFormData()["单位"]).toBe("新单位值");
  });

  it("消费页流程：parseTolerantFormSchemaV2(json).schema 可直接喂给 FormRenderer 回显", () => {
    const json = JSON.stringify(sampleSchema);
    const result = parseTolerantFormSchemaV2(json);
    expect(result.ok).toBe(true);
    expect(result.schema).not.toBeNull();

    const wrapper = mount(FormRenderer, {
      props: {
        schema: result.schema as never,
        data: { ...(demoData as Record<string, unknown>) } as never,
      },
    });
    expect(wrapper.text()).toContain("云南铝业股份有限公司 电气第二种工作票");
    const field = wrapper.find('[data-field="单位"]');
    expect(field.exists()).toBe(true);
    expect(field.text()).toContain("121");
  });

  it("options.bare：传入 bare 时去掉画布外壳修饰类", () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema: sampleSchema,
        data: { ...(demoData as Record<string, unknown>) } as never,
        options: { bare: true },
      },
    });
    expect(wrapper.find(".grid-form-canvas--bare").exists()).toBe(true);
  });

  it("D2：向消费页暴露 print()，触发宿主打印（消费页无需自己 window.print）", () => {
    const original = window.print;
    const spy = vi.fn();
    window.print = spy;
    try {
      const wrapper = mount(FormRenderer, { props: { schema: sampleSchema } });
      const exposed = wrapper.vm as unknown as { print: () => boolean };
      expect(typeof exposed.print).toBe("function");
      expect(exposed.print()).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      window.print = original;
    }
  });
});
