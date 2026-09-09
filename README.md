# TicketDesigner · 固定布局表单设计器

面向**手写场景**的固定布局表单设计器：可视化编排版式 → 导出 Schema JSON → 由渲染组件消费并填充/打印。
技术栈 Vue 3.5 + TypeScript + Vite + Vitest，无后端依赖。

## 一、它解决什么

纸质作业票、工作票、登记表这类表单的共同点是**版式固定、要精确打印**。传统表单引擎按流式布局渲染，对不齐格子、打不出边框。
本项目的 Schema V2 用「页面 → 格子(Grid) → 行 → 单元格 → 组件」的固定坐标模型描述版式，渲染结果与打印结果同源同口径。

## 二、能力

- **设计器**：左侧组件栏拖拽到画布、结构树层级选择、右侧属性面板、撤销/重做、自动分页预览、一键打印
- **节点类型**：Page / Grid（格子）/ Row / Cell / P（字段）/ Text（固定文本）/ Table / HTML / Image
- **渲染内核**：设计、预览、填写、打印共用同一渲染路径（由 `RenderPathIsomorphism` 测试锁死逐字符一致）
- **自动分页**：`src/engine-v2/pagination.ts` 纯函数分页，DOM 无关、确定性，按 Grid 行边界与 Table 数据行切分
- **字段级权限与校验**：`fieldPermissions`（READ/EDIT/HIDDEN）与 `rules`（必填）与数据同轨注入，不进 Schema
- **纸张与打印**：A4/A3 尺寸驱动方向，`@page` 由渲染内核运行时注入
- **国际化**：内置中英文案（`src/i18n`）

## 三、快速开始

```bash
npm install
npm run dev        # 启动设计器（默认 http://localhost:5173）
npm test           # vitest run
npm run build      # vue-tsc --noEmit && vite build
npm run preview    # 预览构建产物
```

演示页：`preview.html`（填写态演示，含字段权限、必填校验、复杂签名表三个场景）。

## 四、目录结构

```
src/
├── types/                # Schema V2 类型定义、序列化、校验、结构操作
├── engine-v2/            # 渲染期领域逻辑：分页引擎、派生计算、节点地址
├── components/
│   ├── renderer-v2/      # 渲染内核：GridFormRenderer / FormRenderer / GridSchemaNode / HtmlBlock / PaperViewport
│   └── designer/         # 设计器：DesignerApp 编排层 + CanvasSurface 表面层 + composables + inspectors
├── preview/              # 预览/填写演示页
├── dev/                  # 示例数据与测试夹具（被测试与演示页引用）
├── i18n/                 # 中英文案
├── utils/ styles/ samples/ test-utils/
docs/                     # 设计契约文档（索引见 docs/README.md）
```

**分层约定**：渲染内核不认识"选中/拖拽/落点"，这些交互设计态相关的内容一律在表面层 `CanvasSurface.vue` 完成；
设计器与消费页都通过 `FormRenderer` 渲染，内核保持可独立消费。

## 五、数据流

```
设计器编排 → 导出 Schema JSON →（外部服务存储）→ 消费页引用 FormRenderer + schema + data → 渲染 / 填写 / 打印
```

Schema 只描述版式，不携带数据；数据（含字段权限、校验规则）在渲染时通过 props 注入。

## 六、文档

| 文档 | 内容 |
|---|---|
| [docs/README.md](./docs/README.md) | 文档索引 |
| [docs/design.md](./docs/design.md) | Schema 结构与节点模型设计契约 |
| [docs/design-biz.md](./docs/design-biz.md) | 业务与交互设计 |
| [docs/engine.md](./docs/engine.md) | 渲染引擎契约（索引/校验/渲染/尺寸/边框/打印） |
| [docs/acceptance-row-spec.md](./docs/acceptance-row-spec.md) | 前五行字段与边框规格表（验收依据） |
| [docs/user-guide.md](./docs/user-guide.md) | 用户操作指南（与应用内「帮助」同源） |

## 七、验证基线

- `npx vitest run`：**381 passed（48 文件）**
- `npx vue-tsc --noEmit`：无错误

## 八、分支

- `release`：对外发布分支，发布到公共 npmjs（`@cluadwong/ticket-designer`），只保留源码、测试与对外文档
- `dev`：内部开发分支，发布到内网 GitLab Package Registry，含过程记录与调试样本

## 九、作为 npm 包使用（对外）

组件库以公共 npm 包形式发布：`@cluadwong/ticket-designer`。

```bash
npm i @cluadwong/ticket-designer
```

两个按需入口：

| 入口 | 内容 | 谁用 |
|---|---|---|
| `@cluadwong/ticket-designer/renderer` | `FormRenderer` / `GridFormRenderer` / `printForm` / `collectFieldValues` / Schema 类型 | 消费端：渲染、填写、打印 |
| `@cluadwong/ticket-designer/designer` | `DesignerApp` / `defaultDesignerUIConfig` / `buildBlankSchema` | 需要在宿主内编排模板时 |

样式按入口分离，别引错（`vue` 是 peerDependency，宿主必须 `resolve.dedupe: ['vue']`）：

```ts
import { FormRenderer } from '@cluadwong/ticket-designer/renderer'
import '@cluadwong/ticket-designer/renderer/style.css'
```

更完整的接入示例与坑见 [docs/publish-npm.md](./docs/publish-npm.md)。
