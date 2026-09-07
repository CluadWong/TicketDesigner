import { describe, expect, it } from "vitest";
import {
  createEmptyFormSchemaV2,
  normalizeFormSchemaV2,
  parseFormSchemaV2,
  serializeFormSchemaV2,
} from "@/types";

/**
 * 页眉 / 页脚的序列化：此前 `normalizeFormSchemaV2` 的 paper 只落 `size`，
 * 新增配置若不补进归一化就会被导出丢弃（本文件锁死该行为）。
 */
describe("页眉/页脚 序列化", () => {
  it("往返保留 paper.header / paper.footer", () => {
    const schema = createEmptyFormSchemaV2();
    schema.paper.header = {
      enabled: true,
      content: { left: "云铝", center: "第二种工作票" },
      height: 12,
      style: { fontSize: 14, fontWeight: "bold", color: "#111827" },
      separator: false,
    };
    schema.paper.footer = {
      enabled: true,
      content: { center: "第 {page} 页 / 共 {total} 页" },
    };

    const parsed = parseFormSchemaV2(serializeFormSchemaV2(schema));
    expect(parsed.paper.header).toEqual(schema.paper.header);
    expect(parsed.paper.footer).toEqual(schema.paper.footer);
  });

  it("未配置：不写入 header / footer 键（不产生 undefined 噪音）", () => {
    const schema = createEmptyFormSchemaV2();
    const parsed = parseFormSchemaV2(serializeFormSchemaV2(schema));
    expect(parsed.paper.header).toBeUndefined();
    expect(parsed.paper.footer).toBeUndefined();
    expect("header" in parsed.paper).toBe(false);
    expect("footer" in parsed.paper).toBe(false);
  });

  it("废弃键 orientation 仍被丢弃，header/footer 不受影响", () => {
    const schema = createEmptyFormSchemaV2();
    schema.paper.header = { enabled: true, content: { left: "A" } };
    const normalized = normalizeFormSchemaV2({
      ...schema,
      paper: { ...schema.paper, orientation: "landscape" },
    });
    expect(normalized.paper.orientation).toBeUndefined();
    expect(normalized.paper.header).toEqual({ enabled: true, content: { left: "A" } });
  });
});
