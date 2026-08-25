import type { FormSchema, TableComponent, TableRow } from "@/types";

/**
 * 云铝“电气第二种工作票”的 v1 schema 能力评估。
 *
 * 结论：当前设计器可以表达纸张、顺序区块和普通二维表格，但不能精确还原原表单。
 * 下方 schema 中形如“{单位}”的内容仅用于标记预期字段，并不是可编辑字段绑定；
 * v1 的 table 只能绑定整张表的数据，不能给单个单元格绑定 field。
 */
export const yunlvSecondWorkTicketCapability = {
  verdict: "partial" as const,
  supported: [
    "A4 纵向纸张及页边距",
    "按业务顺序排列多个表格区块",
    "工作任务等规则二维明细表",
    "整张明细表的数据绑定和跨页表头重复",
  ],
  approximated: [
    "标题借用 header.text 表达，不能作为正文大标题设置字号和对齐",
    "基本信息、签名和日期使用“项目/填写内容”二维表近似",
    "多行填写区使用多条静态占位行近似，不能设置固定行高",
    "单元格中的 {字段名} 只是可视化标记，不具备字段绑定能力",
  ],
  unsupported: [
    "合并单元格（rowspan/colspan）和嵌套表格",
    "单元格内放置 p 字段、多个字段或标签与字段的混排",
    "竖排“工作任务”标签",
    "字段下划线、日期选择器、日期先后校验和打印显隐规则",
    "表格局部样式、精确行高、内边距、字号、对齐及边框控制",
  ],
  requiredExtensions: [
    "为 p 增加固定文本/富文本及排版样式",
    "增加 grid 或 layout 容器，使标签和字段可以组合布局",
    "将 table 升级为单元格模型，支持合并、嵌套组件和单元格 field",
    "为字段增加 input 类型、日期行为、校验规则和打印样式",
  ],
} as const;

const field = (name: string): string => `{${name}}`;

const makeRows = (
  rows: ReadonlyArray<readonly [label: string, value: string]>,
): TableRow[] => rows.map(([label, value]) => ({ label, value }));

const makeSection = (
  id: string,
  sectionField: string,
  rows: ReadonlyArray<readonly [label: string, value: string]>,
): TableComponent => ({
  id,
  type: "table",
  field: sectionField,
  columns: [
    { key: "label", title: "项目", width: 52 },
    { key: "value", title: "填写内容" },
  ],
  rows: makeRows(rows),
});

/**
 * 按当前 v1 FormSchema 所能表达的上限构造工作票。
 *
 * 该 schema 用于设计器能力验证，不应被误认为原 HTML 的等价转换结果。
 */
export function makeYunlvSecondWorkTicketSchema(): FormSchema {
  return {
    paper: { size: "A4", orientation: "portrait" },
    margin: 10,
    header: {
      height: 16,
      text: "云南铝业股份有限公司 电气第二种工作票",
      showPageNumber: false,
    },
    footer: {
      height: 10,
      text: "",
      showPageNumber: true,
    },
    body: [
      makeSection("table-basic-info", "基本信息", [
        ["单位", field("单位")],
        ["编号", field("编号")],
        ["工作负责人（监护人）", field("工作负责人_监护人")],
        ["班组", field("班组")],
        [
          "工作班成员（不包括工作负责人）",
          `${field("工作班成员")}    共 ${field("工作班成员人数")} 人`,
        ],
        ["工作的变、配电站名称及设备名称", field("变配电站名称")],
      ]),
      {
        id: "table-work-task",
        type: "table",
        field: "工作任务",
        columns: [
          { key: "location", title: "工作地点或地段", width: 75 },
          { key: "content", title: "工作内容" },
        ],
        rows: Array.from({ length: 4 }, (_, index) => ({
          location: field(`工作任务_${index + 1}_1`),
          content: field(`工作任务_${index + 1}_2`),
        })),
      } as TableComponent,
      makeSection("table-plan", "计划与工作条件", [
        [
          "计划工作时间",
          `自 ${field("计划工作时间_1")} 至 ${field("计划工作时间_2")}`,
        ],
        [
          "工作条件（停电或不停电，或邻近及保留带电设备名称）",
          field("工作条件"),
        ],
        ["", ""],
      ]),
      makeSection("table-safety", "注意事项与安全措施", [
        ["注意事项（安全措施）", field("注意事项（安全措施）")],
        ["", ""],
        ["备注", field("注意事项备注")],
        ["工作票签发人签名", field("工作票签发人签名")],
        ["签发日期", field("签发日期")],
        ["补充安全措施（工作许可人填写）", field("补充安全措施")],
        ["", ""],
        ["备注", field("补充安全措施备注")],
      ]),
      makeSection("table-confirm", "工作许可与确认", [
        ["确认本工作票上述各项内容", ""],
        ["工作负责人签名", field("确认工作负责人签名")],
        ["工作许可人签名", field("确认工作许可人签名")],
        ["许可工作时间", field("许可工作时间")],
        ["确认工作负责人布置的工作任务和安全措施", ""],
        ["工作班成员签名", field("确认工作班成员签名")],
      ]),
      makeSection("table-extension", "工作票延期", [
        ["有效期延长到", field("有效期延长到")],
        ["工作负责人签名", field("延期工作负责人签名")],
        ["日期", field("延期工作负责人日期")],
        ["工作许可人签名", field("延期工作许可人签名")],
        ["日期", field("延期工作许可人日期")],
      ]),
      makeSection("table-completion", "工作票终结", [
        [
          "终结说明",
          `全部工作于 ${field("终结时间")} 结束，工作人员已全部撤离，材料工具已清理完毕。`,
        ],
        ["工作负责人签名", field("终结工作负责人签名")],
        ["日期", field("终结工作负责人日期")],
        ["工作许可人签名", field("终结工作许可人签名")],
        ["日期", field("终结工作许可人日期")],
        ["备注", field("备注")],
        ["", ""],
      ]),
    ],
  };
}
