import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import PaperViewport from "@/components/renderer-v2/PaperViewport.vue";
import { __getLastOptions, __getPz, __resetPzRegistry } from "@/test-utils/panzoom-stub";

/**
 * PaperViewport（表面层 · 浏览缩放）测试。
 *
 * @panzoom/panzoom 在 jsdom 下经 vitest resolve.alias 指向 `panzoom-stub` 轻量替身，
 * 仅实现本组件实际调用的方法（getScale / zoom / reset / zoomWithWheel / resetStyle / destroy），
 * 并经由 `__getPz` / `__getLastOptions` 暴露最近实例与入参供断言。重点验证：
 * - 工具栏渲染与初始百分比；
 * - 放大/缩小按钮按 1.2 倍步进调用 zoom（并受 min/max 钳制）；
 * - panzoomchange 原生事件驱动百分比文本与 scale-change 发射；
 * - fitWidth 在 jsdom（clientWidth/scrollWidth=0）下安全回退 initialScale，不抛错；
 * - 滚轮在非控件区域交给 zoomWithWheel、在表单控件上放行原生滚动；
 * - onBeforeUnmount 复位样式并销毁。
 */
beforeEach(() => {
  __resetPzRegistry();
});

describe("PaperViewport（纸张视口 · 浏览缩放）", () => {
  it("挂载即创建 panzoom，并以 props 透传缩放边界/光标", () => {
    mount(PaperViewport, { props: { initialScale: 1, minScale: 0.2, maxScale: 4 } });
    const opts = __getLastOptions() as Record<string, unknown> | undefined;
    expect(opts).toBeTruthy();
    expect(opts).toMatchObject({ minScale: 0.2, maxScale: 4, startScale: 1, cursor: "grab" });
  });

  it("工具栏渲染：初始显示 100%，含放大/缩小/适应/重置按钮", () => {
    const wrapper = mount(PaperViewport);
    expect(wrapper.find(".paper-viewport__bar").exists()).toBe(true);
    expect(wrapper.find(".paper-viewport__scale").text()).toBe("100%");
    expect(wrapper.find('button[title="缩小"]').exists()).toBe(true);
    expect(wrapper.find('button[title="放大"]').exists()).toBe(true);
    expect(wrapper.find('button[title="适应宽度"]').exists()).toBe(true);
    expect(wrapper.find('button[title="重置为 100%"]').exists()).toBe(true);
  });

  it("放大按钮：当前比例 1 时以 1.2 步进调用 zoom", async () => {
    const wrapper = mount(PaperViewport);
    await wrapper.find('button[title="放大"]').trigger("click");
    expect(__getPz().zoom).toHaveBeenCalledWith(1.2);
  });

  it("缩小按钮：当前比例 1 时以 1/1.2 步进调用 zoom", async () => {
    const wrapper = mount(PaperViewport, { props: { minScale: 0.2 } });
    await wrapper.find('button[title="缩小"]').trigger("click");
    expect(__getPz().zoom).toHaveBeenCalledWith(1 / 1.2);
  });

  it("重置按钮：调用 reset（animate:false），不抛错", async () => {
    const wrapper = mount(PaperViewport);
    await wrapper.find('button[title="重置为 100%"]').trigger("click");
    expect(__getPz().reset).toHaveBeenCalledWith({ animate: false });
  });

  it("panzoomchange 原生事件：更新百分比文本并发射 scale-change", async () => {
    const wrapper = mount(PaperViewport);
    const scaler = wrapper.find(".paper-viewport__scaler").element;
    scaler.dispatchEvent(new CustomEvent("panzoomchange", { detail: { scale: 1.5 } }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".paper-viewport__scale").text()).toBe("150%");
    expect(wrapper.emitted("scale-change")?.[0]).toEqual([1.5]);
  });

  it("适应宽度：jsdom 下 clientWidth/scrollWidth 均为 0，安全回退 initialScale", async () => {
    const wrapper = mount(PaperViewport, { props: { initialScale: 1 } });
    await expect(
      wrapper.find('button[title="适应宽度"]').trigger("click"),
    ).resolves.not.toThrow();
    // 回退路径：pz.zoom(initialScale)
    expect(__getPz().zoom).toHaveBeenCalledWith(1);
  });

  it("滚轮：空白区域交给 zoomWithWheel；表单控件上放行原生滚动不触发缩放", async () => {
    const wrapper = mount(PaperViewport, {
      slots: { default: '<input class="ctl" />' },
    });
    const viewport = wrapper.find(".paper-viewport").element;
    // 非控件：事件 target = 视口本身 → 走 zoomWithWheel
    viewport.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
    expect(__getPz().zoomWithWheel).toHaveBeenCalledTimes(1);

    // 控件：target = input（含 contenteditable 也被排除）→ 不触发缩放
    const input = wrapper.find("input.ctl").element;
    input.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
    expect(__getPz().zoomWithWheel).toHaveBeenCalledTimes(1); // 次数不变
  });

  it("onBeforeUnmount：复位 panzoom 内联样式并销毁实例", () => {
    const wrapper = mount(PaperViewport);
    wrapper.unmount();
    expect(__getPz().resetStyle).toHaveBeenCalledTimes(1);
    expect(__getPz().destroy).toHaveBeenCalledTimes(1);
  });

  it("设计态 draggable 节点切到预览（移除 draggable）后，过期 panzoom-exclude 被清除、可平移", async () => {
    const wrapper = mount(PaperViewport, {
      attachTo: document.body,
      slots: { default: '<div class="node" draggable="true">design node</div>' },
    });
    const node = wrapper.find(".node").element as HTMLElement;
    // 设计态：draggable 命中选择器 → 打上 panzoom-exclude（被排除，不平移）
    expect(node.classList.contains("panzoom-exclude")).toBe(true);

    // 切到预览态：CanvasSurface 移除 draggable
    node.removeAttribute("draggable");
    // 等 MutationObserver（attributeFilter: draggable）触发 reconcile
    await new Promise((r) => setTimeout(r, 0));

    // 过期标记被清除 → 节点不再被排除，可正常平移（拖拽非输入组件允许平移）
    expect(node.classList.contains("panzoom-exclude")).toBe(false);
    wrapper.unmount();
  });

  it("字段（contenteditable）在 draggable 移除后仍保持排除，输入不被平移吞掉", async () => {
    const wrapper = mount(PaperViewport, {
      attachTo: document.body,
      slots: {
        default: '<p class="field" draggable="true" contenteditable="true">field</p>',
      },
    });
    const field = wrapper.find(".field").element as HTMLElement;
    expect(field.classList.contains("panzoom-exclude")).toBe(true);

    // 切到预览态：draggable 移除，但 contenteditable（真实输入区）仍在
    field.removeAttribute("draggable");
    await new Promise((r) => setTimeout(r, 0));

    // 仅 contenteditable 命中 → 仍被排除（字段可输入、不平移）
    expect(field.classList.contains("panzoom-exclude")).toBe(true);
    wrapper.unmount();
  });
});
