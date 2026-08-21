# 表单设计器 业务设计文档

> 配套 [design.md](./design.md)（产品形态/概念体系/分页机制）与 [engine.md](./engine.md)（分页引擎算法）。
>
> 本文回答"**做什么表单、给谁用、怎么用**"——业务流程、双模式、字段绑定、组件配置项。
> design.md/engine.md 回答"**怎么把表单渲染/分页/打印**"——技术机制。
> 两者正交，不互相覆盖。

---

## 1. 业务定位

### 1.1 双使命

同一份表单设计产物（FormSchema），承载两种使用模式：

| 模式 | 用途 | 数据来源 | 输入交互 | 当前阶段 |
|---|---|---|---|---|
| **打印模式** | 设计 → 打印 → **手写填写** | 无数据 | 纸张手填 | **v1 实现** |
| **审批模式** | 流程运行时 → 渲染表单 → **流程数据自动填充** + 用户补填 | 流程实例数据 `{field: value}` | 屏幕表单交互 | **v2 预留** |

> 设计器只做一件事：**设计表单模板**（FormSchema）。
> 模板被两种消费方使用：打印器（v1） / 流程运行时（v2）。

### 1.2 双阶段开发路线

```
阶段 A（v1，当前）：
  设计器 → FormSchema → 打印 → 手写
  ⚠ 不涉及流程、数据填充、权限运行时

阶段 B（v2，后续）：
  设计器产物（FormSchema） + 流程数据 + 权限规则
    → 运行时渲染器
    → DOM 按 field 注入数据
    → 按 rules 控制字段权限
    → 屏幕审批 / 打印归档
```

> v1 不实现 v2 的运行时，但 Schema 必须**预留 v2 接入点**（field 字段），避免 v2 时回头改 Schema。

---

## 2. 设计器布局范式

### 2.1 三栏式低代码布局

```
┌─ 顶部工具栏（纸张/方向/边距/页眉页脚/打印预览/保存） ────────┐
├──────────┬──────────────────────────┬──────────────────┤
│ 左栏     │ 中栏：预览画布            │ 右栏：配置面板    │
│ 组件库   │  ┌──────────────────┐    │                  │
│          │  │ 离散纸张         │    │ ▸ 表单属性       │
│ ▸ p      │  │  ┌────────────┐ │    │   (纸张/边距/    │
│ ▸ image  │  │  │ 页眉        │ │    │    页眉页脚)     │
│ ▸ table  │  │  │ ────        │ │    │                  │
│          │  │  │ 正文组件    │ │    │ ▸ 选中组件属性   │
│          │  │  │ ────        │ │    │   (由组件配置项   │
│          │  │  │ 页脚        │ │    │    JSON 驱动，    │
│          │  │  └────────────┘ │    │    见 §5)         │
│          │  └──────────────────┘    │                  │
├──────────┴──────────────────────────┴──────────────────┤
│ 底部状态栏（页数/警告/缩放）                              │
└────────────────────────────────────────────────────────┘
```

| 区域 | 职责 | 主要内容 |
|---|---|---|
| 顶部工具栏 | 表单级配置 + 操作 | 纸张选择、方向、边距、页眉页脚文本/页码、打印、保存 JSON |
| 左栏组件库 | 组件投放源 | **v1 仅 p / image / table** 三种；拖到中栏画布 |
| 中栏画布 | 所见即所得预览 | 渲染 `<FormRenderer>`，离散纸张垂直堆叠；点击选中组件；可拖拽排序 |
| 右栏配置面板 | 属性编辑 | 切换"表单属性"/"选中组件属性"两个 tab |

> v1 组件库不含 grid/flex 容器；架构已预留扩展点，后续需要时再追加。

### 2.2 右栏配置面板的两种模式

- **表单属性模式**（默认/无选中组件时）：
  纸张配置、边距、页眉（文本 + 页码开关）、页脚（同）、保存/加载 JSON
- **组件属性模式**（选中某组件时）：
  由该组件的**配置项 JSON** 驱动渲染（见 §5）；至少包含 field 字段输入框

> 选中组件时面板自动切到组件属性；取消选中（点画布空白）切回表单属性。

---

## 3. 字段绑定模型

### 3.1 核心约定

**每个可输入组件都有一个 `field` 字段**，对应 DOM 节点的 `data-field` 属性：

```
Schema:    Component.field = 'workName'
            ↓ 渲染器
DOM:       <p data-field="workName">...</p>
            ↓ v2 流程运行时
流程数据:  { workName: '更换10kV开关柜' }
            ↓ DOM 操作
渲染结果:  <p data-field="workName">更换10kV开关柜</p>
```

- `field` 是**字符串标识符**，由设计器用户在右栏配置面板填写
- `field` 在同一表单内**应唯一**；设计器做**软警告**：重复时提示但不强制阻止
- `field` 缺省时组件**不参与数据绑定**（纯展示用，如说明性文字）

### 3.2 哪些组件可绑定 field

| 组件 | 可绑定 field | 绑定语义 | 备注 |
|---|---|---|---|
| **p** | ✅ | 单值文本 | 主要输入标签，几乎所有输入项用 p |
| **image** | ✅ | 图片 src（URL 或 base64） | 如签名图片 |
| **table** | ✅ | 整表数据（见 §3.3） | 表格绑定形态单一化 |

> **p 是主要输入标签**：从工作票样例看，"单位/编号/工作负责人/班组/工作内容"等字段都用 p 承载，通过 field 标识。
> 设计器默认所有投放的 p 都建议填 field（不填则仅作静态文本）。

### 3.3 表格组件的字段绑定（整表数据形态）

表格 field 绑定语义：**整表对应流程数据的一个数组**。

```
TableComponent {
  field: 'deviceList'         // 整表对应流程数据的一个数组
  columns: [
    { key: 'name',  title: '设备名' },
    { key: 'status', title: '状态' }
  ]
  rows: []                    // v1 设计时为空模板；v2 运行时由流程数据替换
}

流程数据（v2）：
{
  deviceList: [
    { name: '设备A', status: '正常' },
    { name: '设备B', status: '检修' }
  ]
}
```

- v1 渲染时：表格按 columns 渲染表头 + 空行模板（不绑定数据）
- v2 渲染时：`data[field]` 直接替换 `rows`，DOM 上 `<table data-field="deviceList">`

> v1 不实现"表格内散点字段绑定"（即列级 field），如有需求 v2 再扩展。

---

## 4. 权限模型（不在表单 Schema 内）

### 4.1 权限归属

权限配置（required / readonly / hidden 等）**不在表单设计器内实现**，由**专门的流程配置页面**处理：

```
表单设计器          流程配置页面            流程运行时
   │                    │                       │
   │ FormSchema         │ rules: RulesMap        │
   │ (含 field)         │ (按 field 配置权限)     │
   │                    │                        │
   └────────────────────┴────────────────────────┘
                          ↓
                  运行时渲染器
                  按 rules 控制 field 权限
```

- 表单设计器只产出 `FormSchema`（含 `field` 字段，不含 rules）
- 流程配置页面读取 FormSchema 的所有 field 列表，按流程节点为每个 field 配置权限规则
- 运行时渲染器同时接收 FormSchema + RulesMap，按 rules 控制字段权限

### 4.2 权限数据结构（参考，由流程页面定义）

```ts
/** 单个字段在某流程节点的权限规则 */
interface FieldRule {
  required?: boolean
  readonly?: boolean
  hidden?: boolean
  validate?: {
    min?: number
    max?: number
    pattern?: string
    validator?: string
  }
}

/** 权限规则集：field → FieldRule */
type RulesMap = Record<string, FieldRule>
```

> 此数据结构由流程配置页面负责维护，**不放入表单 Schema**。本设计器仅依赖 `field` 字段作为权限配置的键名来源。

---

## 5. 组件配置项 JSON 声明（关键模式）

### 5.1 设计目标

每个组件除 UI 渲染逻辑外，**单独声明一份配置项 JSON**，用于：

1. **驱动右栏配置面板**：选中组件时，按其配置项 JSON 自动渲染对应的表单控件
2. **约束组件可配置属性**：组件开发时显式声明可配字段，避免散落在代码各处
3. **组件可扩展性**：新增组件 = UI 组件 + 配置项 JSON，两者配套

### 5.2 配置项 JSON 结构

```ts
/**
 * 单个配置项定义
 * 右栏面板按此结构渲染对应的表单控件
 */
interface ConfigField {
  /** 配置项 key（对应 Component 上的字段名） */
  key: keyof Component
  /** 显示标签 */
  label: string
  /** 控件类型 */
  type: 'text' | 'textarea' | 'number' | 'select' | 'switch'
  /** 是否必填（设计器层校验，非运行时权限） */
  required?: boolean
  /** 默认值 */
  default?: unknown
  /** select 类型的选项列表 */
  options?: { label: string; value: string | number }[]
  /** 帮助文案 */
  help?: string
}

/**
 * 组件配置项声明
 * 每个组件开发时单独导出此声明
 */
interface ComponentConfig {
  /** 组件类型 */
  type: Component['type']
  /** 组件显示名（左栏组件库展示） */
  displayName: string
  /** 配置项列表（按顺序在右栏渲染） */
  fields: ConfigField[]
}
```

### 5.3 各组件配置项示例

#### p 组件

```json
{
  "type": "p",
  "displayName": "段落文本",
  "fields": [
    { "key": "field", "label": "字段标识", "type": "text", "required": false, "help": "用于与流程数据绑定；空则不参与数据绑定" },
    { "key": "text", "label": "文本内容", "type": "textarea", "required": true }
  ]
}
```

#### image 组件

```json
{
  "type": "image",
  "displayName": "图片",
  "fields": [
    { "key": "field", "label": "字段标识", "type": "text", "help": "v2 用于绑定图片 src（URL/base64）" },
    { "key": "src",   "label": "图片地址", "type": "text", "required": true },
    { "key": "width", "label": "宽度(mm)", "type": "number" },
    { "key": "height","label": "高度(mm)", "type": "number" }
  ]
}
```

#### table 组件

```json
{
  "type": "table",
  "displayName": "表格",
  "fields": [
    { "key": "field", "label": "字段标识", "type": "text", "help": "v2 绑定整表数据数组" }
  ]
}
```

> 表格的 columns / rows 配置较复杂，不在右栏用简单表单控件配置，单独在画布内编辑（点击表格进入列编辑模式）。

### 5.4 实现约定

```
src/components/
├─ p/
│  ├─ PComponent.vue          ← UI 组件
│  └─ config.ts              ← 配置项 JSON（export const pConfig: ComponentConfig）
├─ image/
│  ├─ ImageComponent.vue
│  └─ config.ts
└─ table/
   ├─ TableComponent.vue
   └─ config.ts

src/config/
└─ component-registry.ts      ← 注册表：汇集各组件 config，供左栏面板 + 右栏面板读取
```

- 左栏组件库：遍历注册表，按 `displayName` 渲染可拖拽项
- 右栏配置面板：选中组件时，按其 `config.fields` 自动渲染对应控件
- 组件开发强约束：**新增组件必须同时提供 UI 组件 + config.ts**，否则注册表不接受

---

## 6. v2 数据填充机制（预留）

### 6.1 v1 vs v2 渲染器对比

| 项 | v1 打印渲染器 | v2 审批渲染器 |
|---|---|---|
| 输入 | FormSchema | FormSchema + `{field: value}` + `RulesMap` |
| 输出 | 离散纸张 DOM（空字段/占位符） | 离散纸张 DOM（数据已填入 + 权限生效） |
| 字段渲染 | `<p data-field="x"></p>` | `<p data-field="x">实际值</p>` |
| 交互 | 只读预览 | 可编辑（按 rules 控制可编辑/必填/隐藏） |

### 6.2 v2 数据填充算法（DOM 操作式，按用户描述）

```
function fillForm(schema, data: Record<string, any>, rules?: RulesMap):
  // 1. 渲染空表单 DOM（复用 v1 渲染器输出）
  dom = renderEmpty(schema)

  // 2. 遍历所有 [data-field] 节点，按 field 查 data 填值
  dom.querySelectorAll('[data-field]').forEach(el => {
    field = el.getAttribute('data-field')
    if (data[field] !== undefined) {
      // 按 DOM 节点类型填值
      if (el is <p>)     el.textContent = data[field]
      if (el is <img>)   el.src = data[field]
      if (el is <table>) rebuildRows(el, data[field])   // 表格整表数据
    }
  })

  // 3. 应用权限规则
  if (rules) applyRules(dom, rules)

  return dom
```

### 6.3 v2 权限应用算法

```
function applyRules(dom, rules: RulesMap):
  dom.querySelectorAll('[data-field]').forEach(el => {
    field = el.getAttribute('data-field')
    rule = rules[field]
    if (!rule) return

    if (rule.hidden)   el.style.display = 'none'
    if (rule.readonly) el.setAttribute('contenteditable', 'false')
    if (rule.required) el.setAttribute('data-required', 'true')

    if (rule.validate?.pattern) el.dataset.pattern = rule.validate.pattern
  })
```

> 上述伪代码仅说明填充思路，v2 实现时可能改用 Vue 响应式数据驱动而非直接 DOM 操作；但**数据契约（field/value/rules）不变**。

---

## 7. 与现有文档的关系

| 文档 | 回答的问题 | 是否被本文影响 |
|---|---|---|
| [design.md](./design.md) | 产品形态、概念体系（纸张/页/边距/页眉页脚/组件/容器）、分页机制 | **不受影响**——本文扩展的是组件语义层，不改纸张/分页/页眉页脚等概念 |
| [engine.md](./engine.md) | 分页引擎算法、Schema TS 类型、PaginateResult 契约 | **已小幅扩展**——Component 联合收窄为 p/image/table；BaseComponent 追加 field |
| [development-plan.md](./development-plan.md) | 分阶段开发计划 | **需补充**——v1 阶段追加"字段配置面板"、"组件配置项 JSON 声明"等子任务 |
| 本文 design-biz.md | 业务流程、双模式、字段绑定、组件配置项 | — |

> 三份技术文档与本文是**正交关系**：技术文档讲"怎么渲染/分页/打印"，本文讲"渲染什么内容、内容怎么来、内容怎么填"。

---

## 8. 已锁定的业务决策

| 决策点 | 选型 | 落地位置 |
|---|---|---|
| v1 组件清单 | p / image / table（不含 grid/flex） | §2.1、[schema.ts](../src/types/schema.ts) Component 联合 |
| field 唯一性 | 软警告（不强制阻止） | §3.1 |
| 表格 field 绑定 | 仅形态 1（整表数据） | §3.3 |
| 权限配置 | 不在设计器内，由专门流程页面处理 | §4 |
| Schema 含 field | 是（v1 设计器可填，v2 渲染时用） | [schema.ts](../src/types/schema.ts) BaseComponent.field |
| Schema 不含 rules | 是（权限归流程页面） | [schema.ts](../src/types/schema.ts) FormSchema 无 rules |
| 组件配置项 | UI 组件 + config.ts 单独声明 JSON，驱动右栏面板 | §5 |
| 设计器布局 | 三栏式（左组件库/中画布/右配置面板） | §2.1 |
