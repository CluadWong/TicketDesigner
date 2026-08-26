# 表单设计器业务设计

> 本文描述嵌套 Schema 下的组件语义和设计器操作。总体架构见 [design.md](./design.md)，
> 渲染算法见 [engine.md](./engine.md)，实施路线见 [development-plan.md](./development-plan.md)。

## 1. 产品产物

系统提供两个独立产物：

1. **模板设计器**：通过 UI 编辑数据无关的 FormSchema。
2. **表单预览组件**：接收 schema、data 和 rules，完成填写、查看和打印。

模板设计器是否合格，必须由“UI 构建 → 保存 → 加载 → 填写 → 打印”完整链路验证，
不能只以人工编写 Schema 后 Renderer 能显示作为验收。

## 2. 设计器界面

```text
┌─ 工具栏：纸张 / 边距 / 基础行高 / 预览 / 保存 / 撤销 ───┐
├──────────┬──────────────────────────┬──────────────────┤
│ 组件库   │ 固定纸张画布             │ 配置面板         │
│ Grid     │ 格子辅助线、选中和投放点 │ 页面/行/格/组件  │
│ P        │                          │                  │
│ Table    │                          │                  │
│ HTML     │                          │                  │
│ Image    │                          │                  │
├──────────┴──────────────────────────┴──────────────────┤
│ 节点面包屑 / 缩放 / 结构错误 / 字段与溢出警告           │
└─────────────────────────────────────────────────────────┘
```

画布操作围绕 Page、Grid 和组件进行，不提供绝对坐标定位；GridRow/GridCell 仅作为内部布局槽位。

## 3. 节点与选择

Page、Grid、TableCellTemplate 和组件都有唯一 ID；GridRow/GridCell 的 ID 仅用于布局引用。设计器运行时建立节点索引：

选择链只包含 Page、Grid 和实际组件。点击 Cell 空白区域时，选择其所属 Grid；Row/Cell 不会成为 active 节点。

节点索引提供按 ID 查询节点、祖先链和所属插槽的 API；Schema 更新后通过计算索引重新派生，避免保留旧对象引用。

```ts
interface EditorNodeRef {
  node: SchemaNode
  parent: SchemaNode | null
  path: Array<string | number>
  ownerCell?: GridCell | TableCellTemplate
}
```

索引用于：

- 根据 ID 选择节点。
- 展示 Page > Grid > Row > Cell > Component 面包屑。
- 确定拖拽源和目标。
- 更新配置面板。
- 生成结构 patch 和撤销记录。

索引不写入 Schema，重新加载后根据嵌套结构重建。

## 4. Grid 业务语义

Grid 是静态布局容器，由 rows 和 cells 构成。

### 4.1 行操作

- 在指定位置新增空行。
- 复制行及其所有子组件，并重新生成后代 ID。
- 删除行及其内容。
- 上下移动行。
- 设置基础行高倍数。
- 将内容过高的行标记为溢出，不自动改变固定高度。

### 4.2 Grid 布局操作

- 选中 Grid 后设置整体行数和列数，自动维护内部布局槽位。
- Grid 内部槽位支持固定 mm、fr 或 auto 宽度，以及 padding、水平和垂直对齐。
- 复杂内容通过在槽位内嵌套 Grid 实现，不把行和格子提升为独立组件。
- 拆分已合并格子。
- 将格子内组件排序。
- 将多个组件包装为子 Grid。

### 4.3 边框

- all：外框和内部格线。
- outer：仅外框。
- inner：仅内部格线。
- none：无边框。

嵌套 Grid 默认不重复绘制父格子的边框。

## 5. P 业务语义

P 有两种互斥模式：

| 模式 | 主要属性 | 设计态 | 预览态 |
|---|---|---|---|
| static | text | 显示固定标签 | 固定显示，不可编辑 |
| field | field、inputType、prefix、suffix | 输入格，可带前后固定标签；字段名写入 data-field 属性 | 填入 data[field] 并按权限编辑 |

约束：

- field P 的字段名不作为可见文本或占位符渲染，只写入组件的 data-field 属性。
- field P 的 `prefix` / `suffix` 用于同一组件内的前后固定标签；只配置 `prefix` 可表达“标签 + 输入器”。
- 切换 field → static 时提示 field 将不再参与数据绑定。
- field 模式未设置字段名时显示结构警告。
- field 重复是软警告，不阻止保存。
- 日期和签名先作为 inputType，不急于新增顶层组件。

## 6. Table 业务语义

Table 用于规则明细，不用于整张表单排版。

设计器必须支持：

- 新增、删除和移动列。
- 设置列 key、标题、宽度和对齐。
- 设置表头高度、数据行高度和最小行数。
- 设置 repeatable。
- 编辑 rowTemplate 中每个列的子组件。
- 将 P 或子 Grid 放入单元格模板。
- 新建 Table 时，每个列模板默认包含一个 Field P，渲染结构为 `tbody > tr > td > p`；删除默认 P 后可以放置其他组件。

设计态根据 minRows 重复 rowTemplate。填写态如果 repeatable=true 且 data[field] 有数组，
按数组长度生成数据行，但不少于业务要求的最小行数配置。

## 7. HTML 与 Image

### 7.1 HTML

- 只允许放在 GridCell 或 TableCellTemplate 中。
- 普通用户使用预设 HTML 模板，高级用户才可编辑源码。
- 保存前运行安全过滤。
- CSS 使用组件 ID 做作用域。
- bindings 必须显式配置。
- 设计器显示 HTML 内容边界和尺寸溢出。

### 7.2 Image

- 固定图片配置 src。
- 动态图片配置 field。
- 支持 width、height、objectFit 和对齐。
- 图片加载失败时设计态显示占位和警告。

## 8. 拖拽规则

允许的投放目标：

- Page.children
- GridCell.children
- TableCellTemplate.children

投放行为：

1. 新组件生成唯一 ID。
2. 插入目标 children 的指定位置。
3. 更新运行时索引。
4. 触发结构校验和溢出测量。
5. 自动选中新组件并打开配置面板。

跨格移动从源 children 删除节点，再插入目标 children。移动容器时后代随嵌套对象整体移动。

禁止：

- 将节点移动到自身后代中。
- 将普通组件作为容器投放目标。
- 未确认时覆盖已有节点。
- 通过 DOM 移动绕过 Schema 更新。

## 9. 删除、复制和包装

### 删除

删除 Grid、Row、Cell、Table 时明确提示包含的后代数量。因为 Schema 是嵌套结构，删除父节点自然删除后代，
但撤销记录必须保存完整子树。删除最后一个 Cell 或最后一个 Row 时，操作必须自动清理空的父 Row/Grid，
不能把 `INVALID_GRID_ROWS` 或 `INVALID_GRID_CELLS` 留给后续操作。

### 复制

深复制节点时重新生成整个子树 ID，field 默认保留并产生可能重复的软警告，用户可批量重命名。

### 包装

当一个格子已有组件而用户需要并排放置第二个组件时，设计器提供“包装为 Grid”：

1. 创建子 Grid。
2. 将现有组件移入第一个 Cell。
3. 创建第二个 Cell。
4. 将新组件放入第二个 Cell。

## 10. 配置面板

配置面板根据节点类型切换：

| 节点 | 配置 |
|---|---|
| Page | 纸张、方向、边距、fixed 模式 |
| Grid | 行数、列数、边框、整体样式 |
| P | mode、text/field、inputType、下划线、文字样式 |
| Table | field、columns、表头/行高、minRows、repeatable |
| HTML | html、css、trusted、bindings |
| Image | src/field、尺寸、objectFit |

Grid 的 rows/cells 是内部布局数据，不作为节点链或独立配置节点；结构字段通过 Grid 的专用控件修改，不允许在普通 JSON 文本框里直接编辑 rows/cells/children。

## 11. 数据与权限

```ts
interface FormPreviewProps {
  schema: FormSchemaV2
  data: Record<string, unknown>
  rules?: Record<string, {
    readonly?: boolean
    hidden?: boolean
    required?: boolean
  }>
}
```

- static P 不访问 data。
- field P 读取和回写 data[field]。
- repeatable Table 从 data[field] 读取数组。
- readonly 禁止编辑但保留内容。
- hidden 默认隐藏内容并保留固定版式空间，完全折叠需要显式 layoutHidden 规则。
- required 在预览中标记，并在提交时校验。

权限属于流程运行配置，不写入模板 Schema。

## 12. 保存、加载和版本

保存流程：

1. 运行 Schema 结构校验。
2. 扫描空 field 和重复 field。
3. 检测固定尺寸溢出。
4. 清除设计器临时状态和运行时索引。
5. 写入 version 并序列化嵌套 Schema；加载时只接受 V2，并补全兼容默认字段。

加载流程：

1. 读取 version。
2. 执行版本迁移。
3. 校验 Schema。
4. 重建运行时节点索引。
5. 渲染并恢复选择/缩放之外的模板状态。

## 13. 前五行验收场景

测试人员必须从空白 A4 页面操作：

1. 添加标题 static P。
2. 添加外层 Grid，并设置 all 边框。
3. 添加单位/编号四格行。
4. 添加负责人/班组无内部边框行。
5. 添加成员五格行。
6. 添加设备名称两格行。
7. 添加工作任务两格行并设置高度 5。
8. 左格放竖排 static P。
9. 右格放两列表格，设置表头 1、行高 1、minRows 4。
10. 为所有输入位置配置 field。
11. 保存并重新加载。
12. 填写测试数据并打印。

只有全部步骤无需修改源码或手写 JSON 才视为设计器方案成立。
