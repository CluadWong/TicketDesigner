/**
 * Schema V2 分页引擎（DOM 无关、确定性）。
 *
 * 背景：原 `GridFormRenderer` 用纸张 `min-height` 渲染单个逻辑页，内容超高时只是
 * 在单页内继续向下撑开，看不出「超出纸张高度应换页」的效果。本引擎在** Schema 层**
 * 把每个逻辑 `PageSchemaV2` 的内容流切成若干「物理页」——每页只承载能在纸张正文区
 * （纸张高 − 上/下边距）内放下的节点/网格片段，超高部分流向下一页。
 *
 * 为什么在 Schema 层而不是 DOM 测量层：
 * 固定版式表单里 Grid 的每一行高度是确定性值（`row.height × baseRowHeight` mm，
 * cell.rowHeight 可覆盖所在行高），无需渲染后测量即可得到精确行高。因此本引擎对 Grid
 * 做**精确、可测试**的逐行切分；对 Text/Image/Html/Table 这类内容高度不确定的节点，
 * 用启发式估算（并可注入 DOM 测量回调 `measureNode` 提升精度），整块落页或整体换页。
 *
 * 旧版 v1 引擎（`src/engine`，基于 DOM 测量 + FormSchema/Component 旧模型）已于
 * 2026-09-02 十八续删除；本文件是全项目**唯一**的分页实现。
 *
 * 切分语义：
 * - Grid 可跨页：按行边界切；首个片段保留上边框、末片段保留下边框，中间片段用
 *   `suppressBorders` 抑制上/下边框，使多页连起来像一张被「拆开」的连续表格。
 * - 其它节点为原子块：当前页放得下就放，放不下（且本页已有内容）就换页；单个节点比整页还高
 *   则强制放入并产出 warning（渲染层 overflow 兜底）。
 *
 * 输出 `PhysicalPage[]` 直接喂给渲染层：每个物理页对应一个 `<main class="grid-form-paper">`
 * ，其 `children` 是要渲染的节点/网格片段（`FormNodeV2`，片段即裁剪了 rows 的 GridNodeV2）。
 */

import type {
  EdgeInsetsV2,
  FormDataV2,
  FormNodeV2,
  FormSchemaV2,
  GridNodeV2,
  GridRowV2,
  PageSchemaV2,
  ResolvedPaperSizeV2,
} from "@/types";
import { resolveGridGapV2, resolvePaperSizeV2, resolveTableRowCount } from "@/types";

/** 1px（96DPI 下）换算成 mm，用于外框边框占用的高度。 */
const ONE_PX_MM = 1 / (96 / 25.4); // ≈ 0.264583mm

/** 该 Grid 是否绘制外框（all / outer 才有容器边框）。 */
function drawsOuterFrame(grid: GridNodeV2): boolean {
  return grid.border === "all" || grid.border === "outer";
}

/**
 * 单行高度（mm）。行高 = `max(row.height, 该行任意 cell.rowHeight 覆盖值) × baseRowHeight`，
 * 与 `GridSchemaNode.gridRowStyle` 的 `min-height: row.height * baseRowHeight` 以及
 * cell 的 `min-height: cell.rowHeight * baseRowHeight`（行容器按最高单元格撑开）一致。
 */
export function gridRowHeightMm(
  baseRowHeight: number,
  row: GridRowV2,
): number {
  let factor = row.height;
  for (const cell of row.cells) {
    if (
      typeof cell.rowHeight === "number" &&
      Number.isFinite(cell.rowHeight) &&
      cell.rowHeight > factor
    ) {
      factor = cell.rowHeight;
    }
  }
  return factor * baseRowHeight;
}

/**
 * 一段连续 Grid 行的渲染高度（mm），含行间距与（未抑制的）外框上下边框。
 * @param rows 该片段包含的行（连续）
 * @param suppressTop 是否抑制上边框（非首片段时连续外观用）
 * @param suppressBottom 是否抑制下边框（非末片段时连续外观用）
 */
export function gridFragmentHeightMm(
  baseRowHeight: number,
  grid: GridNodeV2,
  rows: GridRowV2[],
  suppressTop: boolean,
  suppressBottom: boolean,
): number {
  const gap = resolveGridGapV2(grid);
  let h = 0;
  rows.forEach((row, idx) => {
    if (idx > 0) h += gap;
    h += gridRowHeightMm(baseRowHeight, row);
  });
  if (drawsOuterFrame(grid)) {
    if (!suppressTop) h += ONE_PX_MM;
    if (!suppressBottom) h += ONE_PX_MM;
  }
  return h;
}

/** Text 节点估算高度（mm）：按内容宽度估算每行字符数，逐段统计行数 × 行高。 */
function textHeightMm(node: Extract<FormNodeV2, { type: "text" }>, contentWidthMm: number): number {
  const fontSize = node.style?.fontSize ?? 13;
  const lineHeight = node.style?.lineHeight ?? 1.35;
  const lineHeightMm = (fontSize * lineHeight) / (96 / 25.4);
  const avgCharMm = Math.max(0.1, (fontSize * 0.6) / (96 / 25.4));
  const charsPerLine = Math.max(1, Math.floor(contentWidthMm / avgCharMm));
  let lines = 0;
  for (const seg of node.text.split("\n")) {
    lines += Math.max(1, Math.ceil(seg.length / charsPerLine));
  }
  return lines * lineHeightMm;
}

/** Image 节点估算高度（mm）：有 height 用 height；仅有 width 时按正方形兜底；都没有用一行基准高。 */
function imageHeightMm(node: Extract<FormNodeV2, { type: "image" }>, baseRowHeight: number): number {
  if (typeof node.height === "number" && Number.isFinite(node.height) && node.height > 0) {
    return node.height;
  }
  if (typeof node.width === "number" && Number.isFinite(node.width) && node.width > 0) {
    return node.width;
  }
  return baseRowHeight;
}

/** Table 节点估算高度（mm）：表头 1 行 + 数据行（minRows 或 data 推导）× baseRowHeight + 外框。 */
function tableHeightMm(
  node: Extract<FormNodeV2, { type: "table" }>,
  baseRowHeight: number,
  data: FormDataV2 | null | undefined,
): number {
  const rows = resolveTableRowCount(node, data);
  let h = (1 + rows) * baseRowHeight;
  if (node.border === "all" || node.border === "outer") h += 2 * ONE_PX_MM;
  return h;
}

/** 单个原子节点（非 Grid）的估算高度（mm）。 */
function atomicNodeHeightMm(
  node: FormNodeV2,
  ctx: PaginateContext,
): number {
  if (ctx.measureNode) {
    const measured = ctx.measureNode(node);
    if (typeof measured === "number" && Number.isFinite(measured)) return measured;
  }
  switch (node.type) {
    case "grid":
      // 整 Grid 高度（无抑制边框）
      return gridFragmentHeightMm(ctx.baseRowHeight, node, node.rows, false, false);
    case "image":
      return imageHeightMm(node, ctx.baseRowHeight);
    case "text":
      return textHeightMm(node, ctx.contentWidthMm);
    case "table":
      return tableHeightMm(node, ctx.baseRowHeight, ctx.data);
    case "html":
      // Html 内容高度不可知，按一行基准高估算并提示（可注入 measureNode 提升精度）
      return ctx.baseRowHeight;
    case "p":
      // 字段 P 在 Grid 外通常占一行；按基准行高估算
      return ctx.baseRowHeight;
  }
}

/** 分页上下文（高度计算所需的一切）。 */
export interface PaginateContext {
  /** 表单基准行高（mm）。 */
  baseRowHeight: number;
  /** 正文内容区宽度（mm）= 纸张宽 − 左/右边距，用于 Text 折行估算。 */
  contentWidthMm: number;
  /** 正文可用高（mm）= 纸张高 − 上/下边距。 */
  bodyHeightMm: number;
  /** 填写数据（Table 行数推导用），缺省为 null。 */
  data?: FormDataV2 | null;
  /** 可选 DOM 测量回调：返回节点精确高度（mm）或 undefined 走启发式。 */
  measureNode?: (node: FormNodeV2) => number | undefined;
}

/** 物理页中的一个子项（节点，或裁剪了 rows 的 Grid 片段）。 */
export interface PhysicalPageChild {
  node: FormNodeV2;
  /** 该片段需抑制的边框侧（Grid 跨页连续外观用）。 */
  suppressBorders?: { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
}

/** 一个物理页（对应渲染层一个 `<main class="grid-form-paper">`）。 */
export interface PhysicalPage {
  /** 物理页稳定 id（基于来源逻辑页 id + 序号）。 */
  id: string;
  /** 来源逻辑页 id。 */
  sourcePageId: string;
  /** 在来源逻辑页内的序号（0-based）。 */
  sourceIndex: number;
  /** 整篇文档内的全局物理页序号（1-based，由 paginateSchema 回填）。 */
  index: number;
  /** 该物理页使用的页边距（等于来源逻辑页边距）。 */
  margin: EdgeInsetsV2;
  /** 需渲染的节点/片段。 */
  children: PhysicalPageChild[];
}

/** 分页告警（内容超高被裁剪等）。 */
export interface PaginateWarning {
  nodeId: string;
  message: string;
}

/** 分页结果。 */
export interface PaginateResult {
  pages: PhysicalPage[];
  warnings: PaginateWarning[];
}

/**
 * 分页单个逻辑页，得到 0..N 个物理页。
 * @param page 逻辑页
 * @param opts 分页上下文
 */
export function paginatePage(page: PageSchemaV2, opts: PaginateContext): PaginateResult {
  const warnings: PaginateWarning[] = [];
  const bodyH = Math.max(1, opts.bodyHeightMm);
  const pages: PhysicalPage[] = [];

  // 当前正在构建的物理页（用闭包变量持有，避免对象引用重赋值陷阱）
  let curChildren: PhysicalPageChild[] = [];
  let curUsed = 0;

  const flush = (): void => {
    if (curChildren.length > 0) {
      // 首个物理页复用逻辑页 id（保证 1:1 场景下与旧渲染结构逐字节一致，兼容快照/选择）；
      // 后续片段用合成 id，避免与首个或下一逻辑页冲突。
      const isFirstPhysical = pages.length === 0;
      pages.push({
        id: isFirstPhysical ? page.id : `${page.id}__pp${pages.length}`,
        sourcePageId: page.id,
        sourceIndex: pages.length,
        index: 0,
        margin: page.margin,
        children: curChildren,
      });
      curChildren = [];
      curUsed = 0;
    }
  };

  /** 当前页能否放下高度 h 的块（空页时只要 h≤bodyH 即可）。 */
  const fits = (h: number): boolean => curUsed + h <= bodyH + 1e-6;

  const push = (child: PhysicalPageChild): void => {
    curChildren.push(child);
    curUsed += atomicNodeHeightMm(child.node, opts);
  };

  const paginateAtomic = (node: FormNodeV2): void => {
    const h = atomicNodeHeightMm(node, opts);
    if (!fits(h)) {
      flush();
      if (!fits(h)) {
        warnings.push({
          nodeId: node.id,
          message: `节点（${node.type}）高度约 ${h.toFixed(1)}mm 超过单页可用高 ${bodyH.toFixed(1)}mm，已溢出裁剪`,
        });
      }
    }
    push({ node });
  };

  const paginateGrid = (grid: GridNodeV2): void => {
    const fullH = gridFragmentHeightMm(opts.baseRowHeight, grid, grid.rows, false, false);
    // 整 Grid 能放进当前页剩余空间 → 直接放
    if (fits(fullH)) {
      push({ node: grid });
      return;
    }
    // 放不下 → 跨页逐行切分：首个片段先填满当前页剩余空间，余下行流转到后续物理页。
    // （即便当前页已有内容，也优先把能塞下的前几行留在当前页，避免内容被整体推到下一页而留白。）
    splitGrid(grid);
  };

  const splitGrid = (grid: GridNodeV2): void => {
    const rows = grid.rows;
    const gap = resolveGridGapV2(grid);
    const bordered = drawsOuterFrame(grid);
    let i = 0;
    let isFirstFragment = true;

    while (i < rows.length) {
      const suppressTop = !isFirstFragment;
      // 当前页可用高
      let avail = bodyH - curUsed;

      let j = i;
      let acc = suppressTop || !bordered ? 0 : ONE_PX_MM; // 片段上边框（首片段且带框时计入）
      let placed = 0;
      while (j < rows.length) {
        const rowH = gridRowHeightMm(opts.baseRowHeight, rows[j]);
        const add = (placed > 0 ? gap : 0) + rowH;
        // 若该片段到此为止（j 是最后一行）→ 末片段需留底边框；否则中间片段无底边框
        const wouldBeLastFragment = j + 1 >= rows.length;
        const reserve = wouldBeLastFragment && bordered ? ONE_PX_MM : 0;
        if (acc + add + reserve <= avail + 1e-6) {
          acc += add;
          placed++;
          j++;
        } else {
          break;
        }
      }

      // 一行都放不下（该行比可用高还高，或本页剩余空间极小）→ 强制换页放至少一行
      if (placed === 0) {
        if (curChildren.length > 0) flush();
        const st = !isFirstFragment;
        const sb = i + 1 < rows.length; // 还有后续行 → 抑制底边框（连续）
        const fragH = gridFragmentHeightMm(opts.baseRowHeight, grid, rows.slice(i, i + 1), st, sb);
        if (fragH > bodyH + 1e-6) {
          warnings.push({
            nodeId: grid.id,
            message: `Grid 第 ${i + 1} 行高度约 ${fragH.toFixed(1)}mm 超过单页可用高，已溢出裁剪`,
          });
        }
        push({ node: { ...grid, rows: rows.slice(i, i + 1) }, suppressBorders: { top: st, bottom: sb } });
        isFirstFragment = false;
        i = i + 1;
        if (i < rows.length) flush();
        continue;
      }

      const moreRemain = j < rows.length;
      const st = suppressTop;
      const sb = moreRemain; // 后续还有片段 → 抑制底边框（连续外观）
      push({
        node: { ...grid, rows: rows.slice(i, j), id: grid.id },
        suppressBorders: { top: st, bottom: sb },
      });
      isFirstFragment = false;
      i = j;
      if (moreRemain) flush();
    }
  };

  for (const node of page.children) {
    if (node.type === "grid") paginateGrid(node);
    else paginateAtomic(node);
  }
  flush();

  // 兜底：空逻辑页（无子节点）也至少产出一张物理纸，保证纸张元素与 @page 注入始终存在。
  if (pages.length === 0) {
    pages.push({
      id: page.id,
      sourcePageId: page.id,
      sourceIndex: 0,
      index: 0,
      margin: page.margin,
      children: [],
    });
  }

  return { pages, warnings };
}

/**
 * 分页整篇 Schema：逐逻辑页分页后拼接，回填全局物理页序号。
 * @param schema 表单 Schema
 * @param extra 额外上下文（data / measureNode）；baseRowHeight 取自 schema
 */
export function paginateSchema(
  schema: FormSchemaV2,
  extra?: { data?: FormDataV2 | null; measureNode?: PaginateContext["measureNode"] },
): PaginateResult {
  const paper: ResolvedPaperSizeV2 = resolvePaperSizeV2(schema.paper);
  const all: PhysicalPage[] = [];
  const warnings: PaginateWarning[] = [];
  for (const page of schema.pages) {
    const bodyHeightMm = paper.heightMm - page.margin.top - page.margin.bottom;
    const contentWidthMm = paper.widthMm - page.margin.left - page.margin.right;
    const r = paginatePage(page, {
      baseRowHeight: schema.baseRowHeight,
      bodyHeightMm,
      contentWidthMm,
      data: extra?.data ?? null,
      measureNode: extra?.measureNode,
    });
    all.push(...r.pages);
    warnings.push(...r.warnings);
  }
  all.forEach((p, idx) => (p.index = idx + 1));
  return { pages: all, warnings };
}
