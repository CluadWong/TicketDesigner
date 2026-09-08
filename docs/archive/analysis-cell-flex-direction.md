# 单元格内多节点排版方向问题：分析与解决方案

> 结论先行：`.layout-grid__cell` 的 `flex-direction: column` 与该项目**四处**既有约定相矛盾，是「两个 grid 无法左右并列」与「第二个 grid 缺左边框」的共同根因。推荐**方案 A（改为横向排布）**治本；若担心既有票样大面积变化，可先用**方案 B**（方向可配置 + 边框方向感知）过渡。

## 一、现场数据结构（ticket-schema-v2-1788517143658.json）

A3 左右两列由根 Grid `grid-mtmo6frl-7hi2x`（`border: inner`, `gap: 10`）的 row0 两个 `1fr` 单元格构成：

```
grid-mtmo6frl-7hi2x (border: inner, gap: 10)
└── row 0
    ├── cell-1-mtmo6frl-ick96 (width: 1fr)  ← 左格，内含 2 个 grid
    │   ├── grid-mtmo8srm-usm7c  border: all  columns: [20,"1fr",20,"1fr"]  →「单位 __  编号 __」
    │   └── grid-mtmsv88i-r682n  border: all  columns: 默认            → 2 个空格
    └── cell-mtmo6nfd-belzd (width: 1fr)  ← 右格，内含 1 个 grid
```

两个子 grid 都是 `border: "all"`（都绘制外框）。

## 二、根因：CSS 与四处约定冲突

`GridSchemaNode.vue` 第 **623–630 行**：

```css
.layout-grid__cell {
  display: flex;
  flex-direction: column;   /* ← 罪魁祸首 */
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
}
```

这一条 `column` 与下列四处全部矛盾：

| # | 位置 | 约定内容 | column 下的结果 |
|---|------|----------|------------------|
| 1 | 注释 67–70 行 | 「**单元格内子节点横向（flex row）排布**：相邻且都绘制外框的 Grid，抑制后一个 Grid 的左边框」 | 与实际渲染相反 |
| 2 | `cellSiblingSuppressBorders` 71–81 行 | `return { left: !!prev && drawsOuterFrame(prev) }` —— 按**横向相邻**抑制后一个兄弟的 **left** 边框 | 竖向堆叠时抑制错了边 |
| 3 | `cellStyle` 138–160 行 | `align` → `justifyContent`（水平）；`verticalAlign` → `alignItems`（垂直） | **两者语义完全对调**，仅在 row 方向才正确 |
| 4 | 样例语义 `yunlv-second-ticket-first-five-rows.ts:191-194` | `cell-o-l` 依次塞入「工作负责人（监护人）：」+ 字段 +「班组：」+ 字段 | 本意就是**一横排**，column 下变成 4 行竖排 |

**即：注释、边框去重、对齐映射、样例用法四处都指向「横向 row」，唯独 CSS 写成了 `column`。**

## 三、三个后果

1. **两个 grid 上下堆叠，而非左右并列**（核心诉求未满足）。
2. **第二个 grid 缺左边框**：竖向堆叠时，共享边是「上一个的下边 / 下一个的上边」；而 `cellSiblingSuppressBorders` 因「前一个兄弟也画外框」抑制了**第二个 grid 的 left**——这条 left 恰好是整块的**左外缘，本应保留**，于是视觉上第二个 grid 没有左边框。
3. **（隐性）水平/垂直对齐语义反转**：上一轮刚加的「水平对齐 center」（`align` → `justify-content`）在 column 方向下**实际控制的是垂直居中**——这个设置目前是失效/反向的。

## 四、解决方案

### 方案 A（推荐 · 治本）：单元格改为横向排布

- `.layout-grid__cell` → `flex-direction: row`（即删除该行，flex 默认就是 row）。
- **收益**：与上述四处约定一次性对齐；两个 grid 自然左右并列；边框去重抑制 `left` 正好是相邻竖边 → 正确；对齐语义回归正确。
- **需配套处理**：
  1. **宽度分配**：row 方向子元素不再被 `align-items: stretch` 撑满宽度。单个 grid 因 `.layout-grid { width: 100% }`（610 行）仍满宽；但多个 grid 时按 flex 收缩比例分配，**不一定 50/50**。建议给 `GridNodeV2` 增加 `width?: GridTrackV2` 作为 `flex-basis`，显式控制并列比例（更符合本设计器「固定布局」的定位）。
  2. **换行**：建议保持 `nowrap` + `min-width: 0`（行为可预测），避免意外折行。
  3. **回归面**：所有「一格多节点」的单元格都会从**竖排变横排**——这是修正而非回归，但会改变既有票样（含 yunlv 样例）外观，**需重生成快照**。
- **验证点**：`cell-o-l` 应从「4 行竖排」变为「工作负责人（监护人）：____　班组：____」**一横排**。

### 方案 B（保守 · 低风险）：保留 column，增加方向开关

- 给 `GridCellV2` 增加 `direction?: "row" | "column"`（默认 `column` 以维持现状）。
- `cellSiblingSuppressBorders` 改为**方向感知**：row 抑制 `left`，column 抑制 `top`。
- `cellStyle` 的 `align` / `verticalAlign` 映射也按 `direction` 切换。
- 用户在含两个 grid 的那个 cell 上显式设 `direction: "row"` 即可实现并列。
- **收益**：零回归，既有票样外观不变；同时修掉「第二个 grid 缺左边框」（column 下抑制 `top` 才是正确的共享边）。
- **代价**：多一个 schema 字段，且默认行为仍与注释文档不符（技术债保留）。

### 方案 C（最小改动 · 不推荐）：只修边框

- 仅把 `cellSiblingSuppressBorders` 改为方向感知（column 下抑制 `top` 而非 `left`）。
- 能修掉「第二个 grid 没左边框」，但**两个 grid 仍上下堆叠**，核心诉求「左右并列」未解决。

## 五、建议路径

1. **首选 A**，一步到位。
2. 若担心既有票样大面积变化，走 **B 过渡**：先做「方向可配置 + 边框方向感知 + 对齐映射纠正」（修掉缺边框、修正对齐语义），确认无回归后再把默认值切到 `row`，即等价于 A。
3. **无论选哪个**，`cellStyle` 里 `align` / `verticalAlign` 的映射都必须按 `direction` 纠正，否则「水平对齐」在 column 下是反向的（当前就是）。

## 六、待确认

- 并列时两个 grid 的**宽度比例**如何确定？（建议新增 `GridNodeV2.width` 显式控制，还是按内容/列数自动分配？）
- 既有票样外观变化是否可以接受（选 A 则必须接受并重生快照）？
