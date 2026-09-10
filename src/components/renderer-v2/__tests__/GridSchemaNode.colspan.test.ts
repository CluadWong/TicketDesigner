import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { GridFormRenderer } from "@/components/renderer-v2";
import {
  appendNodeToCellV2,
  createEmptyFormSchemaV2,
  createGridNodeV2,
  createTextNodeV2,
  insertRootGridV2,
  mergeGridCellsV2,
} from "@/types/schema-v2-operations";

describe("GridSchemaNode colspan alignment (P6.2c)", () => {
  const buildMergedSchema = () => {
    const blank = createEmptyFormSchemaV2();
    const grid = createGridNodeV2({ rows: 2, columns: 3, cellWidth: 30 });
    let schema = insertRootGridV2(blank, grid);
    const top = schema.pages[0].children[0];
    if (top.type !== "grid") throw new Error("grid missing");
    // 合并第 0 行前两格（colspan 2），第 1 行保持 3 格，用于验证跨行列对齐。
    const merged = mergeGridCellsV2(schema, top.rows[0].cells[0].id, top.rows[0].cells[1].id);
    schema = appendNodeToCellV2(
      merged,
      (merged.pages[0].children[0] as { rows: { cells: { id: string }[] }[] }).rows[0].cells[0].id,
      createTextNodeV2("合并标签"),
    );
    return schema;
  };

  it("uses shared column tracks so a merged cell aligns across rows", () => {
    const wrapper = mount(GridFormRenderer, { props: { schema: buildMergedSchema() } });
    const rows = wrapper.findAll(".layout-grid__row");
    expect(rows).toHaveLength(2);

    // 第 0 行只有 2 个 cell（已合并），但其列轨仍来自 grid.columns（3 列），
    // 确保合并格在任意列宽下都能跨 2 列对齐，而非退化为逐格宽度。
    const row0Tracks = (rows[0].element as HTMLElement).style.gridTemplateColumns.replace(/\s+/g, " ").trim();
    expect(row0Tracks).toBe("30mm 30mm 30mm");

    const row0Cells = rows[0].findAll(".layout-grid__cell");
    expect(row0Cells).toHaveLength(2);
    expect((row0Cells[0].element as HTMLElement).style.gridColumn).toBe("span 2");

    // 第 1 行 3 格，每格占 1 列。
    const row1Cells = rows[1].findAll(".layout-grid__cell");
    expect(row1Cells).toHaveLength(3);
    expect((row1Cells[0].element as HTMLElement).style.gridColumn).toBe("");
  });
});
