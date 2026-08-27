/**
 * V2 固定版式表单 Schema。
 *
 * V2 使用嵌套结构作为持久化和渲染格式：Page -> Grid -> Row -> Cell -> children。
 * 设计器运行时可以从这棵树派生节点索引，但索引不写入 Schema。
 */

export type PaperSizeV2 = "A4" | "A3";
export type OrientationV2 = "portrait" | "landscape";
export type PageModeV2 = "fixed";
export type GridTrackV2 = number | `${number}fr` | "auto";
export type BorderModeV2 = "all" | "outer" | "inner" | "none";

export interface PaperConfigV2 {
  size: PaperSizeV2;
  orientation: OrientationV2;
}

export interface EdgeInsetsV2 {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoxStyleV2 {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface TextStyleV2 {
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  fontSize?: number;
  lineHeight?: number;
  fontWeight?: "normal" | "bold";
  writingMode?: "horizontal-tb" | "vertical-rl";
  whiteSpace?: "normal" | "nowrap";
}

export interface SchemaNodeBaseV2 {
  id: string;
}

export interface StaticPNodeV2 extends SchemaNodeBaseV2 {
  type: "p";
  mode: "static";
  text: string;
  style?: TextStyleV2;
}

export interface FieldPNodeV2 extends SchemaNodeBaseV2 {
  type: "p";
  mode: "field";
  field: string;
  /** Optional inline label rendered before the input area. */
  prefix?: string;
  /** Optional inline label rendered after the input area. */
  suffix?: string;
  inputType?: "text" | "number" | "date" | "signature";
  underline?: boolean;
  webUnderline?: boolean;
  printUnderline?: boolean;
  style?: TextStyleV2;
}

export type PNodeV2 = StaticPNodeV2 | FieldPNodeV2;

export interface GridNodeV2 extends SchemaNodeBaseV2 {
  type: "grid";
  border: BorderModeV2;
  rows: GridRowV2[];
  style?: BoxStyleV2;
}

export interface GridRowV2 extends SchemaNodeBaseV2 {
  type: "grid-row";
  /** 相对于 FormSchemaV2.baseRowHeight 的固定倍数。 */
  height: number;
  cells: GridCellV2[];
}

export interface GridCellV2 extends SchemaNodeBaseV2 {
  type: "grid-cell";
  width?: GridTrackV2;
  colspan?: number;
  padding?: number;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  children: FormNodeV2[];
}

export interface TableColumnV2 {
  key: string;
  title: string;
  width?: GridTrackV2;
  align?: "left" | "center" | "right";
}

export interface TableCellTemplateV2 extends SchemaNodeBaseV2 {
  type: "table-cell-template";
  columnKey: string;
  children: FormNodeV2[];
}

export interface TableNodeV2 extends SchemaNodeBaseV2 {
  type: "table";
  field?: string;
  columns: TableColumnV2[];
  headerHeight: number;
  rowHeight: number;
  minRows: number;
  repeatable: boolean;
  rowTemplate: TableCellTemplateV2[];
}

export interface HtmlNodeV2 extends SchemaNodeBaseV2 {
  type: "html";
  /** HTML 片段，配置期即要求不含 <script>/on* 等脚本；渲染前仍由引擎统一清洗（见 engine.md §11） */
  html: string;
  /** 仅在 Shadow DOM 内生效，不污染表单样式 */
  css?: string;
}

export interface ImageNodeV2 extends SchemaNodeBaseV2 {
  type: "image";
  src?: string;
  field?: string;
  width?: number;
  height?: number;
  objectFit?: "contain" | "cover" | "fill";
}

export type FormNodeV2 =
  | GridNodeV2
  | PNodeV2
  | TableNodeV2
  | HtmlNodeV2
  | ImageNodeV2;

/** Persisted component nodes. Rows/cells/templates are owned layout records. */
export type SchemaNodeV2 = PageSchemaV2 | FormNodeV2;

export type LayoutNodeV2 = GridRowV2 | GridCellV2 | TableCellTemplateV2;
export type EditorNodeV2 = SchemaNodeV2 | LayoutNodeV2;

/** Returns true for nodes that can be selected and edited as components. */
export function isSelectableSchemaNodeV2(
  node: EditorNodeV2 | undefined,
): node is SchemaNodeV2 {
  return Boolean(node && node.type !== "grid-row" && node.type !== "grid-cell" && node.type !== "table-cell-template");
}

export interface PageSchemaV2 extends SchemaNodeBaseV2 {
  type: "page";
  mode: PageModeV2;
  margin: EdgeInsetsV2;
  children: FormNodeV2[];
}

export interface FormSchemaV2 {
  version: 2;
  paper: PaperConfigV2;
  baseRowHeight: number;
  pages: PageSchemaV2[];
}
