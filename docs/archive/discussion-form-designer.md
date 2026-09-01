> **已归档（2026-08-31）**：本文是项目早期的方案讨论**对话记录**（Schema 渲染 vs 直接生成 HTML、
> FormPreview / PreviewDialog 等探索），结论已被 [../design.md](../design.md)（统一设计）与
> [../engine.md](../engine.md)（渲染引擎）吸收，并落地为当前的 Schema V2 实现。
> 仅作决策过程留档，**不再是当前方案依据**；当前实现状态见 [../development-plan.md](../development-plan.md)。

---

# (1) 讨论表单设计器实现方案

> **Workspace:** e:\Project\ssh\TicketDesigner

---

**User**

`/e:/Project/ssh/TicketDesigner/docs/development-plan.md`先不急改代码，先讨论产品设计实现方案。
前期讨论和实现的都是渲染和打印效果，这也是为了验证渲染器的表单渲染效果和打印效果是可实现的。最终要实现的表单，用html也能实现，大部分输入都是诸如之前提过的<p contenteditable data-field="单位"></p>这类，如图片所示。现在需求是，在设计器阶段就能通过拖拽组件，从而实现图片里相似的表单的渲染和打印，设计出来的产物，后续能通过渲染器进行数据写入，也能直接在渲染出来的表单上进行表单内容输入。

**Assistant**

好的，我们先讨论产品设计实现方案。让我先回顾一下相关的设计文档和当前项目状态，确保我们在同一个认知层面上。

让我再看看当前项目的代码状态，以便更准确地讨论实现方案。

好的，我已经完整阅读了三份设计文档和当前代码状态。下面结合你给的工作票图片，讨论设计实现方案。

---

## 一、图片表单的组件映射分析

先把工作票表单拆解成组件，看看我们需要什么：

| 表单区域 | 内容 | 对应组件 | 备注 |
|---------|------|---------|------|
| 标题 | "云南铝业股份有限公司 电气第二种工作票" | p（无 field，纯展示） | 居中、加粗、大字号 |
| 单位 / 编号 | 两列并排，左右各一个 | p × 2 | **需要横向布局** |
| 工作负责人 / 班组 | 两列并排 | p × 2 | **需要横向布局** |
| 工作班成员 | 多行文本 | p | 需支持换行 |
| 变配电所名称及设备名称 | 单行 | p | |
| 工作任务 | 表格（地点/内容）+ 5行空行 | table | 打印手写场景 |
| 计划工作时间 | 年/月/日/时/分（开始/结束共10个字段） | p × 10 | **日期类字段** |
| 工作条件 | 多行文本 | p | |
| 注意事项 | 多行文本 | p | |
| 签发人签名 / 日期 | 签名 + 日期 | p + 签名组件？ | **签名待讨论** |
| 许可人签名 / 日期 | 同上 | | |
| 工作班成员签名 | 多人签名 | | |
| 工作票延期 | 日期 + 签名 | | |
| 工作票终结 | 日期 + 签名 | | |
| 备注 | 多行文本 | p | |

---

## 二、核心设计问题讨论

### 问题 1：横向布局怎么实现？

图片中"单位/编号"、"工作负责人/班组"都是左右并排的布局。当前 v1 组件只有 `p`、`image`、`table`，**没有 grid/flex 容器**。

**可选方案：**

| 方案 | 描述 | 优缺点 |
|------|------|--------|
| A. 扩展 p 组件 | p 组件增加 `layout: 'inline'` 属性，支持横向排列 | 简单但耦合，p 承担了布局职责 |
| B. 引入 grid/flex 容器 | 增加 grid 组件，内部放多个 p | 架构清晰，但要增加组件类型 |
| C. 在 Schema 中隐式支持 | 相邻的 p 组件如果 field 名以相同前缀开头，自动横向排列 | 魔法太多，不可控 |
| D. 用 table 模拟 | 两列表格模拟横向布局 | 语义不对，打印效果可能有边框 |

### 问题 2：日期字段和签名怎么处理？

工作票中有大量日期字段（年/月/日/时/分）和签名区。

**可选方案：**

| 方案 | 描述 | 优缺点 |
|------|------|--------|
| A. v1 用 p 组件承载 | 日期就是普通文本 input，签名用 image（上传图片） | 简单，快速可用，v1 可接受 |
| B. 新增日期组件 | 专门的 DatePicker 组件 | 交互更好，但增加组件复杂度 |
| C. 新增签名组件 | 手写签名板 | 用户体验好，但实现复杂 |

### 问题 3：预览组件的数据流和交互

你提到的 `<p contenteditable data-field="单位"></p>` 模式，涉及几个关键设计：

```
设计器阶段：
  <p data-field="单位">{单位}</p>  ← 显示 {field} 占位

预览组件阶段（有数据）：
  <p contenteditable data-field="单位">云南铝业</p>  ← 填入数据 + 可编辑

打印阶段：
  同一个 DOM，直接 @media print 输出
```

**需要讨论的子问题：**

**3a. 数据填入是"渲染时赋值"还是"双向绑定"？**

- 渲染时赋值：`fillForm(schema, data)` → 直接操作 DOM 的 textContent。简单但预览时的编辑无法同步回 data 对象。
- 双向绑定：用 `v-model` 或 Vue reactive，p 组件的 textContent 与 data 对象双向同步。复杂但支持实时编辑。

**3b. contenteditable 的实现方式？**

- 原生 `contenteditable` 属性：简单直接，浏览器原生支持，但粘贴富文本可能有问题。
- Vue 自定义指令：封装 contenteditable，处理输入事件，回写 data。

**3c. 权限如何生效？**

- `readonly`：去掉 `contenteditable` 属性
- `hidden`：`display: none`
- `required`：红色星号 + 提交时校验

### 问题 4：表格组件的两种使用场景

从图片看，表格有两种用法：

1. **工作任务表**：打印手写场景，模板配置 N 行空行，预览时可能填入数据也可能空着
2. **其他表格**：可能完全由数据填入，不需要空行模板

当前设计已经支持这个（`rows` 是模板配置，`data[field]` 覆盖），但需要确认：
- 预览时如果 `data[field]` 为空，是否显示模板空行？（是的，用于打印手写）
- 预览时如果 `data[field]` 有数据，是否完全替换模板 rows？（是的）

### 问题 5：设计器产出 → 预览组件的完整流程

```
┌─────────────────────────────────────────────────────┐
│ 设计器 (阶段 3)                                       │
│                                                       │
│  用户拖拽组件 → 配置属性 → 产出 FormSchema              │
│  (数据无关模板，含 field 标识)                          │
│                                                       │
│  例:                                                 │
│  { body: [                                           │
│    { type:'p', field:'单位' },                       │
│    { type:'p', field:'编号' },                       │
│    { type:'table', field:'工作任务', columns:[...],   │
│      rows:[5行空行] },                                │
│    ...                                               │
│  ]}                                                  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 预览组件 (阶段 4)                                     │
│                                                       │
│  输入: FormSchema + data: {单位:'云南铝业', ...}       │
│        + rules: {单位: {readonly: false}, ...}        │
│                                                       │
│  渲染流程:                                            │
│  1. 调 paginate(schema) → 得到分页结构                │
│  2. 渲染纸张 DOM（同 FormRenderer）                    │
│  3. 遍历 [data-field] 节点 → 填入 data[field]         │
│  4. 按 rules 应用权限（contenteditable/hidden/...）    │
│  5. 用户编辑 → 回写 data 对象                         │
│                                                       │
│  输出: 可编辑的表单 DOM + 同步的 data 对象              │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 打印 (复用同一 DOM)                                   │
│                                                       │
│  window.print() + @page size + 打印媒体查询            │
│  屏幕所见 = 打印所得                                    │
└─────────────────────────────────────────────────────┘
```

---

## 三、我的建议

基于以上分析，我建议分两步走：

**第一步（当前优先级最高）：** 完成 Schema 调整 + 预览组件骨架

1. Schema 调整：p 去 text（已完成 ✓）、image src 改可选（未完成）
2. 实现 `FormPreview` 组件：复用 `FormRenderer`，增加数据填入 + contenteditable
3. 先用现有 p/image/table 三种组件跑通完整流程

**第二步（按需扩展）：** 根据实际表单需求扩展组件

1. 如果确实需要横向布局 → 引入 grid 容器
2. 如果日期输入体验不好 → 新增日期组件
3. 如果签名需求明确 → 新增签名组件

---

## 四、需要你决策的关键问题

在进入实现前，想和你确认：

1. **横向布局**：工作票中的"单位/编号"并排、"工作负责人/班组"并排，v1 是否需要支持？如果需要，用什么方案？
2. **日期字段**：v1 是否用 p 组件（普通文本）承载日期，还是需要专门的日期组件？
3. **签名**：v1 是否需要签名功能？还是后续再考虑？
4. **数据填入方式**：预览组件中，用户编辑 contenteditable 后，是否需要实时同步回 data 对象（双向绑定）？还是只在提交时读取？
5. **权限范围**：v1 预览组件是否实现 readonly/hidden/required 三种权限，还是先只实现 readonly？

这些决策会直接影响 Schema 设计、组件扩展和实现路径。你倾向哪种方案？

---

**User**

1.前期阶段先只实现基础的p组件，用来确认模板设计、预览(填写)、打印三种状态下渲染效果一致；横版和竖版布局只是分别对应A3/A4，内容与设计器拖拽形成的排板基本一致（超过纸张内容高度的再换页继续渲染）
2. 日期和签名，将通过外部弹窗组件提供输入，组件本身不直接参与输入值的保存，而是另外维护一个data对象来记录field的值。
3.渲染时复制，原生 contenteditable 属性，权限也是渲染时通过dom操作改变，required暂时不开发。
4. 是的，用于打印手写；是的；既可以打印手写（这种数据不会记录到data里），也可以替换模版（使用dom操作去替换）；
5.流程没问题，现在需要确认的是，除了使用schema去渲染，如果直接通过拖拽组件结合布局组件去生成html,会不会更简单更接近；

**Assistant**

让我先看看引擎内部的渲染流程，再回答你的核心问题。

好，我理解了你的 1-4 点确认。现在重点分析第 5 点的核心问题。

---

## Schema 渲染 vs 直接生成 HTML：对比分析

先把两种方案的完整数据流画出来：

### 方案 A：Schema 驱动（当前架构）

```
设计器：
  拖拽组件 → 更新 Schema(JSON) → FormRenderer → paginate → Paper → CompP/CompImage/CompTable → DOM

测量（引擎内部）：
  Schema → renderComponentHtml() → HTML 字符串 → DomMeasure → offsetHeight

预览：
  Schema + data → 渲染 DOM → querySelectorAll('[data-field]') → 填入 data[field]

打印：
  同一 DOM + @page 规则
```

### 方案 B：直接生成 HTML

```
设计器：
  拖拽组件 → 直接生成 HTML(<p data-field="单位">) → 插入画布 DOM

分页：
  遍历画布 HTML 元素 → 逐个测高 → 切分到页面

预览：
  clone HTML 模板 → querySelectorAll('[data-field]') → 填入 data[field]

打印：
  同一 DOM + @page 规则
```

### 核心对比

| 维度 | Schema 驱动 | 直接 HTML |
|------|------------|----------|
| **模板存储** | JSON（结构化，易序列化/校验） | HTML 字串（不够结构化，难程序化修改） |
| **分页引擎** | 遍历 `schema.body` 数组，已实现 | 需改为遍历 DOM 元素，**重写引擎** |
| **渲染路径** | 双通道：render-html.ts（测量）+ Vue 组件（显示），需保持一致 | 单通道：HTML 就是最终产物，**无双通道问题** |
| **组件配置** | Schema 字段显式声明（field/src/width...） | 散落在 HTML 属性中，修改需操作 DOM |
| **数据填入** | 渲染后 querySelectorAll('[data-field]') | clone 后 querySelectorAll('[data-field]') |
| **权限应用** | DOM 操作（去 contenteditable / display:none） | 完全相同 |
| **选中/交互** | provide/inject + data-comp-id | event delegation + data-comp-id（已部分实现） |
| **保存/加载** | JSON.stringify(schema) / JSON.parse | innerHTML 字符串（难校验、难差异修改） |
| **扩展新组件** | 加 Schema 类型 + renderer + config | 加 HTML 生成逻辑（无类型约束） |

### 关键发现

1. **复杂度不在 Schema→HTML 这一层**。真正复杂的是分页引擎（off-screen 测高 + 按行/按块切分 + 表格跨页 + 超高裁剪）和纸张结构（页眉/页脚/页码注入）。这些在两种方案里都一样复杂。

2. **直接 HTML 的唯一优势**：消除当前的双通道渲染问题（render-html.ts 测量 + Vue 组件显示需保持一致）。这是真实存在的维护成本。

3. **直接 HTML 的代价**：失去结构化模板表示，保存/加载/校验/扩展都变难，且需重写已验证的分页引擎。

4. **你提到的 data 对象方案**——"另外维护一个 data 对象来记录 field 的值"——两种方案下完全一致：都是渲染后通过 `querySelectorAll('[data-field]')` 做 DOM 操作填入。Schema 还是 HTML 只是模板的存储格式不同，不影响数据填入逻辑。

### 我的建议

**保留 Schema 作为模板格式，但简化渲染路径。**

理由：
- 分页引擎已验证通过（134 个单测），重写无收益
- Schema 的结构化表示对保存/加载/扩展至关重要
- 双通道渲染问题可以用更轻量的方式解决，不必推翻架构

具体做法——**统一渲染路径**：

```
当前：
  测量：Schema → render-html.ts → HTML 字符串 → DomMeasure
  显示：Schema → paginate → Paper.vue → CompP.vue → DOM
  ⚠ 两条路径必须产出一致 HTML

改进后：
  统一：Schema → render-html.ts → HTML 字符串
       ↗ 用于测量（DomMeasure）
       ↘ 用于显示（Paper.vue 直接 v-html 插入）
  
  CompP/CompImage/CompTable → 退化为 render-html.ts 内的函数
  Paper.vue → 从 v-for CompP 改为 v-html block.html
```

这样：
- 消除双通道问题（render-html.ts 是唯一渲染源）
- 保留 Schema 的结构化优势
- 预览组件仍然是：渲染 DOM → querySelectorAll 填数据 → 加 contenteditable
- 不需要重写分页引擎

---

## 针对 p 组件先跑通的落地计划

基于你的确认（先只做 p，验证三种状态一致），路径如下：

```
第一步：Schema 调整
  ✓ PComponent 已去掉 text（已完成）
  ✓ BaseComponent 已有 field（已完成）
  → image src 改可选（后续再做）

第二步：统一渲染路径（简化）
  render-html.ts 的 renderComponentHtml(p) 产出：
    <p data-field="单位">{单位}</p>    ← 模板模式
  
  Paper.vue 改为直接插入 HTML 字符串（不再走 CompP.vue）
  
  选中态：通过 data-comp-id 属性 + CSS .selected 类
  （CanvasPane 已用 event delegation，只需给 HTML 加 data-comp-id）

第三步：FormPreview 预览组件
  接收：schema + data
  流程：
    1. paginate(schema) → PaginateResult
    2. Paper.vue 渲染（同 FormRenderer）
    3. 渲染后 querySelectorAll('[data-field]') → 填入 data[field]
    4. p 节点加 contenteditable 属性
    5. 按 rules 去 contenteditable / hidden（DOM 操作）
  
  用户编辑 → input 事件 → 回写 data 对象

第四步：验证三种状态
  模板模式：  <p data-field="单位">{单位}</p>     ← 显示占位
  预览模式：  <p contenteditable data-field="单位">云南铝业</p>  ← 填数据+可编辑
  打印模式：  同一 DOM + @page（contenteditable 不影响打印）
```

---

你觉得这个方向对吗？还是你更倾向于直接 HTML 的方案？如果确认方向，我可以开始细化每一步的改动范围。

---

**User**

那就还是保持schema的方案，但要保证在设计器设计表单时，能确保画布上能直接渲染表单效果，可直接用于打印

**Assistant**

确认。让我先看一下设计器当前的打印 CSS 覆盖情况，确保"画布即打印"这个需求的具体差距。

好，已经看完当前代码。情况如下：

## 当前状态评估

**已经实现的：**
- 设计器画布通过 FormRenderer 渲染实际表单 DOM（Paper → CompP → `<p data-field="xxx">{xxx}</p>`）
- DesignerApp 打印 CSS 已隐藏左栏 ComponentPalette 和右栏 ConfigPanel
- CanvasPane 打印 CSS 已重置容器约束（padding/overflow/min-height）
- FormRenderer 打印 CSS 已处理纸张分页（page-break-after）

**存在的差距：**

1. **打印时 Toolbar 和 StatusBar 未隐藏**——[DesignerApp.vue](file:///e:/Project/ssh/TicketDesigner/src/components/designer/DesignerApp.vue#L220-L233) 的 `@media print` 只隐藏了 `.designer-body > :not(.canvas-pane)`，但 Toolbar 和 StatusBar 是 `.designer` 的直接子元素，不受此规则约束，打印时仍会出现在页面上。

2. **FormPreview 组件未实现**——预览（填写数据 + contenteditable）模式还没开始。

3. **Schema 调整未完成**——development-plan 阶段4前置清单中的 image src 改可选、mock schema 调整等未做（但 p 组件已调整完毕）。

## 实现计划

基于你的确认（先 p 组件，验证三种状态一致），分三步：

### 第一步：补全设计器打印 CSS

| 文件 | 改动 |
|------|------|
| [DesignerApp.vue](file:///e:/Project/ssh/TicketDesigner/src/components/designer/DesignerApp.vue) | `@media print` 中增加隐藏 Toolbar 和 StatusBar 的规则 |

确保设计器画布 → `window.print()` → 只输出纸张内容，所见即所得。

### 第二步：实现 FormPreview 预览组件（p-only）

新建 `src/components/preview/FormPreview.vue`：

```
输入：schema + data + rules?(暂只 readonly/hidden)

流程：
1. 复用 FormRenderer 调 paginate(schema) → 渲染纸张 DOM
2. 渲染完成后 nextTick → querySelectorAll('[data-field]')
3. 对每个 [data-field] 节点：
   - 填入 data[field]（p → textContent）
   - 加 contenteditable 属性
4. 应用 rules：
   - readonly → 去掉 contenteditable
   - hidden → display: none
5. 监听 input 事件 → 回写 data 对象
```

| 文件 | 改动 |
|------|------|
| 新建 `src/components/preview/FormPreview.vue` | 预览组件骨架 + 数据填入 + contenteditable + 权限 |
| 可能调整 [FormRenderer.vue](file:///e:/Project/ssh/TicketDesigner/src/components/renderer/FormRenderer.vue) | 暴露渲染完成后的 DOM ref 或 emit 'rendered' 事件，供 FormPreview 接管后续 DOM 操作 |

### 第三步：验证三种状态

| 状态 | 渲染结果 | 打印 |
|------|---------|------|
| 设计器模板 | `<p data-field="单位">{单位}</p>` | 直接 window.print() |
| 预览填入 | `<p contenteditable data-field="单位">云南铝业</p>` | 同一 DOM + @page |
| 打印输出 | 复用上述 DOM | @page size + page-break |

---

这个计划是否符合你的预期？确认后我开始实施。

---

**User**

打印和预览 不在设计器页上直接实现。期望的是 封装一个预览弹窗，在弹窗内支持打印

**Assistant**

明白了。打印和预览不在设计器页面上，而是封装一个独立的预览弹窗，弹窗内支持打印。

## 修正后的架构

```
设计器页面（DesignerApp）
  ├─ 三栏布局：组件库 / 画布 / 配置面板
  ├─ 画布渲染模板效果（{field} 占位）
  └─ 工具栏"预览"按钮 → 打开预览弹窗

预览弹窗（PreviewDialog）
  ├─ 顶部：标题 + 打印按钮 + 关闭按钮
  ├─ 内容区：FormPreview（渲染纸张 + 填入数据 + contenteditable）
  └─ 打印：弹窗内 window.print()，@media print 只输出纸张内容
```

## 实现计划

### 第一步：FormPreview 预览组件

新建 `src/components/preview/FormPreview.vue`：

```
输入：schema + data + rules?

流程：
1. 调 paginate(schema) → 渲染纸张 DOM（复用 FormRenderer 渲染逻辑）
2. nextTick → querySelectorAll('[data-field]')
3. 对每个节点：
   - p → textContent = data[field]，加 contenteditable
4. rules 应用（DOM 操作）：
   - readonly → 去掉 contenteditable
   - hidden → display: none
5. input 事件 → 回写 data 对象
```

### 第二步：PreviewDialog 弹窗组件

新建 `src/components/preview/PreviewDialog.vue`：

```
结构：
  <div class="preview-overlay" v-if="visible">
    <div class="preview-toolbar">
      <span>表单预览</span>
      <button @click="handlePrint">打印</button>
      <button @click="handleClose">关闭</button>
    </div>
    <div class="preview-content">
      <FormPreview :schema :data :rules />
    </div>
  </div>

打印 CSS（弹窗内 scoped 或全局）：
  @media print {
    /* 隐藏设计器页面 */
    #app { display: none !important; }
    /* 弹窗容器重置 */
    .preview-overlay { position: static; }
    .preview-toolbar { display: none; }
    .preview-content { overflow: visible; }
    /* 纸张分页规则（复用现有 FormRenderer 打印 CSS） */
  }
```

### 第三步：设计器接入

| 文件 | 改动 |
|------|------|
| [Toolbar.vue](file:///e:/Project/ssh/TicketDesigner/src/components/designer/Toolbar.vue) | 增加"预览"按钮，emit `open-preview` 事件 |
| [DesignerApp.vue](file:///e:/Project/ssh/TicketDesigner/src/components/designer/DesignerApp.vue) | 接收 `open-preview`，控制 PreviewDialog 显示/隐藏，传入当前 schema |

### 第四步：验证三种状态

| 状态 | 渲染 | 位置 |
|------|------|------|
| 设计器 | `<p data-field="单位">{单位}</p>` | 画布 |
| 预览 | `<p contenteditable data-field="单位">云南铝业</p>` | 弹窗 |
| 打印 | 同弹窗 DOM + @page | 弹窗内 window.print() |

---

这个方案是否符合你的预期？确认后开始实施。

---

**User**

确保预览组件不与预览弹窗一起封装，而是单独一个组件，后续用于表单详情页里直接渲染表单；是的话继续执行

**Assistant**

确认。FormPreview 是独立组件，不与 PreviewDialog 耦合，后续表单详情页也能直接用。开始执行。

先读取需要了解的文件。

让我再看几个关键文件，然后开始实现。

现在有了完整的上下文。开始实施。

现在更新 types 的 index 文件并创建 FormPreview 组件。

有重复行，修复一下。

types/index.ts 修复完成。现在创建 FormPreview 组件。

FormPreview 创建成功。现在创建 PreviewDialog 弹窗组件。

PreviewDialog 创建成功。现在修改 Toolbar 和 DesignerApp。

先修改 Toolbar.vue——把"打印"按钮改为"预览"按钮，emit `open-preview` 事件。

emit 已添加。现在替换 handlePrint 和模板中的打印按钮。

现在替换模板中的打印按钮。

Toolbar 修改完成。现在修改 DesignerApp.vue 接入预览弹窗。

先加 import 和状态变量。

import 成功。现在添加预览弹窗状态和处理函数。

状态变量添加成功。现在添加处理函数和模板。

处理函数添加成功。现在更新模板——给 Toolbar 加 `@open-preview` 事件，并添加 PreviewDialog。

现在添加 PreviewDialog 到模板末尾。

所有文件修改完成。让我更新 todo 并检查 TypeScript 诊断。

FormPreview 无错误。检查其他文件。

所有文件零 TypeScript 错误。更新进度并总结。

全部完成。以下是实施总结：

## 新增/修改文件

| 文件 | 操作 | 职责 |
|------|------|------|
| [rules.ts](file:///e:/Project/ssh/TicketDesigner/src/types/rules.ts) | 新建 | FieldRule + RulesMap 类型（readonly/hidden/required） |
| [index.ts](file:///e:/Project/ssh/TicketDesigner/src/types/index.ts) | 修改 | 导出 rules |
| [FormPreview.vue](file:///e:/Project/ssh/TicketDesigner/src/components/preview/FormPreview.vue) | 新建 | 独立预览组件：复用 FormRenderer + 数据填入 + contenteditable + 权限 |
| [PreviewDialog.vue](file:///e:/Project/ssh/TicketDesigner/src/components/preview/PreviewDialog.vue) | 新建 | 弹窗容器：Teleport to body + 工具栏(打印/关闭) + 打印CSS |
| [Toolbar.vue](file:///e:/Project/ssh/TicketDesigner/src/components/designer/Toolbar.vue) | 修改 | "打印"→"预览"按钮，emit open-preview |
| [DesignerApp.vue](file:///e:/Project/ssh/TicketDesigner/src/components/designer/DesignerApp.vue) | 修改 | 接入 PreviewDialog + previewData 状态 |

## 三种状态的渲染链路

```
1. 设计器模板模式
   Toolbar "预览"按钮 → 打开 PreviewDialog
   画布渲染：<p data-field="单位">{单位}</p>          ← {field} 占位

2. 预览填入模式（弹窗内）
   PreviewDialog → FormPreview
   FormRenderer 渲染纸张 DOM → nextTick → fillData()
   querySelectorAll('[data-field]') → 填 data[field] + contenteditable
   用户编辑 → @input 事件 → emit update:data → 回写 previewData

3. 打印模式（弹窗内点"打印"）
   @media print:
     #app { display: none }           ← 隐藏设计器
     .preview-overlay { static }     ← 弹窗容器重置
     .preview-toolbar { display: none } ← 隐藏工具栏
     纸张 page-break-after: always     ← 复用现有打印CSS
```

## 关键设计决策

- **FormPreview 独立于 PreviewDialog**：后续表单详情页可直接 `<FormPreview :schema :data :rules />` 使用
- **渲染时复制**：data → DOM 单向填入；用户编辑 → input 事件 → 回写 data（不触发重新渲染）
- **权限 DOM 操作式**：readonly 去掉 contenteditable，hidden 设 display:none
- **打印 CSS 隔离**：PreviewDialog 的 `#app { display: none }` 确保打印时只输出弹窗内的纸张

---

