import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { GridFormRenderer } from "@/components/renderer-v2";
import { validateFormSchemaV2 } from "@/types";
import { makeYunlvSecondTicketFullSchema } from "@/dev/yunlv-second-ticket-full";

/**
 * P11 完整工作票样例验收：
 * - 结构合法（无 error 级校验问题）；
 * - 1 个外层 all 网格承载整票外框 + 段间单线，7 个 inner 网格承载各段内部行列；
 * - 全部业务字段与内嵌表均被渲染且可被索引（data-field / data-node-id 存在）；
 * - 段间无 2px 双边框（相邻段只由外层网格画 1 条分隔线，inner 网格无外框）。
 */
describe("yunlv-second-ticket-full（P11 完整工作票样例）", () => {
  it("schema 校验无 error，且恰好 1 个外层 all 网格 + 7 个 inner 段网格", () => {
    const schema = makeYunlvSecondTicketFullSchema();
    const issues = validateFormSchemaV2(schema);
    expect(issues.filter(i => i.level === "error")).toHaveLength(0);

    const wrapper = mount(GridFormRenderer, { props: { schema } });
    // 外层唯一 all 网格
    expect(wrapper.findAll(".layout-grid--all")).toHaveLength(1);
    // 各业务段（basic/work-task/safety/confirm/extension/completion/remark）= 7 个 inner 网格
    expect(wrapper.findAll(".layout-grid--inner")).toHaveLength(7);
    // 不应出现 outer / none 边框类（full 样例只用 all + inner）
    expect(wrapper.findAll(".layout-grid--outer")).toHaveLength(0);
    expect(wrapper.findAll(".layout-grid--none")).toHaveLength(0);
  });

  it("全部业务字段均被渲染（覆盖每个段落）", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: makeYunlvSecondTicketFullSchema() },
    });
    const expectField = (field: string) => {
      const el = wrapper.find(`[data-field="${field}"]`);
      expect(el.exists(), `字段 ${field} 应存在`).toBe(true);
    };
    // 基本信息
    expectField("单位");
    expectField("编号");
    expectField("工作负责人_监护人");
    expectField("班组");
    expectField("工作班成员");
    expectField("工作班成员人数");
    expectField("变配电站名称");
    // 工作任务 + 计划工作时间
    expectField("工作任务");
    expectField("计划工作时间_1");
    expectField("计划工作时间_2");
    // 安全措施 / 签发
    expectField("工作条件");
    expectField("注意事项（安全措施）");
    expectField("注意事项备注");
    expectField("工作票签发人签名");
    expectField("签发日期");
    expectField("补充安全措施");
    expectField("补充安全措施备注");
    // 确认
    expectField("确认工作负责人签名");
    expectField("确认工作许可人签名");
    expectField("许可工作时间");
    expectField("确认工作班成员签名");
    // 延期
    expectField("有效期延长到");
    expectField("延期工作负责人签名");
    expectField("延期工作负责人日期");
    expectField("延期工作许可人签名");
    expectField("延期工作许可人日期");
    // 终结
    expectField("终结时间");
    expectField("终结工作负责人签名");
    expectField("终结工作负责人日期");
    expectField("终结工作许可人签名");
    expectField("终结工作许可人日期");
    // 备注
    expectField("备注");
  });

  it("内嵌工作任务表逐行字段绑定 {row} 并渲染 minRows 行", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: makeYunlvSecondTicketFullSchema() },
    });
    const table = wrapper.find("table.layout-table");
    expect(table.exists()).toBe(true);
    const bodyRows = wrapper.findAll("table.layout-table tbody tr");
    expect(bodyRows.length).toBeGreaterThanOrEqual(1);
    // 首行应含逐行键 工作任务_1_1 / 工作任务_1_2
    expect(wrapper.find('[data-field="工作任务_1_1"]').exists()).toBe(true);
    expect(wrapper.find('[data-field="工作任务_1_2"]').exists()).toBe(true);
  });

  it("嵌套 Grid 节点可被节点索引命中（段网格 id 存在）", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: makeYunlvSecondTicketFullSchema() },
    });
    for (const id of [
      "ticket-layout",
      "section-basic-info",
      "section-work-task",
      "section-safety",
      "section-confirm",
      "section-extension",
      "section-completion",
      "section-remark",
    ]) {
      expect(
        wrapper.find(`[data-node-id="${id}"]`).exists(),
        `节点 ${id} 应存在`,
      ).toBe(true);
    }
  });
});
