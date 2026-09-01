import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { GridFormRenderer } from "@/components/renderer-v2";
import {
  createEmptyFormSchemaV2,
  createGridBySizeV2,
  createTableNodeV2,
  insertRootGridV2,
  appendNodeToCellV2,
} from "@/types";
import type { FormSchemaV2 } from "@/types";

/**
 * 渲染层验收：表格行数由 data 推导（max(minRows, data 中最大行号)），
 * 而不是由 schema 上的某个「可重复」开关决定。
 */
function schemaWithTable(minRows: number): FormSchemaV2 {
  const grid = createGridBySizeV2({ rows: 1, columns: 1, border: "all" });
  const table = createTableNodeV2();
  table.minRows = minRows;
  // 两列模板字段改为逐行键：工作内容_{row}_1 / 工作内容_{row}_2
  table.rowTemplate = table.rowTemplate.map((template, index) => ({
    ...template,
    children: template.children.map(child =>
      child.type === "p" ? { ...child, field: `工作内容_{row}_${index + 1}` } : child,
    ),
  }));
  return appendNodeToCellV2(
    insertRootGridV2(createEmptyFormSchemaV2(), grid),
    grid.rows[0].cells[0].id,
    table,
  );
}

describe("表格按 data 动态渲染行数（P7.2d / P9.1d）", () => {
  it("无 data（设计态）时渲染 minRows 行", () => {
    const wrapper = mount(GridFormRenderer, { props: { schema: schemaWithTable(4) } });
    expect(wrapper.findAll("tbody tr")).toHaveLength(4);
  });

  it("data 含第 5 行数据时补渲染第 5 行（配置为 4 行）", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: schemaWithTable(4), data: { 工作内容_5_2: "a" } },
    });
    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(5);
    // 第 5 行第 2 列应带上该数据（填充态渲染真实控件，取 .value）
    const controls = rows[4]
      .findAll("textarea, input")
      .map(control => control.element as HTMLTextAreaElement);
    expect(controls[1].value).toBe("a");
    // 第 5 行第 1 列无数据 → 留空
    expect(controls[0].value).toBe("");
  });

  it("data 行数未超过配置时行数不变", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: schemaWithTable(4), data: { 工作内容_2_1: "b" } },
    });
    expect(wrapper.findAll("tbody tr")).toHaveLength(4);
  });
});
