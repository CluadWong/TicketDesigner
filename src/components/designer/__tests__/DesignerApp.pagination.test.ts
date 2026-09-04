import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import DesignerApp from "@/components/designer/DesignerApp.vue";
import type { FormSchemaV2 } from "@/types";
import { makeFiftyRowGridSchema } from "@/dev/gridPaginationDemo";

/** 单行就超过一页的 Grid（行高 100 × 基准 8mm = 800mm ≫ A4 正文 277mm）：
 *  分页引擎会「强制放入并告警」，用于验证该告警能通过状态栏暴露出来。 */
function makeOversizedRowSchema(): FormSchemaV2 {
  return {
    version: 2,
    paper: { size: "A4", orientation: "portrait" },
    baseRowHeight: 8,
    pages: [
      {
        id: "p1",
        type: "page",
        mode: "fixed",
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        children: [
          {
            id: "tall-grid",
            type: "grid",
            border: "all",
            rows: [
              {
                id: "tall-row",
                type: "grid-row",
                height: 100,
                cells: [{ id: "tall-cell", type: "grid-cell", children: [] }],
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * 设计器分页（十六续）回归用例。
 *
 * 背景：曾出现「`paginate` 传了 true 却看不到分页效果」的反馈。经查渲染链路是通的
 * （本文件用例 1 即为固化证据），看不到效果的原因是**设计器默认空白 Schema、内容远未超页**，
 * 分页引擎无事可做。故用例同时载入超高 Schema（`makeFiftyRowGridSchema`）+ 切换「分页开关」，
 * 确保分页效果可验证。
 */
function mountWithTallSchema() {
  return mount(DesignerApp, {
    props: { initialSchema: makeFiftyRowGridSchema() },
  });
}

describe("DesignerApp 分页渲染", () => {
  it("超高 Schema 在设计器中渲染为多张物理页，且行数不丢失", () => {
    const wrapper = mountWithTallSchema();
    const papers = wrapper.findAll(".grid-form-paper");
    expect(papers.length).toBeGreaterThan(1);
    expect(wrapper.findAll(".layout-grid__row")).toHaveLength(50);
  });

  it("每张物理页的纸张高度都等于整纸高（不使用 min-height 无限撑开）", () => {
    const wrapper = mountWithTallSchema();
    const papers = wrapper.findAll(".grid-form-paper");
    for (const paper of papers) {
      const style = paper.attributes("style") ?? "";
      expect(style).toContain("height: 297mm");
      expect(style).not.toContain("min-height");
    }
  });

  it("空白 Schema 仍只渲染一张纸（分页不产生空页）", () => {
    const wrapper = mount(DesignerApp);
    expect(wrapper.findAll(".grid-form-paper")).toHaveLength(1);
  });

  it("关闭分页开关后回到单张纸的整页连续渲染，行数不丢", async () => {
    const wrapper = mountWithTallSchema();
    expect(wrapper.findAll(".grid-form-paper").length).toBeGreaterThan(1);

    // 分页开关已移入「页面」配置项，需先选中页面节点方能操作
    const pageRow = wrapper.findAll(".v2-tree-row").find(r => r.text().includes("页面"));
    await pageRow?.trigger("click");
    await nextTick();

    await wrapper.find('[data-paginate="true"]').setValue(false);

    expect(wrapper.findAll(".grid-form-paper")).toHaveLength(1);
    expect(wrapper.findAll(".layout-grid__row")).toHaveLength(50);
  });
});

describe("DesignerApp 状态栏暴露分页结果", () => {
  it("内容超高时显示物理（打印）页数，且与画布纸张数一致", () => {
    const wrapper = mountWithTallSchema();
    const paperCount = wrapper.findAll(".grid-form-paper").length;

    const status = wrapper.find('[data-physical-page-count="true"]');
    expect(status.exists()).toBe(true);
    expect(status.text()).toContain(String(paperCount));
    // 逻辑页仍只有 1 页，多出来的是换页结果
    expect(status.text()).toMatch(/打印：\d+ 张/);
  });

  it("逻辑页与物理页相同（空白 Schema）时不额外显示打印页数", () => {
    const wrapper = mount(DesignerApp);
    expect(wrapper.find('[data-physical-page-count="true"]').exists()).toBe(false);
  });

  it("单节点比整页还高时，状态栏显示分页告警", () => {
    const wrapper = mount(DesignerApp, {
      props: { initialSchema: makeOversizedRowSchema() },
    });
    expect(wrapper.find('[data-paginate-warning-count="true"]').exists()).toBe(true);
  });

  it("无超高内容时不显示分页告警", () => {
    const wrapper = mountWithTallSchema();
    expect(wrapper.find('[data-paginate-warning-count="true"]').exists()).toBe(false);
  });
});
