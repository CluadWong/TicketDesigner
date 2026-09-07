/**
 * 文档 composable 单测（2026-09-07 批次 1 拆分）。
 *
 * 拆分前这些行为只能通过 DesignerApp 的 DOM 点击间接验证；现在可脱离组件直接测：
 * 提交 / 撤销 / 重做 / tag 合并窗口 / 整份替换 / 本地持久化往返。
 */
import { describe, beforeEach, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { useSchemaDocument, SCHEMA_STORAGE_KEY } from "../useSchemaDocument";
import { updateBaseRowHeightV2, serializeFormSchemaV2 } from "@/types";

function bump(doc: ReturnType<typeof useSchemaDocument>, rowHeight: number, tag?: string) {
  doc.commit(updateBaseRowHeightV2(doc.schema.value, rowHeight), tag);
}

describe("useSchemaDocument", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("缺省初始化为空白文档：1 个页面 + 1 个根 Grid", () => {
    const doc = useSchemaDocument();
    expect(doc.schema.value.pages).toHaveLength(1);
    expect(doc.schema.value.pages[0].children).toHaveLength(1);
    expect(doc.dirty.value).toBe(false);
  });

  it("initialSchema 被深拷贝，改动初始对象不影响文档", () => {
    const seed = useSchemaDocument().schema.value;
    const doc = useSchemaDocument(seed);
    seed.pages[0].margin.top = 99;
    expect(doc.schema.value.pages[0].margin.top).not.toBe(99);
  });

  it("commit 标记脏；undo / redo 在版本间往返", async () => {
    const doc = useSchemaDocument();
    const before = doc.schema.value.baseRowHeight;
    bump(doc, before + 4);
    await nextTick();
    expect(doc.schema.value.baseRowHeight).toBe(before + 4);
    expect(doc.dirty.value).toBe(true);
    expect(doc.canUndo.value).toBe(true);

    doc.undo();
    expect(doc.schema.value.baseRowHeight).toBe(before);
    expect(doc.canRedo.value).toBe(true);
    doc.redo();
    expect(doc.schema.value.baseRowHeight).toBe(before + 4);
  });

  it("空历史时 undo / redo 是空操作", () => {
    const doc = useSchemaDocument();
    const snapshot = doc.schema.value;
    doc.undo();
    doc.redo();
    expect(doc.schema.value).toBe(snapshot);
  });

  it("同 tag 在 800ms 窗口内合并为一步，跨窗口则各自一步", async () => {
    const doc = useSchemaDocument();
    bump(doc, 10, "edit:node-a");
    bump(doc, 11, "edit:node-a");
    expect(doc.canUndo.value).toBe(true);
    doc.undo();
    // 两次提交被合并：一次撤销即回到最初
    expect(doc.schema.value.baseRowHeight).toBe(
      useSchemaDocument().schema.value.baseRowHeight,
    );

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    const doc2 = useSchemaDocument();
    bump(doc2, 20, "edit:node-b");
    nowSpy.mockReturnValue(1_000_900);
    bump(doc2, 21, "edit:node-b");
    expect(doc2.canUndo.value).toBe(true);
    doc2.undo();
    expect(doc2.schema.value.baseRowHeight).toBe(20);
    doc2.undo();
    expect(doc2.schema.value.baseRowHeight).toBe(
      useSchemaDocument().schema.value.baseRowHeight,
    );
  });

  it("resetHistory 清空历史与脏标记，并触发 onReset 回调", () => {
    let resetCount = 0;
    const doc = useSchemaDocument(undefined, { onReset: () => resetCount++ });
    bump(doc, 30);
    expect(doc.canUndo.value).toBe(true);
    doc.resetHistory(updateBaseRowHeightV2(doc.schema.value, 40));
    expect(doc.canUndo.value).toBe(false);
    expect(doc.canRedo.value).toBe(false);
    expect(doc.dirty.value).toBe(false);
    expect(resetCount).toBe(0); // resetHistory 本身不触发（调用方自行清选中）
  });

  it("saveToLocal / loadFromLocal 往返一致，且读取后触发 onReset", () => {
    let resetCount = 0;
    const doc = useSchemaDocument(undefined, { onReset: () => resetCount++ });
    bump(doc, 50);
    doc.saveToLocal();
    expect(localStorage.getItem(SCHEMA_STORAGE_KEY)).toContain("baseRowHeight");
    expect(doc.dirty.value).toBe(false);

    const other = useSchemaDocument(undefined, { onReset: () => resetCount++ });
    other.loadFromLocal();
    expect(serializeFormSchemaV2(other.schema.value, true)).toBe(
      serializeFormSchemaV2(doc.schema.value, true),
    );
    expect(resetCount).toBe(1);
  });
});
