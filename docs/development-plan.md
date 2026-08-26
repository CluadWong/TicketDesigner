# 开发计划

> 本计划配套 [design.md](./design.md)、[design-biz.md](./design-biz.md) 和 [engine.md](./engine.md)。
> 当前唯一主线是嵌套 Grid Schema V2；旧流式实现只作为迁移参考，最终需要移除。

## 1. 最终目标

通过设计器 UI 实现云铝电气第二种工作票，而不是仅通过源码手写 Schema：

```text
空白 A4
  → UI 创建标题和 Grid
  → UI 创建行、格子、P 和 Table
  → 保存 Schema
  → 重新加载并继续编辑
  → 填入 data
  → 预览和打印
  → 与参考 HTML/图片对比
```

任一环节需要修改源码或手写 JSON，都不能视为设计器能力完成。

## 2. 当前状态

### 已完成的历史基础能力

- [x] Vue 3 + TypeScript + Vite 工程
- [x] A3/A4、横向/纵向纸张画布
- [x] 早期 p/image/table Renderer
- [x] 早期 off-screen 测量和流式分页探索
- [x] 早期 Table 按行切分和表头重复探索
- [x] 三栏设计器、组件库、配置面板和状态栏
- [x] 基础预览、打印和字段相关代码

### 已完成的 V2 探索

- [x] 抽象 Grid/P/Table/HTML 原型节点
- [x] 手写云铝工作票前五行嵌套 Schema
- [x] 递归渲染前五行
- [x] 验证 8mm 基础行高
- [x] 验证工作任务 5 倍行高
- [x] 验证竖排标签、下划线、嵌套 Table 和 A4 画布
- [x] 修正 min-height + flex-grow 导致 Table 行被撑高的问题

### 当前缺口

- [x] 原型类型已提升为正式 Schema V2
- [x] 已有通用节点索引和基础结构操作函数
- [ ] Grid Renderer 仍是 dev 原型，待移入正式组件目录
- [ ] 用户尚不能从空白页通过 UI 创建完整前五行；当前已支持空白页、Grid、行、拆分格子和基础节点插入
- [ ] 右侧配置面板尚未绑定 V2 节点
- [ ] 保存、加载、撤销、预览仍未接入 V2
- [x] 旧测试、旧 Renderer 和旧依赖已清理

## 3. 已锁定决策

| 领域 | 决策 |
|---|---|
| 导出格式 | 嵌套 Schema，直接表达 pages/grid/rows/cells/children |
| 节点身份 | 所有结构节点和组件使用稳定唯一 ID |
| 编辑器查询 | 从嵌套树派生 `id → node/parent/path` 索引 |
| 静态布局 | Grid，禁止绝对定位 |
| 固定文字和字段 | P，通过 static/field mode 区分 |
| 明细 | Table + rowTemplate |
| 高级扩展 | 受控 HTML |
| 图片 | 保留 Image |
| 尺寸 | mm + baseRowHeight 整数倍 |
| 页面 | 工作票使用 fixed，显式 pages[] |
| 验收 | UI 构建、保存加载、填值打印完整闭环 |

## 4. 阶段 P0：基线修复与原型隔离

**目标**：清理旧入口，确保设计器只有 V2 状态和 V2 Renderer。

- [x] P0.1 删除 DesignerApp 对旧 Toolbar/CanvasPane/ConfigPanel 的依赖
- [x] P0.2 确认 `vue-tsc --noEmit` 全量通过
- [x] P0.3 确认 V2 vitest 全量通过
- [x] P0.4 删除旧默认 mock 和旧流式 Renderer 入口
- [x] P0.5 保留前五行截图作为视觉基线
- [x] P0.6 为前五行 Schema 增加最小渲染测试

**完成门槛**：

- 页面只有 V2 状态。
- 页面中不存在旧 Toolbar、旧 ConfigPanel 或旧 FormRenderer 混合交互。
- 类型检查和测试通过。

## 5. 阶段 P1：Schema V2 正式契约

**目标**：将 dev 类型提升为可保存、可校验、可迁移的正式 Schema。

### P1.1 类型

- [x] 定义 `FormSchemaV2 { version, paper, baseRowHeight, pages }`
- [x] 定义 PageSchema 和 EdgeInsets
- [x] 定义 GridNode/GridRow/GridCell
- [x] 定义 PNode static/field 判别联合
- [x] 定义 TableNode/TableColumn/TableCellTemplate
- [x] 定义 HtmlNode/ImageNode
- [x] 定义 FormNode/SchemaNode 联合类型
- [x] 所有 Page/Grid/组件包含 ID；Row/Cell ID 仅作为 Grid 内部布局引用

建议让 P 使用判别联合，阻止非法组合：

```ts
type PNode = StaticPNode | FieldPNode
```

### P1.2 默认值

- [x] A4 fixed Page 默认配置
- [x] 空 Grid 默认一行一格
- [x] static P 默认文本
- [x] field P 默认 field 和 inputType
- [x] field P 支持 prefix/suffix 复合标签
- [x] Table 默认两列、表头 1、行高 1、minRows 4
- [x] Table 默认每个数据列生成一个 Field P，允许删除后替换为其他组件
- [x] HTML/Image 安全默认值

### P1.3 序列化

- [x] 保存时写入 version=2
- [x] 定义运行时校验入口
- [x] 加载未知版本时报错
- [x] 加载时补全可兼容的缺省字段
- [x] 不将 selectedId、缩放、索引等编辑器状态写入模板

**完成门槛**：前五行 Schema 使用正式类型；JSON 往返后深度等价；非法 P 模式不能通过 TypeScript 构造。

## 6. 阶段 P2：节点索引和结构操作

**目标**：让设计器可以可靠修改嵌套 Schema，而不是在组件中散落路径操作。

### P2.1 节点索引

- [x] 实现 `buildNodeIndex(schema)`
- [x] 索引 Page/Grid/TableTemplate/组件；Row/Cell 不进入可选节点链
- [x] 返回 node、parent、path 和 ownerCell
- [x] 检测重复 ID
- [x] 提供 `getNodeById`、`getAncestors`、`getOwnerCell`
- [x] Schema 变化后重建或增量更新索引

### P2.2 结构操作纯函数

- [x] `insertRow`
- [x] `copyRow`
- [x] `removeRow`
- [x] `moveRow`
- [x] `splitCell`
- [x] `mergeCells`
- [x] `insertNode`
- [x] `moveNode`
- [x] `removeNode`
- [x] `wrapCellChildrenWithGrid`
- [x] `updateNode`

### P2.3 ID 策略

- [x] 统一 ID 生成器
- [x] 深复制子树时重建全部 ID
- [ ] 保存加载后保留原 ID
- [ ] DOM data-node-id 与 Schema ID 一致

### P2.4 单测

- [x] 行增删移动
- [x] 格子拆分合并
- [x] 跨格移动组件
- [x] 防止移动到自身后代
- [x] 删除和复制完整子树
- [x] 包装为子 Grid
- [x] 操作后索引仍能定位正确 path（基础 update 操作）

**完成门槛**：所有设计器结构变更都只能通过纯函数完成；测试覆盖嵌套三层以上结构。

## 7. 阶段 P3：Schema 校验与警告

**目标**：错误结构不能进入预览和打印，固定尺寸问题能定位到节点。

- [x] 唯一 ID 校验
- [x] Page/Grid 内部 Row/Cell 空结构校验
- [x] GridCell width/colspan 校验
- [x] P mode/text/field 校验
- [x] Table columnKey 和 rowTemplate 完整性校验
- [x] HTML trusted/bindings 校验（基础 trusted 警告）
- [x] 图片尺寸和资源警告
- [x] 重复 field 软警告
- [ ] 节点内容溢出警告
- [ ] Page 溢出警告
- [x] issue 包含 nodeId、path、code 和 message
- [ ] 点击问题列表可选中对应节点

**完成门槛**：构造错误 Schema 时能一次返回全部问题；预览/打印阻止结构 error，但普通 warning 可继续。

## 8. 阶段 P4：正式递归 Renderer

**目标**：将前五行 dev Renderer 升级为生产目录中的通用 V2 Renderer。

### P4.1 组件

- [ ] `GridFormRenderer`
- [ ] `PageRenderer`
- [ ] `GridRenderer`
- [ ] `GridRowRenderer`
- [ ] `GridCellRenderer`
- [ ] `PNodeRenderer`
- [ ] `TableNodeRenderer`
- [ ] `HtmlNodeRenderer`
- [ ] `ImageNodeRenderer`

### P4.2 尺寸

- [ ] mm/fr/auto 列轨道
- [ ] baseRowHeight × height
- [x] Table 表头/数据行最小高度，内容可撑开父 GridRow
- [ ] box-sizing 统一
- [ ] 固定字体、行高和 letter-spacing
- [ ] fixed Page 可用区域计算

### P4.3 边框

- [ ] all/outer/inner/none
- [ ] 嵌套 Grid 无双边框
- [ ] Table 外框和 GridCell 边界不重复
- [ ] colspan 后格线正确

### P4.4 模式

- [x] designer：data-node-id、选中和结构警告
- [ ] preview：字段数据填入和权限
- [x] print：隐藏辅助 UI，业务尺寸不变

### P4.5 测试

- [ ] 组件单测
- [ ] 前五行 DOM 结构快照
- [ ] 8mm/40mm 尺寸测试
- [ ] 长文本和 Table 增行撑高测试
- [x] Chrome/Edge 截图验证

**完成门槛**：正式 Renderer 输出与当前前五行截图基线一致；打印尺寸误差不超过 0.5mm。

## 9. 阶段 P5：设计器基础框架 V2

**目标**：V2 画布具备节点选择和配置更新能力。

- [x] DesignerApp 持有 `FormSchemaV2`
- [x] 提供 nodeIndex、selectedNodeId 和基础属性面板
- [x] 点击 data-node-id 选中节点
- [x] 显示 Page > Grid > Row > Cell > Node 面包屑
- [ ] 节点树可展开和选择
- [x] 点击空白取消选择；重复点击同一位置可逐级选择祖先
- [x] 点击节点后缓存完整祖先路径，循环选择和面包屑切换只改变 active 节点
- [x] 选择链只显示 Page/Grid/实际组件，GridRow/GridCell 改为布局引用
- [x] 配置更新调用 `updateNode`
- [x] 选中节点显示蓝色内描边和浅色背景，不改变布局尺寸
- [x] 结构错误显示在节点检查面板和状态栏
- [ ] v2 工具栏控制纸张、边距和基础行高
- [x] 所有入口只接受 `version: 2` Schema

**完成门槛**：手写前五行 Schema 中任意 Page/Grid/P/Table 都能被选中并修改属性，Row/Cell 只作为布局槽位使用。

## 10. 阶段 P6：Grid 可视化编辑

**目标**：用户可以从空白页创建前五行的所有 Grid 结构。

### P6.1 行

- [x] 新增行
- [x] 设置行高倍数
- [x] 复制行
- [x] 上下移动行
- [x] 删除行

### P6.2 格子

- [x] 一行拆分为 N 格
- [x] GridRow 行高按基础行高倍数作为最小行高，Table 增加 `minRows` 时可撑开父行
- [x] 选中 Grid 后通过属性面板调整行数和列数
- [x] GridCell 行列配置统一转换为嵌套 Grid，子格可独立插入组件
- [x] Grid 的行列调整统一移入右侧属性面板；GridRow/GridCell 仅作为内部布局记录，组件库不提供结构快捷按钮
- [ ] 设置 mm/fr/auto 宽度
- [ ] 设置 padding 和对齐
- [ ] 设置 colspan
- [ ] 合并/拆分相邻格
- [ ] 设置 Grid 边框模式

### P6.3 投放

- [x] Cell 显示投放点
- [ ] 从组件库拖入 P/Grid/Table/HTML/Image（当前为按钮插入 P/Grid/Table）
- [ ] 格子内排序
- [ ] 跨格移动
- [x] 已有内容时支持插入而非覆盖
- [x] 删除选中节点并级联删除后代
- [x] 删除最后一个 Cell/Row 时清理空父级，避免产生非法 Grid
- [x] 一键包装为子 Grid
- [x] 禁止移动到自身后代

**当前进度**：基础结构纯函数已覆盖空白模板、根 Grid、行增删移动、复制行、格子拆分合并、跨格移动、子 Grid 包装和节点插入；
组件库拖拽、格子内排序及完整前五行 UI 构建仍待完成。

**完成门槛**：不手写 JSON，可以创建外层 Grid 和五个目标行；保存 Schema 与手写基线结构等价。

## 11. 阶段 P7：P、Table、HTML、Image 编辑

### P7.1 P

- [ ] static/field 分段控件
- [ ] 固定文本编辑
- [ ] field 和 inputType 编辑
- [x] field P 空内容、data-field、下划线和打印下划线基础语义
- [x] field P 前标签、输入器、后标签组合渲染
- [ ] 字号、字重、对齐、竖排和不换行

### P7.2 Table

- [ ] 新增、删除、移动列
- [ ] 编辑 key、标题、宽度和对齐
- [ ] headerHeight、rowHeight、minRows
- [ ] repeatable
- [ ] 编辑 rowTemplate 的 Cell children
- [ ] 单元格放 P 或子 Grid

### P7.3 HTML

- [ ] 预设模板选择
- [ ] 高级源码编辑
- [ ] sanitizer
- [ ] CSS scope
- [ ] bindings 编辑

### P7.4 Image

- [ ] src/field 模式
- [ ] 尺寸和 objectFit
- [ ] 加载失败占位

**完成门槛**：通过属性面板完成标题、所有标签、输入字段、竖排“工作任务”和两列表格配置。

## 12. 阶段 P8：保存、加载和历史

**目标**：编辑结果可以稳定持久化并恢复。

- [ ] 导出 Schema JSON
- [ ] 导入 Schema JSON
- [ ] version 检查和迁移入口
- [ ] 保存前结构校验
- [ ] 重新加载后重建 nodeIndex
- [ ] 重新加载后所有节点仍可编辑
- [ ] 撤销/重做栈
- [ ] 属性连续输入合并历史记录
- [ ] 结构操作保持原子性
- [ ] 复制/删除保存完整子树历史
- [ ] 提供未保存修改提示

**完成门槛**：前五行保存、刷新、加载后视觉一致，节点 ID 稳定，撤销/重做至少覆盖 20 步。

## 13. 阶段 P9：填写、权限和打印

### P9.1 数据

- [ ] static P 显示 text
- [ ] field P 从 data 填值
- [ ] 输入事件回写 data
- [ ] number/date/signature 内部控件
- [ ] repeatable Table 绑定数组
- [ ] rowTemplate 字段使用行上下文

### P9.2 权限

- [ ] readonly
- [ ] hidden 且默认保留固定空间
- [ ] required 标记和提交校验
- [ ] HTML bindings 权限边界

### P9.3 打印

- [ ] A3/A4 @page
- [ ] 打印隐藏设计器 UI
- [ ] 复用 Preview DOM
- [ ] 不改变业务尺寸
- [ ] fixed Page 溢出提示
- [ ] Chrome/Edge 打印预览

**完成门槛**：填写单位、负责人、班组和四行工作任务后，data 正确；打印与设计态位置一致。

## 14. 阶段 P10：前五行闭环验收

由非实现者按以下步骤验收：

1. 新建 A4 fixed 模板，基础行高设为 8mm。
2. 创建标题。
3. 创建外层 Grid 和四个基本信息行。
4. 创建工作任务 5 倍行高。
5. 配置全部 static/field P。
6. 创建两列表格和四个最小数据行。
7. 保存并关闭模板。
8. 重新加载并修改任意列宽和标签。
9. 填写测试数据。
10. 打印并与参考 HTML/图片比较。

验收指标：

- [ ] 不修改源码或 JSON
- [ ] 无结构 error
- [ ] 无意外溢出
- [ ] 行高和边框稳定
- [ ] 所有节点可再次编辑
- [ ] 数据回写正确
- [ ] 打印尺寸误差不超过 0.5mm
- [ ] 主要结构与参考图一致

前五行闭环未通过前，不扩展完整表单。

## 15. 阶段 P11：完整工作票

- [ ] 计划工作时间
- [ ] 工作条件多行区
- [ ] 注意事项和安全措施
- [ ] 签发人和签发日期
- [ ] 补充安全措施
- [ ] 负责人/许可人确认
- [ ] 工作班成员签名
- [ ] 工作票延期
- [ ] 工作票终结
- [ ] 备注
- [ ] 多页 fixed Page 方案
- [ ] 完整字段清单
- [ ] 与参考图片截图对比

**完成门槛**：完整表单同样通过 UI 构建、保存加载、填值打印闭环，不能通过 HTML 整体替代。

## 16. 阶段 P12：迁移和清理

- [ ] 移除旧流式 Renderer 和硬编码旧 Schema
- [ ] 清理所有旧实现残留
- [ ] 更新组件开发文档和示例
- [ ] 补充性能和大模板测试

## 17. 风险控制

| 风险 | 控制 |
|---|---|
| Schema 嵌套修改复杂 | 统一节点索引和结构操作纯函数 |
| ID 索引引用过期 | Schema 结构变化后重建/增量更新索引 |
| 行高语义 | 使用 min-height；Table 内容可撑开父 GridRow，溢出检测另行提示 |
| 嵌套边框变粗 | 单边归属规则 + 截图测试 |
| Table 模板与数据行混淆 | rowTemplate 和运行时 rows 分离 |
| HTML 破坏安全和布局 | sanitizer、scope、Cell overflow |
| 设计态与打印态漂移 | 共用 DOM，只隐藏辅助 UI |
| 只会手写 Schema、UI 不可构造 | P10 独立闭环验收 |
| 旧代码残留 | V2 闭环后删除旧 Renderer、旧类型和旧入口 |
| 开发范围过大 | 前五行闭环通过前禁止扩展完整表单 |

## 18. 当前执行顺序

严格按以下顺序推进：

1. P0：删除旧入口，恢复全量类型检查和测试。
2. P1～P3：正式 Schema、节点索引、结构操作和校验。
3. P4：正式 Renderer，保持前五行视觉基线。
4. P5～P7：完成从空白页构建前五行所需的最小 UI。
5. P8～P9：保存加载、填写和打印。
6. P10：独立验收前五行闭环。
7. P11：通过同一设计器扩展完整工作票。
8. P12：清理旧实现和临时原型。

任何阶段不得用“直接修改示例 Schema”替代该阶段要求的设计器能力。
