# 开发计划

> 配套 [design.md](./design.md)、[engine.md](./engine.md)、[design-biz.md](./design-biz.md)。
> 本文档描述分阶段落地路径。

## 已锁定的技术决策

| 决策点 | 选型 | 来源 |
|---|---|---|
| 双产物分离 | 表单模板编辑器（阶段 3）+ 表单预览组件（阶段 4） | design-biz.md §1.1 |
| 模板 vs 数据分离 | 模板编辑器产出数据无关配置；预览组件接收 data 填入 | design-biz.md §1.1、§3 |
| p 组件不含 text | p 是空壳，预览时由 data[field] 填入文本 | design-biz.md §3.2、§5.3 |
| image src 可选 | src 模板固定图片（logo/印章）；无 src 由 data[field] 提供 | design-biz.md §3.2、§5.3 |
| table rows 是模板配置 | N 行空行（打印手写），预览时由 data[field] 覆盖 | design-biz.md §3.3、§5.3 |
| 预览组件契约 | schema + data + rules → 渲染填入 + 权限 | design-biz.md §6.1 |
| 页眉/页脚内容 | 仅文本 + 页码（不做组件容器） | design.md §2.5 |
| 超高组件 | 裁剪 + 警告（不跨页） | design.md §4.5 |
| 拖拽方案 | vuedraggable（v1 暂用按钮排序替代，与 paginate 冲突） | — |
| 分页引擎 | off-screen 测高 + 按行/按块切分（已验证） | engine.md §1 |
| 屏幕与打印 | 复用同一 DOM 结构 | design.md §4.1 |
| 边距模型 | 上下 0 / 左右统一 | design.md §2.3 |
| 技术栈 | Vue 3 + TS + Vite + Element Plus | — |
| v1 组件清单 | p / image / table（不含 grid/flex） | design-biz.md §2.1 |
| field 字段 | Schema 内置，设计器可填，预览组件用 | design-biz.md §3.1 |
| 权限配置 | 不在设计器内，由专门流程页面处理 | design-biz.md §4 |
| 组件配置项 | UI 组件 + config.ts 单独声明 JSON | design-biz.md §5 |

## 阶段 1：项目骨架与 Schema（基础设施）

**目标**：搭好项目，定义数据契约，引擎函数化。

- [x] 1.1 初始化 Vue 3 + TS + Vite + Element Plus 项目骨架
- [x] 1.2 安装 vuedraggable（已含在 1.1 的 package.json）
- [x] 1.3 定义 Schema 类型体系（[src/types/schema.ts](../src/types/schema.ts)）
  - v1 范围：p / image / table 三种组件（不含 grid/flex）
  - BaseComponent 含 `field?` 字段（v2 流程数据绑定键）
  - FormSchema 不含 rules（权限归流程页面）
  - 输出契约 [src/types/paginate.ts](../src/types/paginate.ts)：Page / Block / Warning / PaginateResult
- [ ] 1.4 引擎抽函数化：`paginate(schema) → PaginateResult`，TS 类型
- [ ] 1.5 引擎单测：覆盖表格切分、超高裁剪警告

**产出**：`FormSchema` 类型 + `paginate()` 纯函数 + 单测。

## 阶段 2：渲染器（只读视图）

**目标**：给 schema → 渲染出离散纸张，复刻 demo-v2 效果。

- [ ] 2.1 `<FormRenderer :schema :warnings>`：调 `paginate()` → `v-for <Paper>`
- [ ] 2.2 `<Paper>`：纸张容器 + 页眉槽 + 正文槽 + 页脚槽（含页码注入）
- [ ] 2.3 组件渲染器（v1 仅三种）：
  - `<CompP>`：渲染 `<p data-field="...">`，v1 不填值
  - `<CompImage>`：渲染 `<img data-field="...">`
  - `<CompTable>`：渲染 `<table data-field="...">`，按 columns 渲染表头 + 空行模板
- [ ] 2.4 `usePrintStyle` composable：按 schema.paper 动态注入 `@page` 规则
- [ ] 2.5 打印集成：`window.print()` + 打印媒体查询
- [ ] 2.6 超高警告提示：在裁剪组件上叠加红色"超高"标记

**产出**：只读渲染器，能渲染 schema 为离散纸张 + 打印 + 警告。

## 阶段 3：表单模板编辑器（可编辑）

**目标**：拖拽编辑 schema，产出数据无关的表单模板。模板含 field + 样式 + 结构，不含数据。

### 3.1 组件库 + 配置项 JSON（组件开发强约束）

每个组件**必须同时提供 UI 组件 + config.ts**，二者配套：

```
src/components/
├─ p/
│  ├─ CompP.vue              ← UI 组件（阶段 2.3 复用）
│  └─ config.ts              ← 配置项 JSON（export const pConfig: ComponentConfig）
├─ image/
│  ├─ CompImage.vue
│  └─ config.ts
└─ table/
   ├─ CompTable.vue
   └─ config.ts

src/config/
└─ component-registry.ts      ← 注册表：汇集各组件 config
src/types/
└─ component-config.ts         ← ComponentConfig / ConfigField 类型定义
```

各组件配置项内容（参见 [design-biz.md §5.3](./design-biz.md#53-各组件配置项示例)）：
- p：field（text，可选）—— **不含 text 内容字段**，预览时由 data[field] 填入
- image：field（text）+ src（text，可选）+ width（number）+ height（number）—— src 可选，模板固定图片或预览由 data[field] 提供
- table：field（text）—— rows 是模板配置（默认 5 行空行），columns 在画布内编辑

### 3.2 三栏布局骨架

- [x] 3.2.1 顶部工具栏：纸张选择、方向切换、边距配置、页眉/页脚文本与页码开关、打印按钮、保存/加载 JSON
- [x] 3.2.2 左栏组件库：遍历 `component-registry`，按 `displayName` 渲染可拖拽项（v1 仅 p/image/table）
- [x] 3.2.3 中栏画布：承载 `<FormRenderer>`，离散纸张垂直堆叠；点击选中组件；拖拽排序
- [x] 3.2.4 右栏配置面板：两个 tab 切换
  - 表单属性 tab：纸张/边距/页眉页脚
  - 组件属性 tab：按选中组件的 `config.fields` 自动渲染表单控件
- [x] 3.2.5 底部状态栏：页数 / 警告数 / 缩放

### 3.3 交互能力

- [x] 3.3.1 从左栏拖到画布 → push 进 `schema.body`（生成默认 id + 空壳模板）
- [x] 3.3.2 画布内组件排序（v1 用右栏上移/下移按钮替代 vuedraggable，因 vuedraggable 与 paginate 切片冲突）
- [x] 3.3.3 选中组件：点击高亮 + 触发右栏切到组件属性 tab
- [x] 3.3.4 取消选中：点画布空白 → 右栏切回表单属性 tab
- [x] 3.3.5 编辑后 debounce 重算分页（300ms）

### 3.4 field 软校验

- [ ] 3.4.1 同表单内 field 重复时，在画布对应组件上叠加黄色"重复"标记
- [ ] 3.4.2 状态栏显示重复 field 警告数

**产出**：表单模板编辑器，拖拽编辑 + 实时分页预览 + 配置项驱动右栏面板。产出数据无关的 `FormSchema` 模板。

## 阶段 4：表单预览组件（数据填入 + 权限）

**目标**：接收模板 schema + 数据 data + 权限 rules，渲染填入数据并应用权限。

### 4.1 预览组件骨架

- [ ] 4.1.1 `<FormPreview :schema :data :rules>` 组件骨架
- [ ] 4.1.2 复用阶段 2 的 FormRenderer 渲染纸张结构，扩展数据填入逻辑

### 4.2 数据填入

- [ ] 4.2.1 p 组件：渲染 `<p contenteditable data-field="x">`，按 `comp.field` 查找 `data[field]` 填入文本
- [ ] 4.2.2 image 组件：有 `comp.src` 用模板 src；无 src 用 `data[field]` 作为图片地址
- [ ] 4.2.3 table 组件：`data[field]` 覆盖模板 `rows`，按 `columns` 渲染实际数据行

> p 组件预览渲染为 `<p contenteditable data-field="单位"></p>`（空 contenteditable），
> 读取 `data: {'单位': '单位1'}` 后填入文本"单位1"。
> rules 控制权限：readonly 时去掉 contenteditable 或加 data-readonly。

### 4.3 权限应用

- [ ] 4.3.1 接收 `RulesMap`，按 `field` 查找规则
- [ ] 4.3.2 `readonly`：字段不可编辑
- [ ] 4.3.3 `hidden`：字段隐藏
- [ ] 4.3.4 `required`：字段必填（视觉标记 + 提交校验）

**产出**：表单预览组件，接收 schema + data + rules，渲染填入数据 + 应用权限。

## 阶段 5：页眉/页脚/页码完善

**目标**：页眉/页脚配置生效（已在阶段 2 基本实现，本阶段完善）。

- [ ] 5.1 页眉/页脚：文本输入框 + "显示页码"勾选（已在 Toolbar/ConfigPanel 实现）
- [ ] 5.2 页码格式：`第 {n} 页 / 共 {N} 页`，引擎注入 n/N（已实现）
- [ ] 5.3 未配置时仍占位（高度=边距）（已实现）

**产出**：页眉页脚可视化配置 + 页码动态注入（基本完成，本阶段补全细节）。

## 阶段 6：打磨与扩展

- [ ] 6.1 撤销/重做（历史栈）
- [ ] 6.2 schema 序列化/反序列化（保存/加载 JSON）
- [ ] 6.3 组件库扩展：grid/flex 容器、签名、勾选框、日期、分隔线
- [ ] 6.4 测量性能优化（行高缓存、批量测量）
- [ ] 6.5 表单预览组件扩展：表格列级 field 绑定、复杂校验规则

## 优先级与风险

| 阶段 | 优先级 | 风险点 |
|---|---|---|
| 1 | 高 | 引擎抽函数化，注意保留 demo-v2 验证过的测量宽度对齐 |
| 2 | 高 | 低，纯渲染 |
| 3 | 高 | 拖拽排序与分页重算的性能（debounce 策略）；组件配置项 JSON 驱动右栏面板的开发模式新引入 |
| 4 | 高 | 数据填入与权限应用，p 去掉 text 后的渲染逻辑调整 |
| 5 | 中 | 页码注入时机（引擎生成 Page[] 时确定） |
| 6 | 低 | — |

## 验证基线

阶段 2 完成后应复刻 demo-v2.html 的全部验证点：

1. JS 分页引擎自动分页
2. 屏幕离散纸张垂直堆叠
3. 表格按行切分 + 表头每页重复
4. 页眉/页脚占位贴纸张顶/底
5. A4/A3 × 横/纵 动态切换 + `@page` 注入
6. 打印复用屏幕 DOM，效果一致
7. 组件含 `data-field` 属性（预览组件接入点）

阶段 3 完成后追加验证点：

8. 三栏布局 + 顶部工具栏 + 底部状态栏
9. 拖拽投放 p/image/table 到画布，生成空壳模板
10. 选中组件 → 右栏按 config.fields 自动渲染控件
11. 修改组件属性 → debounce 重算分页
12. field 重复软警告显示（阶段 3.4 待实现）

阶段 4 完成后追加验证点：

13. 传入 data {field: value} → p/image/table 数据正确填入
14. 传入 rules → readonly/hidden/required 权限生效

## 进度跟踪

| 阶段 | 状态 | 备注 |
|---|---|---|
| 1.1 项目骨架 | ✅ 完成 | Vue 3 + TS + Vite + Element Plus + vuedraggable |
| 1.2 vuedraggable 安装 | ✅ 完成 | 含在 1.1 |
| 1.3 Schema 类型 | ✅ 完成 | 含 field；不含 grid/flex；不含 rules；**待调整：p 去 text** |
| 1.4 引擎函数化 | ✅ 完成 | geom/measure/paginate/render-html |
| 1.5 引擎单测 | ✅ 完成 | 50 单测覆盖切分/超高/表格 |
| 2 渲染器 | ✅ 完成 | FormRenderer/Paper/CompP/CompImage/CompTable + usePrintStyle + 54 单测 |
| 3.1 组件配置项 JSON | ✅ 完成 | ComponentConfig 泛型 + createDefaultFactory + 注册表 + 30 单测 |
| 3.2 三栏骨架 | ✅ 完成 | DesignerApp/Toolbar/ComponentPalette/CanvasPane/ConfigPanel/StatusBar |
| 3.3 交互能力 | ✅ 完成 | 拖拽生成 + 选中高亮 + 排序按钮 + debounce 300ms |
| 3.4 field 软校验 | ⏳ 待开始 | — |
| 4 表单预览组件 | ⏳ 待开始 | 需先完成阶段 3.4 + schema 调整（p 去 text） |
| 5 页眉页脚完善 | ⏳ 待开始 | 基本已在阶段 2 实现，本阶段补全细节 |
| 6 打磨扩展 | ⏳ 待开始 | — |

## 阶段 4 前置：Schema 与组件调整清单

> 阶段 4（表单预览组件）开始前，需先完成以下 schema 与组件调整，让模板真正"数据无关"。

### A. Schema 调整（src/types/schema.ts）

- [ ] PComponent：去掉 `text` 字段（p 是空壳，预览时由 data[field] 填入）
- [ ] ImageComponent：`src` 改为可选（模板固定图片或预览由 data[field] 提供）
- [ ] TableComponent：rows 保留为模板配置（默认 5 行空行）；不加 rowCount 字段

### B. 组件配置项调整（src/components/{p,image,table}/config.ts）

- [ ] pConfig：去掉 text field；保留 field（可选）
- [ ] imageConfig：src 改为可选（required: false）
- [ ] tableConfig：保留 field；不加 rowCount（rows 直接是模板配置，createDefault 生成默认 5 行空行）

### C. createDefault 调整（产出空壳模板）

- [ ] pConfig.createDefault：产出 `{ id, type: 'p', field: '' }`（无 text）
- [ ] imageConfig.createDefault：产出 `{ id, type: 'image', field: '', src: '', width: undefined, height: undefined }`
- [ ] tableConfig.createDefault：产出 `{ id, type: 'table', field: '', columns: [默认 2 列], rows: [5 行空行] }`

### D. UI 组件渲染调整

- [ ] CompP.vue：模板模式显示 `{field}` 占位（如 field='workName' 显示 `{workName}`）；无 field 显示空
- [ ] CompImage.vue：有 src 渲染图片；无 src 显示占位框
- [ ] CompTable.vue：按 rows 模板渲染 N 行空行

### E. Mock schema 调整

- [ ] mock-schema.ts（A4）：去掉 p 的 text，改为 field 标识；table rows 改为 5 行空行
- [ ] mock-schema-a3.ts：同上

### F. 测试调整

- [ ] CompP.test.ts：去掉 text 相关断言，改为 field 占位断言
- [ ] pConfig.test.ts：去掉 text field 断言
- [ ] imageConfig.test.ts：src 改可选断言
- [ ] tableConfig.test.ts：rows 默认 5 行空行断言
- [ ] paginate.test.ts / FormRenderer.test.ts：mock schema 调整后同步更新
