import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import FormRenderer from "@/components/renderer-v2/FormRenderer.vue";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";
import demoData from "@/dev/demoData";
import { parseTolerantFormSchemaV2 } from "@/types";

/**
 * FormRenderer（G8 公共渲染入口）测试：
 * - preview 模式 = 只读回显（消费页浏览详情），字段不可输入；
 * - fill 模式 = 可填写，真实控件输入回写并 emit field-change / update:data；
 * - 消费页典型流程：JSON 字符串 → parseTolerantFormSchemaV2().schema → FormRenderer。
 */
const sampleSchema = makeYunlvSecondTicketFirstFiveRowsSchema();

describe("FormRenderer（G8 公共入口）", () => {
  it("preview 模式：携带数据回显，渲染为只读控件（与填写态同一结构），不可编辑", () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema: sampleSchema,
        data: { ...(demoData as Record<string, unknown>) } as never,
        mode: "preview",
      },
    });
    // 标题（文本节点）仍作为静态文本回显
    expect(wrapper.text()).toContain("云南铝业股份有限公司 电气第二种工作票");
    // 预览与填写复用同一 <p> 渲染路径，仅 readonly 差异 —— 值落在文本，字段不可编辑
    const field = wrapper.find('[data-field="单位"]');
    expect(field.exists()).toBe(true);
    expect(field.text()).toContain("121");
    expect(field.attributes("contenteditable")).toBeUndefined();
  });

  it("fill 模式：渲染真实控件，字段初始值来自 data", () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema: sampleSchema,
        data: { ...(demoData as Record<string, unknown>) } as never,
        mode: "fill",
      },
    });
    // 字段为可编辑 <p>，值落在文本
    const field = wrapper.find('[data-field="单位"]');
    expect(field.exists()).toBe(true);
    expect(field.text()).toContain("121");
    expect(field.attributes("contenteditable")).toBe("true");
  });

  it("fill 模式：输入触发 field-change 与 update:data，且字段键正确", async () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema: sampleSchema,
        data: { ...(demoData as Record<string, unknown>) } as never,
        mode: "fill",
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
    // update:data 携带的 data 中应包含被改写的字段
    const payload = updateData?.[0]?.[0] as Record<string, unknown>;
    expect(payload["单位"]).toBe("新单位值");
  });

  it("消费页流程：parseTolerantFormSchemaV2(json).schema 可直接喂给 FormRenderer 预览", () => {
    const json = JSON.stringify(sampleSchema);
    const result = parseTolerantFormSchemaV2(json);
    expect(result.ok).toBe(true);
    expect(result.schema).not.toBeNull();

    const wrapper = mount(FormRenderer, {
      props: {
        schema: result.schema as never,
        data: { ...(demoData as Record<string, unknown>) } as never,
        mode: "preview",
      },
    });
    expect(wrapper.text()).toContain("云南铝业股份有限公司 电气第二种工作票");
    // 容错解析后字段键仍可回显（单位 = 121，值落在 <p> 文本中）
    const field = wrapper.find('[data-field="单位"]');
    expect(field.exists()).toBe(true);
    expect(field.text()).toContain("121");
  });

  it("options.bare：传入 bare 时去掉画布外壳修饰类", () => {
    const wrapper = mount(FormRenderer, {
      props: {
        schema: sampleSchema,
        data: { ...(demoData as Record<string, unknown>) } as never,
        mode: "preview",
        options: { bare: true },
      },
    });
    expect(wrapper.find(".grid-form-canvas--bare").exists()).toBe(true);
  });
});
