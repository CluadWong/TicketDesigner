/**
 * 结构编辑 composable 单测（2026-09-07 批次 1 拆分）：验证编辑闸门与提交接线。
 *
 * 关注点不是每个 Inspector 字段（那仍由 DesignerApp.test.ts 经 DOM 覆盖），
 * 而是：① 非设计态一切结构编辑被闸门挡住；② 编辑动作确实落到文档并进入历史。
 */
import { describe, expect, it } from "vitest";
import { ref, type Ref } from "vue";
import { useSchemaDocument, type SchemaDocument } from "../useSchemaDocument";
import { useNodeSelection } from "../useNodeSelection";
import { useSchemaEdits } from "../useSchemaEdits";
import type { FormSchemaV2, GridCellV2, GridNodeV2, TableNodeV2 } from "@/types";

function setup(editable = true) {
  const editableRef = ref(editable);
  const doc = useSchemaDocument();
  const selection = useNodeSelection(doc.schema, { editable: () => editableRef.value });
  const edits = useSchemaEdits({
    document: doc,
    selection,
    editable: () => editableRef.value,
    clearSelection: selection.clearSelection,
  });
  return { editableRef, doc, selection, edits };
}

describe("useSchemaEdits", () => {
  it("非设计态：结构编辑一律不生效（统一闸门）", () => {
    const { doc, edits } = setup(false);
    const before = doc.schema.value;
    edits.addRootGrid();
    edits.addGrid();
    edits.addNodeToSelectedCell("text");
    expect(doc.schema.value).toBe(before);
    expect(doc.canUndo.value).toBe(false);
  });

  it("设计态：addRootGrid 追加根 Grid 并选中它", () => {
    const { doc, selection, edits } = setup(true);
    const before = doc.schema.value.pages[0].children.length;
    edits.addRootGrid();
    const page = doc.schema.value.pages[0];
    expect(page.children).toHaveLength(before + 1);
    const added = page.children[page.children.length - 1];
    expect(selection.selectedNodeId.value).toBe(added.id);
    expect(doc.canUndo.value).toBe(true);
  });

  it("updateSelectedNode 只作用于当前选中节点", () => {
    const { doc, selection, edits } = setup(true);
    const gridId = doc.schema.value.pages[0].children[0].id;
    selection.selectNodeById(gridId);
    expect(selection.selectedNodeId.value).toBe(gridId);
    edits.updateSelectedNode((node) =>
      node.type === "grid" ? { ...node, border: "none" } : node,
    );
    const grid = doc.schema.value.pages[0].children[0];
    expect(grid.type === "grid" && grid.border).toBe("none");
  });

  it("落点提交：节点不存在时不产生新结构", () => {
    const { doc, edits } = setup(true);
    const cellEntry = [...doc.schema.value.pages[0].children].find((n) => n.type === "grid");
    expect(cellEntry).toBeDefined();
    edits.onDropNode({ moveId: "not-exist", cellId: "not-exist", index: 0 });
    expect(doc.canUndo.value).toBe(false);
  });
});

/** 在 schema 中按 id 查找 grid-cell（用于断言落点）。 */
function findCell(doc: SchemaDocument, cellId: string): GridCellV2 {
  for (const page of doc.schema.value.pages) {
    for (const child of page.children) {
      if (child.type === "grid") {
        for (const row of child.rows) {
          for (const cell of row.cells) {
            if (cell.id === cellId) return cell;
          }
        }
      }
    }
  }
  throw new Error("cell not found: " + cellId);
}

/** 构造「单元格内有一个文本组件」的场景，并选中该文本组件。 */
function withTextInCell() {
  const ctx = setup(true);
  const { doc, selection, edits } = ctx;
  const grid = doc.schema.value.pages[0].children[0] as GridNodeV2;
  const cellId = grid.rows[0].cells[0].id;
  selection.selectNodeById(cellId);
  edits.addNodeToSelectedCell("text");
  const cell = findCell(doc, cellId);
  const textId = cell.children[0].id;
  selection.selectNodeById(textId);
  return { ...ctx, cellId, textId };
}

describe("useSchemaEdits 复制/剪切/粘贴/原地复制", () => {
  it("设计态：duplicateSelected 在选中组件后插入克隆并选中它", () => {
    const { doc, selection, edits, cellId } = withTextInCell();
    const before = findCell(doc, cellId).children.length;
    const original = findCell(doc, cellId).children[0] as { text?: string };
    edits.duplicateSelected();
    const cell = findCell(doc, cellId);
    expect(cell.children).toHaveLength(before + 1);
    const clones = cell.children.filter((c) => (c as { text?: string }).text === original.text);
    expect(clones).toHaveLength(2);
    // 新选中节点是原节点之后的克隆，且 id 全新
    const selId = selection.selectedNodeId.value;
    expect(selId).toBe(cell.children[1].id);
    expect(cell.children[0].id).not.toBe(selId);
    expect(doc.canUndo.value).toBe(true);
  });

  it("设计态：copySelected 不改动 schema，只写入内存缓冲", () => {
    const { doc, edits } = withTextInCell();
    const before = doc.schema.value;
    const undoBefore = doc.canUndo.value;
    edits.copySelected();
    expect(doc.schema.value).toBe(before); // 无提交
    expect(doc.canUndo.value).toBe(undoBefore); // 不产生新撤销步
  });

  it("设计态：复制后粘贴 → 插到选中组件之后（同格）", () => {
    const { doc, edits, cellId } = withTextInCell();
    edits.copySelected();
    const before = findCell(doc, cellId).children.length;
    edits.pasteClipboard();
    const cell = findCell(doc, cellId);
    expect(cell.children).toHaveLength(before + 1);
    // 粘贴产物 id 与原组件不同（深拷贝刷新）
    expect(cell.children[0].id).not.toBe(cell.children[1].id);
    expect(doc.canUndo.value).toBe(true);
  });

  it("设计态：复制后选中单元格再粘贴 → 进该格", () => {
    const { doc, selection, edits, cellId } = withTextInCell();
    edits.copySelected();
    selection.selectNodeById(cellId); // 当前选中为 grid-cell
    const before = findCell(doc, cellId).children.length;
    edits.pasteClipboard();
    expect(findCell(doc, cellId).children).toHaveLength(before + 1);
  });

  it("设计态：cut 后选中清空，粘贴回源格（兜底落点）", () => {
    const { doc, edits, cellId } = withTextInCell();
    const before = findCell(doc, cellId).children.length; // 1
    edits.cutSelected();
    expect(findCell(doc, cellId).children).toHaveLength(before - 1); // 原件被移除
    expect(doc.canUndo.value).toBe(true);
    // 此时选中已清空、无插入槽，但 clipboardSourceCellId 记录源格
    edits.pasteClipboard();
    expect(findCell(doc, cellId).children).toHaveLength(before); // 克隆回到源格
  });

  it("非设计态：复制/剪切/粘贴/原地复制 全部 no-op（统一闸门）", () => {
    const { doc, edits, editableRef } = withTextInCell();
    editableRef.value = false; // 切到预览态
    const before = doc.schema.value;
    const undoBefore = doc.canUndo.value;
    edits.copySelected();
    edits.cutSelected();
    edits.duplicateSelected();
    edits.pasteClipboard();
    expect(doc.schema.value).toBe(before);
    expect(doc.canUndo.value).toBe(undoBefore); // 无新撤销步
  });

  it("page 与 grid-cell 不可复制/剪切/原地复制（受保护节点无副作用）", () => {
    const { doc, selection, edits } = setup(true);

    // page：selectedCopiableNode 直接返回 null，三个动作均 no-op
    const pageId = doc.schema.value.pages[0].id;
    selection.selectNodeById(pageId);
    const beforePage = doc.schema.value;
    edits.copySelected();
    edits.cutSelected();
    edits.duplicateSelected();
    expect(doc.schema.value).toBe(beforePage);
    expect(doc.canUndo.value).toBe(false);

    // grid-cell：同样受保护（无独立复制语义）
    const cellId = (doc.schema.value.pages[0].children[0] as GridNodeV2).rows[0].cells[0].id;
    selection.selectNodeById(cellId);
    const beforeCell = doc.schema.value;
    edits.copySelected();
    edits.cutSelected();
    edits.duplicateSelected();
    expect(doc.schema.value).toBe(beforeCell);
    expect(doc.canUndo.value).toBe(false);
  });
});

describe("列宽解析：不得静默兜底为 24（三十七续回归）", () => {
  function selectGrid() {
    const ctx = setup(true);
    const { doc, selection, edits } = ctx;
    const gridId = (doc.schema.value.pages[0].children[0] as GridNodeV2).id;
    selection.selectNodeById(gridId);
    return { ...ctx, gridId };
  }

  function gridOf(doc: SchemaDocument): GridNodeV2 {
    const node = doc.schema.value.pages[0].children[0];
    if (node.type !== "grid") throw new Error("not a grid");
    return node;
  }

  it("空列宽输入：回到默认 1fr，绝不写入 24", () => {
    const { doc, edits } = selectGrid();
    edits.updateGridColumnWidth(0, { target: { value: "" } } as unknown as Event);
    const grid = gridOf(doc);
    expect(grid.columns?.[0]).toBe("1fr");
    expect(grid.columns?.[0]).not.toBe(24);
  });

  it("非法列宽输入（如 abc）：不提交 schema，不误写 24", () => {
    const { doc, edits } = selectGrid();
    const before = doc.schema.value;
    edits.updateGridColumnWidth(0, { target: { value: "abc" } } as unknown as Event);
    expect(doc.schema.value).toBe(before);
    expect(doc.canUndo.value).toBe(false);
  });

  it("合法列宽（1fr / 数字）：正常提交且不变成 24", () => {
    const { doc, edits } = selectGrid();
    edits.updateGridColumnWidth(0, { target: { value: "1fr" } } as unknown as Event);
    expect(gridOf(doc).columns?.[0]).toBe("1fr");
    edits.updateGridColumnWidth(0, { target: { value: "30" } } as unknown as Event);
    expect(gridOf(doc).columns?.[0]).toBe(30);
  });

  it("列宽带 mm 单位（照标签输入 30mm）：剥离后按毫米数提交", () => {
    const { doc, edits } = selectGrid();
    edits.updateGridColumnWidth(0, { target: { value: "30mm" } } as unknown as Event);
    expect(gridOf(doc).columns?.[0]).toBe(30);
    edits.updateGridColumnWidth(0, { target: { value: "20 MM" } } as unknown as Event);
    expect(gridOf(doc).columns?.[0]).toBe(20);
  });

  it("改列数后设第二列宽度：渲染真源 columns 同步（resize 不再留 stale 长度）", () => {
    const { doc, selection, edits } = selectGrid();
    edits.updateGridDimensions({
      target: { value: "2", dataset: { dimension: "columns" } },
    } as unknown as Event);
    edits.updateGridColumnWidth(1, { target: { value: "40" } } as unknown as Event);
    const grid = gridOf(doc);
    expect(grid.columns).toHaveLength(2);
    expect(grid.columns?.[1]).toBe(40);
  });
});

describe("Table 表头样式配置（表头字号/粗细/对齐）", () => {
  function selectTable() {
    const ctx = setup(true);
    const { doc, selection, edits } = ctx;
    const grid = doc.schema.value.pages[0].children[0] as GridNodeV2;
    const cellId = grid.rows[0].cells[0].id;
    selection.selectNodeById(cellId);
    edits.addNodeToSelectedCell("table");
    const cell = findCell(doc, cellId);
    const table = cell.children.find((c) => c.type === "table") as TableNodeV2;
    selection.selectNodeById(table.id);
    return { ...ctx, tableId: table.id };
  }

  function tableOf(doc: SchemaDocument): TableNodeV2 {
    const grid = doc.schema.value.pages[0].children[0] as GridNodeV2;
    const cell = findCell(doc, grid.rows[0].cells[0].id);
    return cell.children.find((c) => c.type === "table") as TableNodeV2;
  }

  it("设置表头字号：写入 headerStyle.fontSize", () => {
    const { doc, edits } = selectTable();
    edits.updateTableHeaderFontSize({ target: { value: "14" } } as unknown as Event);
    expect(tableOf(doc).headerStyle?.fontSize).toBe(14);
  });

  it("表头字号非法/空：不静默兜底，移除覆盖（undefined，不写 1）", () => {
    const { doc, edits } = selectTable();
    edits.updateTableHeaderFontSize({ target: { value: "14" } } as unknown as Event);
    expect(tableOf(doc).headerStyle?.fontSize).toBe(14);
    edits.updateTableHeaderFontSize({ target: { value: "abc" } } as unknown as Event);
    expect(tableOf(doc).headerStyle?.fontSize).toBeUndefined();
  });

  it("设置表头粗细 / 对齐：写入 headerStyle", () => {
    const { doc, edits } = selectTable();
    edits.updateTableHeaderFontWeight({ target: { value: "bold" } } as unknown as Event);
    edits.updateTableHeaderAlign({ target: { value: "center" } } as unknown as Event);
    const h = tableOf(doc).headerStyle;
    expect(h?.fontWeight).toBe("bold");
    expect(h?.align).toBe("center");
  });

  it("非 table 节点：表头样式不生效", () => {
    const { doc, selection, edits } = selectTable();
    const grid = doc.schema.value.pages[0].children[0];
    selection.selectNodeById(grid.id);
    edits.updateTableHeaderFontSize({ target: { value: "20" } } as unknown as Event);
    expect(tableOf(doc).headerStyle).toBeUndefined();
  });
});
