import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import TableInspector from "@/components/designer/inspectors/TableInspector.vue";
import { createTableNodeV2 } from "@/types";
import type { SchemaEdits } from "@/components/designer/composables/useSchemaEdits";

/** 占位 api：本测试只校验字号输入框的占位默认值，不触发任何编辑动作。 */
function stubApi(): SchemaEdits {
  return new Proxy({} as SchemaEdits, { get: () => () => undefined });
}

describe("TableInspector 表头样式", () => {
  it("表头字号输入框：未设置时占位默认 16（不写入 schema）", () => {
    const node = createTableNodeV2();
    expect(node.headerStyle?.fontSize).toBeUndefined();

    const wrapper = mount(TableInspector, { props: { node, api: stubApi() } });
    const inlineLabels = wrapper.findAll("label.v2-control--inline");
    const fontSizeLabel = inlineLabels.find((l) => l.text().includes("字号"));
    expect(fontSizeLabel).toBeDefined();
    const input = fontSizeLabel!.find("input");
    expect((input.element as HTMLInputElement).value).toBe("16");
  });
});
