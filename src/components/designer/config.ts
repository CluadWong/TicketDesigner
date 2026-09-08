/**
 * 设计器全局 UI 配置（2026-09-08）。
 *
 * 用途：用一个结构化配置对象集中控制「设计页 UI」的可见性——当前主要作用于顶部
 * 工具栏的模块按钮组，后续可扩展到左侧组件面板 / 右侧检查器等（配置结构已预留）。
 *
 * 设计约定：
 * - `defaultDesignerUIConfig` 是**全局默认值**——默认显示除「填充数据」模块之外的全部按钮
 *   （`showFillDataModule: false`）；「填充数据」模块（导入/导出/读取/保存数据）默认隐藏，
 *   由宿主按需经 `DesignerApp` 的 `uiConfig` prop 开启。
 * - 默认语言 `locale: "zh-CN"`（见 `src/i18n`）；宿主经 `uiConfig.locale` 切换，如
 *   `<DesignerApp :ui-config="{ locale: 'en' }" />` 即可整页切英文（已迁移到 `t()` 的文案生效）。
 * - 宿主通过 `<DesignerApp :ui-config="{ showFillDataModule: true }" />` 局部覆盖；
 *   `resolveDesignerUIConfig` 做浅合并（每个开关独立），未提供的键回退到默认。
 * - 组件内统一用 `resolveDesignerUIConfig(props.uiConfig)` 得到完整配置，避免散落默认值。
 */

import type { Locale } from "@/i18n";

/** 设计页 UI 可见性开关 + 语言（每个开关独立，缺省见 `defaultDesignerUIConfig`）。 */
export interface DesignerUIConfig {
  /** 新建空白按钮。 */
  showNewBlank: boolean;
  /** 样例载入按钮（B3 注入的样例集）。 */
  showSamples: boolean;
  /** 撤销 / 重做按钮组。 */
  showUndoRedo: boolean;
  /** 模板模块组（保存 / 读取 / 导出文件 / 导入文件）。 */
  showTemplateModule: boolean;
  /** 填充数据模块组（导入数据 / 导出数据 / 读取数据 / 保存数据）。默认隐藏。 */
  showFillDataModule: boolean;
  /** 预览 / 打印按钮。 */
  showPreviewPrint: boolean;
  /** 帮助按钮。 */
  showHelp: boolean;
  /** 界面语言（默认简体中文）。 */
  locale: Locale;
}

/** 全局默认：显示除「填充数据」之外的所有模块，语言简体中文。 */
export const defaultDesignerUIConfig: DesignerUIConfig = {
  showNewBlank: true,
  showSamples: true,
  showUndoRedo: true,
  showTemplateModule: true,
  showFillDataModule: false,
  showPreviewPrint: true,
  showHelp: true,
  locale: "zh-CN",
};

/** 浅合并宿主覆盖到默认配置，返回完整 `DesignerUIConfig`。 */
export function resolveDesignerUIConfig(partial?: Partial<DesignerUIConfig>): DesignerUIConfig {
  return { ...defaultDesignerUIConfig, ...(partial ?? {}) };
}
