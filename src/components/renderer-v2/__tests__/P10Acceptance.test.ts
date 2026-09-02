import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GridFormRenderer from "@/components/renderer-v2/GridFormRenderer.vue";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";
import demoData from "@/dev/demoData";
import {
  serializeFormSchemaV2,
  parseFormSchemaV2,
  SchemaV2SerializationError,
} from "@/types/schema-v2-serialization";
import { validateFormSchemaV2 } from "@/types/schema-v2-validation";
import { buildEditorNodeIndexV2 } from "@/types/schema-v2-index";
import {
  moveGridRowV2,
  moveNodeV2,
  setGridColumnWidthV2,
  updateCellWidthV2,
  updateGridRowHeightV2,
  updateTableMinRowsV2,
} from "@/types/schema-v2-operations";
import type { GridNodeV2 } from "@/types";

/**
 * P10「前五行闭环验收」实现侧 harness（不依赖人工浏览器）。
 *
 * 对规范样例 `makeYunlvSecondTicketFirstFiveRowsSchema`（已对齐为 `acceptance-row-spec.md` 要求的
 * 1 外层 Grid + 5 内部行）复现验收步骤 7–10 的「保存 → 加载 → 校验 → 填值 → 渲染」全闭环，
 * 并对关键指标（行高、边框稳定、竖排标签、内嵌表、字段回写、无结构 error、修改后保持正确）做断言。
 */
describe("P10 前五行闭环验收（实现侧 harness）", () => {
  describe("A. 闭环验收（规范样例，1 外层 Grid + 5 行）", () => {
    const schema = makeYunlvSecondTicketFirstFiveRowsSchema();

    it("保存 → 加载：序列化往返深度等价且保留全部 ID（P10 步骤 7–8）", () => {
      const json = serializeFormSchemaV2(schema, true);
      let parsed: ReturnType<typeof parseFormSchemaV2> | undefined;
      expect(() => { parsed = parseFormSchemaV2(json); }).not.toThrow();
      expect(parsed!.version).toBe(2);
      expect(JSON.parse(json)).toEqual(JSON.parse(serializeFormSchemaV2(parsed!, true)));
      const ids = [
        "ticket-page-1",
        "ticket-title-layout",
        "ticket-layout",
        "unit-field",
        "owner-field",
        "team-field",
        "members-field",
        "station-field",
        "work-task-table",
        "title-text",
      ];
      for (const id of ids) {
        expect(serializedContainsId(json, id), `应保留 ID ${id}`).toBe(true);
      }
      expect(() => parseFormSchemaV2("{ not valid json")).toThrow(SchemaV2SerializationError);
    });

    it("校验：加载后无 error 级问题（P10「无结构 error」）", () => {
      const errors = validateFormSchemaV2(schema).filter(i => i.level === "error");
      expect(errors).toEqual([]);
    });

    it("节点索引：所有实际组件可定位（P10「所有节点可再次选中」）", () => {
      const index = buildEditorNodeIndexV2(schema);
      const selectable = [
        "ticket-title-layout",
        "ticket-layout",
        "unit-field",
        "owner-field",
        "team-field",
        "members-field",
        "station-field",
        "work-task-table",
        "title-text",
      ];
      for (const id of selectable) {
        expect(index.get(id), `节点 ${id} 应可索引`).toBeDefined();
      }
    });

    it("渲染（设计态）：标题加粗居中、工作任务行 40mm、竖排标签、内嵌表两列四行", () => {
      const wrapper = mount(GridFormRenderer, { props: { schema } });
      const title = wrapper.find('[data-node-id="title-text"]');
      expect(title.exists()).toBe(true);
      const tStyle = title.attributes("style") ?? "";
      expect(tStyle).toContain("font-size: 22");
      expect(tStyle).toContain("font-weight: bold");

      const row = wrapper.find('[data-layout-id="row-work-task"]');
      expect(row.exists()).toBe(true);
      expect(row.attributes("style")).toContain("min-height: 40mm");

      const vertical = wrapper
        .findAll(".layout-text")
        .find(el => el.attributes("style")?.includes("vertical-rl"));
      expect(vertical?.text()).toBe("工作任务");

      const headers = wrapper.findAll("thead th");
      expect(headers).toHaveLength(2);
      expect(headers.map(h => h.text())).toEqual(["工作地点或地段", "工作内容"]);
      expect(wrapper.findAll("tbody tr")).toHaveLength(4);
    });

    it("渲染（填写态）：外部字段回写 demoData（P10 步骤 9「数据回写正确」）", () => {
      const wrapper = mount(GridFormRenderer, { props: { schema, data: demoData } });
      // 填充态字段为真实控件（textarea/input），值存于 .value 而非 textContent
      const fieldVal = (f: string) => wrapper.find(`[data-field="${f}"]`).text();
      expect(fieldVal("单位")).toContain("121");
      expect(fieldVal("工作负责人（监护人）")).toContain("121");
      expect(fieldVal("班组")).toContain("121");
      const count = wrapper.find('[data-field="工作班成员人数"]');
      expect(count.exists()).toBe(true);
      // 复合字段前缀/后缀为静态标签，仍出现在文本中
      expect(wrapper.text()).toContain("共");
      expect(wrapper.text()).toContain("人");
    });

    it("内嵌表逐行字段绑定：4 行 × 2 列 field 唯一且与 demoData 键一致（P10 步骤 9 表格 cell）", () => {
      const wrapper = mount(GridFormRenderer, { props: { schema } });
      const rows = wrapper.findAll("tbody tr");
      expect(rows).toHaveLength(4);
      const fields = rows.map(row =>
        row.findAll("[data-field]").map(cell => cell.attributes("data-field")),
      );
      expect(fields).toEqual([
        ["工作地点_1", "工作内容_1"],
        ["工作地点_2", "工作内容_2"],
        ["工作地点_3", "工作内容_3"],
        ["工作地点_4", "工作内容_4"],
      ]);
      // 逐行键必须在验收数据里存在，否则填写态取不到值（指标「键与 demoData 一致无错位」）。
      for (const field of fields.flat()) {
        expect(Object.keys(demoData), `demoData 应含键 ${field}`).toContain(field);
      }
    });

    it("填写态：内嵌表按行独立回写（改一行不影响其他行）", () => {
      const data = {
        ...demoData,
        "工作地点_1": "1 号主变",
        "工作地点_2": "2 号主变",
        "工作内容_2": "清扫检查",
      };
      const wrapper = mount(GridFormRenderer, { props: { schema, data } });
      const rows = wrapper.findAll("tbody tr");
      const cellVal = (rowIdx: number, f: string) =>
        rows[rowIdx].find(`[data-field="${f}"]`).text();
      expect(cellVal(0, "工作地点_1")).toContain("1 号主变");
      expect(cellVal(0, "工作地点_1")).not.toContain("2 号主变");
      expect(cellVal(1, "工作地点_2")).toContain("2 号主变");
      expect(cellVal(1, "工作内容_2")).toContain("清扫检查");
      expect(cellVal(2, "工作地点_3").trim()).toBe("");
    });

    it("无意外溢出：校验无 CONTENT_OVERFLOW / PAPER_OVERFLOW（P10 指标「无意外溢出」）", () => {
      const overflow = validateFormSchemaV2(schema).filter(
        i => i.code === "CONTENT_OVERFLOW" || i.code === "PAPER_OVERFLOW",
      );
      expect(overflow).toEqual([]);
    });

    it("边框稳定：外层 Grid 为 all 模式且单元格不内联 border（P10 指标「行高和边框稳定」）", () => {
      const wrapper = mount(GridFormRenderer, { props: { schema } });
      const grid = wrapper.find('[data-node-id="ticket-layout"]');
      expect(grid.classes()).toContain("layout-grid--all");
      for (const cell of wrapper.findAll(".layout-grid__cell")) {
        expect(cell.attributes("style") ?? "", "格线由 CSS 单边归属绘制").not.toContain("border");
      }
    });

    it("修改列宽与标签后仍结构正确（P10 步骤 8「修改后保持正确」）", () => {
      let next = setGridColumnWidthV2(schema, "ticket-layout", 0, 20);
      next = updateCellWidthV2(next, "cell-u-l", 20);
      const json = serializeFormSchemaV2(next, true);
      const parsed = parseFormSchemaV2(json);
      expect(validateFormSchemaV2(parsed).filter(i => i.level === "error")).toEqual([]);
      expect(JSON.parse(json)).toEqual(JSON.parse(serializeFormSchemaV2(parsed, true)));
      const g = parsed.pages[0].children.find(c => c.id === "ticket-layout") as GridNodeV2;
      expect(g.columns?.[0]).toBe(20);
    });

    it("加载后可再次选中、移动和配置（P10 指标「所有节点可再次选中、移动和配置」）", () => {
      // 模拟「重新加载模板」：序列化落盘后再解析回来。
      const reloaded = parseFormSchemaV2(serializeFormSchemaV2(schema, true));

      // 移动：跨格移动组件 + 上移工作任务行
      const movedP = moveNodeV2(reloaded, "unit-field", "cell-n-f");
      const moved = moveGridRowV2(movedP, "row-work-task", "up");
      expect(validateFormSchemaV2(moved).filter(i => i.level === "error")).toEqual([]);
      const movedGrid = moved.pages[0].children.find(c => c.id === "ticket-layout") as GridNodeV2;
      expect(movedGrid.rows.map(r => r.id)).toEqual([
        "row-unit-number",
        "row-owner-team",
        "row-members",
        "row-work-task",
        "row-station",
      ]);

      // 配置：改行高、改列宽、改表格 minRows
      let configured = updateGridRowHeightV2(moved, "row-work-task", 6);
      configured = updateCellWidthV2(configured, "cell-u-l", 18);
      configured = updateTableMinRowsV2(configured, "work-task-table", 6);
      expect(validateFormSchemaV2(configured).filter(i => i.level === "error")).toEqual([]);

      // 再次选中：重建索引后所有节点仍可定位
      const index = buildEditorNodeIndexV2(configured);
      for (const id of [
        "unit-field",
        "owner-field",
        "team-field",
        "members-field",
        "station-field",
        "work-task-table",
        "title-text",
      ]) {
        expect(index.get(id), `移动/配置后节点 ${id} 应仍可索引`).toBeDefined();
      }

      // 配置生效：表格 minRows=6 渲染 6 行，工作任务行高变为 6×8=48mm
      const wrapper = mount(GridFormRenderer, { props: { schema: configured } });
      expect(wrapper.findAll("tbody tr")).toHaveLength(6);
      expect(wrapper.find('[data-layout-id="row-work-task"]').attributes("style")).toContain("min-height: 48mm");
    });
  });
});

/** 在序列化 JSON 文本中按 id 查找（避免依赖具体嵌套层级）。 */
function serializedContainsId(json: string, id: string): boolean {
  return json.includes(`"id":"${id}"`) || json.includes(`"id": "${id}"`);
}
