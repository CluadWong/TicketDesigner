# 开发计划

> 本计划配套 [design.md](./design.md)。项目现有 v1 流式设计器已经完成基础分页、渲染和三栏交互，
> 当前主线转为扁平组件数组驱动的 Grid 固定版式设计器。

## 1. 当前基线

以下能力已经存在，应保留作为回归基线，不在 Grid 重构初期删除：

- Vue 3 + TypeScript + Vite 工程骨架。
- A3/A4、横向/纵向纸张显示及打印样式。
- v1 `p / image / table` 渲染器。
- off-screen 测量、普通组件分页、Table 按行切分。
- 三栏设计器、组件选择、属性面板和状态栏。
- FormPreview、字段填值和基础权限相关代码。
- 云铝工作票 v1 近似 Schema，用于证明旧模型的表达上限。
- 云铝第二种工作票前五行 Grid 原型，已验证固定行高和嵌套布局方向可行。

现有测试中仍有一组 `PComponent.text` 与当前 v1 类型不一致的错误。该问题需要在 v2 类型迁移前
单独清理，避免将历史契约错误混入 Grid 重构。

## 2. 已锁定的新架构决策

| 决策点 | 目标方案 |
|---|---|
| Schema 关系 | 单一 `components[]`，通过 `id / parentId / index` 关联 |
| 静态布局 | 可嵌套 Grid，不使用绝对定位 |
| 固定文字与输入 | 统一为 P，通过 `editable` 区分 |
| 规则明细 | Table，仅负责表头、固定/动态行和数组数据 |
| 复杂扩展 | 受控 HTML 组件，限定作用域并做安全过滤 |
| 图片 | 保留 Image，按扁平关系放入 Grid |
| 行高 | `baseRowHeight × height`，使用确定 CSS height |
| 边框 | 父 Grid 管理 `all / inner / none`，避免嵌套双边框 |
| 页面模式 | 固定工作票优先 fixed，溢出警告；动态报表后续支持 flow |
| 运行时数据 | Schema 与 data/rules 分离 |
| 迁移方式 | v1/v2 暂时并存，v2 验收完成后切换默认设计器 |

## 3. 阶段 G0：原型收口与基线清理

**目标**：把当前实验代码整理成可继续演进的稳定起点。

- [x] G0.1 使用嵌套 Grid 原型渲染工作票前五行
- [x] G0.2 验证基础行高为 8mm、工作任务行为 5 倍高度
- [x] G0.3 验证竖排标签、输入 P、下划线和明细 Table
- [ ] G0.4 将原型 Schema 改为扁平 `components[]`
- [ ] G0.5 Renderer 只通过 `parentId/index` 解析关系
- [ ] G0.6 增加前五行 Schema 结构单测和渲染快照
- [ ] G0.7 修复现有测试仍使用旧 `PComponent.text` 的类型错误
- [ ] G0.8 为原型增加开发模式切换，不再硬编码替换正式 CanvasPane

**验收**：`vue-tsc --noEmit` 通过；前五行截图与嵌套对象版本一致；打乱 `components[]` 数组顺序后
渲染结果不变。

## 4. 阶段 G1：正式 Schema V2

**目标**：将已验证的关系模型从 `src/dev` 提升为正式公共类型。

- [ ] G1.1 在 `FormSchema` 增加 `version: 2`
- [ ] G1.2 定义 `ComponentBase { id, parentId, index, colspan?, padding? }`
- [ ] G1.3 定义 Grid、P、Table、HTML、Image 联合类型
- [ ] G1.4 定义 `baseRowHeight`、固定页面模式和纸张配置
- [ ] G1.5 实现 `componentsById`、`childrenByParentId` 索引工具
- [ ] G1.6 实现结构校验器：唯一 ID、父节点类型、循环、index、边界
- [ ] G1.7 定义容器级联删除、同父重排和跨父移动纯函数
- [ ] G1.8 定义 Schema JSON 版本迁移入口

**产出**：`src/types/schema-v2.ts`、索引工具、结构变更工具及单元测试。

**验收**：非法 parentId、父子循环、重复 index、Grid/Table 越界都返回可定位到组件 ID 的错误。

## 5. 阶段 G2：递归渲染器

**目标**：正式 Renderer 可以从扁平数组还原组件关系并稳定打印。

- [ ] G2.1 实现 `GridFormRenderer`
- [ ] G2.2 实现递归 `GridNodeRenderer`
- [ ] G2.3 实现 Grid 的 mm/fr 列轨道、colspan、边框和内边距
- [ ] G2.4 实现固定/输入两种 P 状态
- [ ] G2.5 实现 Table 表头、固定行数、基础行高和单元格子组件
- [ ] G2.6 实现受控 HTML 渲染与 CSS 作用域
- [ ] G2.7 复用 Image 渲染能力
- [ ] G2.8 实现 fixed 页面溢出检测和组件定位警告
- [ ] G2.9 保证设计态、预览态、打印态 DOM 结构一致

**产出**：正式 Grid Renderer、渲染测试和打印样式。

**验收**：前五行在 Chrome/Edge 中尺寸一致；打印为 A4；所有行高误差不超过 0.5mm；无双边框。

## 6. 阶段 G3：Grid 设计器交互

**目标**：用户可以通过格子操作构造前五行 Schema，而不是手写 JSON。

### G3.1 画布选择

- [ ] 通过 `data-component-id` 选择任意组件
- [ ] 显示当前 Grid 格子边界和投放位置
- [ ] 面包屑显示当前组件的父级链
- [ ] 点击空白回到纸张或根 Grid 配置

### G3.2 格子编辑

- [ ] 新增/删除 Grid 直接子格子
- [ ] 将一行拆分为 1～N 列
- [ ] 编辑固定 mm 和 fr 列宽
- [ ] 设置基础行高倍数
- [ ] 设置 all/inner/none 边框
- [ ] 设置 padding、文本对齐和垂直对齐
- [ ] 通过 colspan 合并/拆分相邻列
- [ ] 将格子包装成子 Grid

### G3.3 拖拽和移动

- [ ] 从组件库拖入 Grid 格子
- [ ] 写入目标 `parentId/index`
- [ ] 同父拖动时交换 index
- [ ] 跨父拖动时更新 parentId 并重排两侧 index
- [ ] 删除容器时展示后代数量并级联删除
- [ ] 所有结构操作接入撤销/重做历史

### G3.4 属性面板

- [ ] Grid：列轨道、高度倍数、边框、内边距
- [ ] P：固定文字、editable、field、输入类型、下划线、文字样式
- [ ] Table：field、列、rowCount、rowHeight、repeatable
- [ ] HTML：HTML、局部 CSS、可信状态和 bindings
- [ ] Image：src、field、宽高和适配方式

**验收**：从空白 A4 开始，仅通过 UI 能重新构造前五行工作票；保存后加载，ID 关系和视觉结果不变。

## 7. 阶段 G4：预览、数据与打印

**目标**：Grid 模板可用于真实填写和打印。

- [ ] G4.1 P 根据 editable 决定固定文字或 contenteditable/input
- [ ] G4.2 按 field 从 data 填值并回写
- [ ] G4.3 Table 使用 data[field] 替换设计态明细行
- [ ] G4.4 应用 readonly/hidden/required 规则
- [ ] G4.5 日期和签名先作为 P inputType 实现
- [ ] G4.6 HTML bindings 显式填值，不扫描任意内部 DOM
- [ ] G4.7 打印隐藏选择框和格子辅助线，但不改变业务尺寸
- [ ] G4.8 fixed 模式溢出时禁止静默裁剪并给出组件 ID

**验收**：单位、负责人、班组、工作任务等字段可填写；打印输出与设计态位置一致；刷新前的数据可以回写宿主。

## 8. 阶段 G5：完整工作票

**目标**：用同一模型实现云铝电气第二种工作票全部内容。

- [ ] G5.1 计划工作时间和日期输入
- [ ] G5.2 工作条件多行区
- [ ] G5.3 注意事项和补充安全措施
- [ ] G5.4 工作负责人、许可人和成员签名区
- [ ] G5.5 工作票延期
- [ ] G5.6 工作票终结和备注
- [ ] G5.7 完整字段清单和重复 field 检查
- [ ] G5.8 A4 单页/显式多页方案确认
- [ ] G5.9 与参考 HTML 和图片进行截图对比

**验收**：主要边框、列宽、行高、标题、字段位置和签名区域与参考图一致；所有输入位置都有独立 field。

## 9. 阶段 G6：迁移与清理

**目标**：正式切换默认设计器，处理旧模板和技术债务。

- [ ] G6.1 实现可转换部分的 v1 → v2 Schema 转换
- [ ] G6.2 无法转换的布局输出明确迁移报告
- [ ] G6.3 DesignerApp 默认切换到 v2
- [ ] G6.4 保存/加载 JSON 加入 version 检查
- [ ] G6.5 保留旧 Renderer 只读兼容期
- [ ] G6.6 兼容期结束后移除旧默认 mock 和无效入口
- [ ] G6.7 同步 `engine.md`、`design-biz.md` 和组件开发说明

## 10. 风险与控制

| 风险 | 控制措施 |
|---|---|
| 扁平数组形成父子循环 | 保存和渲染前运行循环检测 |
| index 重复导致格子重叠 | 结构操作集中在纯函数中并自动重排 |
| colspan 越界 | 校验列边界，设计器禁止非法拖放 |
| 固定高度被内容撑开 | 使用确定 height；设计态显示 overflow 警告 |
| 嵌套边框变粗 | 外层 all、内层 inner，边框只由父 Grid 负责 |
| HTML 污染页面 | sanitize、CSS scope、禁止 script 和事件属性 |
| 设计态与打印态漂移 | 共用 DOM，仅隐藏辅助 UI，不重排业务内容 |
| v1/v2 状态混用 | Schema version 分流，Designer 同一时刻只编辑一种版本 |
| 大型模板查询变慢 | 保存 `childrenByParentId` 索引，结构变化时增量重建 |

## 11. 当前优先级

当前只推进以下顺序，避免同时扩展完整工作票和设计器交互：

1. 完成 G0.4～G0.8，将前五行原型切换为扁平数组并恢复全量类型检查。
2. 完成 G1 Schema V2 和结构操作纯函数。
3. 完成 G2 正式 Renderer。
4. 用 UI 重建前五行，完成 G3 最小闭环。
5. 接入预览数据后再扩展完整工作票。

在前五行能够“UI 构建 → 保存 → 加载 → 填写 → 打印”之前，不新增更多表单区块或复杂组件类型。
