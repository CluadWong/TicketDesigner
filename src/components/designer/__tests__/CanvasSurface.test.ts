import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import CanvasSurface from "@/components/designer/CanvasSurface.vue";
import type { FormSchemaV2 } from "@/types";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";

/**
 * A5 分层重构后，选中高亮由「渲染内核」迁移到「设计表面层」(CanvasSurface)：
 * - 内核 (renderer-v2) 只输出稳定的 `data-node-id` 地址，不再感知选中态；
 * - CanvasSurface 通过 MutationObserver + watch 把 `.is-design-selected` 加到
 *   与 `selectedNodeId` 匹配的节点上，并去掉其它节点的残留类。
 *
 * 高亮在 watch 的 nested nextTick 中落地，故测试统一用 `flush()`（两次 nextTick）等待。
 */
async function flush(): Promise<void> {
  await nextTick();
  await nextTick();
}

function findSelected(wrapper: VueWrapper): string[] {
  return wrapper
    .findAll(".is-design-selected")
    .map((el) => el.attributes("data-node-id") ?? "");
}

describe("CanvasSurface selection highlight (A5)", () => {
  const schema = makeYunlvSecondTicketFirstFiveRowsSchema();

  it("applies .is-design-selected to the node matching selectedNodeId", async () => {
    const wrapper = mount(CanvasSurface, {
      props: { schema, mode: "design", selectedNodeId: "unit-field" },
    });
    await flush();

    const selected = findSelected(wrapper);
    expect(selected).toContain("unit-field");
    expect(wrapper.find('[data-node-id="unit-field"]').classes()).toContain(
      "is-design-selected",
    );
  });

  it("applies no highlight when selectedNodeId is null", async () => {
    const wrapper = mount(CanvasSurface, {
      props: { schema, mode: "design", selectedNodeId: null },
    });
    await flush();

    expect(findSelected(wrapper)).toHaveLength(0);
  });

  it("moves the highlight when selectedNodeId changes", async () => {
    const wrapper = mount(CanvasSurface, {
      props: { schema, mode: "design", selectedNodeId: "unit-field" },
    });
    await flush();
    expect(findSelected(wrapper)).toContain("unit-field");

    await wrapper.setProps({ selectedNodeId: "work-task-table" });
    await flush();

    const selected = findSelected(wrapper);
    expect(selected).toContain("work-task-table");
    expect(selected).not.toContain("unit-field");
  });

  it("is mode-agnostic: highlights whenever selectedNodeId is set (preview suppression is FormDesigner's job)", async () => {
    // 表面层只认 selectedNodeId，不感知 mode；预览态「无选中」由 FormDesigner 传 null 实现，
    // 本测试确认表面层本身的行为：只要传了非 null selectedNodeId 就高亮（与 mode 无关）。
    const wrapper = mount(CanvasSurface, {
      props: { schema, mode: "preview", selectedNodeId: "unit-field" },
    });
    await flush();

    expect(findSelected(wrapper)).toContain("unit-field");
  });
});
