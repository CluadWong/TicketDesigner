# 表单设计器业务设计

> 本文描述 Schema V2 下的组件业务语义和设计器行为。总体架构见 [design.md](./design.md)，
> 渲染算法见 [engine.md](./engine.md)，落地顺序见 [development-plan.md](./development-plan.md)。

## 1. 产品产物

系统提供两个可独立使用的产物：

1. **表单模板设计器**：编辑数据无关的 `FormSchema`。
2. **表单预览组件**：接收 `schema + data + rules`，用于填写、只读查看和打印。

```text
Designer                          FormPreview
   │                                  │
   ├─ 编辑 components[]               ├─ 读取 schema
   ├─ 调整 parentId/index             ├─ 填入 data[field]
   ├─ 配置尺寸和样式                   ├─ 应用 rules[field]
   └─ 保存 FormSchema                 └─ 输出/打印同一套 DOM
```

模板不包含流程实例值，预览组件不修改模板结构。

## 2. 设计器布局

```text
┌─ 工具栏：纸张 / 边距 / 基础行高 / 预览 / 保存 ──────────┐
├──────────┬──────────────────────────┬──────────────────┤
│ 组件库   │ A3/A4 固定纸张画布       │ 配置面板         │
│ Grid     │ 格子边界、选择和投放提示 │ 表单/组件/格子    │
│ P        │                          │                  │
│ Table    │                          │                  │
│ HTML     │                          │                  │
│ Image    │                          │                  │
├──────────┴──────────────────────────┴──────────────────┤
│ 状态栏：页面 / 缩放 / 结构错误 / 溢出警告              │
└─────────────────────────────────────────────────────────┘
```

画布不是自由坐标编辑器。任何组件都必须属于纸张根级或某个 Grid/Table 格子。

## 3. 组件关系

Schema 使用扁平组件数组：

```ts
interface ComponentBase {
  id: string
  parentId: string | null
  index: number
  colspan?: number
  padding?: number
}
```

- `id`：组件稳定标识，用于选中、字段定位、警告和历史记录。
- `parentId`：所属容器；根级组件为 `null`。
- `index`：父容器中的逻辑格子序号。
- `colspan`：仅在父容器为 Grid 时生效。
- `padding`：该组件所在父格子的内边距，单位 mm。

一个格子默认只放一个直接子组件。需要标签、字段等多个元素时，将该格子的直接子组件设为 Grid，
再把多个 P 放入子 Grid。这样关系始终只有一层 `parentId/index` 语义。

## 4. 组件业务语义

### 4.1 Grid

Grid 是静态版式的唯一通用容器：

- 根 Grid：整张表单外框。
- 行 Grid：单位/编号、负责人/班组等一行内容。
- 子 Grid：在一个格子中继续拆列。
- 无边框 Grid：实现标签与输入区域的自然混排。

Grid 的 `height` 是基础行高倍数。用户在属性面板选择 1、2、3 等整数，设计器显示实际 mm 高度。

### 4.2 P

P 同时覆盖固定文字和输入字段：

| 模式 | 配置 | 设计态 | 预览态 |
|---|---|---|---|
| 固定文字 | `editable=false, text` | 显示 text | 显示 text，不可编辑 |
| 输入字段 | `editable=true, field` | 显示字段占位/空输入线 | 填入 data[field]，按规则编辑 |

业务约束：

- 固定文字不需要 field。
- 输入 P 必须设置 field 后才能参与数据保存和权限控制。
- 一个 P 不混合固定标签和输入值；通过 Grid 相邻放置。
- `inputType` 第一阶段支持 text、number、date、signature。
- 下划线属于字段样式，Web 与打印可分别控制是否显示。

### 4.3 Table

Table 只用于规则明细，例如工作地点/工作内容：

- columns 定义表头和列宽。
- rowCount 定义设计态空白行数。
- rowHeight 使用基础行高倍数。
- repeatable 决定预览数据是否可以扩展行数。
- 子 P 通过 `parentId=table.id`、`index=row*columnCount+column` 放入单元格。

静态表单外框、签名布局和说明区域不使用 Table，统一使用 Grid。

### 4.4 HTML

HTML 是高级组件，用于暂时无法由 Grid/P/Table 表达的局部内容。

- 仅高级用户或可信模板可编辑原始 HTML。
- 必须经过安全过滤和 CSS 作用域处理。
- HTML 内部数据绑定使用显式 bindings，不通过任意 DOM 扫描推断。
- HTML 的外层尺寸仍由所属 Grid 格子约束。

### 4.5 Image

Image 用于 Logo、二维码和图片签章：

- 固定图片使用 src。
- 动态图片使用 field 从 data 获取地址。
- width/height 和 objectFit 由属性面板配置。
- Image 与其他组件一样通过 parentId/index 放入 Grid。

## 5. 设计操作

### 5.1 新增

从组件库拖入目标格子时：

1. 生成唯一 ID。
2. 写入目标 Grid/Table 的 ID 作为 parentId。
3. 写入目标格子 index。
4. 如果格子已有组件，提示替换、交换或包装为子 Grid，禁止静默覆盖。

### 5.2 移动

- 同父移动：交换两个组件的 index。
- 跨父移动：更新组件 parentId/index，同时整理源父和目标父的 index。
- 移动容器不修改后代；后代通过 parentId 链自然跟随。
- 非法目标（P、Image、非容器 HTML）不接受投放。

### 5.3 删除

- 普通组件直接删除。
- 删除 Grid/Table 前显示其后代数量。
- 确认后级联删除全部后代。
- 删除后重新编号父容器的直接子组件，避免无意义空洞。

### 5.4 拆分与合并

- 拆分 Grid 列时更新 columns，并为新增格子预留 index。
- 合并相邻列通过第一个组件的 colspan 实现。
- 合并范围内存在多个组件时，必须先包装为子 Grid或选择保留项。
- 第一阶段不提供 rowspan；跨行视觉结构用嵌套 Grid 完成。

## 6. 配置面板

每种组件继续提供 UI Renderer 和 config 声明：

```text
src/components-v2/
├─ grid/    GridRenderer.vue + config.ts
├─ p/       PRenderer.vue + config.ts
├─ table/   TableRenderer.vue + config.ts
├─ html/    HtmlRenderer.vue + config.ts
└─ image/   ImageRenderer.vue + config.ts
```

配置项最小集合：

| 组件 | 配置项 |
|---|---|
| Grid | columns、height、border、gap、padding |
| P | text、editable、field、inputType、underline、文字样式 |
| Table | field、columns、rowCount、rowHeight、repeatable |
| HTML | html、css、trusted、bindings |
| Image | src、field、width、height、objectFit |

关系字段 parentId/index 不允许在普通文本输入框中直接修改，由画布结构操作维护。

## 7. 数据和权限

预览契约：

```ts
interface FormPreviewProps {
  schema: FormSchema
  data: Record<string, unknown>
  rules?: Record<string, {
    readonly?: boolean
    hidden?: boolean
    required?: boolean
  }>
}
```

- 可编辑 P：`data[field]` 填值，输入后回写。
- 固定 P：只显示 text。
- 动态 Image：`data[field]` 提供图片地址。
- repeatable Table：`data[field]` 提供明细数组。
- readonly：禁止编辑但保留显示。
- hidden：隐藏字段内容，是否保留布局空间由规则明确配置。
- required：显示标记并在提交时校验。

权限是流程运行配置，不写入模板 Schema。

## 8. 保存与加载

保存前必须：

1. 校验组件 ID 和父子关系。
2. 检测父子循环。
3. 校验 index、colspan 和 Table 单元格边界。
4. 扫描重复 field 并生成软警告。
5. 写入 Schema version。

加载时按 version 选择 Renderer 和迁移器。未知版本不得静默按当前版本解析。

## 9. 第一条业务验收

云铝电气第二种工作票前五行必须可以完全通过 Grid 设计器构造：

- 标题固定 P。
- 单位/编号为四列 Grid，标签 P + 输入 P。
- 负责人/班组为无内部边框 Grid。
- 成员行为五列 Grid。
- 设备名称行为两列 Grid。
- 工作任务为两列 Grid，左侧竖排 P，右侧 Table。
- 工作任务外层高度等于表头加四行明细的高度。
- 保存的 components 数组可以任意重排，不影响加载后的视觉结果。
