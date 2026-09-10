/** i18n 类型定义（2026-09-08）。 */
export type Locale = "zh-CN" | "en";

/** 单语言文案表：key → 文案（文案里可用 `{name}` 占位，由 `t(key, params)` 替换）。 */
export type Messages = Record<string, string>;
