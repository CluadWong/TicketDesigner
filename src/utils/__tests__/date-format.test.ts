import { describe, expect, it } from "vitest";
import {
  formatDateValue,
  parseDateValue,
  formatHasTime,
} from "../date-format";

describe("date-format 日期格式工具", () => {
  it("formatDateValue：日期格式串套用（年月日）", () => {
    expect(formatDateValue("2026-09-08", "{YYYY}年{MM}月{DD}")).toBe(
      "2026年09月08",
    );
  });

  it("formatDateValue：含时间 token 补零到秒", () => {
    // datetime-local 无秒 → 秒补 00
    expect(
      formatDateValue(
        "2026-09-08T14:30",
        "{YYYY}年{MM}月{DD} {hh}时{mm}分{ss}秒",
      ),
    ).toBe("2026年09月08 14时30分00秒");
  });

  it("formatDateValue：无 format / 无值 / 无法解析 → 原样返回（向后兼容）", () => {
    expect(formatDateValue("2026-09-08")).toBe("2026-09-08");
    expect(formatDateValue("2026-09-08", "")).toBe("2026-09-08");
    expect(formatDateValue("不是日期", "{YYYY}年{MM}月{DD}")).toBe("不是日期");
    expect(formatDateValue("", "{YYYY}年{MM}月{DD}")).toBe("");
  });

  it("parseDateValue：格式化串还原为 ISO（日期）", () => {
    expect(parseDateValue("2026年09月08", "{YYYY}年{MM}月{DD}")).toBe(
      "2026-09-08",
    );
  });

  it("parseDateValue：格式化串还原为 ISO（日期时间，含秒）", () => {
    expect(
      parseDateValue(
        "2026年09月08 14时30分00秒",
        "{YYYY}年{MM}月{DD} {hh}时{mm}分{ss}秒",
      ),
    ).toBe("2026-09-08T14:30:00");
  });

  it("parseDateValue：无 format / 无值 → 空串（无法回填）", () => {
    expect(parseDateValue("2026年09月08")).toBe("");
    expect(parseDateValue("", "{YYYY}年{MM}月{DD}")).toBe("");
  });

  it("formatHasTime：含时间 token 判定", () => {
    expect(formatHasTime("{YYYY}年{MM}月{DD} {hh}时{mm}分{ss}秒")).toBe(true);
    expect(formatHasTime("{YYYY}年{MM}月{DD}")).toBe(false);
    expect(formatHasTime(undefined)).toBe(false);
  });

  it("round-trip：格式化 ↔ 还原一致", () => {
    const format = "{YYYY}年{MM}月{DD} {hh}时{mm}分{ss}秒";
    const iso = "2026-09-08T14:30:00";
    const formatted = formatDateValue(iso, format);
    expect(formatted).toBe("2026年09月08 14时30分00秒");
    expect(parseDateValue(formatted, format)).toBe(iso);
  });
});
