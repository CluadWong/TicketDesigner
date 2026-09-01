import { describe, expect, it } from "vitest";
import {
  bindRowPlaceholder,
  collectFieldKeys,
  resolveTableRowCount,
  ROW_PLACEHOLDER,
} from "@/types";
import type { FormNodeV2, TableNodeV2 } from "@/types";

/**
 * 表格「动态行」不是 schema 属性，而是渲染期按 data 推导：
 * 行数 = max(minRows, data 中实际出现过的最大行号)。
 */

function fieldP(id: string, field: string): FormNodeV2 {
  return { id, type: "p", mode: "field", field };
}

/** 行模板单元格内嵌一层子 Grid（P7.2f：表格 cell 可放子 Grid），用于验证字段可下潜收集。 */
function nestedGrid(id: string, field: string): FormNodeV2 {
  return {
    id,
    type: "grid",
    border: "none",
    rows: [
      {
        id: `${id}-row`,
        type: "grid-row",
        height: 1,
        cells: [
          {
            id: `${id}-cell`,
            type: "grid-cell",
            children: [fieldP(`${id}-p`, field)],
          },
        ],
      },
    ],
  };
}

function makeTable(
  minRows: number,
  col1Children: FormNodeV2[],
  col2Children: FormNodeV2[] = [],
): TableNodeV2 {
  return {
    id: "table-1",
    type: "table",
    columns: [
      { key: "col1", title: "列 1", width: "1fr" },
      { key: "col2", title: "列 2", width: "1fr" },
    ],
    headerHeight: 1,
    rowHeight: 1,
    minRows,
    border: "all",
    rowTemplate: [
      { id: "tpl-1", type: "table-cell-template", columnKey: "col1", children: col1Children },
      { id: "tpl-2", type: "table-cell-template", columnKey: "col2", children: col2Children },
    ],
  };
}

describe("表格运行时行数（data 驱动，P7.2d / P9.1d）", () => {
  it("无 data（设计态）时回退为 minRows", () => {
    const table = makeTable(
      4,
      [fieldP("p1", "工作内容_{row}_1")],
      [fieldP("p2", "工作内容_{row}_2")],
    );
    expect(resolveTableRowCount(table, null)).toBe(4);
    expect(resolveTableRowCount(table, undefined)).toBe(4);
  });

  it("data 存在但模板字段不含 {row} 占位符时仍为 minRows", () => {
    const table = makeTable(4, [fieldP("p1", "固定键")]);
    expect(resolveTableRowCount(table, { 固定键: "x", 其它: "y" })).toBe(4);
  });

  it("data 出现超出配置行数的行号时补足行数（配置 4 行 + data 第 5 行 → 5 行）", () => {
    const table = makeTable(
      4,
      [fieldP("p1", "工作内容_{row}_1")],
      [fieldP("p2", "工作内容_{row}_2")],
    );
    expect(resolveTableRowCount(table, { 工作内容_5_2: "a" })).toBe(5);
  });

  it("data 最大行号未超过 minRows 时保持 minRows", () => {
    const table = makeTable(4, [fieldP("p1", "工作内容_{row}_1")]);
    expect(resolveTableRowCount(table, { 工作内容_1_1: "a", 工作内容_2_1: "b" })).toBe(4);
  });

  it("中间行缺失时仍按 data 最大行号渲染（缺失行留空）", () => {
    const table = makeTable(4, [fieldP("p1", "工作内容_{row}_1")]);
    expect(resolveTableRowCount(table, { 工作内容_3_1: "c", 工作内容_7_1: "g" })).toBe(7);
  });

  it("行模板内嵌子 Grid 的后代字段也能参与行数推断", () => {
    const table = makeTable(2, [nestedGrid("g1", "工作内容_{row}_1")]);
    expect(resolveTableRowCount(table, { 工作内容_4_1: "d" })).toBe(4);
  });

  it("按完整键匹配，能正确解析多位行号", () => {
    const table = makeTable(1, [fieldP("p1", "工作内容_{row}_1")]);
    expect(resolveTableRowCount(table, { 工作内容_12_1: "z" })).toBe(12);
  });

  it("非数字或不完整的键不会被误判为行号", () => {
    const table = makeTable(1, [fieldP("p1", "工作内容_{row}_1")]);
    expect(resolveTableRowCount(table, { 工作内容_x_1: "z", 工作内容_1_9: "y" })).toBe(1);
  });
});

describe("bindRowPlaceholder", () => {
  it("替换全部 {row} 占位符为行号", () => {
    expect(bindRowPlaceholder("工作任务_{row}_1", 3)).toBe("工作任务_3_1");
    expect(bindRowPlaceholder("a_{row}_b_{row}", 2)).toBe("a_2_b_2");
  });

  it("不含占位符时原样返回", () => {
    expect(bindRowPlaceholder("固定键", 3)).toBe("固定键");
  });

  it("占位符常量与行模板写法一致", () => {
    expect(ROW_PLACEHOLDER).toBe("{row}");
  });
});

describe("collectFieldKeys", () => {
  it("下潜 Grid 与 Table 收集后代字段", () => {
    expect(collectFieldKeys(nestedGrid("g", "x_{row}"))).toEqual(["x_{row}"]);
    const table = makeTable(1, [fieldP("p1", "a_{row}")], [nestedGrid("g2", "b_{row}")]);
    expect(collectFieldKeys(table).sort()).toEqual(["a_{row}", "b_{row}"]);
  });
});
