import { describe, expect, it } from "vitest";
import { findEmptyRequiredFields } from "@/engine-v2/derivation";

/**
 * P9.2c 必填校验（引擎侧真相源）：规则由消费方经 props（FormRenderer `options.rules`）
 * 注入、不进 schema；空值口径 = 键缺失 / undefined / 空串 / 纯空白。
 */
describe("findEmptyRequiredFields（P9.2c 必填校验）", () => {
  const rules = {
    单位: { required: true },
    编号: { required: true },
    备注: {}, // 未声明 required → 不参与校验
  };

  it("键缺失 / 空串 / 纯空白 → 计为未填", () => {
    expect(findEmptyRequiredFields(rules, {})).toEqual(["单位", "编号"]);
    expect(findEmptyRequiredFields(rules, { 单位: "", 编号: "   " })).toEqual([
      "单位",
      "编号",
    ]);
  });

  it("已填（含空白包裹的非空值）→ 通过", () => {
    expect(
      findEmptyRequiredFields(rules, { 单位: "x", 编号: " 1 " }),
    ).toEqual([]);
  });

  it("未声明 required 的规则键：值为空也不报", () => {
    expect(findEmptyRequiredFields(rules, { 备注: "" })).toEqual([
      "单位",
      "编号",
    ]);
  });

  it("rules 缺省 / 空对象 → 空数组（零规则零校验，向后兼容）", () => {
    expect(findEmptyRequiredFields(undefined, {})).toEqual([]);
    expect(findEmptyRequiredFields({}, {})).toEqual([]);
  });

  it("data 为 null / undefined → 所有 required 规则记为未填", () => {
    expect(findEmptyRequiredFields(rules, null)).toEqual(["单位", "编号"]);
    expect(findEmptyRequiredFields(rules, undefined)).toEqual([
      "单位",
      "编号",
    ]);
  });
});
