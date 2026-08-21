<script setup lang="ts">
/**
 * 设计器根组件
 *
 * 三栏式低代码布局容器，按 docs/design-biz.md §2.1 实现：
 *
 *   ┌─ 顶部工具栏（Toolbar）─┐
 *   ├─ 左栏 ─ 中栏画布 ─ 右栏配置面板 ┤
 *   └─ 底部状态栏（StatusBar）─┘
 *
 * 状态职责（v1 阶段 3.2 骨架）：
 *   - schema：当前表单 schema（默认加载 mock A4 示例）
 *   - selectedCompId：选中的组件 id（拖拽/选中交互待阶段 3.3 实现）
 *   - activeTab：右栏激活的 tab（'form' | 'component'）
 *   - paginateResult：来自 FormRenderer 的分页结果，传给状态栏
 *
 * 设计依据：docs/design-biz.md §2、docs/development-plan.md 阶段 3.2。
 */

import { computed, ref } from 'vue'
import type { FormSchema, PaginateResult, Component } from '@/types'
import Toolbar from './Toolbar.vue'
import ComponentPalette from './ComponentPalette.vue'
import CanvasPane from './CanvasPane.vue'
import ConfigPanel from './ConfigPanel.vue'
import StatusBar from './StatusBar.vue'
import { makeMockSchema } from '@/dev/mock-schema'
import { makeMockSchemaA3 } from '@/dev/mock-schema-a3'

/** 右栏配置面板的 tab 标识 */
type ConfigTab = 'form' | 'component'

/** 当前表单 schema */
const schema = ref<FormSchema>(makeMockSchema())

/** 当前选中的组件 id（null 表示无选中） */
const selectedCompId = ref<string | null>(null)

/** 当前右栏激活的 tab（无选中组件时默认 'form'） */
const activeTab = ref<ConfigTab>('form')

/** 分页结果（来自 CanvasPane 的 FormRenderer，传给 StatusBar） */
const paginateResult = ref<PaginateResult | null>(null)

/** 选中组件实例（基于 selectedCompId 计算） */
const selectedComp = computed<Component | null>(() =>
  schema.value.body.find(c => c.id === selectedCompId.value) ?? null,
)

/**
 * 加载 A4 纵向 mock 示例（云南铝业电气工作票）
 */
function loadMockA4(): void {
  schema.value = makeMockSchema()
  selectedCompId.value = null
  activeTab.value = 'form'
}

/**
 * 加载 A3 横向 mock 示例（铝合金板材质量检验报告）
 */
function loadMockA3(): void {
  schema.value = makeMockSchemaA3()
  selectedCompId.value = null
  activeTab.value = 'form'
}

/**
 * Toolbar 修改 schema（纸张/方向/边距/页眉页脚）
 */
function handleSchemaUpdate(newSchema: FormSchema): void {
  schema.value = newSchema
}

/**
 * CanvasPane 拿到分页结果（传给 StatusBar 显示页数/警告数）
 */
function handlePaginate(result: PaginateResult): void {
  paginateResult.value = result
}

/**
 * 选中组件（CanvasPane 点击组件触发；阶段 3.3 实现交互）
 */
function handleSelectComp(id: string | null): void {
  selectedCompId.value = id
  activeTab.value = id ? 'component' : 'form'
}

/**
 * ConfigPanel 更新 schema（修改选中组件的属性，或表单属性）
 */
function handleConfigUpdate(newSchema: FormSchema): void {
  schema.value = newSchema
}

/**
 * 切换右栏 tab
 */
function handleTabChange(tab: ConfigTab): void {
  activeTab.value = tab
}
</script>

<template>
  <div class="designer">
    <Toolbar
      :schema="schema"
      @update:schema="handleSchemaUpdate"
      @load-mock-a4="loadMockA4"
      @load-mock-a3="loadMockA3"
    />
    <div class="designer-body">
      <ComponentPalette />
      <CanvasPane
        :schema="schema"
        :selected-comp-id="selectedCompId"
        @paginate="handlePaginate"
        @select-comp="handleSelectComp"
      />
      <ConfigPanel
        :schema="schema"
        :selected-comp="selectedComp"
        :active-tab="activeTab"
        @update:schema="handleConfigUpdate"
        @update:active-tab="handleTabChange"
      />
    </div>
    <StatusBar
      :page-count="paginateResult?.pages.length ?? 0"
      :warning-count="paginateResult?.warnings.length ?? 0"
    />
  </div>
</template>

<style scoped>
/**
 * 三栏布局：CSS Grid
 *   顶部 48px 工具栏 + 1fr 内容区 + 28px 状态栏
 *   内容区横向：240px 左栏 + 1fr 中栏 + 320px 右栏
 */
.designer {
  display: grid;
  grid-template-rows: 48px 1fr 28px;
  height: 100vh;
  background: #f3f4f6;
  overflow: hidden;
}

.designer-body {
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  overflow: hidden;
}

/* 打印模式：只保留中栏画布的纸张内容 */
@media print {
  .designer {
    display: block;
    height: auto;
    background: white;
  }
  .designer-body {
    display: block;
  }
  .designer-body > :not(.canvas-pane) {
    display: none !important;
  }
}
</style>
