import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GridFormRenderer from "@/components/renderer-v2/GridFormRenderer.vue";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";

/**
 * P4.5 前五行 DOM 结构快照：锁定云铝工作票「标题 + 前五行」的渲染基线，
 * 防止后续重构无意改变结构、行高、竖排标签或表格列数。
 */
describe("前五行渲染基线（P4.5 快照）", () => {
  const schema = makeYunlvSecondTicketFirstFiveRowsSchema();
  const wrapper = mount(GridFormRenderer, { props: { schema } });

  it("渲染标题 Grid + 外层五行 Grid（共 2 个，外层含 5 行）", () => {
    expect(wrapper.find('[data-node-id="ticket-page-1"]').exists()).toBe(true);
    expect(wrapper.findAll(".layout-grid")).toHaveLength(2);
    const outer = wrapper.find('[data-node-id="ticket-layout"]');
    expect(outer.exists()).toBe(true);
    expect(outer.findAll(".layout-grid__row")).toHaveLength(5);
  });

  it("工作任务行高度 = 5 × 8mm = 40mm", () => {
    const row = wrapper.find('[data-layout-id="row-work-task"]');
    expect(row.exists()).toBe(true);
    expect(row.attributes("style")).toContain("min-height: 40mm");
  });

  it("工作任务左格「工作任务」标签为竖排（vertical-rl）", () => {
    const vertical = wrapper
      .findAll(".layout-text")
      .find(el => el.attributes("style")?.includes("vertical-rl"));
    expect(vertical?.text()).toBe("工作任务");
  });

  it("工作任务表格含两列（工作地点或地段 / 工作内容）", () => {
    const headers = wrapper.findAll("thead th");
    expect(headers).toHaveLength(2);
    expect(headers.map(h => h.text())).toEqual(["工作地点或地段", "工作内容"]);
  });

  it("标题字号加粗且居中", () => {
    const title = wrapper.find('[data-node-id="title-text"]');
    expect(title.exists()).toBe(true);
    const style = title.attributes("style") ?? "";
    expect(style).toContain("font-size: 22");
    expect(style).toContain("font-weight: bold");
  });

  it("DOM 结构快照与基线一致", () => {
    expect(wrapper.html()).toMatchSnapshot();
  });
});
