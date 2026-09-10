import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import HelpPanel from "@/components/designer/HelpPanel.vue";

/**
 * 应用内帮助面板（2026-09-08）：工具栏「帮助」按钮触发的浮层。
 * 锁四件事：关闭态零 DOM、打开态内容可见、三条关闭途径（✕ / 遮罩 / Esc）、
 * 以及「初始即 open」时 Esc 监听也已挂上（immediate watch 契约）。
 */
describe("HelpPanel 应用内帮助面板", () => {
  it("关闭时不渲染任何浮层 DOM", () => {
    const wrapper = mount(HelpPanel, { props: { open: false } });
    expect(wrapper.find(".v2-help").exists()).toBe(false);
  });

  it("打开时渲染面板与指南内容（含操作指南 / 快捷键 / 术语速查）", async () => {
    const wrapper = mount(HelpPanel, { props: { open: false } });
    await wrapper.setProps({ open: true });
    expect(wrapper.find(".v2-help__panel").exists()).toBe(true);
    expect(wrapper.text()).toContain("操作指南");
    expect(wrapper.text()).toContain("Ctrl/Cmd + S");
    expect(wrapper.text()).toContain("术语速查");
  });

  it("右上 ✕ 按钮触发 close", async () => {
    const wrapper = mount(HelpPanel, { props: { open: true } });
    await wrapper.find(".v2-help__close").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("点击遮罩（面板外）触发 close", async () => {
    const wrapper = mount(HelpPanel, { props: { open: true } });
    await wrapper.find(".v2-help").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("Esc 键触发 close；转 closed 后监听摘除、再按 Esc 不再触发", async () => {
    // 初始即 open：验证 immediate watch 在首挂载就挂上了 Esc 监听。
    const wrapper = mount(HelpPanel, { props: { open: true } });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(wrapper.emitted("close")).toHaveLength(1);

    await wrapper.setProps({ open: false });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});
