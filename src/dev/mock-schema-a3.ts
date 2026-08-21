/**
 * A3 横向 Demo mock schema
 *
 * 与 A4 纵向 mock-schema.ts 对照，验证：
 *   - A3 横向（420×297mm）纸张几何渲染正确
 *   - 多列表格（6 列）在 A3 横向宽度下布局正常
 *   - 跨页表格 + 中长文本在 A3 高度（297mm）下的分页行为
 *   - usePrintStyle 动态输出 a3 landscape
 */

import type { FormSchema, TableComponent, TableRow } from "@/types";

/**
 * 构造 A3 横向 mock schema
 *
 * 主题：铝合金产品质检报告（A3 横向适合宽表格）
 */
export function makeMockSchemaA3(): FormSchema {
  // 构造 30 行检验记录（6 列，A3 横向宽度足够容纳）
  const rows: TableRow[] = Array.from({ length: 30 }, (_, i) => ({
    no: String(i + 1).padStart(3, "0"),
    batch: `B${20241000 + i}`,
    product: `铝合金板 ${1000 + i}×2000×3.0`,
    standard: "GB/T 3880.1-2012",
    result: i % 4 === 0 ? "不合格" : "合格",
    inspector: ["张三", "李四", "王五", "赵六"][i % 4],
  }));

  // 检验依据（中长文本）
  const inspectionBasis =
    "检验依据：本批次铝合金板材按 GB/T 3880.1-2012《一般工业用铝及铝合金板、带材》要求执行。" +
    "检验项目包含化学成分、力学性能、尺寸偏差、表面质量、包覆层厚度五大类。" +
    "拉伸试验在电子万能试验机上进行，屈服强度、抗拉强度、断后伸长率均按 GB/T 228.1 测试。" +
    "化学成分采用光电直读光谱仪分析，结果符合 GB/T 3190 牌号 3003 要求。" +
    "尺寸测量采用游标卡尺与千分尺，厚度偏差控制在 ±0.08mm 内。" +
    "表面质量逐张目视检验，不允许有裂纹、腐蚀斑点、压伤、擦伤等缺陷。" +
    "包覆层厚度采用金相法测定，每张板材取 3 个试样，平均值应不小于 4%。" +
    "本报告所列样品均为本批次随机抽取，检验结果代表本批次整体质量水平。";

  return {
    paper: { size: "A3", orientation: "landscape" },
    margin: 18,
    header: {
      height: 14,
      text: "云南铝业 铝合金板材质量检验报告",
      showPageNumber: true,
    },
    footer: {
      height: 14,
      text: "报告编号：YN-QC-2024-A3-001（机密）",
      showPageNumber: true,
    },
    body: [
      {
        id: "p-title",
        type: "p",
        field: "reportTitle",
        text: "铝合金板材质量检验报告",
      },
      {
        id: "p-basis",
        type: "p",
        field: "inspectionBasis",
        text: inspectionBasis,
      },
      {
        id: "p-sep",
        type: "p",
        text: "──── 检验数据明细 ────",
      },
      {
        id: "t-inspection",
        type: "table",
        field: "inspectionTable",
        columns: [
          { key: "no", title: "序号", width: 20 },
          { key: "batch", title: "批次号", width: 35 },
          { key: "product", title: "产品规格", width: 60 },
          { key: "standard", title: "执行标准", width: 50 },
          { key: "result", title: "检验结果", width: 25 },
          { key: "inspector", title: "检验员", width: 25 },
        ],
        rows,
      } as TableComponent,
      {
        id: "p-remark",
        type: "p",
        field: "remark",
        text:
          "备注：1) 本报告所列检验数据为原始记录，不得涂改；" +
          "2) 不合格批次已隔离存放，待复检后处置；" +
          "3) 检验结论由质检部门审核盖章后生效；" +
          "4) 本报告复印件未加盖质检专用章无效；" +
          "5) 异议提出期限为收货后 15 日内。",
      },
    ],
  };
}
