import { describe, expect, it } from "vitest";
import { measureHeightMm } from "../measure-rows";

/**
 * 分页校正靠「测量真实行高」兜住确定性估算的偏差，测量一旦失真就会**漏分页**
 * （内容溢出纸张却不换页）。本文件锁死测量的取数口径。
 */
describe("行高测量（分页校正）", () => {
  it("用 offsetHeight：不受祖先 transform 缩放影响（getBoundingClientRect 会）", () => {
    const el = {
      offsetHeight: 38, // 布局高度 ≈ 10mm
      getBoundingClientRect: () => ({ height: 19 }), // 被 PaperViewport 缩放 50% 后的视觉高度
    } as unknown as HTMLElement;
    // 38px ÷ (96/25.4) ≈ 10.05mm —— 取的是布局高度，不是缩放后的 5mm
    expect(measureHeightMm(el)).toBeCloseTo(10, 0);
  });

  it("零高度（未布局 / jsdom）返回 0，由调用方跳过测量", () => {
    const el = { offsetHeight: 0 } as unknown as HTMLElement;
    expect(measureHeightMm(el)).toBe(0);
  });
});
