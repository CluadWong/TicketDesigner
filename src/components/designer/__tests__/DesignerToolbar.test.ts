import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DesignerToolbar from "@/components/designer/DesignerToolbar.vue";
import type { DesignerUIConfig } from "@/components/designer/config";

function mountToolbar(uiConfig?: Partial<DesignerUIConfig>) {
  return mount(DesignerToolbar, {
    props: {
      dirty: false,
      canUndo: true,
      canRedo: true,
      previewMode: false,
      samples: [],
      ...(uiConfig !== undefined ? { uiConfig } : {}),
    },
  });
}

function groupTexts(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll(".v2-toolbar__group").map((g) => g.text());
}

describe("DesignerToolbar 全局 UI 配置（2026-09-08）", () => {
  it("默认配置：隐藏「填充数据」模块，其余模块均显示", () => {
    const texts = groupTexts(mountToolbar());
    expect(texts.some((t) => t.includes("填充数据"))).toBe(false);
    expect(texts.some((t) => t.includes("模板"))).toBe(true);
    expect(texts.some((t) => t.includes("撤销"))).toBe(true);
    expect(texts.some((t) => t.includes("新建空白"))).toBe(true);
    // 预览 / 打印 / 帮助 同属末组，默认显示。
    const tail = texts[texts.length - 1];
    expect(tail).toContain("预览");
    expect(tail).toContain("打印");
    expect(tail).toContain("帮助");
  });

  it("showFillDataModule=true：显示填充数据模块（含导入/导出/读取/保存数据）", () => {
    const texts = groupTexts(mountToolbar({ showFillDataModule: true }));
    const fillGroup = texts.find((t) => t.includes("填充数据"));
    expect(fillGroup).toBeDefined();
    expect(fillGroup).toContain("导入数据");
    expect(fillGroup).toContain("导出数据");
    expect(fillGroup).toContain("读取数据");
    expect(fillGroup).toContain("保存数据");
  });

  it("showTemplateModule=false：隐藏模板模块组", () => {
    const texts = groupTexts(mountToolbar({ showTemplateModule: false }));
    expect(texts.some((t) => t.includes("模板"))).toBe(false);
  });

  it("showPreviewPrint / showHelp=false：末组相应按钮隐藏", () => {
    const wrapper = mountToolbar({ showPreviewPrint: false, showHelp: false });
    expect(wrapper.text()).not.toContain("预览");
    expect(wrapper.text()).not.toContain("打印");
    expect(wrapper.text()).not.toContain("帮助");
  });
});
