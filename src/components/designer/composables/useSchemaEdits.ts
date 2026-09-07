/**
 * 设计器结构编辑动作：节点增删、Grid/Cell 结构、Inspector 的属性更新。
 *
 * 从 `DesignerApp.vue` 抽出（2026-09-07 批次 1 拆分）：所有「改 schema」的动作集中在此，
 * 只依赖文档句柄与选择态句柄，**不直接依赖组件实例**，可脱离 UI 单测。
 *
 * 闸门：结构性编辑统一走 `ctx.editable()`（设计态才允许），避免逐处手写守卫。
 */
import { computed, type ComputedRef } from "vue";
import {
  addTableColumnV2,
  appendNodeToCellV2,
  createFieldPNodeV2,
  createGridNodeV2,
  createHtmlNodeV2,
  createImageNodeV2,
  createTableNodeV2,
  createTextNodeV2,
  insertRootGridV2,
  mergeGridCellsV2,
  moveNodeToIndexV2,
  removeNodeV2,
  removeTableColumnV2,
  renameTableColumnKeyV2,
  resizeGridV2,
  setGridColumnWidthV2,
  splitGridCellV2,
  updateBaseRowHeightV2,
  updateGridBorderV2,
  updateGridCellDefaultsV2,
  updateGridGapV2,
  updatePaperConfigV2,
  updateSchemaNodeV2,
  updateTableBorderV2,
  updateTableColumnV2,
  updateTableMinRowsV2,
} from "@/types";
import type {
  BorderModeV2,
  EditorNodeV2,
  FieldPNodeV2,
  FormNodeV2,
  FormSchemaV2,
  GridCellV2,
  GridNodeV2,
  GridRowV2,
  GridTrackV2,
  TableColumnV2,
  TextStyleV2,
} from "@/types";
import type { SchemaDocument } from "./useSchemaDocument";
import type { NodeSelection } from "./useNodeSelection";

export type NodeKind = "text" | "field" | "table" | "html" | "image" | "grid";

export interface SchemaEditsContext {
  document: SchemaDocument;
  selection: NodeSelection;
  /** 是否允许结构性编辑（设计态）。 */
  editable: () => boolean;
  /** 结构变化后清空选中（删除 / 撤销等场景）。 */
  clearSelection: () => void;
}

export type SchemaEdits = ReturnType<typeof useSchemaEdits>;

export function useSchemaEdits(ctx: SchemaEditsContext) {
  const { schema, commit } = ctx.document;
  const {
    selectedNodeId,
    selectedNode,
    selectionPathIds,
    selectionPathIndex,
    nodeIndex,
    selectedCellContext,
    insertionSlot,
  } = ctx.selection;

  function createNodeByKind(kind: NodeKind): FormNodeV2 {
    return kind === "text"
      ? createTextNodeV2()
      : kind === "field"
        ? createFieldPNodeV2()
        : kind === "table"
          ? createTableNodeV2()
          : kind === "html"
            ? createHtmlNodeV2()
            : kind === "grid"
              ? createGridNodeV2()
              : createImageNodeV2();
  }

  function addRootGrid(): void {
    if (!ctx.editable()) return;
    const grid = createGridNodeV2();
    commit(insertRootGridV2(schema.value, grid));
    selectedNodeId.value = grid.id;
    selectionPathIds.value = [schema.value.pages[0].id, grid.id];
    selectionPathIndex.value = 1;
  }

  /** 添加 Grid：选中格存在则嵌进该格，否则退化为根追加。 */
  function addGrid(): void {
    if (!ctx.editable()) return;
    if (insertionSlot.value) {
      addNodeToSelectedCell("grid");
    } else {
      addRootGrid();
    }
  }

  function addNodeToSelectedCell(kind: NodeKind): void {
    if (!ctx.editable()) return;
    const ownerCell = insertionSlot.value;
    if (!ownerCell) return;
    const child = createNodeByKind(kind);
    commit(appendNodeToCellV2(schema.value, ownerCell.id, child));
    selectedNodeId.value = child.id;
  }

  function removeSelectedNode(): void {
    if (
      !selectedNodeId.value ||
      selectedNode.value?.type === "page" ||
      selectedNode.value?.type === "grid-cell"
    )
      return;
    commit(removeNodeV2(schema.value, selectedNodeId.value));
    ctx.clearSelection();
  }

  // ── 单元格合并 / 拆分 ──
  function mergeSelectedCellRight(): void {
    const id = selectedNodeId.value;
    const cellCtx = selectedCellContext.value;
    if (!id || !cellCtx || !cellCtx.hasNextSibling) return;
    const row = nodeIndex.value.get(id)?.parent as GridRowV2 | undefined;
    if (!row) return;
    const rightId = row.cells[cellCtx.columnIndex + 1].id;
    commit(mergeGridCellsV2(schema.value, id, rightId), `merge:${id}`);
    selectedNodeId.value = id;
  }

  function splitSelectedCell(): void {
    const id = selectedNodeId.value;
    const cellCtx = selectedCellContext.value;
    if (!id || !cellCtx || !cellCtx.canSplit) return;
    commit(splitGridCellV2(schema.value, id), `split:${id}`);
    selectedNodeId.value = id;
  }

  // ── 拖拽重排：落点判定在表面层 CanvasSurface，这里只接收语义事件并提交 schema ──
  function onCanvasNodeDragStart(id: string): void {
    selectedNodeId.value = id;
  }

  function onDropNode(detail: { moveId: string; cellId: string; index: number }): void {
    const next = moveNodeToIndexV2(schema.value, detail.moveId, detail.cellId, detail.index);
    if (next === schema.value) return; // 原位 / 非法：不产生新结构
    commit(next, "move:" + detail.moveId);
    selectedNodeId.value = detail.moveId;
  }

  function onDropPalette(detail: { kind: NodeKind; cellId: string }): void {
    const slot = nodeIndex.value.get(detail.cellId)?.node;
    if (!slot || (slot.type !== "grid-cell" && slot.type !== "table-cell-template")) return;
    const child = createNodeByKind(detail.kind);
    commit(appendNodeToCellV2(schema.value, detail.cellId, child));
    selectedNodeId.value = child.id;
  }

  function updateSelectedNode(
    updater: (node: EditorNodeV2) => EditorNodeV2,
    tag?: string,
  ): void {
    if (!selectedNodeId.value) return;
    commit(updateSchemaNodeV2(schema.value, selectedNodeId.value, updater), tag);
  }

  // ── 字段 P（含外部组件 action） ──
  function updateSelectedText(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    updateSelectedNode(
      (node) => (node.type === "text" ? { ...node, text: value } : node),
      selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedField(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    updateSelectedNode(
      (node) => (node.type === "p" && node.mode === "field" ? { ...node, field: value } : node),
      selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedPrefix(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    updateSelectedNode(
      (node) =>
        node.type === "p" && node.mode === "field"
          ? { ...node, prefix: value || undefined }
          : node,
      selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedSuffix(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    updateSelectedNode(
      (node) =>
        node.type === "p" && node.mode === "field"
          ? { ...node, suffix: value || undefined }
          : node,
      selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedWidth(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    updateSelectedNode(
      (node) =>
        node.type === "p" && node.mode === "field"
          ? { ...node, width: value.trim() || undefined }
          : node,
      selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedDefault(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    updateSelectedNode(
      (node) =>
        node.type === "p" && node.mode === "field"
          ? { ...node, default: value || undefined }
          : node,
      selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedInnerBorder(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    updateSelectedNode(
      (node) =>
        node.type === "p" && node.mode === "field"
          ? { ...node, innerBorder: checked || undefined }
          : node,
      selectedNodeId.value ? `edit:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedAction(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as FieldPNodeV2["action"];
    updateSelectedNode(
      (node) =>
        node.type === "p" && node.mode === "field" ? { ...node, action: value || undefined } : node,
      selectedNodeId.value ? `action:${selectedNodeId.value}` : undefined,
    );
  }

  /** 图形安措（action=safetyGraphic）的「安措匹配字段」：写入 actionParams.matchField。 */
  function updateSelectedSafetyField(event: Event): void {
    const raw = (event.target as HTMLInputElement).value.trim();
    updateSelectedNode(
      (node) => {
        if (node.type !== "p" || node.mode !== "field") return node;
        const params: Record<string, string> = { ...(node.actionParams ?? {}) };
        if (raw) params.matchField = raw;
        else delete params.matchField;
        return {
          ...node,
          actionParams: Object.keys(params).length ? params : undefined,
        };
      },
      selectedNodeId.value ? `actionParams:${selectedNodeId.value}` : undefined,
    );
  }

  // ── Grid / Table 结构 ──
  function updateGridBorder(event: Event): void {
    if (selectedNode.value?.type !== "grid") return;
    commit(
      updateGridBorderV2(
        schema.value,
        selectedNode.value.id,
        (event.target as HTMLSelectElement).value as BorderModeV2,
      ),
    );
  }

  function updateTableBorder(event: Event): void {
    if (selectedNode.value?.type !== "table") return;
    commit(
      updateTableBorderV2(
        schema.value,
        selectedNode.value.id,
        (event.target as HTMLSelectElement).value as BorderModeV2,
      ),
    );
  }

  function updateGridDimensions(event: Event): void {
    if (selectedNode.value?.type !== "grid") return;
    const input = event.target as HTMLInputElement;
    const value = Math.max(1, Math.floor(Number(input.value) || 1));
    const rowCount =
      input.dataset.dimension === "rows" ? value : selectedNode.value.rows.length;
    const columnCount =
      input.dataset.dimension === "columns"
        ? value
        : (selectedNode.value.rows[0]?.cells.length ?? 1);
    commit(resizeGridV2(schema.value, selectedNode.value.id, rowCount, columnCount));
  }

  function updateTableRows(event: Event): void {
    if (selectedNode.value?.type !== "table") return;
    commit(
      updateTableMinRowsV2(
        schema.value,
        selectedNode.value.id,
        Number((event.target as HTMLInputElement).value),
      ),
    );
  }

  function addTableColumn(): void {
    if (selectedNode.value?.type !== "table") return;
    commit(addTableColumnV2(schema.value, selectedNode.value.id));
  }

  function removeTableColumn(columnKey: string): void {
    if (selectedNode.value?.type !== "table") return;
    commit(removeTableColumnV2(schema.value, selectedNode.value.id, columnKey));
  }

  function renameTableColumnKey(oldKey: string, event: Event): void {
    if (selectedNode.value?.type !== "table") return;
    const newKey = (event.target as HTMLInputElement).value.trim();
    if (!newKey || newKey === oldKey) return;
    commit(renameTableColumnKeyV2(schema.value, selectedNode.value.id, oldKey, newKey));
  }

  function updateTableColumn(
    columnKey: string,
    field: "title" | "width" | "align",
    event: Event,
  ): void {
    if (selectedNode.value?.type !== "table") return;
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const patch: Partial<TableColumnV2> =
      field === "width"
        ? { width: parseColumnWidth(target.value) }
        : ({ [field]: target.value || undefined } as Partial<TableColumnV2>);
    commit(
      updateTableColumnV2(schema.value, selectedNode.value.id, columnKey, patch),
      `tblcol:${columnKey}:${field}`,
    );
  }

  function parseColumnWidth(raw: string): GridTrackV2 {
    const value = raw.trim().toLowerCase();
    if (value === "auto") return "auto";
    if (/^\d+(\.\d+)?fr$/.test(value)) return value as `${number}fr`;
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 24;
  }

  function updateGridColumnWidth(columnIndex: number, event: Event): void {
    if (selectedNode.value?.type !== "grid") return;
    commit(
      setGridColumnWidthV2(
        schema.value,
        selectedNode.value.id,
        columnIndex,
        parseColumnWidth((event.target as HTMLInputElement).value),
      ),
      `col:${selectedNode.value.id}:${columnIndex}`,
    );
  }

  // ── Grid 级单元格默认 ──
  function updateGridCellDefault(
    field: "cellPadding" | "cellAlign" | "cellVerticalAlign",
    event: Event,
  ): void {
    if (selectedNode.value?.type !== "grid") return;
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const raw = target.value;
    const patch =
      field === "cellPadding"
        ? { cellPadding: raw === "" ? undefined : Math.max(0, Number(raw) || 0) }
        : ({ [field]: raw === "" ? undefined : raw } as Partial<
            Pick<GridNodeV2, "cellAlign" | "cellVerticalAlign">
          >);
    commit(updateGridCellDefaultsV2(schema.value, selectedNode.value.id, patch), `gridcell:${field}`);
  }

  /** 设置 Grid 单元格间距（mm，等价于 CSS gap，同时作用于行与列）。 */
  function updateGridGap(event: Event): void {
    if (selectedNode.value?.type !== "grid") return;
    const raw = (event.target as HTMLInputElement).value;
    const gap = raw === "" ? undefined : Math.max(0, Number(raw) || 0);
    commit(updateGridGapV2(schema.value, selectedNode.value.id, gap), "gridgap");
  }

  // ── 单元格（grid-cell）覆盖 ──
  function updateSelectedCellPadding(event: Event): void {
    const value = Math.max(0, Number((event.target as HTMLInputElement).value) || 0);
    updateSelectedNode(
      (node) => (node.type === "grid-cell" ? { ...node, padding: value } : node),
      selectedNodeId.value ? `cellpad:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedCellAlign(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    updateSelectedNode(
      (node) =>
        node.type === "grid-cell"
          ? { ...node, align: (raw || undefined) as GridCellV2["align"] }
          : node,
      selectedNodeId.value ? `cellalign:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedCellVerticalAlign(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    updateSelectedNode(
      (node) =>
        node.type === "grid-cell"
          ? {
              ...node,
              verticalAlign: (raw || undefined) as GridCellV2["verticalAlign"],
            }
          : node,
      selectedNodeId.value ? `cellvalign:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedCellRowHeight(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === "" ? undefined : Math.max(0, Math.floor(Number(raw)));
    updateSelectedNode(
      (node) => (node.type === "grid-cell" ? { ...node, rowHeight: value } : node),
      selectedNodeId.value ? `cellrowh:${selectedNodeId.value}` : undefined,
    );
  }

  function clearCellOverride(): void {
    updateSelectedNode(
      (node) =>
        node.type === "grid-cell"
          ? {
              ...node,
              padding: undefined,
              align: undefined,
              verticalAlign: undefined,
              rowHeight: undefined,
            }
          : node,
      selectedNodeId.value ? `cellclear:${selectedNodeId.value}` : undefined,
    );
  }

  // ── 文本样式（text / p 共用） ──
  function updateSelectedTextStyle(patch: Partial<TextStyleV2>): void {
    updateSelectedNode(
      (node) =>
        node.type === "p" || node.type === "text"
          ? { ...node, style: { ...node.style, ...patch } }
          : node,
      selectedNodeId.value ? `style:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedFontSize(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    updateSelectedTextStyle({ fontSize: Math.max(1, Math.floor(Number(raw) || 1)) });
  }

  function updateSelectedLineHeight(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    updateSelectedTextStyle({
      lineHeight: Number.isFinite(value) && value > 0 ? value : undefined,
    });
  }

  function updateSelectedFontWeight(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    updateSelectedTextStyle({
      fontWeight: (value || undefined) as "normal" | "bold" | undefined,
    });
  }

  function updateSelectedColor(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    updateSelectedTextStyle({ color: value || undefined });
  }

  function updateSelectedFontFamily(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    updateSelectedTextStyle({ fontFamily: value || undefined });
  }

  function updateSelectedAlign(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    updateSelectedTextStyle({
      align: (value || undefined) as "left" | "center" | "right" | undefined,
    });
  }

  function updateSelectedVerticalAlign(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    updateSelectedTextStyle({
      verticalAlign: (value || undefined) as "top" | "middle" | "bottom" | undefined,
    });
  }

  // ── HTML / Image ──
  function updateSelectedHtml(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    updateSelectedNode(
      (node) => (node.type === "html" ? { ...node, html: value } : node),
      selectedNodeId.value ? `html:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedCss(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    updateSelectedNode(
      (node) => (node.type === "html" ? { ...node, css: value || undefined } : node),
      selectedNodeId.value ? `css:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedImageSrc(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    updateSelectedNode(
      (node) => (node.type === "image" ? { ...node, src: value || undefined } : node),
      selectedNodeId.value ? `imgsrc:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedImageField(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    updateSelectedNode(
      (node) => (node.type === "image" ? { ...node, field: value || undefined } : node),
      selectedNodeId.value ? `imgfield:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedImageSize(dimension: "width" | "height", event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    updateSelectedNode(
      (node) =>
        node.type === "image"
          ? { ...node, [dimension]: Number.isFinite(value) && value > 0 ? value : undefined }
          : node,
      selectedNodeId.value ? `imgsize:${selectedNodeId.value}` : undefined,
    );
  }

  function updateSelectedImageFit(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as "contain" | "cover" | "fill";
    updateSelectedNode(
      (node) => (node.type === "image" ? { ...node, objectFit: value } : node),
      selectedNodeId.value ? `imgfit:${selectedNodeId.value}` : undefined,
    );
  }

  // ── 页面级：行高 / 纸张 ──
  function updateBaseRowHeight(event: Event): void {
    const value = Math.max(1, Math.floor(Number((event.target as HTMLInputElement).value) || 8));
    commit(updateBaseRowHeightV2(schema.value, value));
  }

  function updatePaperSize(event: Event): void {
    const size = (event.target as HTMLSelectElement).value as FormSchemaV2["paper"]["size"];
    // 方向自 P11-3 起由纸张尺寸派生（A4→纵向、A3→横向），渲染与打印均忽略 `orientation`
    // 字段（已置为可选废弃键）。仅更新 size，旧 orientation 在内存中置 undefined，序列化导出自然丢弃。
    commit(updatePaperConfigV2(schema.value, { size }));
  }

  /** 纸张边距（mm）：统一作用于四边，展示为单一数值（取首页 top）。 */
  const paperMargin: ComputedRef<number> = computed(() => schema.value.pages[0]?.margin.top ?? 10);

  function updatePaperMargin(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const value = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    commit({
      ...schema.value,
      pages: schema.value.pages.map((page) => ({
        ...page,
        margin: { top: value, right: value, bottom: value, left: value },
      })),
    });
  }

  return {
    addRootGrid,
    addGrid,
    addNodeToSelectedCell,
    removeSelectedNode,
    mergeSelectedCellRight,
    splitSelectedCell,
    onCanvasNodeDragStart,
    onDropNode,
    onDropPalette,
    updateSelectedNode,
    updateSelectedText,
    updateSelectedField,
    updateSelectedPrefix,
    updateSelectedSuffix,
    updateSelectedWidth,
    updateSelectedDefault,
    updateSelectedInnerBorder,
    updateSelectedAction,
    updateSelectedSafetyField,
    updateGridBorder,
    updateTableBorder,
    updateGridDimensions,
    updateTableRows,
    addTableColumn,
    removeTableColumn,
    renameTableColumnKey,
    updateTableColumn,
    updateGridColumnWidth,
    updateGridCellDefault,
    updateGridGap,
    updateSelectedCellPadding,
    updateSelectedCellAlign,
    updateSelectedCellVerticalAlign,
    updateSelectedCellRowHeight,
    clearCellOverride,
    updateSelectedTextStyle,
    updateSelectedFontSize,
    updateSelectedLineHeight,
    updateSelectedFontWeight,
    updateSelectedColor,
    updateSelectedFontFamily,
    updateSelectedAlign,
    updateSelectedVerticalAlign,
    updateSelectedHtml,
    updateSelectedCss,
    updateSelectedImageSrc,
    updateSelectedImageField,
    updateSelectedImageSize,
    updateSelectedImageFit,
    updateBaseRowHeight,
    updatePaperSize,
    paperMargin,
    updatePaperMargin,
  };
}
