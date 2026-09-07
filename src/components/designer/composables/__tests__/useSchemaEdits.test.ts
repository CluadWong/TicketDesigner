/**
 * 结构编辑 composable 单测（2026-09-07 批次 1 拆分）：验证编辑闸门与提交接线。
 *
 * 关注点不是每个 Inspector 字段（那仍由 DesignerApp.test.ts 经 DOM 覆盖），
 * 而是：① 非设计态一切结构编辑被闸门挡住；② 编辑动作确实落到文档并进入历史。
 */
import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useSchemaDocument } from "../useSchemaDocument";
import { useNodeSelection } from "../useNodeSelection";
import { useSchemaEdits } from "../useSchemaEdits";

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
