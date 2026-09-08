/**
 * 轻量 i18n（2026-09-08）：无第三方依赖，模块级响应式语言 + `t()` 取文案。
 *
 * 设计要点：
 * - `currentLocale` 用 `ref` 持有 → 模板里调用 `t(key)` 会建立响应式依赖，
 *   切语言后所有消费组件自动重渲染（无需 provide/inject 或 globalProperties）。
 * - `setLocale` 仅接受 `SUPPORTED_LOCALES` 中的值，非法值静默忽略（金标准：不写垃圾）。
 * - `t(key, params?)`：当前语言缺 key → 回退 `DEFAULT_LOCALE`；仍缺 → 回退 key 本身
 *   （便于发现漏翻，而非空白）。`{name}` 占位由 params 替换。
 * - 语言来源：设计页通过全局配置 `uiConfig.locale` 注入（见 `components/designer/config.ts`），
 *   `DesignerApp` 在挂载/配置变化时 `setLocale`；默认 `zh-CN`。
 */
import { ref } from "vue";
import type { Locale, Messages } from "./types";
import { zhCN } from "./zh-CN";
import { en } from "./en";

export type { Locale, Messages };

export const SUPPORTED_LOCALES: Locale[] = ["zh-CN", "en"];
export const DEFAULT_LOCALE: Locale = "zh-CN";

const dictionaries: Record<Locale, Messages> = {
  "zh-CN": zhCN,
  en,
};

const currentLocale = ref<Locale>(DEFAULT_LOCALE);

export function getLocale(): Locale {
  return currentLocale.value;
}

export function setLocale(locale: Locale): void {
  if (SUPPORTED_LOCALES.includes(locale)) {
    currentLocale.value = locale;
  }
}

/** 取当前语言文案；缺失 key 回退默认语言，仍缺失回退 key 本身。 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLocale.value] ?? dictionaries[DEFAULT_LOCALE];
  let msg = dict[key];
  if (msg == null) msg = dictionaries[DEFAULT_LOCALE][key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      msg = msg.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
    }
  }
  return msg;
}
