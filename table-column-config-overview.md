# Table 组件列配置（TicketDesigner）

## 完成内容
为固定版式表单设计器的 **Table 组件**补齐了列配置能力（此前仅有「表头高度 / 行高 / 最小行数」，缺少列增删与列属性编辑）。

### 改动文件
- **`src/types/schema-v 2-operations.ts`**（新增 3 个纯函数，已通过 `@/types` 出口暴露）：
  - `addTableColumnV2`：新增一列，同步向 `columns` 追加列定义、向 `rowTemplate` 追加一个对应字段 P 模板；列 key 自动生成且不与现有 key 冲突。
  - `removeTableColumnV2`：按 columnKey 同步删除 `columns` 与对应 `rowTemplate`，保留至少 1 列防止退化。
  - `updateTableColumnV2`：编辑列 meta（标题 / 宽度 / 对齐）。
- **`src/components/renderer-v2/GridSchemaNode.vue`**：新增 `tableCellStyle(column)`，把列 `align` 应用到表头 `<th>` 与单元格 `<td>`，使「对齐」配置真正生效（之前单元格对齐被硬编码为居中）。
- **`src/components/designer/DesignerApp.vue`**：右侧「节点检查」在选中 table 时新增「列配置」区块——列出每列的 key、标题输入、宽度（mm/fr/auto）、对齐下拉、删除按钮，以及「+ 添加列」；新增 `addTableColumn / removeTableColumn / updateTableColumn` 三个处理器（复用已有的宽度解析逻辑）。
- **`src/types/__tests__/schema-v2-operations.test.ts`**：新增  3 个用例覆盖新增/删除/编辑列，全部基于现有 `yunlv-second-ticket` 样例表格校验，并断言源 schema 不被 mutate。
- **`docs/development-plan.md`**：更新 P7.2 与配置面板清单，标记 Table 列编辑从「推迟」改为「已实现」。

### 关键决策
- 列编辑借用已有的 `updateSchemaNodeV2` 不可变更新 + 撤销合并 tag（`tblcol:...`），与既有 Grid/字段编辑一致。
- 删除列保留至少 1 列，避免渲染 `rowTemplate` 为空导致表格崩溃。

### 验证
- 类型检查（`vue-tsc --noEmit`）干净，退出码 0。
- 测试 **59/59 通过**（含新增 3 例）。
- 生产构建成功（CSS 10.67 kB / JS 150.68 kB）。

### 后续 / 备注
- 列内子组件（rowTemplate 的 P/Text/Image 等）的细粒度编辑仍按原计划 §2.2 推迟，未在此轮处理。
- 如需让列的「删除」支持快捷键或在画布内拖拽调序，可另行补充。
