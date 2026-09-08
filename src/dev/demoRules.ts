/**
 * 字段级校验规则演示数据（demoRules）——与 demoData / demoPermissions 同模式的 dev 夹具。
 *
 * 服务于消费演示页（src/preview/App.vue）：演示 P9.2c 必填校验的接入方式——
 * 与 `data` / `fieldPermissions` 同轨经 props 注入（FormRenderer 的 `options.rules`），
 * **不进 schema**。键 = schema 字段名（需与样例模板的实际字段键一致，此处对齐
 * demoData 键集），值 = 规则对象（当前仅 `required`，可扩展 min/max/pattern 等）。
 * 消费页调 `FormRenderer.validate()`（defineExpose）按当前数据校验。
 */
import type { FieldRuleV2 } from "@/types";

export default {
  单位: { required: true },
  编号: { required: true },
  "工作负责人（监护人）": { required: true },
} satisfies Record<string, FieldRuleV2>;
