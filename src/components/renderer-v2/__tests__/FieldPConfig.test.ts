import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GridSchemaNode from "@/components/renderer-v2/GridSchemaNode.vue";
import type { FieldPNodeV2 } from "@/types";

/**
 * 字段组件（field P）三项配置：
 * 1. **宽度 width**：自由长度字符串（mm / px / % 等），渲染为内联样式；
 * 2. **默认内容 default**：无填写数据时的预设文本，由文本域配置；
 * 3. **内部边框 innerBorder**：p 标签内每行（回车生成的 div）显示底边框，
 *    默认不显示；勾选后设计态 / 预览 / 打印均保持显示（渲染层只加修饰类，
 *    底边框由 `.layout-p--inner-border :deep(div)` 绘制，不在任何 @media 内，故打印同样生效）。
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

describe("字段组件配置：宽度 / 默认内容 / 内部边框", () => {
  it("宽度：设置 width 时写入内联样式，支持 mm / px / %", () => {
    for (const width of ["30mm", "120px", "50%"]) {
      const wrapper = mount(GridSchemaNode, {
        props: { node: fieldNode({ width }), baseRowHeight: 8 },
      });
      expect(wrapper.attributes("style")).toContain(`width: ${width}`);
    }
  });

  it("宽度：未设置时不写 width（沿用 .layout-p 的 100%）", () => {
    const wrapper = mount(GridSchemaNode, {
      props: { node: fieldNode(), baseRowHeight: 8 },
    });
    expect(wrapper.attributes("style") ?? "").not.toContain("width:");
  });

  it("宽度：复合字段（有前/后标签）下宽度只作用于可输入区域，不作用于整个组件", () => {
    const make = (mode: "design" | "fill") =>
      mount(GridSchemaNode, {
        props: {
          node: fieldNode({ prefix: "共", suffix: "人", width: "30mm" }),
          baseRowHeight: 8,
          // fill 模式传空 data 进入填充态控件；
          data: mode === "fill" ? {} : undefined,
        },
      });

    // 1. 整个 <p> 不应带 width（否则前缀/后缀会被算进宽度）
    const design = make("design");
    expect(design.attributes("style") ?? "").not.toContain("width:");
    const fill = make("fill");
    expect(fill.attributes("style") ?? "").not.toContain("width:");

    // 2. 可输入区域挂上 width：设计态是 .layout-p__input，填充态是 .layout-p__control
    expect(design.find(".layout-p__input").attributes("style")).toContain("width: 30mm");
    expect(fill.find(".layout-p__control").attributes("style")).toContain("width: 30mm");
  });

  it("默认内容：无 data 时渲染 default 预设文本", () => {
    const wrapper = mount(GridSchemaNode, {
      props: { node: fieldNode({ default: "预设内容" }), baseRowHeight: 8 },
    });
    expect(wrapper.text()).toBe("预设内容");
  });

  it("默认内容：data 有值时优先于 default（预览态静态文本 + 填充态控件值）", () => {
    // 预览态（readonly）：渲染静态文本，直接取 text
    const preview = mount(GridSchemaNode, {
      props: {
        node: fieldNode({ default: "预设内容" }),
        baseRowHeight: 8,
        data: { 测试字段: "填写值" },
        readonly: true,
      },
    });
    expect(preview.text()).toBe("填写值");

    // 填充态：值在真实控件（textarea）的 .value 上，而非 textContent
    const fill = mount(GridSchemaNode, {
      props: {
        node: fieldNode({ default: "预设内容" }),
        baseRowHeight: 8,
        data: { 测试字段: "填写值" },
      },
    });
    const control = fill.find(".layout-p__control").element as HTMLTextAreaElement;
    expect(control.value).toBe("填写值");
  });

  it("默认内容：填充态无 data 时控件回退 default", () => {
    const fill = mount(GridSchemaNode, {
      props: {
        node: fieldNode({ default: "预设内容" }),
        baseRowHeight: 8,
        data: {},
      },
    });
    const control = fill.find(".layout-p__control").element as HTMLTextAreaElement;
    expect(control.value).toBe("预设内容");
  });

  it("默认内容：data 存在该键且为空串时不回退 default（字段可被清空，G16）", () => {
    // 预览态（readonly）：直接取 textContent，应为空而非默认内容
    const preview = mount(GridSchemaNode, {
      props: {
        node: fieldNode({ default: "预设内容" }),
        baseRowHeight: 8,
        data: { 测试字段: "" },
        readonly: true,
      },
    });
    expect(preview.text()).toBe("");

    // 填充态：控件 .value 应为空串（用户主动清空后，回写 "" 不应被 default 覆盖）
    const fill = mount(GridSchemaNode, {
      props: {
        node: fieldNode({ default: "预设内容" }),
        baseRowHeight: 8,
        data: { 测试字段: "" },
      },
    });
    const control = fill.find(".layout-p__control").element as HTMLTextAreaElement;
    expect(control.value).toBe("");
  });

  it("默认内容：未设置且无 data 时渲染为空", () => {
    const wrapper = mount(GridSchemaNode, {
      props: { node: fieldNode(), baseRowHeight: 8 },
    });
    expect(wrapper.text()).toBe("");
  });

  it("内部边框：innerBorder=true 加 layout-p--inner-border 修饰类", () => {
    const wrapper = mount(GridSchemaNode, {
      props: { node: fieldNode({ innerBorder: true }), baseRowHeight: 8 },
    });
    expect(wrapper.classes()).toContain("layout-p--inner-border");
  });

  it("内部边框：默认（未设置）不显示底边框修饰类", () => {
    const wrapper = mount(GridSchemaNode, {
      props: { node: fieldNode(), baseRowHeight: 8 },
    });
    expect(wrapper.classes()).not.toContain("layout-p--inner-border");
  });

  it("内部边框：预览（readonly）与填充态同样保留修饰类（设计/预览/打印均显示）", () => {
    const readonlyWrapper = mount(GridSchemaNode, {
      props: {
        node: fieldNode({ innerBorder: true }),
        baseRowHeight: 8,
        readonly: true,
      },
    });
    expect(readonlyWrapper.classes()).toContain("layout-p--inner-border");

    const fillWrapper = mount(GridSchemaNode, {
      props: {
        node: fieldNode({ innerBorder: true }),
        baseRowHeight: 8,
        data: {},
      },
    });
    expect(fillWrapper.classes()).toContain("layout-p--inner-border");
  });

  it("内部边框：勾选后 p 内存在 div 时底边框规则可命中（:deep 无 scope 属性）", () => {
    const wrapper = mount(GridSchemaNode, {
      props: { node: fieldNode({ innerBorder: true }), baseRowHeight: 8 },
    });
    // 渲染层产出的修饰类必须与 :deep(div) 规则匹配；运行时插入的 div 无 data-v 属性，
    // 故规则已用 :deep()，此处仅断言类名按 innerBorder 开关（视觉由浏览器保证）。
    const cls = wrapper.classes();
    expect(cls).toContain("layout-p--inner-border");
    expect(cls).toContain("layout-p--field");
  });

  it("内部边框：静态/预览渲染为逐行 div，打印态可命中真实底边框（修复打印不显示）", () => {
    // 多行值 → 渲染出与行数一致的 .layout-p__line div（真实边框元素，打印必定显示）
    const wrapper = mount(GridSchemaNode, {
      props: {
        node: fieldNode({ innerBorder: true, default: "第一行\n第二行\n第三行" }),
        baseRowHeight: 8,
        readonly: true,
      },
    });
    const lines = wrapper.findAll(".layout-p__line");
    expect(lines).toHaveLength(3);
    // 空值（无 data 且无 default）→ 至少渲染一个空行 div，保证打印有横线
    const empty = mount(GridSchemaNode, {
      props: { node: fieldNode({ innerBorder: true }), baseRowHeight: 8, readonly: true },
    });
    expect(empty.findAll(".layout-p__line").length).toBeGreaterThanOrEqual(1);
  });
});
