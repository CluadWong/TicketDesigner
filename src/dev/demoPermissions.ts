/**
 * 字段级权限演示数据（demoPermissions）——与 demoData 同模式的 dev 夹具。
 *
 * 服务于消费演示页（src/preview/App.vue）：演示 P9.2a/P9.2b 字段级运行时权限
 * 的接入方式——与 `data` 同轨经 props 注入渲染组件，**不进 schema**：
 *
 * - `EDIT`：可输入（缺省值，未注明的字段一律可编辑，向后兼容）；
 * - `READ`：只读回显（渲染值但不可就地输入）；
 * - `HIDDEN`：脱敏显示——外壳与前/后标签照常渲染、占位保留，输入内容以 `***` 替代；
 *   真实值不进 DOM（collectFieldValues 跳过），消费页 getFormData 仍返回真实值。
 *
 * 键 = schema 字段名（需与样例模板的实际字段键一致，此处对齐 demoData 键集）。
 */
import type { FieldPermissionV2 } from "@/types";

export default {
  单位: "READ",
  编号: "READ",
  班组: "EDIT",
  "工作负责人（监护人）": "EDIT",
  电站设备: "HIDDEN",
} satisfies Record<string, FieldPermissionV2>;
