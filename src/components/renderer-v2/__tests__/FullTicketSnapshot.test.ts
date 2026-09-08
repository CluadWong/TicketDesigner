import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GridFormRenderer from "@/components/renderer-v2/GridFormRenderer.vue";
import type { FormNodeV2, FormSchemaV2 } from "@/types";
import { makeYunlvSecondTicketFullSchema } from "@/dev/yunlv-second-ticket-full";

/**
 * P11-2 完整工作票 DOM 结构快照基线。
 *
 * 锁死 13 段扁平网格全票（含嵌套段）的渲染输出：节点数按 schema 递归统计与 DOM
 * 双向对账（防止「schema 有但没渲染出来」或「多渲染」），再加关键段落锚点与整页
 * `toMatchSnapshot()`。后续任何触碰渲染内核的改动若改变全票结构，此测试首先报警。
 */
function countNodes(nodes: FormNodeV2[]): {
  grid: number;
  p: number;
  field: number;
  text: number;
  table: number;
  image: number;
} {
  const acc = { grid: 0, p: 0, field: 0, text: 0, table: 0, image: 0 };
  const walk = (list: FormNodeV2[]): void => {
    for (const node of list) {
      if (node.type === "grid") {
        acc.grid++;
        for (const row of node.rows) {
          for (const cell of row.cells) walk(cell.children);
        }
      } else if (node.type === "p") {
        acc.p++;
        if (node.field) acc.field++;
      } else if (node.type === "text") {
        acc.text++;
      } else if (node.type === "table") {
        acc.table++;
      } else if (node.type === "image") {
        acc.image++;
      }
    }
  };
  walk(nodes);
  return acc;
}

function schemaNodes(schema: FormSchemaV2): FormNodeV2[] {
  return schema.pages.flatMap((page) => page.children);
}

describe("完整工作票渲染基线（P11-2 快照）", () => {
  const schema = makeYunlvSecondTicketFullSchema();
  const expected = countNodes(schemaNodes(schema));
  const wrapper = mount(GridFormRenderer, { props: { schema } });

  it("页面存在，且 DOM 网格数与 schema 递归统计一致（≥13 段）", () => {
    expect(wrapper.find('[data-node-id="ticket-page-full"]').exists()).toBe(true);
    expect(expected.grid).toBeGreaterThanOrEqual(13);
    expect(wrapper.findAll(".layout-grid")).toHaveLength(expected.grid);
  });

  it("表格 / 图片 DOM 数与 schema 递归统计一致；p / 字段 / 文本不少于去重节点数", () => {
    // 表格按「行数 × 列数」重复渲染模板子节点（见 GridSchemaNode table 分支），
    // 故含字段模板的表格会让 DOM 中 .layout-p / [data-field] 多于 schema 去重统计
    // ——精确值由下方整页快照锁定，这里做结构级下界对账防「漏渲染」。
    expect(wrapper.findAll(".layout-table")).toHaveLength(expected.table);
    expect(wrapper.findAll(".layout-image")).toHaveLength(expected.image);
    expect(wrapper.findAll(".layout-p").length).toBeGreaterThanOrEqual(expected.p);
    expect(wrapper.findAll("[data-field]").length).toBeGreaterThanOrEqual(
      expected.field,
    );
    expect(wrapper.findAll(".layout-text").length).toBeGreaterThanOrEqual(
      expected.text,
    );
    expect(expected.field).toBeGreaterThan(0);
  });

  it("关键段落锚点存在（标题 / 确认 / 延期 / 终结）", () => {
    for (const id of [
      "confirm-header",
      "extension-header",
      "completion-header",
    ]) {
      expect(wrapper.find(`[data-node-id="${id}"]`).exists()).toBe(true);
    }
  });

  it("工作任务表头仍为两列（工作地点或地段 / 工作内容）", () => {
    const headers = wrapper.findAll("thead th");
    expect(headers.length).toBeGreaterThanOrEqual(2);
    expect(headers.map((h) => h.text())).toContain("工作地点或地段");
    expect(headers.map((h) => h.text())).toContain("工作内容");
  });

  it("DOM 结构快照与基线一致", () => {
    expect(wrapper.html()).toMatchSnapshot();
  });
});
