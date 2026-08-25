import type {
  GridCell,
  GridLayoutNode,
  GridLayoutSchema,
  GridNode,
  GridPNode,
} from "./grid-layout-schema";

let nodeSequence = 0;

const nextId = (prefix: string): string => `${prefix}-${++nodeSequence}`;

const text = (
  value: string,
  options: Partial<Omit<GridPNode, "id" | "type" | "text">> = {},
): GridPNode => ({
  id: nextId("text"),
  type: "p",
  text: value,
  ...options,
});

const field = (
  name: string,
  options: Partial<Omit<GridPNode, "id" | "type" | "field" | "editable">> = {},
): GridPNode => ({
  id: nextId("field"),
  type: "p",
  editable: true,
  field: name,
  placeholder: options.placeholder ?? "",
  ...options,
});

const cell = (children: GridLayoutNode[], padding = 1.5): GridCell => ({
  id: nextId("cell"),
  padding,
  children,
});

const oneRowGrid = (
  columns: GridNode["columns"],
  cells: GridCell[],
  border: GridNode["border"] = "none",
  height = 1,
): GridNode => ({
  id: nextId("grid"),
  type: "grid",
  columns,
  border,
  rows: [{ id: nextId("row"), height, cells }],
});

/** 云铝电气第二种工作票：标题及“计划工作时间”之前的 5 个布局行。 */
export function makeYunlvSecondTicketFirstFiveRowsSchema(): GridLayoutSchema {
  nodeSequence = 0;

  return {
    paper: { size: "A4", orientation: "portrait" },
    margin: 10,
    baseRowHeight: 8,
    title: text("云南铝业股份有限公司 电气第二种工作票", {
      style: { align: "center", fontSize: 22, fontWeight: "bold" },
    }),
    body: {
      id: "ticket-layout",
      type: "grid",
      columns: ["1fr"],
      border: "all",
      rows: [
        {
          id: "basic-unit-number",
          height: 1,
          cells: [
            cell([
              oneRowGrid(
                [18, "1fr", 18, "1fr"],
                [
                  cell([text("单位", { style: { align: "center" } })]),
                  cell([field("单位", { underline: true })]),
                  cell([text("编号", { style: { align: "center" } })]),
                  cell([field("编号", { underline: true })]),
                ],
                "inner",
              ),
            ], 0),
          ],
        },
        {
          id: "basic-owner-team",
          height: 1,
          cells: [
            cell([
              oneRowGrid(
                [48, "1fr", 16, "1fr"],
                [
                  cell([text("工作负责人（监护人）：")], 0),
                  cell([field("工作负责人_监护人", { underline: true })], 0),
                  cell([text("班组：")], 0),
                  cell([field("班组", { underline: true })], 0),
                ],
              ),
            ], 2),
          ],
        },
        {
          id: "basic-members",
          height: 1,
          cells: [
            cell([
              oneRowGrid(
                [62, "1fr", 8, 18, 7],
                [
                  cell([text("工作班成员（不包括工作负责人）：")], 0),
                  cell([field("工作班成员", { underline: true })], 0),
                  cell([text("共", { style: { align: "right" } })], 0),
                  cell([
                    field("工作班成员人数", {
                      underline: true,
                      style: { align: "center" },
                    }),
                  ], 0),
                  cell([text("人")], 0),
                ],
              ),
            ], 2),
          ],
        },
        {
          id: "basic-station",
          height: 1,
          cells: [
            cell([
              oneRowGrid(
                [78, "1fr"],
                [
                  cell([text("工作的变、配电站名称及设备名称：")], 0),
                  cell([field("变配电站名称", { underline: true })], 0),
                ],
              ),
            ], 2),
          ],
        },
        {
          id: "work-task",
          height: 5,
          cells: [
            cell([
              oneRowGrid(
                [14, "1fr"],
                [
                  cell([
                    text("工作任务", {
                      style: {
                        align: "center",
                        verticalAlign: "middle",
                        writingMode: "vertical-rl",
                        fontWeight: "bold",
                      },
                    }),
                  ]),
                  cell([
                    {
                      id: "work-task-table",
                      type: "table",
                      field: "工作任务",
                      rowHeight: 1,
                      columns: [
                        { key: "location", title: "工作地点或地段", width: "1fr" },
                        { key: "content", title: "工作内容", width: "1fr" },
                      ],
                      rows: Array.from({ length: 4 }, (_, index) => ({
                        location: [field(`工作任务_${index + 1}_1`)],
                        content: [field(`工作任务_${index + 1}_2`)],
                      })),
                    },
                  ], 0),
                ],
                "inner",
                5,
              ),
            ], 0),
          ],
        },
      ],
    },
  };
}
