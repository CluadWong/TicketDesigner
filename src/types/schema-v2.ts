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
  /** 废弃键：方向自 P11-3 起由纸张尺寸派生（A4→纵向、A3→横向），渲染与打印均忽略本字段。
   *  保留为可选仅为存量模板向后兼容；新模板不再写入，序列化导出自然丢弃。 */
  orientation?: OrientationV2;
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
  whiteSpace?: "normal" | "nowrap" | "pre-wrap";
  /** 文字颜色（CSS color）。仅用于渲染，不影响字段语义。 */
  color?: string;
  /** 字体族（CSS font-family）。 */
  fontFamily?: string;
}

export interface SchemaNodeBaseV2 {
  id: string;
}

/**
 * 固定文字节点（text 类型，标题 / 标签 / 说明等）。
 * 与可输入字段的 `p` 节点彻底分离：text 不进入字段数据、不参与填写回写，
 * 仅用于静态展示，可在设计器配置多行文本与文本样式。
 */
export interface TextNodeV2 extends SchemaNodeBaseV2 {
  type: "text";
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
  /** 外部组件触发类型（选项值）：由宿主弹窗调用、在回调里把数据回写 data 再渲染到票面上。
   *  text=无（纯文本输入）、date=日期选择器、signature=签名板、upload=文件上传、
   *  safetyGraphic=图形安措（选中后需在 `actionParams.matchField` 指定匹配字段）。 */
  action?: "text" | "date" | "signature" | "upload" | "safetyGraphic";
  /** 外部组件的额外参数（含义由 `action` 决定）。图形安措用 `matchField` 指定要匹配的字段名。 */
  actionParams?: Record<string, string>;
  underline?: boolean;
  webUnderline?: boolean;
  printUnderline?: boolean;
  /** 字段宽度（CSS 长度字符串，支持 mm / px / % 等，如 "30mm"、"120px"、"50%"）。
   *  缺省时不限制宽度（沿用父容器 100%）。 */
  width?: string;
  /** 字段默认内容：无填写数据时的预设文本，支持多行（`\n`）。 */
  default?: string;
  /** 内部边框：为 p 标签内每一行（回车生成的 div）显示底边框。
   *  默认不显示；勾选后设计态 / 预览 / 打印均保持显示。 */
  innerBorder?: boolean;
  style?: TextStyleV2;
}

export type PNodeV2 = FieldPNodeV2;

export interface GridNodeV2 extends SchemaNodeBaseV2 {
  type: "grid";
  border: BorderModeV2;
  rows: GridRowV2[];
  style?: BoxStyleV2;
  /** 列宽规范（按逻辑列顺序）。渲染时所有行共用同一组列轨，使跨列合并（colspan）
   *  在任意列宽下都能正确对齐。缺省时渲染器回退到逐格 cell.width（旧数据兼容）。 */
  columns?: GridTrackV2[];
  /** 单元格默认内边距（mm）。子 cell 未单独设置 padding 时继承此值，缺省为 0。 */
  cellPadding?: number;
  /** 单元格默认水平对齐。子 cell 未单独设置 align 时继承此值。 */
  cellAlign?: "left" | "center" | "right";
  /** 单元格默认垂直对齐。子 cell 未单独设置 verticalAlign 时继承此值。 */
  cellVerticalAlign?: "top" | "middle" | "bottom";
  /**
   * 单元格间距（mm，非负）：同时作用于**行与行之间**与**列与列之间**，
   * 等价于 CSS `gap`。缺省为 0（单元格紧贴，分隔线相接）。
   * 注意：间距会让内部边框线之间出现等距空隙（每格只画自己的单边，间隙留白）。
   */
  gap?: number;
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
  /** 单元格行高倍数（覆盖所在 Grid 行的 height）；不设置时继承 Grid 行高。 */
  rowHeight?: number;
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
  minRows: number;
  rowTemplate: TableCellTemplateV2[];
  /** 边框模式（与 Grid 一致）：all=外框+内部线（默认）、inner=仅内部线、outer=仅外框、none=无。 */
  border?: BorderModeV2;
  /**
   * 分页引擎内部字段（2026-09-03 廿一续）：跨页切分时，本片段最多渲染的数据行数。
   * 仅由 `paginateTable` 写入，渲染层 `GridSchemaNode.vue` 用它限制 `v-for` 行范围。
   * 未设置或 ≤0 时渲染全部行（= 不限制，与未分页时一致）。
   * 序列化/校验层忽略此字段（不在用户 JSON 中出现）。
   */
  _paginateMaxRows?: number;
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
  | TextNodeV2
  | TableNodeV2
  | HtmlNodeV2
  | ImageNodeV2;

/** 表单数据：字段名 -> 值。渲染时用于原地填充字段节点（见 engine.md §11）。 */
export type FormDataV2 = Record<string, string | number | boolean | null>;

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

/** 纸张边长（mm）：short=短边，long=长边。渲染纸张、打印 `@page size`、溢出校验共用同一份，
 *  避免各处硬编码「A4 = 210×297」（历史上 `@page` 写死 A4，导致选 A3 时打印被裁）。 */
export const PAPER_SIDE_MM: Record<PaperSizeV2, { short: number; long: number }> = {
  A4: { short: 210, long: 297 },
  A3: { short: 297, long: 420 },
};

export interface ResolvedPaperSizeV2 {
  size: PaperSizeV2;
  /** 方向由纸张尺寸派生（无独立方向选择）：A4 → 纵向，A3 → 横向。 */
  orientation: OrientationV2;
  widthMm: number;
  heightMm: number;
}

/**
 * 解析纸张物理尺寸（mm）。渲染纸张宽度/最小高度、打印 `@page size`、页面溢出校验
 * 三处统一调用本函数，保证「屏幕上看到多大纸、打印出来就是多大纸」。
 */
export function resolvePaperSizeV2(paper: PaperConfigV2): ResolvedPaperSizeV2 {
  const size: PaperSizeV2 = paper?.size === "A3" ? "A3" : "A4";
  const sides = PAPER_SIDE_MM[size];
  const orientation: OrientationV2 = size === "A3" ? "landscape" : "portrait";
  return orientation === "portrait"
    ? { size, orientation, widthMm: sides.short, heightMm: sides.long }
    : { size, orientation, widthMm: sides.long, heightMm: sides.short };
}
