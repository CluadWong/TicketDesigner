# 交付场景差距分析：设计器导出 JSON → 渲染器独立消费 (json+data) → 打印

> 生成日期：**2026-09-02**
> 场景（用户最终澄清，第 7 轮）：**本应用只含「设计器」与「渲染组件（renderer-v2）」两块，不含服务器、不含组件消费页面**。完整使用场景为——
> ① 设计器设计表单并**导出 JSON**；② 服务器**透明存储**该 JSON（外部应用，不在本应用）；③ 消费页面（外部独立应用）**引用渲染器 + JSON + data 完成渲染**；④ 用户调用**打印**功能。
> 本文只做核对，**不含代码改动**；配套 [architecture-layering-review.md](./architecture-layering-review.md)（分层核对）。

> **范围澄清（2026-09-02 用户定稿）**：
> - **本应用** = 设计器（导出 JSON）+ 渲染组件（消费 JSON+data 渲染 + 打印）。
> - **外部** = 服务器存储、消费页面（宿主应用）。二者是"本应用"的上下游，其可行性**不依赖**本应用新增功能，只依赖本应用交付的 JSON 与渲染器契约是否自洽。
> - 因此差距只落在两处：**(a) 设计器导出的 JSON 是否自洽、可被消费**；**(b) 渲染组件能否独立于设计器消费 JSON+data 并正确渲染（含打印）**。
> - 标注约定：每条差距在表中以 **◆ 本应用须补** 或 **◇ 外部实现** 标注归属；仅 **◆** 计入本应用行动清单。

---

## 0. 目标链路与当前断点

```text
① 设计器设计 → 导出 JSON   →   ②（服务器透明存储）   →   ③ 消费页面：引用渲染器 + JSON + data 渲染   →   ④ 用户打印
      （已具备）                （◇ 外部，透明存储）              （◆ 渲染组件须可独立消费）                    （◆ 打印须可用）
```

定稿结论：**第 ① 步"设计 + 导出 JSON"已具备，第 ② 步为外部透明存储，真正的本应用断点全部落在「渲染组件作为可被独立消费的一层」上**——即 ◆ G8（独立入口）/ G5（容错解析）/ G6（未知类型降级）/ G12（字段清单）/ G16（空值缺陷）/ G11（单 DOM）/ G15（回写 emit）。这与分层核对 §6.5 高度重合：当前要做的不是新功能，而是把渲染组件打磨成可交付的一层。

---

## 0.1 范围澄清细目（G1–G19 归属）

| 标注 | 含义 | 覆盖条目 |
|---|---|---|
| **◆ 本应用须补** | 落在设计器导出 / 渲染器消费契约内，本应用需补齐 | G4 G5 G6 G7 G8 G9 G10 G11 G12 G13 G14 G15 G16 G17 G18 |
| **◇ 外部实现** | 由服务器 / 消费页面承担，本应用无需实现（仅备案） | G1 G2 G3 G18b G19 |

> 外部条目（G1/G2/G3/G19/G18b）为何不影响本应用：它们只要求"本应用给出 JSON 与渲染器契约"，本应用无需提供存储、模板信封、草稿/发布分级或资源存储约定。本应用暴露 `v-model:schema` + `@save`、约定 Schema 版本字段即可满足所有外部对接需求。

---

## 1. 核对范围

| 对象 | 结论依据 |
|---|---|
| `src/types/schema-v2-serialization.ts` | 全文读（`normalizeFormSchemaV2` / `serialize` / `parse`） |
| `src/types/schema-v2-validation.ts` | 校验码与级别统计：**error 18 处 / warning 10 处** |
| `src/types/schema-v2-table-rows.ts` | 全文读（`buildTableRowField` / `bindTableRowCell` / `collectFieldKeys` / `resolveTableRowCount`） |
| `src/types/schema-v2.ts` | `FormSchemaV2`（仅 `version: 2`）、`FieldPNodeV2`（无 label/required/校验）、`FormDataV2 = Record<string, string\|number\|boolean\|null>` |
| `src/components/renderer-v2/*` | 分层核对已全文读 |
| `vite.config.ts` / `package.json` / `main.ts` | 单入口应用构建；`private: true`，无 lib 构建、无 `exports`；别名 `@ → src` |
| `src/styles/root.css` | 仅 `body{margin:0}`，无强全局依赖 |

---

## 2. 差距清单

> 优先级：**P0** = 不做则渲染组件无法被独立/可靠消费；**P1** = 影响正确性或集成体验；**P2** = 演进与规范；**P3** = 安全加固。
> 归属：**◆** = 本应用须补（计入行动清单）；**◇** = 外部实现（仅备案，不计入）。

### 2.1 ◆ 本应用须补（设计器导出 / 渲染器消费契约）

| 编号 | 归属 | 差距 | 证据 | 影响 | 建议 | 优先级 |
|---|---|---|---|---|---|---|
| **G16** | ◆ | **空值与 default 语义冲突（实际缺陷）** | `fieldValue(node)`：`raw == null \|\| raw === ""` 时回退 `node.default ?? ""`；填充态 `<textarea :value="fieldValue(node)">` | 带 `default` 的字段**无法被清空**：清空 → 回写 `""` → 回退 default → 控件又显示默认内容；消费页面同样表现为"清空的字段看起来没清掉" | 区分"未填"与"清空"：data 中存在该键（即便为空串）时不再回退 default | **P0** |
| **G11** | ◆ | **只读与可编辑是两套 DOM** | 分层核对 A3：`canFill` 决定渲染 `<textarea>` 还是静态文本 / 逐行 `<div>` | 同一份数据在"浏览（消费页只读）"与"填写"下版式可能不一致（换行、行高、innerBorder 逐行横线）；打印与填写结果对不上 | 统一渲染路径：`mode` 显式传入，只读态复用同一结构 | **P0** |
| **G12** | ◆ | **没有完整字段清单导出** | `collectFieldKeys` 只收集 schema 中**手写**的 `field`；表格行模板内字段 P 留空、由渲染期 `bindTableRowCell` 派生为 `列key_行号`，因此**表格字段一个都收不到**；也没有按 `minRows × 列key` 枚举的 API | 表格是工作票主体，等于字段清单缺了大部分；消费页面"按字段取数/导出/校验"无从建立 | 新增 `collectSchemaFields(schema, data?)`：非表格走 `collectFieldKeys`；表格按 `列key_行号` 枚举 `max(minRows, data 推导行)` 行，输出 `[{key, kind, tableField?, row?, label?}]` | **P0** |
| **G5** | ◆ | 解析"严格即崩" | `parseFormSchemaV2` 过滤 `level === "error"` 即 throw；18 条 error 中多条对渲染并不致命：`EMPTY_PAGE`、`EMPTY_FIELD`、`DUPLICATE_FIELD`、`INVALID_GRID_ROWS`（空 Grid） | 一处瑕疵（如误建一个空 Grid）就让整张表单打不开，而不是局部降级；消费页无法"容忍"设计器导出的小瑕疵 | 解析分两级：`parseStrict`（设计器保存/发布用）+ **`parseTolerant`（渲染端用，坏节点降级为占位并收集 issues）** | **P0** |
| **G6** | ◆ | 未知节点类型直接抛异常 | `normalizeNode` 末尾 `throw new SchemaV2SerializationError("Unknown Schema node type")` | 设计器今后新增节点类型，未升级的渲染端（消费页引用旧版本）遇到新模板**整体崩溃** | 渲染端降级：未知 type → 渲染占位 / 跳过 + 记 issue | **P0** |
| **G8** | ◆ | 渲染组件**不能被独立使用** | `App.vue` 只挂 `DesignerApp`；`src/components/preview/` 为空目录；组件用别名 `@/` import `@/types`（含渲染期逻辑）与 `dompurify`；`package.json` `private: true`、无 lib 构建与 `exports` | 渲染组件目前只能在设计器里被看到，消费页面"引用渲染器"无法落地 | 先做**可独立运行**（独立入口页 + props 收敛为 `schema / data / mode / options`）；库化打包（vite lib + dts）可延后 | **P0** |
| **G9** | ◆ | 无独立入口、用法示例与测试护栏 | `GridFormRenderer.test.ts` 仅 1 例；无 README | 作为交付件缺少最基本的可信度 | 补：`preview` 入口页 + 最小调用示例 + 测试（只读回显 / data 回显 / 老模板容错 / 字段缺失容错） | **P1** |
| **G15** | ◆ | 数据回写契约是设计器私有的 | `inject("formFill")` 字符串 key；宿主页面无 provide 即**静默失效**（默认空函数） | 消费填写页拿不到用户输入，且不报错 | 改 emit（`update:data` / `field-change`），使用方 v-model 接管 | **P1** |
| **G10** | ◆ | 渲染形态不可配：纸张外壳硬编码 | `.grid-form-canvas` 固定灰底 + 24px padding + 纸张阴影；纸张固定 `A4/A3` 毫米尺寸，无缩放 | 消费页通常只需"嵌入页面中部"，不需要模拟纸张；小屏看 A4 需要缩放 | 增加 `bare`（无外壳）/ `scale` / `paper` 可选项 | **P2** |
| **G14** | ◆ | 无空数据骨架生成 | 没有 `createEmptyFormData(schema)` | 使用方需自行按字段清单造初始 data，易漏 | 随 G12 一起提供 | **P2** |
| **G4** | ◆ | 无版本迁移能力 | `normalizeFormSchemaV2` 首行 `if (source.version !== 2) throw` | Schema 一升级，旧模板全部不可用 | 预留迁移链 `migrate(input)`（v1→v2→v3…），迁移后再 normalize | **P2** |
| **G7** | ◆ | 已废弃字段仍被保留与写回 | normalize 用展开 `{...node}` 保留未知键（已删除的 `repeatable`/`inputType` 被来回搬运）；仍写入 `orientation`（默认 `portrait`），而渲染层自 P11-3 起**方向由纸张尺寸派生、忽略 orientation** | 语义不一致：带 `orientation:"landscape"` 的模板会被保留却不生效 | normalize/migrate 时显式剔除已知废弃键 | **P2** |
| **G13** | ◆ | 无字段级元数据 | `FieldPNodeV2` 无 label / required / 数据类型 / 校验规则 | 无法按字段做校验、导出表头或生成录入页 | 向后兼容地补 `label?` / `required?` / `rules?`（缺省即现状） | **P2** |
| **G17** | ◆ | 外部组件 `action` 在渲染端**完全没有实现** | `FieldPNodeV2.action` 支持 `date/signature/upload/safetyGraphic`，设计器与渲染组件均无处理（设计器内"不实现"） | 这类字段退化为普通文本框，与消费页设计语义不符（日期不能选、签名不能签） | 渲染组件提供 action 扩展点（使用方注入处理器），至少把 action 透出到 DOM/事件 | **P2** |
| **G18** | ◆ | HTML 节点清洗可收紧 | 渲染侧已有 DOMPurify + Shadow DOM；但 `ADD_ATTR` 允许 `target`（`<a target>` 可 tabnabbing，缺 `rel="noopener"`） | 模板写入恶意 HTML 时，所有访问者受影响 | 收紧 `ALLOWED_ATTR` 并补 `rel`；保存侧清洗属服务器范围（◇ G18b） | **P3** |

### 2.2 ◇ 外部实现（服务器 / 消费页面，仅备案，不计入本应用行动清单）

| 编号 | 标注 | 条目 | 备注 |
|---|---|---|---|
| **G1** | ◇ | 无"保存模板到服务器"环节 | 设计器只有 `exportFile`（浏览器下载 JSON）与 `saveToLocal`（localStorage）。集成时：设计器暴露 `v-model:schema` + `@save`，由宿主决定存哪 |
| **G2** | ◇ | 草稿与发布未分级 | `serializeFormSchemaV2` 有 error 即拒 → 草稿无法保存。将来拆 `serialize`（宽松）与 `validateForPublish`（严格） |
| **G3** | ◇ | 模板无元信息 | `FormSchemaV2.version: 2` 是**格式版本**不是模板版本；无 templateId / 名称 / revision。将来约定外层信封 `{ templateId, name, bizType, revision, status, schema, ... }` |
| **G19** | ◇ | 图片/资源引用无约定 | `src` 可为 URL 或 data URI；将来约定走对象存储、模板只存引用，或限定 data URI 体积 |
| **G18b** | ◇ | 保存侧无校验/清洗 | 与 G18 配套的双保险之另一半，属服务端职责 |

---

## 3. 最小落地路径（定稿范围：◆ 本应用须补）

1. **渲染组件可独立消费（G8 + G9）**：独立 `preview` 入口 + props 收敛为 `schema / data / mode / options` + 调用示例 + 测试补齐，使消费页可引用。
2. **解析容错（G5 + G6）**：拆 `parseStrict` / `parseTolerant`，未知类型降级为占位并收集 issues，保证消费页容忍设计器瑕疵与新版本。
3. **字段清单（G12 + G14）**：`collectSchemaFields(schema, data?)` + `createEmptyFormData(schema)`，让消费页能按字段取数/导出/校验。
4. **数据与一致性（G15 + G16 + G11）**：回写改 emit；修空值回退缺陷；只读与可编辑统一渲染路径，保证消费页浏览/填写/打印版式一致。
5. **渲染形态（G10）**：`bare` / `scale` / `paper` 可选项，适配消费页嵌入。
6. **收尾（G4 + G7 + G13 + G17 + G18）**：迁移入口、废弃键清理、字段元数据、action 扩展点、清洗收紧。

> 与分层核对的关系：G8/G9 ↔ B1，G11 ↔ A1/A3，G15 ↔ A4，G16 ↔ 取值逻辑。**第 1–4 步与分层整改 §6.5 的第 1–4 批几乎完全重合，建议合并推进**（设计器导出 JSON 自洽 + 渲染器独立消费，是本应用同一件事的两面）。

---

## 4. 待拍板（定稿范围）

| 议题 | 选项 |
|---|---|
| 空值语义（G16） | ① data 中存在该键（即便空串）即不回退 `default`（推荐，可清空）；② 维持现状（无法清空带默认值的字段） |
| 表格字段清单口径（G12） | ① 按 `minRows` 固定枚举、行超出时按 data 追加（清单稳定）；② 完全随 data 动态（清单不稳定，只能整体存 JSON） |
| 渲染组件交付形态（G8） | ① 先只做"可独立运行"的入口与示例（当前范围）；② 同时做库化打包（vite lib + dts，external vue）；③ 源码复制到宿主仓库 |
| 消费页对接契约（外部 ◇） | 本应用只需暴露：设计器 `v-model:schema` + `@save`、渲染器 props `schema/data/mode/options`、Schema `version` 字段；其余由消费页/服务器自理 |
