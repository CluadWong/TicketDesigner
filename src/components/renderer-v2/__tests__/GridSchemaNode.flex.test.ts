import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { GridFormRenderer } from "@/components/renderer-v2";
import {
  appendNodeToCellV2,
  createEmptyFormSchemaV2,
  createGridNodeV2,
  createTextNodeV2,
  insertRootGridV2,
} from "@/types/schema-v2-operations";
import { validateFormSchemaV2 } from "@/types/schema-v2-validation";
import { parseFormSchemaV2 } from "@/types/schema-v2-serialization";
import type { GridNodeV2 } from "@/types/schema-v2";

describe("GridSchemaNode cell-level flex layout (单元格弹性布局)", () => {
  const buildFlexCellSchema = () => {
    const blank = createEmptyFormSchemaV2();
    const grid = createGridNodeV2({ rows: 1, columns: 1 });
    const cellId = grid.rows[0].cells[0].id;
    let schema = insertRootGridV2(blank, grid);
    // 单元格设为弹性布局，并塞入多个直接子节点
    schema = appendNodeToCellV2(schema, cellId, createTextNodeV2("A"));
    schema = appendNodeToCellV2(schema, cellId, createTextNodeV2("B"));
    schema = appendNodeToCellV2(schema, cellId, createTextNodeV2("C"));
    const topGrid = schema.pages[0].children[0];
    if (topGrid.type !== "grid") throw new Error("grid missing");
    topGrid.rows[0].cells[0].flex = true;
    return schema;
  };

  it("renders the flex cell with wrap on; alignment driven by cell align/verticalAlign config", () => {
    const wrapper = mount(GridFormRenderer, { props: { schema: buildFlexCellSchema() } });

    // 普通 Grid 结构仍在（行 + 单个单元格）
    expect(wrapper.findAll(".layout-grid__row")).toHaveLength(1);

    const cell = wrapper.find(".layout-grid__cell--flex");
    expect(cell.exists()).toBe(true);

    // 三个直接子节点（文本 A/B/C）均被递归渲染
    expect(wrapper.findAll(".layout-text")).toHaveLength(3);

    // 仅额外开启换行；水平/垂直对齐继承 cell 默认（无显式配置 → 居中/居中）
    const style = (cell.element as HTMLElement).style;
    expect(style.flexWrap).toBe("wrap");
    expect(style.justifyContent).toBe("center");
    expect(style.alignItems).toBe("center");
  });

  it("flex cell honors explicit horizontal align (left → flex-start)", () => {
    const schema = buildFlexCellSchema();
    const grid = schema.pages[0].children[0];
    if (grid.type !== "grid") throw new Error("grid missing");
    grid.rows[0].cells[0].align = "left";
    const wrapper = mount(GridFormRenderer, { props: { schema } });

    const cell = wrapper.find(".layout-grid__cell--flex");
    expect((cell.element as HTMLElement).style.justifyContent).toBe("flex-start");
  });

  it("non-flex cell does NOT get the flex class", () => {
    const blank = createEmptyFormSchemaV2();
    const grid = createGridNodeV2({ rows: 1, columns: 1 });
    const schema = insertRootGridV2(blank, grid);
    const wrapper = mount(GridFormRenderer, { props: { schema } });

    expect(wrapper.find(".layout-grid__cell--flex").exists()).toBe(false);
  });

  it("keeps cell.flex through round-trip serialization/validation", () => {
    const schema = buildFlexCellSchema();
    const errors = validateFormSchemaV2(schema).filter((i) => i.level === "error");
    expect(errors).toHaveLength(0);

    const restored = parseFormSchemaV2(JSON.stringify(schema));
    const grid = restored.pages[0].children[0] as GridNodeV2;
    expect(grid.rows[0].cells[0].flex).toBe(true);
  });
});
