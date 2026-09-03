import { describe, expect, it } from "vitest";
import { mount, type DOMWrapper } from "@vue/test-utils";
import { nextTick as vueNextTick } from "vue";
import DesignerApp from "@/components/designer/DesignerApp.vue";

/** 定位「填充数据」工具组，避免与 schema 组的「保存 / 导出文件」按钮混淆。 */
function findFillDataGroup(wrapper: ReturnType<typeof mount>): DOMWrapper<Element> {
  const groups = wrapper.findAll(".v2-toolbar__group");
  const group = groups.find((g) => g.text().includes("填充数据"));
  if (!group) throw new Error("未找到「填充数据」工具组");
  return group;
}

function buttonByText(
  group: DOMWrapper<Element>,
  text: string,
): DOMWrapper<HTMLButtonElement> {
  const btn = group.findAll("button").find((b) => b.text().trim() === text);
  if (!btn) throw new Error(`工具组内未找到按钮：${text}`);
  return btn;
}

describe("B2 填充数据导入/导出生命周期（三十续）", () => {
  it("设计态：填充数据组含 导入/导出/读取/保存，且导出/保存禁用", () => {
    const wrapper = mount(DesignerApp);
    const group = findFillDataGroup(wrapper);
    const importBtn = buttonByText(group, "导入");
    const exportBtn = buttonByText(group, "导出");
    const loadBtn = buttonByText(group, "读取");
    const saveBtn = buttonByText(group, "保存");

    expect(importBtn.exists()).toBe(true);
    expect(loadBtn.exists()).toBe(true);
    // 入口（导入/读取）设计态可用；结果出口（导出/保存）仅预览态可用。
    expect(importBtn.attributes("disabled")).toBeUndefined();
    expect(loadBtn.attributes("disabled")).toBeUndefined();
    expect(exportBtn.attributes("disabled")).toBeDefined();
    expect(saveBtn.attributes("disabled")).toBeDefined();
  });

  it("预览态：导出/保存转为可用", async () => {
    const wrapper = mount(DesignerApp);
    await wrapper.find('[data-view-mode="preview"]').trigger("click");
    await vueNextTick();

    const group = findFillDataGroup(wrapper);
    expect(buttonByText(group, "导出").attributes("disabled")).toBeUndefined();
    expect(buttonByText(group, "保存").attributes("disabled")).toBeUndefined();
  });
});
