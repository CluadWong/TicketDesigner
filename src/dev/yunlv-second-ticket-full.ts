/**
 * 云南铝业股份有限公司 电气第二种工作票 —— 完整版 Schema 样例
 *
 * 覆盖截图与 demo HTML 的全部字段区域（标题 → 基本信息 → 工作任务 →
 * 安全措施/签发 → 确认 → 延期 → 终结 → 备注）。
 *
 * 用途：
 * - 作为「载入样例」的完整模板（替换当前仅前五行的版本）
 * - 验证 Schema V2 能否表达整张工作票的全部结构
 * - P10/P11 验收的参考基线
 *
 * 字段名与 demoData / demo HTML 的 `field` 属性逐字一致。
 * 日期字段标注 `action: "date"`；签名字段属外部组件（action 可后续扩展为 `"signature"`），
 * 第一版用 contenteditable 文本兜底。所有字段均为字符串类型（无输入类型配置，见 Phase D 第 3 项）。
 */
import type {
  FieldPNodeV2,
  FormNodeV2,
  FormSchemaV2,
  GridCellV2,
  GridNodeV2,
  GridRowV2,
  PNodeV2,
  TextNodeV2,
  TableCellTemplateV2,
  TableNodeV2,
  TextStyleV2,
} from "@/types";

// ── 辅助工厂 ──────────────────────────────────────────────────

const staticP = (
  id: string,
  text: string,
  style?: TextStyleV2,
): TextNodeV2 => ({
  id,
  type: "text",
  text,
  style,
});

const fieldP = (
  id: string,
  field: string,
  options: Omit<Partial<FieldPNodeV2>, "id" | "type" | "mode" | "field"> = {},
): FieldPNodeV2 => ({
  id,
  type: "p",
  mode: "field",
  field,
  underline: true,
  ...options,
});

const cell = (
  id: string,
  children: FormNodeV2[],
  options: Omit<GridCellV2, "id" | "type" | "children"> = {},
): GridCellV2 => ({ id, type: "grid-cell", children, ...options });

const row = (id: string, height: number, cells: GridCellV2[]): GridRowV2 => ({
  id,
  type: "grid-row",
  height,
  cells,
});

const tableTemplate = (
  id: string,
  columnKey: string,
  child: FormNodeV2,
): TableCellTemplateV2 => ({
  id,
  type: "table-cell-template",
  columnKey,
  children: [child],
});

/** 段内网格：用 `inner` 边框——内部线由自身绘制，外框交由外层 `ticket-layout`(`all`) 承担，
 *  从而避免与外层网格相邻处出现 2px 双边框（P11 对齐：消除段间接缝，与首五行 1-Grid 对齐同源）。 */
const innerGrid = (id: string, rows: GridRowV2[]): GridNodeV2 => ({
  id,
  type: "grid",
  border: "inner",
  rows,
});

/** 外层 `ticket-layout` 的一个段落行：单行单格，内含一段 inner 网格。
 *  行高取该段所有内部行高之和，使整张票总高与旧「每段一个 all 网格」版本一致。 */
const sectionRow = (id: string, rows: GridRowV2[], gridId: string): GridRowV2 => {
  const height = rows.reduce((sum, r) => sum + r.height, 0);
  // 外层行 id 用 `${gridId}-row` 与嵌套 Grid id(`${gridId}`) 区分，避免 DUPLICATE_ID。
  return row(`${gridId}-row`, height, [cell(`${id}-cell`, [innerGrid(gridId, rows)], { width: "1fr" })]);
};

/** 日期字段工厂：自动带 action="date"（字段均为字符串类型，不再设 inputType） */
const dateField = (id: string, field: string): FieldPNodeV2 =>
  fieldP(id, field, { action: "date" });

// ── 内嵌表格：工作任务明细 ───────────────────────────────────

const workTaskTable: TableNodeV2 = {
  id: "work-task-table",
  type: "table",
  field: "工作任务",
  columns: [
    { key: "location", title: "工作地点或地段", width: "1fr", align: "center" },
    { key: "content", title: "工作内容", width: "1fr", align: "center" },
  ],
  headerHeight: 1,
  rowHeight: 1,
  minRows: 4,
  rowTemplate: [
    tableTemplate("wt-loc-tpl", "location", fieldP("wt-loc-1", "工作任务_1_1")),
    tableTemplate(
      "wt-content-tpl",
      "content",
      fieldP("wt-content-1", "工作任务_1_2"),
    ),
  ],
};

// ── Section 1: 标题 ───────────────────────────────────────────

const titleRow = row("title-row", 2, [
  cell(
    "title-cell",
    [
      staticP("title", "云南铝业股份有限公司 电气第二种工作票", {
        align: "center",
        fontSize: 22,
        fontWeight: "bold",
      }),
    ],
    { width: "1fr" },
  ),
]);

// ── Section 2: 基本信息（单位/编号/负责人/班组/成员/变配电站） ──

const basicInfoRows: GridRowV2[] = [
  // Row 1: 单位 | 单位-field | 编号 | 编号-field
  row("basic-unit-number", 1, [
    cell(
      "unit-label-cell",
      [staticP("unit-label", "单位", { align: "center" })],
      { width: 18 },
    ),
    cell("unit-field-cell", [fieldP("unit-field", "单位")], { width: "1fr" }),
    cell(
      "number-label-cell",
      [staticP("number-label", "编号", { align: "center" })],
      { width: 18 },
    ),
    cell("number-field-cell", [fieldP("number-field", "编号")], {
      width: "1fr",
    }),
  ]),
  // Row 2: 工作负责人(监护人) | field | 班组 | field
  row("basic-owner-team", 1, [
    cell(
      "owner-label-cell",
      [staticP("owner-label", "工作负责人（监护人）：")],
      { width: 48, padding: 0 },
    ),
    cell("owner-field-cell", [fieldP("owner-field", "工作负责人_监护人")], {
      width: "1fr",
      padding: 0,
    }),
    cell("team-label-cell", [staticP("team-label", "班组：")], {
      width: 16,
      padding: 0,
    }),
    cell("team-field-cell", [fieldP("team-field", "班组")], {
      width: "1fr",
      padding: 0,
    }),
  ]),
  // Row 3: 工作班成员(不含负责人) | field | 共 | 人数-field | 人
  row("basic-members", 1, [
    cell(
      "members-label-cell",
      [staticP("members-label", "工作班成员（不包括工作负责人）：")],
      { width: 62, padding: 0 },
    ),
    cell("members-field-cell", [fieldP("members-field", "工作班成员")], {
      width: "1fr",
      padding: 0,
    }),
    cell(
      "count-field",
      [
        fieldP("member-count-field", "工作班成员人数", {
          prefix: "共",
          suffix: "人",
          style: { align: "center" },
        }),
      ],
      { width: 25, padding: 0 },
    ),
  ]),
  // Row 4: 变配电站名称及设备名称 | field
  row("basic-station", 1, [
    cell(
      "station-label-cell",
      [staticP("station-label", "工作的变、配电站名称及设备名称：")],
      { width: 78, padding: 0 },
    ),
    cell("station-field-cell", [fieldP("station-field", "变配电站名称")], {
      width: "1fr",
      padding: 0,
    }),
  ]),
];

// ── Section 3: 工作任务（竖排标签 + 内嵌表 + 计划工作时间） ─────

const workTaskRows: GridRowV2[] = [
  // Row 5: 工作任务(竖排) | inner-table
  row("work-task-row", 5, [
    cell(
      "work-task-label-cell",
      [
        staticP("work-task-label", "工作任务", {
          align: "center",
          verticalAlign: "middle",
          writingMode: "vertical-rl",
          fontWeight: "bold",
        }),
      ],
      { width: 14 },
    ),
    cell("work-task-table-cell", [workTaskTable], { width: "1fr", padding: 0 }),
  ]),
  // Row 6: 计划工作时间 | 自 date | 至 date
  row("schedule-row", 1, [
    cell("schedule-label-cell", [staticP("schedule-label", "计划工作时间")], {
      width: 28,
    }),
    cell(
      "schedule-fields",
      [
        staticP("schedule-from-label", "自"),
        dateField("schedule-from", "计划工作时间_1"),
        staticP("schedule-to-label", "至"),
        dateField("schedule-to", "计划工作时间_2"),
      ],
      { width: "1fr", padding: 0 },
    ),
  ]),
];

// ── Section 4: 安全措施 / 签发 ─────────────────────────────────

const safetyRows: GridRowV2[] = [
  // Row 7: 工作条件（多行文本）
  row("condition-row", 2, [
    cell(
      "condition-cell",
      [
        staticP(
          "condition-label",
          "工作条件（停电或不停电，或邻近及保留带电设备名称）：",
        ),
        fieldP("condition-field", "工作条件"),
      ],
      { padding: 0 },
    ),
  ]),
  // Row 8: 注意事项（安全措施）+ 签发人签名 + 签发日期
  row("notice-sign-row", 2, [
    cell(
      "notice-sign-cell",
      [
        staticP("notice-label", "注意事项（安全措施）："),
        fieldP("notice-field", "注意事项（安全措施）"),
        // 备注（行内）
        staticP("notice-remark-label", "备注："),
        fieldP("notice-remark-field", "注意事项备注"),
        // 签发人签名 + 签发日期（并排）
        staticP("issuer-sign-label", "工作票签发人签名："),
        fieldP("issuer-sign-field", "工作票签发人签名"),
        staticP("issue-date-label", "签发日期："),
        dateField("issue-date-field", "签发日期"),
      ],
      { padding: 0 },
    ),
  ]),
  // Row 9: 补充安全措施
  row("supplement-safety-row", 2, [
    cell(
      "supplement-cell",
      [
        staticP("supplement-label", "补充安全措施："),
        fieldP("supplement-field", "补充安全措施"),
        staticP("supplement-remark-label", "备注："),
        fieldP("supplement-remark-field", "补充安全措施备注"),
      ],
      { padding: 0 },
    ),
  ]),
];

// ── Section 5: 确认各项内容 ───────────────────────────────────

const confirmRows: GridRowV2[] = [
  // Row 10: 确认本工作票上述各项内容（签名+签名+许可时间）
  row("confirm-header-row", 1, [
    cell(
      "confirm-header-cell",
      [
        staticP("confirm-header", "确认本工作票上述各项内容："),
        // 工作负责人签名 | 工作许可人签名（并排）
        staticP("confirm-owner-label", "工作负责人签名："),
        fieldP("confirm-owner-sign", "确认工作负责人签名"),
        staticP("confirm-permitter-label", "工作许可人签名："),
        fieldP("confirm-permitter-sign", "确认工作许可人签名"),
        // 许可工作时间
        staticP("permit-time-label", "许可工作时间："),
        dateField("permit-time-field", "许可工作时间"),
      ],
      { padding: 0 },
    ),
  ]),
  // Row 11: 确认布置的工作任务和安全措施（成员签名）
  row("confirm-task-row", 1, [
    cell(
      "confirm-task-cell",
      [
        staticP(
          "confirm-task-header",
          "确认工作负责人布置的工作任务和安全措施：",
        ),
        staticP("confirm-member-label", "工作班成员签名："),
        fieldP("confirm-member-sign", "确认工作班成员签名"),
      ],
      { padding: 0 },
    ),
  ]),
];

// ── Section 6: 工作票延期 ─────────────────────────────────────

const extensionRows: GridRowV2[] = [
  row("extension-row", 2, [
    cell(
      "extension-cell",
      [
        staticP("extension-header", "工作票延期："),
        // 有效期延长到
        staticP("ext-expire-label", "有效期延长到："),
        dateField("ext-expire-field", "有效期延长到"),
        // 工作负责人签名 + 日期
        staticP("ext-owner-label", "工作负责人签名："),
        fieldP("ext-owner-sign", "延期工作负责人签名"),
        staticP("ext-owner-date-label", "日期："),
        dateField("ext-owner-date", "延期工作负责人日期"),
        // 工作许可人签名 + 日期
        staticP("ext-permitter-label", "工作许可人签名："),
        fieldP("ext-permitter-sign", "延期工作许可人签名"),
        staticP("ext-permitter-date-label", "日期："),
        dateField("ext-permitter-date", "延期工作许可人日期"),
      ],
      { padding: 0 },
    ),
  ]),
];

// ── Section 7: 工作票终结 ─────────────────────────────────────

const completionRows: GridRowV2[] = [
  row("completion-row", 2, [
    cell(
      "completion-cell",
      [
        staticP("completion-header", "工作票终结："),
        // 全部工作于 [date] 结束，工作人员已全部撤离...
        staticP("completion-end-label", "全部工作于"),
        dateField("completion-end-time", "终结时间"),
        staticP(
          "completion-end-suffix",
          "结束，工作人员已全部撤离，材料工具已清理完毕。",
        ),
        // 工作负责人签名 + 日期
        staticP("comp-owner-label", "工作负责人签名："),
        fieldP("comp-owner-sign", "终结工作负责人签名"),
        staticP("comp-owner-date-label", "日期："),
        dateField("comp-owner-date", "终结工作负责人日期"),
        // 工作许可人签名 + 日期
        staticP("comp-permitter-label", "工作许可人签名："),
        fieldP("comp-permitter-sign", "终结工作许可人签名"),
        staticP("comp-permitter-date-label", "日期："),
        dateField("comp-permitter-date", "终结工作许可人日期"),
      ],
      { padding: 0 },
    ),
  ]),
];

// ── Section 8: 备注 ────────────────────────────────────────────

const remarkRows: GridRowV2[] = [
  row("remark-row", 1, [
    cell(
      "remark-cell",
      [staticP("remark-label", "备注："), fieldP("remark-field", "备注")],
      { padding: 0 },
    ),
  ]),
];

// ── 组装完整 Schema ───────────────────────────────────────────
//
// P11 对齐结构：1 个外层 Grid(`ticket-layout`, `border:"all"`) 承载整张票外框与段间单线；
// 每个业务段作为「单行单格」放入外层网格，格子内嵌一段 `border:"inner"` 网格表达该段内部行列。
// 这样相邻段之间只由外层网格画出 1 条分隔线（无 2px 双边框），同时复用九续落地的 Grid-in-cell。

export function makeYunlvSecondTicketFullSchema(): FormSchemaV2 {
  return {
    version: 2,
    paper: { size: "A4", orientation: "portrait" },
    baseRowHeight: 8,
    pages: [
      {
        id: "ticket-page-full",
        type: "page",
        mode: "fixed",
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        children: [
          {
            id: "ticket-layout",
            type: "grid",
            border: "all",
            columns: ["1fr"],
            rows: [
              titleRow,
              sectionRow("section-basic-info", basicInfoRows, "section-basic-info"),
              sectionRow("section-work-task", workTaskRows, "section-work-task"),
              sectionRow("section-safety", safetyRows, "section-safety"),
              sectionRow("section-confirm", confirmRows, "section-confirm"),
              sectionRow("section-extension", extensionRows, "section-extension"),
              sectionRow("section-completion", completionRows, "section-completion"),
              sectionRow("section-remark", remarkRows, "section-remark"),
            ],
          },
        ],
      },
    ],
  };
}
