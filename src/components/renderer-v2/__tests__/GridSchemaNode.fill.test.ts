import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import GridSchemaNode from "@/components/renderer-v2/GridSchemaNode.vue";

const fieldNode = {
  id: "unit",
  type: "p" as const,
  mode: "field" as const,
  field: "单位",
  underline: true,
};

const compositeNode = {
  id: "member",
  type: "p" as const,
  mode: "field" as const,
  field: "工作班成员人数",
  prefix: "共",
  suffix: "人",
  underline: true,
};

describe("GridSchemaNode 填写态数据回写（P9.1b）", () => {
  it("填写态下字段 P 渲染多行控件（textarea）并回写到 provide 的 formFill", async () => {
    const formFill = vi.fn();
    const wrapper = mount(GridSchemaNode, {
      props: { node: fieldNode, baseRowHeight: 8, data: { 单位: "初始" } },
      global: { provide: { formFill } },
    });

    const control = wrapper.find("textarea.layout-p__control");
    expect(control.exists()).toBe(true);
    expect((control.element as HTMLTextAreaElement).value).toBe("初始");

    (control.element as HTMLTextAreaElement).value = "张三";
    await control.trigger("input");

    expect(formFill).toHaveBeenCalledTimes(1);
    expect(formFill).toHaveBeenCalledWith("单位", "张三");
  });

  it("复合字段 P 的填写态输入器为真实控件并回写，前缀/后缀不参与", async () => {
    const formFill = vi.fn();
    const wrapper = mount(GridSchemaNode, {
      props: { node: compositeNode, baseRowHeight: 8, data: { 工作班成员人数: "" } },
      global: { provide: { formFill } },
    });

    const control = wrapper.find("textarea.layout-p__control");
    expect(control.exists()).toBe(true);
    expect((control.element as HTMLTextAreaElement).value).toBe("");
    (control.element as HTMLTextAreaElement).value = "8";
    await control.trigger("input");

    expect(formFill).toHaveBeenCalledTimes(1);
    expect(formFill).toHaveBeenCalledWith("工作班成员人数", "8");
    // 前缀/后缀为静态标签，不参与字段
    expect(wrapper.text()).toContain("共");
    expect(wrapper.text()).toContain("人");
  });

  it("字段 multiline=false 时填写态渲染单行 input", async () => {
    const formFill = vi.fn();
    const wrapper = mount(GridSchemaNode, {
      props: {
        node: { id: "single", type: "p" as const, mode: "field" as const, field: "编号", multiline: false },
        baseRowHeight: 8,
        data: { 编号: "A1" },
      },
      global: { provide: { formFill } },
    });

    expect(wrapper.find("textarea.layout-p__control").exists()).toBe(false);
    const control = wrapper.find("input.layout-p__control");
    expect(control.exists()).toBe(true);
    expect((control.element as HTMLInputElement).value).toBe("A1");
  });

  it("inputType=number 时单行控件 type=number", async () => {
    const wrapper = mount(GridSchemaNode, {
      props: {
        node: { id: "num", type: "p" as const, mode: "field" as const, field: "数量", inputType: "number" as const, multiline: false },
        baseRowHeight: 8,
        data: { 数量: "3" },
      },
      global: { provide: { formFill: vi.fn() } },
    });

    expect((wrapper.find("input.layout-p__control").element as HTMLInputElement).type).toBe("number");
  });

  it("data 为空时回退到节点 default（支持多行），且预览态不渲染控件", async () => {
    const wrapper = mount(GridSchemaNode, {
      props: {
        node: { id: "def", type: "p" as const, mode: "field" as const, field: "备注", default: "预设第一行\n预设第二行" },
        baseRowHeight: 8,
        readonly: true,
      },
      global: { provide: { formFill: vi.fn() } },
    });

    // 预览态静态渲染 default，不出现可输入控件
    expect(wrapper.find("textarea.layout-p__control").exists()).toBe(false);
    expect(wrapper.find("input.layout-p__control").exists()).toBe(false);
    expect(wrapper.text()).toContain("预设第一行");
    expect(wrapper.text()).toContain("预设第二行");
  });

  it("设计态（无 data）输入不回写，避免污染填写数据", async () => {
    const formFill = vi.fn();
    const wrapper = mount(GridSchemaNode, {
      props: { node: fieldNode, baseRowHeight: 8 },
      global: { provide: { formFill } },
    });

    const el = wrapper.element as HTMLElement;
    el.textContent = "设计态文本";
    await wrapper.trigger("input");

    expect(formFill).not.toHaveBeenCalled();
  });

  it("只读预览（data + readonly）：带数据渲染，但不可编辑且不回写", async () => {
    const formFill = vi.fn();
    const wrapper = mount(GridSchemaNode, {
      props: { node: fieldNode, baseRowHeight: 8, data: { 单位: "云鹿检修班" }, readonly: true },
      global: { provide: { formFill } },
    });

    // 数据照常渲染
    expect(wrapper.text()).toBe("云鹿检修班");
    // 但字段不可编辑
    expect(wrapper.attributes("contenteditable")).toBeUndefined();

    const el = wrapper.element as HTMLElement;
    el.textContent = "篡改";
    await wrapper.trigger("input");

    expect(formFill).not.toHaveBeenCalled();
  });

  it("只读预览下复合字段 P 的输入区同样不可编辑", async () => {
    const formFill = vi.fn();
    const wrapper = mount(GridSchemaNode, {
      props: {
        node: compositeNode,
        baseRowHeight: 8,
        data: { 工作班成员人数: "8" },
        readonly: true,
      },
      global: { provide: { formFill } },
    });

    const input = wrapper.find(".layout-p__input");
    expect(input.attributes("contenteditable")).toBeUndefined();
    expect(input.text()).toBe("8");

    input.element.textContent = "99";
    await input.trigger("input");
    expect(formFill).not.toHaveBeenCalled();
  });

  it("填写态下固定文字（text 节点）不可编辑，不回写", async () => {
    const formFill = vi.fn();
    const wrapper = mount(GridSchemaNode, {
      props: {
        node: { id: "title", type: "text" as const, text: "标题" },
        baseRowHeight: 8,
        data: {},
      },
      global: { provide: { formFill } },
    });

    expect(wrapper.attributes("contenteditable")).toBeUndefined();
    const el = wrapper.element as HTMLElement;
    el.textContent = "篡改";
    await wrapper.trigger("input");

    expect(formFill).not.toHaveBeenCalled();
  });
});
