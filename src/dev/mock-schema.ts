/**
 * Demo mock schema + 渲染辅助
 *
 * 临时用于阶段 1.4/1.5 验收：在阶段 2 渲染器完成前，
 * 用引擎 + 简单 HTML 字符串拼接可视化分页效果。
 *
 * ⚠ 阶段 2 完成后，本文件应迁移或删除（实际渲染由 Vue 渲染器负责）。
 */

import type { FormSchema, TableComponent, TableRow } from "@/types";
import type { PaginateResult, Page, Block } from "@/types";
import { PX_PER_MM, geom } from "@/engine";
import { renderComponentHtml } from "@/engine";

/** HTML 文本转义（避免污染 dev 渲染） */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 构造 demo mock schema
 *
 * 特点：
 *   - 含 1 个超长文本 p（跨页）
 *   - 含 1 个 25 行表格（跨页）
 *   - 配置页眉/页脚含页码
 */
export function makeMockSchema(): FormSchema {
  // 构造 25 行设备列表
  const deviceRows: TableRow[] = Array.from({ length: 65 }, (_, i) => ({
    no: String(i + 1).padStart(3, "0"),
    name: `设备 ${i + 1}`,
    model: `DL-${1000 + i}`,
    qty: (i % 3) + 1,
    remark: i % 2 === 0 ? "需停电检修" : "清扫维护",
  }));

  // 超长工作内容描述（约 300+ 字，可能跨页）
  const workContent =
    "工作内容：本次检修涉及 10kV 配电室多台开关柜及变压器维护。" +
    "主要工作包括：1) 对 10kV 一段母线及附属开关柜进行全面清扫、紧固、试验；" +
    "2) 更换 #1 主变压器 10kV 侧 B 相套管，处理渗漏油；" +
    "3) 对 #2 主变压器本体进行油样化验、瓦斯继电器校验及二次回路检查；" +
    "4) 配合继电保护班完成 10kV 进线柜保护定值校验，更新定值通知单；" +
    "5) 完成配电室直流屏蓄电池核对性放电试验，更换失效电池 6 节；" +
    "6) 对所有断路器机构进行机械特性测试，处理拒动/误动缺陷；" +
    "7) 全站二次回路绝缘检查，更换老化电缆；" +
    "8) 完成所有隔离开关触头接触电阻测试，打磨处理发热部位；" +
    "9) 检查并紧固所有接地引下线，测量接地电阻；" +
    "10) 工作结束后恢复安全措施，清理现场，人员撤离。";

  return {
    paper: { size: "A4", orientation: "portrait" },
    margin: 15,
    header: {
      height: 15,
      text: "云南铝业电气第一种工作票",
      showPageNumber: false,
    },
    footer: {
      height: 15,
      text: "编号：YN-DL-2024-001",
      showPageNumber: true,
    },
    body: [
      {
        id: "p-title",
        type: "p",
        field: "title",
        text: "电气第一种工作票",
      },
      {
        id: "p-workcontent",
        type: "p",
        field: "workContent",
        text: workContent,
      },
      {
        id: "p-blank",
        type: "p",
        text: "──────── 工作设备清单 ────────",
      },
      {
        id: "t-devices",
        type: "table",
        field: "deviceList",
        columns: [
          { key: "no", title: "序号", width: 25 },
          { key: "name", title: "设备名称", width: 60 },
          { key: "model", title: "型号", width: 40 },
          { key: "qty", title: "数量", width: 20 },
          { key: "remark", title: "备注", width: 50 },
        ],
        rows: deviceRows,
      } as TableComponent,
      {
        id: "p-remark",
        type: "p",
        field: "remark",
        text: "注意事项：工作前必须验电、挂接地线；工作票签发人需到场确认安全措施落实到位；工作结束后工作负责人应组织清理现场，确认无遗留工具材料后申请工作终结。",
      },
    ],
  };
}

/**
 * 渲染单个 Block 为 HTML 字符串
 * @param block 待渲染的 block
 * @returns HTML 字符串
 */
function renderBlockHtml(block: Block): string {
  if (block.type === "item") {
    return renderComponentHtml(block.comp);
  }
  // table-slice：含本页承载的行 + 重复表头
  const comp = block.comp;
  const ths = comp.columns
    .map(
      (c) =>
        `<th${c.width ? ` style="width:${c.width * PX_PER_MM}px"` : ""}>${escapeHtml(c.title)}</th>`,
    )
    .join("");
  const trs = block.rows
    .map((row) => {
      const tds = comp.columns
        .map((c) => `<td>${escapeHtml(String(row[c.key] ?? ""))}</td>`)
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");
  return `<table data-field="${escapeHtml(comp.field ?? "")}"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

/**
 * 渲染页码文本：第 n 页 / 共 N 页
 */
function renderPageNumber(n: number, N: number): string {
  return `第 ${n} 页 / 共 ${N} 页`;
}

/**
 * 渲染单张纸（含页眉、正文、页脚）
 * @param page 单页数据
 * @param schema 表单 schema（取纸张/边距/页眉页脚配置）
 * @param totalPages 总页数（用于页码）
 * @returns 单张纸 HTML 字符串
 */
function renderPageHtml(
  page: Page,
  schema: FormSchema,
  totalPages: number,
): string {
  const g = geom(schema.paper.size, schema.paper.orientation);
  const wPx = g.w * PX_PER_MM;
  const hPx = g.h * PX_PER_MM;
  const marginPx = schema.margin * PX_PER_MM;
  const headerHeightPx = (schema.header?.height ?? schema.margin) * PX_PER_MM;
  const footerHeightPx = (schema.footer?.height ?? schema.margin) * PX_PER_MM;

  // 页眉
  const headerText = schema.header?.text ?? "";
  const headerPageNum = schema.header?.showPageNumber
    ? renderPageNumber(page.index + 1, totalPages)
    : "";
  const headerHtml = `
    <div class="paper-header" style="height:${headerHeightPx}px">
      <span class="header-text">${escapeHtml(headerText)}</span>
      ${headerPageNum ? `<span class="header-pagenum">${headerPageNum}</span>` : ""}
    </div>`;

  // 正文
  const bodyHtml = page.blocks
    .map((b) => `<div class="block">${renderBlockHtml(b)}</div>`)
    .join("");

  // 页脚
  const footerText = schema.footer?.text ?? "";
  const footerPageNum = schema.footer?.showPageNumber
    ? renderPageNumber(page.index + 1, totalPages)
    : "";
  const footerHtml = `
    <div class="paper-footer" style="height:${footerHeightPx}px">
      <span class="footer-text">${escapeHtml(footerText)}</span>
      ${footerPageNum ? `<span class="footer-pagenum">${footerPageNum}</span>` : ""}
    </div>`;

  return `
    <div class="paper" style="width:${wPx}px; min-height:${hPx}px; padding:0 ${marginPx}px;">
      ${headerHtml}
      <div class="paper-body">${bodyHtml}</div>
      ${footerHtml}
    </div>`;
}

/**
 * 渲染完整分页结果为可视化 HTML
 * @param result 引擎分页结果
 * @param schema 表单 schema
 * @returns 包含所有纸张 + 警告面板的 HTML 字符串
 */
export function renderPagesToHtml(
  result: PaginateResult,
  schema: FormSchema,
): string {
  const totalPages = result.pages.length;
  const papersHtml = result.pages
    .map((p) => renderPageHtml(p, schema, totalPages))
    .join("");

  // 警告面板
  const warningsHtml =
    result.warnings.length === 0
      ? '<div class="warnings-empty">无警告</div>'
      : result.warnings
          .map(
            (w) =>
              `<div class="warning-item">⚠ ${escapeHtml(w.compId)}：${escapeHtml(w.message)}</div>`,
          )
          .join("");

  return `
    <div class="warnings-panel">
      <div class="warnings-title">引擎警告（${result.warnings.length}）</div>
      ${warningsHtml}
    </div>
    <div class="papers-stack">${papersHtml}</div>`;
}

/**
 * 渲染所需的全局 CSS（注入到 demo 页面）
 */
export const DEMO_CSS = `
  <style>
    body { margin: 0; background: #e5e7eb; font-family: -apple-system, system-ui, sans-serif; }
    .demo-wrap { padding: 20px; }
    .warnings-panel {
      background: #fef3c7; border: 1px solid #f59e0b;
      padding: 12px 16px; margin-bottom: 20px; border-radius: 6px;
      max-width: 794px;
    }
    .warnings-title { font-weight: bold; margin-bottom: 6px; color: #92400e; }
    .warnings-empty { color: #6b7280; font-style: italic; }
    .warning-item { color: #92400e; font-size: 13px; padding: 2px 0; }
    .papers-stack { display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .paper {
      background: white;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
      display: flex; flex-direction: column;
      box-sizing: border-box;
    }
    .paper-header, .paper-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0 4px; border-bottom: 1px dashed #d1d5db;
      font-size: 11px; color: #6b7280;
    }
    .paper-footer { border-bottom: none; border-top: 1px dashed #d1d5db; }
    .paper-body { flex: 1; padding: 4px 0; }
    .block { margin: 2px 0; }
    .block p { margin: 4px 0; font-size: 13px; line-height: 1.6; color: #1f2937; }
    .block img { max-width: 100%; }
    .block table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .block th, .block td {
      border: 1px solid #9ca3af; padding: 4px 6px; text-align: left;
    }
    .block th { background: #f3f4f6; font-weight: 600; }

    /* 打印模式：仅纸张内容，隐藏辅助 UI + 强制每张纸后分页 */
    @media print {
      body { background: white; }
      .demo-wrap { padding: 0; }
      .info-bar,
      .warnings-panel { display: none !important; }
      .papers-stack { gap: 0; align-items: stretch; }
      .paper {
        box-shadow: none;
        page-break-after: always;
        break-after: page;
      }
      .paper:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
  </style>
`;
