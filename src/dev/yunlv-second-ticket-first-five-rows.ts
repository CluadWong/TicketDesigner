import type {
  FieldPNodeV2,
  FormSchemaV2,
  GridCellV2,
  GridNodeV2,
  GridRowV2,
  PNodeV2,
  StaticPNodeV2,
  TableCellTemplateV2,
  TableNodeV2,
  TextStyleV2,
} from "@/types";

const staticP = (id: string, text: string, style?: TextStyleV2): StaticPNodeV2 => ({
  id,
  type: "p",
  mode: "static",
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
  children: PNodeV2[] | GridNodeV2[] | TableNodeV2[],
  options: Omit<GridCellV2, "id" | "type" | "children"> = {},
): GridCellV2 => ({
  id,
  type: "grid-cell",
  children,
  ...options,
});

const row = (id: string, height: number, cells: GridCellV2[]): GridRowV2 => ({
  id,
  type: "grid-row",
  height,
  cells,
});

const tableTemplate = (
  id: string,
  columnKey: string,
  child: PNodeV2,
): TableCellTemplateV2 => ({
  id,
  type: "table-cell-template",
  columnKey,
  children: [child],
});

/** 云铝电气第二种工作票：标题及“计划工作时间”之前的五个布局行。 */
export function makeYunlvSecondTicketFirstFiveRowsSchema(): FormSchemaV2 {
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
    repeatable: true,
    rowTemplate: [
      tableTemplate("work-task-location-template", "location", fieldP("work-task-location", "工作任务_地点")),
      tableTemplate("work-task-content-template", "content", fieldP("work-task-content", "工作任务_内容")),
    ],
  };

  const ticketGrid: GridNodeV2 = {
    id: "ticket-layout",
    type: "grid",
    border: "all",
    rows: [
      row("basic-unit-number", 1, [
        cell("unit-label-cell", [staticP("unit-label", "单位", { align: "center" })], { width: 18 }),
        cell("unit-field-cell", [fieldP("unit-field", "单位")], { width: "1fr" }),
        cell("number-label-cell", [staticP("number-label", "编号", { align: "center" })], { width: 18 }),
        cell("number-field-cell", [fieldP("number-field", "编号")], { width: "1fr" }),
      ]),
      row("basic-owner-team", 1, [
        cell("owner-label-cell", [staticP("owner-label", "工作负责人（监护人）：")], { width: 48, padding: 0 }),
        cell("owner-field-cell", [fieldP("owner-field", "工作负责人_监护人")], { width: "1fr", padding: 0 }),
        cell("team-label-cell", [staticP("team-label", "班组：")], { width: 16, padding: 0 }),
        cell("team-field-cell", [fieldP("team-field", "班组")], { width: "1fr", padding: 0 }),
      ]),
      row("basic-members", 1, [
        cell("members-label-cell", [staticP("members-label", "工作班成员（不包括工作负责人）：")], { width: 62, padding: 0 }),
        cell("members-field-cell", [fieldP("members-field", "工作班成员")], { width: "1fr", padding: 0 }),
        cell("member-count-cell", [fieldP("member-count-field", "工作班成员人数", {
          prefix: "共",
          suffix: "人",
          style: { align: "center" },
        })], { width: 25, padding: 0 }),
      ]),
      row("basic-station", 1, [
        cell("station-label-cell", [staticP("station-label", "工作的变、配电站名称及设备名称：")], { width: 78, padding: 0 }),
        cell("station-field-cell", [fieldP("station-field", "变配电站名称")], { width: "1fr", padding: 0 }),
      ]),
      row("work-task", 5, [
        cell("work-task-label-cell", [staticP("work-task-label", "工作任务", {
          align: "center",
          verticalAlign: "middle",
          writingMode: "vertical-rl",
          fontWeight: "bold",
        })], { width: 14 }),
        cell("work-task-table-cell", [workTaskTable], { width: "1fr", padding: 0 }),
      ]),
    ],
  };

  const titleRow = row("ticket-title-row", 2, [
    cell("ticket-title-cell", [staticP("ticket-title", "云南铝业股份有限公司 电气第二种工作票", {
      align: "center",
      fontSize: 22,
      fontWeight: "bold",
    })], { width: "1fr" }),
  ]);
  const sectionGrid = (id: string, rows: GridRowV2[]): GridNodeV2 => ({
    id,
    type: "grid",
    border: "all",
    rows,
  });
  const [unitNumberRow, ownerTeamRow, membersRow, stationRow, workTaskRow] = ticketGrid.rows;
  const ticketSections = [
    sectionGrid("ticket-title-layout", [titleRow]),
    sectionGrid("ticket-basic-layout", [unitNumberRow, ownerTeamRow]),
    sectionGrid("ticket-member-layout", [membersRow, stationRow]),
    sectionGrid("ticket-work-task-layout", [workTaskRow]),
  ];

  return {
    version: 2,
    paper: { size: "A4", orientation: "portrait" },
    baseRowHeight: 8,
    pages: [
      {
        id: "ticket-page-1",
        type: "page",
        mode: "fixed",
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        children: ticketSections,
      },
    ],
  };
}
