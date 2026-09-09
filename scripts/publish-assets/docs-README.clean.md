# 文档索引

> 本文是 `docs/` 的**唯一入口**；不确定看哪份时，先从这里开始。
> 阅读顺序：① 根 [README.md](../README.md)（项目说明与上手）→ ② 按任务命中下表对应的契约文档（**不要全读**）。

## 一、活跃文档

| 文档 | 用途 | 维护方式 |
|---|---|---|
| [design.md](./design.md) | 统一设计契约：Schema 结构、Grid / P / Table / HTML / Image 模型、边框模型 | 设计变更时更新 |
| [design-biz.md](./design-biz.md) | 业务与交互设计：设计器界面、节点选择、拖拽规则、配置面板、数据与权限 | 设计变更时更新 |
| [engine.md](./engine.md) | 渲染引擎契约：运行时索引、Schema 校验、递归渲染、尺寸与边框算法、结构操作 | 设计变更时更新 |
| [acceptance-row-spec.md](./acceptance-row-spec.md) | 前五行**字段/边框规格表**，是样例 Schema 与验收测试的对齐依据 | **生效中**（被代码注释引用，勿移动/改名） |
| [prd.md](./prd.md) | 表单打印纸张尺寸说明 | 稳定 |
| [user-guide.md](./user-guide.md) | 面向最终用户的操作指南（与应用内「帮助」面板同源） | 文案变更时同步两处 |

## 二、约定

- 规格类结论只写在契约文档里，不写在临时记录中，避免多处漂移。
- `acceptance-row-spec.md` 被代码注释引用，改名或移动会打断追溯链。
- 字段/边框口径以 `acceptance-row-spec.md` 为唯一事实源，`design.md` / `design-biz.md` 引用它而不内嵌行级细节。
