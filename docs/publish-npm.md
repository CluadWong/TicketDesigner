# 发布为 npm 包 · ERP 接入指南

本组件库以私有 npm 包形式交付，发布到**自建 GitLab 的 Package Registry**（10.8.0.102，自带 npm registry，无需另搭 verdaccio）。

## 一、包结构（两个入口，按需引用）

| 入口 | 内容 | 谁用 |
|---|---|---|
| `@huangshichuang/ticket-designer/renderer` | `FormRenderer` / `GridFormRenderer` / `printForm` / `collectFieldValues` / Schema 类型 | **ERP 消费端**：渲染、填写、打印 |
| `@huangshichuang/ticket-designer/designer` | `DesignerApp` / `defaultDesignerUIConfig` / `buildBlankSchema` | 需要在 ERP 内编排模板时 |
| `@huangshichuang/ticket-designer` | 上面两个的合集 | 不推荐生产使用（会把设计器一起打进产物） |

样式按入口分离，**别引错**：

```
@huangshichuang/ticket-designer/renderer/style.css   → 渲染样式 6.7KB（含 .layout-* 版式类）
@huangshichuang/ticket-designer/designer/style.css   → 设计器样式 11.5KB（含 .v2-* 面板类）
```

只做渲染/填写的页面**只引 renderer 的样式**，否则设计器的非 scoped 样式会洒进 ERP 全局。

## 二、本地构建与校验

```bash
npm run build:lib          # 产出 dist/（JS + CSS）
npm run build:types        # 产出 dist/*.d.ts
npm run pack:check         # 上面两步 + npm pack --dry-run，发布前必跑
```

产物：`dist/{index,renderer,designer}.js` + `dist/chunks/{renderer-core,designer-ui}.js` + `dist/{renderer-core,designer-ui}.css` + 类型声明。
当前包体约 **104 KB（压缩）/ 368 KB（解压）**。

> `build:types` 末尾会自动跑 `scripts/fix-dts-alias.mjs`：把 `vue-tsc` 产物里残存的 `@/` 路径别名改写成相对路径。发布包**不能带 `@/`**（消费端没有这个别名，一 import 就报 `Cannot find module '@/types'`）。`tsconfig.lib.json` 已排除 `src/dev`，调试类型桩不会进包。改动这两处后必须重跑 `npm run build:types` 再 `npm pack`。

## 三、发布到 GitLab Package Registry

### 1. 建 token

GitLab → Preferences → Access Tokens，勾选 `api`（或 Deploy Token 勾 `write_package_registry`）。

### 2. 项目根放 `.npmrc`（**不要提交**，加进 `.gitignore`）

```ini
@huangshichuang:registry=https://10.8.0.102/api/v4/projects/huangshichuang%2Fticketdesigner/packages/npm/
//10.8.0.102/api/v4/projects/huangshichuang%2Fticketdesigner/packages/npm/:_authToken=${NPM_TOKEN}
```

### 3. 发布

发布命令必须在**能直连 `10.8.0.102` 的机器**上执行。本 agent 沙箱出口走代理，到内网 GitLab 的 TLS 隧道被拦截（返回 502），无法从此环境直接 `npm publish`。任选其一：

**方案 A — 从源码构建后发（推荐，最标准）**

```bash
npm ci
npm run build:lib && npm run build:types   # 产出 dist/（已验证：117 文件 / d.ts 内 @/ = 0 / CSS 拆分）
export NPM_TOKEN=<你的 token>
npm run pack:check                         # 先校验产物（npm pack --dry-run）
npm publish
```

**方案 B — 直接发已打好的 tarball（不用重建）**

```bash
export NPM_TOKEN=<你的 token>
npm publish ./huangshichuang-ticket-designer-0.1.0.tgz \
  --registry=https://10.8.0.102/api/v4/projects/huangshichuang%2Fticketdesigner/packages/npm/
```

> 每个版本号只能发一次，重发会 409。改 bug 请升版本号（`npm version patch`）。

## 四、ERP 侧接入

### 1. `.npmrc`（ERP 项目根，同样别提交）

```ini
@huangshichuang:registry=https://10.8.0.102/api/v4/projects/huangshichuang%2Fticketdesigner/packages/npm/
//10.8.0.102/api/v4/projects/huangshichuang%2Fticketdesigner/packages/npm/:_authToken=<只读 token>
```

### 2. 安装

```bash
npm i @huangshichuang/ticket-designer
```

### 3. `vite.config.ts` —— 必须加 dedupe

```ts
export default defineConfig({
  resolve: {
    // 关键：保证整个应用只有一份 Vue，否则响应式 / provide-inject / 组件解析全断
    dedupe: ['vue'],
  },
})
```

### 4. 用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FormRenderer, type FormSchemaV2 } from '@huangshichuang/ticket-designer/renderer'
import '@huangshichuang/ticket-designer/renderer/style.css'

const schema = ref<FormSchemaV2>(/* 设计器导出的 JSON */)
const data = ref<Record<string, string>>({})
const rendererRef = ref<InstanceType<typeof FormRenderer> | null>(null)

async function submit() {
  const ok = await rendererRef.value?.validate()   // 必填校验
  if (!ok) return
  console.log(rendererRef.value?.getFormData())    // 采集填写结果
}
</script>

<template>
  <FormRenderer
    ref="rendererRef"
    v-model:data="data"
    :schema="schema"
    :options="{ readonly: false, fieldPermissions, rules }"
    @action="onAction"
  />
</template>
```

`FormRenderer` 暴露：`print()` / `getFormData()` / `validate()`。
`fieldPermissions`（READ/EDIT/HIDDEN）与 `rules`（必填）与数据同轨注入，不进 Schema。

## 五、三个必须注意的坑

1. **Vue 单例**：`vue` 是 peerDependency，绝不能被打进包。ERP 侧务必配 `resolve.dedupe: ['vue']`，两个 Vue 副本会导致响应式失效、组件解析失败。
2. **全局 CSS**：渲染侧的 `HtmlBlock` 样式是非 scoped 的，类名带 `layout-` 前缀；设计器侧是 `v2-` 前缀。上线前在 ERP 里检查是否有同名类冲突。
3. **版本演进**：ERP 锁 `^0.1.0` 时注意 `0.x` 的 `^` 只锁 minor，破坏性变更必须升 minor（0.x 约定）。

## 六、开发期联调（不发版就能试）

```bash
# 本仓库
npm run build:lib && npm link

# ERP 项目
npm link @huangshichuang/ticket-designer
```

改一次要重新 `npm run build:lib`。联调完记得 `npm unlink`。
