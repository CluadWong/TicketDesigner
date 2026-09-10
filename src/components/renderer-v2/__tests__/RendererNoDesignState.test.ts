import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GridFormRenderer from "@/components/renderer-v2/GridFormRenderer.vue";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";
import demoData from "@/dev/demoData";
import type { FormDataV2 } from "@/types";

/**
 * D3（渲染组件内为设计态服务的样式 / 交互 DOM 分支）收口闸门：
 * 渲染内核（renderer-v2）不再为设计态输出任何 DOM 分支——插入指示线（`.v2-insertion-line`）
 * 与拖拽悬停态（`dragOverCellId` / `dragOverIndex`）已整体移出内核，由设计表面层
 * `designer/CanvasSurface.vue` 用 overlay 绝对定位绘制。内核只认 schema + data + 版式相关 props。
 *
 * 本文件锁死这一点：任意模式下渲染结果都不含任何设计态交互 DOM，防止将来再把
 * 拖拽 / 插入线 / 选中态塞回渲染内核（内核曾输出 `.layout-node--selected` 与
 * `.v2-insertion-line`，A5 / D3 已分别移出）。
 */
const schema = makeYunlvSecondTicketFirstFiveRowsSchema();
const data = { ...(demoData as Record<string, unknown>) } as FormDataV2;

function html(mode: "design" | "preview"): string {
  const wrapper = mount(GridFormRenderer, {
    props: { schema, data, mode, paginate: false },
  });
  return wrapper.html();
}

describe("D3 渲染内核不含设计态交互 DOM", () => {
  it("任意模式下都不渲染插入指示线 .v2-insertion-line", () => {
    for (const mode of ["design", "preview"] as const) {
      expect(html(mode)).not.toContain("v2-insertion-line");
    }
  });

  it("渲染结果不含任何 drag-over-* 属性（拖拽悬停态已移出内核）", () => {
    for (const mode of ["design", "preview"] as const) {
      const h = html(mode);
      expect(h).not.toContain("drag-over-cell-id");
      expect(h).not.toContain("drag-over-index");
    }
  });

  it("内核对外 props 不再暴露 dragOverCellId / dragOverIndex 等设计态交互态", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema, data, mode: "design" },
    });
    const vm = wrapper.vm as unknown as { $props: Record<string, unknown> };
    const keys = Object.keys(vm.$props ?? {});
    expect(keys).not.toContain("dragOverCellId");
    expect(keys).not.toContain("dragOverIndex");
  });
});
