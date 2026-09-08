import type { Messages } from "./types";

/**
 * 英文文案（初版，由助手拟定，待人工核对）。
 * key 与 `zh-CN.ts` 一一对应；新增 key 须同步在两语言字典补充。
 */
export const en: Messages = {
  "toolbar.dirty": "● Unsaved",
  "toolbar.saved": "Saved",
  "toolbar.newBlank": "New Blank",
  "toolbar.loadSamplePrefix": "Load ",
  "toolbar.undo": "Undo",
  "toolbar.redo": "Redo",
  "toolbar.module.template": "Template",
  "toolbar.saveTemplate": "Save",
  "toolbar.loadTemplate": "Open",
  "toolbar.exportTemplate": "Export File",
  "toolbar.importTemplate": "Import File",
  "toolbar.module.fillData": "Fill Data",
  "toolbar.importFillData": "Import Data",
  "toolbar.exportFillData": "Export Data",
  "toolbar.loadFillData": "Load Data",
  "toolbar.saveFillData": "Save Data",
  "toolbar.preview": "Preview",
  "toolbar.exitPreview": "Exit Preview",
  "toolbar.print": "Print",
  "toolbar.help": "Help",
  "toolbar.importFillDataTip": "Choose a fill-data JSON file and enter preview",
  "toolbar.exportFillDataTip": "Fill in preview first, then export current values",
  "toolbar.loadFillDataTip": "Load locally saved fill data and enter preview",
  "toolbar.saveFillDataTip": "Fill in preview first, then save locally",
  "toolbar.previewTip": "See the actual filled form; you can input in preview and export as fill data",
  "toolbar.helpTip": "View usage instructions",
};
