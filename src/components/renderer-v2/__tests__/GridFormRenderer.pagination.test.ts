import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { GridFormRenderer } from "@/components/renderer-v2";
import { makeFiftyRowGridSchema } from "@/dev/gridPaginationDemo";

describe("GridFormRenderer 分页渲染", () => {
  it("50 行 Grid 被渲染为 2 张物理纸，且行数不丢", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: makeFiftyRowGridSchema() },
    });
    const papers = wrapper.findAll(".grid-form-paper");
    expect(papers).toHaveLength(2);

    // 全局行数（.layout-grid__row）应等于 50（跨页不丢行）
    const rows = wrapper.findAll(".layout-grid__row");
    expect(rows).toHaveLength(50);

    // 每张纸都有标题 + 一段 Grid
    papers.forEach((paper) => {
      expect(paper.find(".layout-text").exists()).toBe(true);
      expect(paper.find(".layout-grid").exists()).toBe(true);
    });
  });

  it("跨页 Grid 片段的边框抑制类正确（首段去底框、末段去顶框）", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: makeFiftyRowGridSchema() },
    });
    const grids = wrapper.findAll(".grid-form-paper .layout-grid");
    expect(grids.length).toBe(2);

    // 首个片段：continues → 抑制底边框（layout-grid--no-bottom）
    expect(grids[0].classes()).toContain("layout-grid--no-bottom");
    expect(grids[0].classes()).not.toContain("layout-grid--no-top");

    // 末个片段：continued → 抑制顶边框（layout-grid--no-top）
    expect(grids[1].classes()).toContain("layout-grid--no-top");
    expect(grids[1].classes()).not.toContain("layout-grid--no-bottom");
  });

  it("paginate=false 时整页连续渲染（不切分，单张纸）", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: makeFiftyRowGridSchema(), paginate: false },
    });
    const papers = wrapper.findAll(".grid-form-paper");
    expect(papers).toHaveLength(1);
    expect(wrapper.findAll(".layout-grid__row")).toHaveLength(50);
  });

  it("paginate=false 时纸张用 min-height（内容高于一张纸也不溢出纸外）", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: makeFiftyRowGridSchema(), paginate: false },
    });
    const paper = wrapper.find(".grid-form-paper");
    const style = paper.attributes("style") ?? "";
    // 分页关闭：纸张随内容长高、内容留在纸内，故用 min-height 而非固定 height。
    expect(style).toMatch(/min-height\s*:\s*297mm/);
    // 注意：min-height 内部含 "height" 子串，这里用负向后查确保不是独立的 height 声明。
    expect(style).not.toMatch(/(?<!-)height\s*:\s*297mm/);
  });
});
