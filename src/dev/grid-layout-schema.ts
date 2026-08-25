export type GridTrack = number | `${number}fr` | "auto";

export interface GridTextStyle {
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  writingMode?: "horizontal-tb" | "vertical-rl";
  whiteSpace?: "normal" | "nowrap";
}

export interface GridPNode {
  id: string;
  type: "p";
  text?: string;
  editable?: boolean;
  field?: string;
  placeholder?: string;
  underline?: boolean;
  style?: GridTextStyle;
}

export interface GridHtmlNode {
  id: string;
  type: "html";
  html: string;
}

export interface GridCell {
  id: string;
  colspan?: number;
  padding?: number;
  children: GridLayoutNode[];
}

export interface GridRow {
  id: string;
  /** 相对于 schema.baseRowHeight 的倍数。 */
  height: number;
  cells: GridCell[];
}

export interface GridNode {
  id: string;
  type: "grid";
  columns: GridTrack[];
  rows: GridRow[];
  border?: "all" | "inner" | "none";
}

export interface GridTableColumn {
  key: string;
  title: string;
  width: GridTrack;
}

export interface GridTableNode {
  id: string;
  type: "table";
  field?: string;
  columns: GridTableColumn[];
  rows: Array<Record<string, GridLayoutNode[]>>;
  rowHeight: number;
}

export type GridLayoutNode =
  | GridPNode
  | GridHtmlNode
  | GridNode
  | GridTableNode;

export interface GridLayoutSchema {
  paper: {
    size: "A4" | "A3";
    orientation: "portrait" | "landscape";
  };
  margin: number;
  baseRowHeight: number;
  title?: GridPNode;
  body: GridNode;
}
