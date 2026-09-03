import { describe, expect, it } from "vitest";
import { collectFieldKeys } from "@/types";
import type { FormNodeV2, FormSchemaV2, TableNodeV2 } from "@/types";
import {
  bindTableRowCell,
  buildTableRowField,
  collectSchemaFields,
  resolveTableRowCount,
} from "@/engine-v2/derivation";

/**
 * 表格「动态行」不是 schema 属性，而是渲染期按 data 推导：
 * 行数 = max(minRows, data 中实际出现过的最大行号)。
 * 字段命名规则：列内字段由「列key_行号」自动派生（见 schema-v2-table-rows.ts）。
 */

function fieldP(id: string, field: string): FormNodeV2 {
  return { id, type: "p", mode: "field", field };
}

/** 行模板单元格内嵌一层子 Grid（P7.2f：表格 cell 可放子 Grid），用于验证字段可下潜派生。 */
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
    const table = makeTable(4, [fieldP("p1", "")]);
    expect(resolveTableRowCount(table, null)).toBe(4);
    expect(resolveTableRowCount(table, undefined)).toBe(4);
  });

  it("data 出现超出配置行数的行号时补足行数（配置 4 行 + data 第 5 行 → 5 行）", () => {
    const table = makeTable(4, [fieldP("p1", "")]);
    expect(resolveTableRowCount(table, { col1_5: "a" })).toBe(5);
  });

  it("data 最大行号未超过 minRows 时保持 minRows", () => {
    const table = makeTable(4, [fieldP("p1", "")]);
    expect(resolveTableRowCount(table, { col1_1: "a", col2_2: "b" })).toBe(4);
  });

  it("中间行缺失时仍按 data 最大行号渲染（缺失行留空）", () => {
    const table = makeTable(4, [fieldP("p1", "")]);
    expect(resolveTableRowCount(table, { col1_3: "c", col2_7: "g" })).toBe(7);
  });

  it("按完整键匹配，能正确解析多位行号", () => {
    const table = makeTable(1, [fieldP("p1", "")]);
    expect(resolveTableRowCount(table, { col1_12: "z" })).toBe(12);
  });

  it("非数字或不完整的键不会被误判为行号", () => {
    const table = makeTable(1, [fieldP("p1", "")]);
    expect(resolveTableRowCount(table, { col1_x: "z", col1_1_9: "y" })).toBe(1);
  });

  it("列 key 含下划线时仅匹配「key_纯数字」后缀", () => {
    const table: TableNodeV2 = {
      id: "table-2",
      type: "table",
      columns: [{ key: "a_b", title: "列", width: "1fr" }],
      minRows: 1,
      rowTemplate: [{ id: "tpl", type: "table-cell-template", columnKey: "a_b", children: [fieldP("p", "")] }],
    };
    expect(resolveTableRowCount(table, { a_b_3: "x" })).toBe(3);
    expect(resolveTableRowCount(table, { a_b_x: "x" })).toBe(1);
  });
});

describe("bindTableRowCell（表格列内字段由 列key_行号 派生）", () => {
  it("字段 P 绑定为 列key_行号", () => {
    const bound = bindTableRowCell(fieldP("p1", ""), "工作地点", 3) as Extract<FormNodeV2, { type: "p" }>;
    expect(bound.field).toBe("工作地点_3");
    expect(buildTableRowField("工作地点", 3)).toBe("工作地点_3");
  });

  it("嵌套 Grid 内的字段 P 也一并派生（同 columnKey_行号）", () => {
    const bound = bindTableRowCell(nestedGrid("g1", ""), "工作内容", 4) as Extract<FormNodeV2, { type: "grid" }>;
    const innerP = bound.rows[0].cells[0].children[0] as Extract<FormNodeV2, { type: "p" }>;
    expect(innerP.field).toBe("工作内容_4");
  });

  it("非字段节点（Text）保持原样", () => {
    const text = { id: "t", type: "text", text: "标题" } as FormNodeV2;
    expect(bindTableRowCell(text, "col1", 2)).toBe(text);
  });

  it("schema 中手写 field 会被覆盖（派生名非空）", () => {
    const bound = bindTableRowCell(fieldP("p1", "旧键"), "col1", 1) as Extract<FormNodeV2, { type: "p" }>;
    expect(bound.field).toBe("col1_1");
  });
});

describe("collectFieldKeys", () => {
  it("下潜 Grid 与 Table 收集后代字段（schema 手写值；表格实际字段由列派生）", () => {
    expect(collectFieldKeys(fieldP("g", "x"))).toEqual(["x"]);
    const table = makeTable(1, [fieldP("p1", "a")], [fieldP("p2", "b")]);
    expect(collectFieldKeys(table).sort()).toEqual(["a", "b"]);
  });
});

function makeSchema(children: FormNodeV2[]): FormSchemaV2 {
  return {
    version: 2,
    paper: { size: "A4", orientation: "portrait" },
    baseRowHeight: 8,
    pages: [
      {
        id: "page-1",
        type: "page",
        mode: "fixed",
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        children,
      },
    ],
  };
}

describe("collectSchemaFields（完整字段清单，G12）", () => {
  it("非表格字段 + 表格派生字段（无 data 时按 minRows 枚举）", () => {
    const schema = makeSchema([fieldP("owner", "负责人"), makeTable(2, [fieldP("p1", "")], [fieldP("p2", "")])]);
    const fields = collectSchemaFields(schema);
    const keys = fields.map(f => f.key).sort();
    // 默认 Array.sort 按 UTF-16 码位："col*" 早于中文"负责人"
    expect(keys).toEqual(["col1_1", "col1_2", "col2_1", "col2_2", "负责人"]);
    // 普通字段
    const owner = fields.find(f => f.key === "负责人")!;
    expect(owner.kind).toBe("field");
    expect(owner.tableField).toBeUndefined();
    // 表格派生字段带列 key 与行号
    const c11 = fields.find(f => f.key === "col1_1")!;
    expect(c11.kind).toBe("table-field");
    expect(c11.tableField).toBe("col1");
    expect(c11.row).toBe(1);
  });

  it("有 data 时表格行数按 data 推导（超出 minRows 的行也纳入清单）", () => {
    const schema = makeSchema([makeTable(2, [fieldP("p1", "")], [fieldP("p2", "")])]);
    const fields = collectSchemaFields(schema, { col1_3: "x" });
    const keys = fields.map(f => f.key).sort();
    expect(keys).toEqual(["col1_1", "col1_2", "col1_3", "col2_1", "col2_2", "col2_3"]);
  });

  it("表格 cell 内嵌 Grid 的字段 P 也派生为 列key_行号（与渲染 bindTableRowCell 一致）", () => {
    const schema = makeSchema([makeTable(1, [nestedGrid("g1", "")], []), fieldP("tail", "备注")]);
    const fields = collectSchemaFields(schema);
    const keys = fields.map(f => f.key).sort();
    expect(keys).toEqual(["col1_1", "备注"]);
    const tableField = fields.find(f => f.key === "col1_1")!;
    expect(tableField.kind).toBe("table-field");
    expect(tableField.tableField).toBe("col1");
    expect(tableField.row).toBe(1);
  });
});
