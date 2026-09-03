import { describe, expect, it } from "vitest";
import {
  gridFragmentHeightMm,
  paginatePage,
  paginateSchema,
  type PhysicalPage,
} from "@/engine-v2/pagination";
import { makeFiftyRowGridSchema } from "@/dev/gridPaginationDemo";
import type {
  FormSchemaV2,
  GridNodeV2,
  PageSchemaV2,
} from "@/types";
import { resolvePaperSizeV2 } from "@/types";

/** 统计物理页列表中所有 Grid 片段的行数总和。 */
function totalGridRows(pages: PhysicalPage[]): number {
  let n = 0;
  for (const p of pages) {
    for (const c of p.children) {
      if (c.node.type === "grid") n += c.node.rows.length;
    }
  }
  return n;
}

/** 统计物理页数量（仅含至少一个子项）。 */
function nonEmptyPages(pages: PhysicalPage[]): PhysicalPage[] {
  return pages.filter((p) => p.children.length > 0);
}

describe("分页引擎 pagination", () => {
  it("50 行 Grid + 标题 → 切成 2 个物理页，且行数不丢", () => {
    const schema = makeFiftyRowGridSchema();
    const result = paginateSchema(schema);
    const pages = nonEmptyPages(result.pages);

    expect(pages).toHaveLength(2);
    // 网格被完整保留：50 行一分不丢
    expect(totalGridRows(pages)).toBe(50);
    // 无溢出告警（每段都放得下）
    expect(result.warnings).toHaveLength(0);
  });

  it("每个物理页内容高度均不超过正文可用高", () => {
    const schema = makeFiftyRowGridSchema();
    const paper = resolvePaperSizeV2(schema.paper);
    const bodyH = paper.heightMm - 10 - 10; // margin 10
    const result = paginateSchema(schema);

    for (const p of result.pages) {
      let used = 0;
      for (const c of p.children) {
        if (c.node.type === "grid") {
          const sb = c.suppressBorders;
          used += gridFragmentHeightMm(schema.baseRowHeight, c.node, c.node.rows, !!sb?.top, !!sb?.bottom);
        }
      }
      expect(used).toBeLessThanOrEqual(bodyH + 0.5);
    }
  });

  it("跨页 Grid 片段用 suppressBorders 形成连续外观（首段有顶框、末段有底框、中间去顶底框）", () => {
    const schema = makeFiftyRowGridSchema();
    const result = paginateSchema(schema);
    const gridFragments = result.pages
      .flatMap((p) => p.children)
      .filter((c) => c.node.type === "grid");

    expect(gridFragments.length).toBeGreaterThan(1);
    // 首片段保留顶框（未被抑制）
    expect(gridFragments[0].suppressBorders?.top).not.toBe(true);
    // 末片段保留底框（未被抑制）
    const last = gridFragments[gridFragments.length - 1];
    expect(last.suppressBorders?.bottom).not.toBe(true);
    // 中间片段抑制顶/底框（连续外观）
    for (let i = 1; i < gridFragments.length - 1; i++) {
      expect(gridFragments[i].suppressBorders?.top).toBe(true);
      expect(gridFragments[i].suppressBorders?.bottom).toBe(true);
    }
  });

  it("短内容 → 单页，且不切分 Grid", () => {
    const page: PageSchemaV2 = {
      id: "p1",
      type: "page",
      mode: "fixed",
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      children: [
        {
          id: "g",
          type: "grid",
          border: "all",
          rows: [
            {
              id: "r1",
              type: "grid-row",
              height: 1,
              cells: [{ id: "c1", type: "grid-cell", children: [] }],
            },
          ],
        },
      ],
    };
    const schema: FormSchemaV2 = { version: 2, paper: { size: "A4", orientation: "portrait" }, baseRowHeight: 8, pages: [page] };
    const result = paginatePage(page, {
      baseRowHeight: 8,
      bodyHeightMm: 277,
      contentWidthMm: 190,
    });
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].children[0].node).toMatchObject({ id: "g" });
    // 整 Grid 未切分（rows 仍是 1 行）
    expect((result.pages[0].children[0].node as GridNodeV2).rows).toHaveLength(1);
  });

  it("单个节点比整页还高 → 强制放入并产出告警", () => {
    const page: PageSchemaV2 = {
      id: "p1",
      type: "page",
      mode: "fixed",
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      children: [
        {
          id: "tall",
          type: "grid",
          border: "all",
          rows: [
            {
              id: "r1",
              type: "grid-row",
              height: 1,
              cells: [{ id: "c1", type: "grid-cell", children: [] }],
            },
          ],
        },
      ],
    };
    // baseRowHeight=300 → 单行就 300mm > 正文 277mm
    const result = paginatePage(page, {
      baseRowHeight: 300,
      bodyHeightMm: 277,
      contentWidthMm: 190,
    });
    expect(result.pages).toHaveLength(1);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("多个逻辑页 → 拼接为连续编号的物理页", () => {
    const makePage = (id: string): PageSchemaV2 => ({
      id,
      type: "page",
      mode: "fixed",
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      children: [
        {
          id: `${id}-t`,
          type: "text",
          text: "一页内容",
        },
      ],
    });
    const schema: FormSchemaV2 = {
      version: 2,
      paper: { size: "A4", orientation: "portrait" },
      baseRowHeight: 8,
      pages: [makePage("lp1"), makePage("lp2")],
    };
    const result = paginateSchema(schema);
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].index).toBe(1);
    expect(result.pages[1].index).toBe(2);
    expect(result.pages[1].sourcePageId).toBe("lp2");
  });

  it("measureRow 注入真实行高后，分页按真实高度切分（估算偏低 → 多换页、不溢出）", () => {
    const schema = makeFiftyRowGridSchema();
    // 模拟「多行字段 / 换行文本」使真实行高（20mm）远高于确定性估算（8mm）
    const result = paginateSchema(schema, { measureRow: () => 20 });
    const pages = nonEmptyPages(result.pages);

    // 真实行高下每页装得下更少行 → 物理页数多于确定性分页的 2 页
    expect(pages.length).toBeGreaterThan(2);
    // 50 行一分不丢
    expect(totalGridRows(pages)).toBe(50);
    // 用真实行高复核：每页内容高度不再超过正文可用高（不溢出纸外）
    const paper = resolvePaperSizeV2(schema.paper);
    const bodyH = paper.heightMm - 10 - 10;
    for (const p of pages) {
      let used = 0;
      for (const c of p.children) {
        if (c.node.type === "grid") {
          const sb = c.suppressBorders;
          used += gridFragmentHeightMm(
            schema.baseRowHeight,
            c.node,
            c.node.rows,
            !!sb?.top,
            !!sb?.bottom,
            () => 20,
          );
        }
      }
      expect(used).toBeLessThanOrEqual(bodyH + 0.5);
    }
  });
});
