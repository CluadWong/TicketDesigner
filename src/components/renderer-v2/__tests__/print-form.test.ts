import { afterEach, describe, expect, it, vi } from "vitest";
import { printForm } from "../print-form";

/**
 * D2：打印触发收口到渲染内核后的行为契约。
 * 重点是「宿主缺失 / 未实现 print / SSR」三类边界都静默返回 false 而非抛错——
 * 打印是宿主副作用，渲染层不能因环境不支持而崩。
 */
describe("printForm（D2 打印触发与呈现同归渲染内核）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("注入宿主时触发其 print 并返回 true", () => {
    const host = { print: vi.fn() };
    expect(printForm(host)).toBe(true);
    expect(host.print).toHaveBeenCalledTimes(1);
  });

  it("宿主缺少 print 实现时安全 no-op 并返回 false", () => {
    expect(printForm({})).toBe(false);
    expect(printForm({ print: undefined })).toBe(false);
  });

  it("显式传入 null 宿主时安全 no-op", () => {
    expect(printForm(null)).toBe(false);
  });

  it("缺省宿主取 window 并触发其 print", () => {
    const original = window.print;
    const spy = vi.fn();
    window.print = spy;
    try {
      expect(printForm()).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      window.print = original;
    }
  });

  it("window 未实现 print 时不抛错、返回 false", () => {
    const original = window.print;
    // @ts-expect-error 测试期移除以模拟不支持打印的宿主环境
    delete window.print;
    try {
      expect(() => printForm()).not.toThrow();
      expect(printForm()).toBe(false);
    } finally {
      window.print = original;
    }
  });

  it("SSR（无 window）时安全 no-op 并返回 false", () => {
    vi.stubGlobal("window", undefined);
    expect(() => printForm()).not.toThrow();
    expect(printForm()).toBe(false);
  });
});
