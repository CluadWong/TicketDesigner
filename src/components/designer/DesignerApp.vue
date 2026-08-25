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
 *   - schema：当前表单 schema（默认加载云铝电气第二种工作票能力验证示例）
 *   - selectedCompId：选中的组件 id（拖拽/选中交互待阶段 3.3 实现）
 *   - activeTab：右栏激活的 tab（'form' | 'component'）
 *   - paginateResult：来自 FormRenderer 的分页结果，传给状态栏
 *
 * 设计依据：docs/design-biz.md §2、docs/development-plan.md 阶段 3.2。
 */

import { computed, provide, ref } from 'vue'
import type { FormSchema, PaginateResult, Component } from '@/types'
import Toolbar from './Toolbar.vue'
import ComponentPalette from './ComponentPalette.vue'
import CanvasPane from './CanvasPane.vue'
import ConfigPanel from './ConfigPanel.vue'
import StatusBar from './StatusBar.vue'
import PreviewDialog from '@/components/preview/PreviewDialog.vue'
import GridSchemaRenderer from '@/dev/GridSchemaRenderer.vue'
import { makeMockSchema } from '@/dev/mock-schema'
import { makeMockSchemaA3 } from '@/dev/mock-schema-a3'
import { makeYunlvSecondWorkTicketSchema } from '@/dev/yunlv-second-work-ticket-schema'
import { makeYunlvSecondTicketFirstFiveRowsSchema } from '@/dev/yunlv-second-ticket-first-five-rows'
import { getComponentConfig } from '@/config/component-registry'

/** 右栏配置面板的 tab 标识 */
type ConfigTab = 'form' | 'component'

/** 当前表单 schema */
const schema = ref<FormSchema>(makeYunlvSecondWorkTicketSchema())

/** 嵌套格子方案的前五行渲染原型；暂与 v1 FormSchema 隔离。 */
const gridPrototypeSchema = makeYunlvSecondTicketFirstFiveRowsSchema()

/** 当前选中的组件 id（null 表示无选中） */
const selectedCompId = ref<string | null>(null)

/**
 * 跨层级 provide selectedCompId 给 Paper.vue
 *
 * Paper.vue inject 后用于 .block 选中高亮（蓝色 outline）。
 * 用 ref 注入让子组件响应 selectedCompId 变化自动更新视图。
 */
provide('selectedCompId', selectedCompId)

/** 当前右栏激活的 tab（无选中组件时默认 'form'） */
const activeTab = ref<ConfigTab>('form')

/** 分页结果（来自 CanvasPane 的 FormRenderer，传给 StatusBar） */
const paginateResult = ref<PaginateResult | null>(null)

/** 预览弹窗显示状态 */
const previewVisible = ref(false)

/** 预览弹窗的表单数据（field → value，独立于 schema 维护） */
const previewData = ref<Record<string, unknown>>({})

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
 * 从左栏拖拽到画布：根据组件 type 生成默认实例 push 进 schema.body
 *
 * 调用注册表的 createDefault(id) 拿到默认值，自动选中新建组件并切到组件属性 tab。
 * @param type 组件类型（'p' | 'image' | 'table'）
 */
function handleAddComp(type: Component['type']): void {
  const config = getComponentConfig(type)
  if (!config) return
  // 生成唯一 id：type-时间戳-随机串
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const comp = config.createDefault(id) as Component
  schema.value = {
    ...schema.value,
    body: [...schema.value.body, comp],
  }
  // 自动选中新组件并切到组件属性 tab
  selectedCompId.value = id
  activeTab.value = 'component'
}

/**
 * 选中组件（CanvasPane 点击组件触发；阶段 3.3 实现交互）
 */
function handleSelectComp(id: string | null): void {
  selectedCompId.value = id
  activeTab.value = id ? 'component' : 'form'
}

/**
 * 上下移动选中组件（来自 ConfigPanel 的 move-comp 事件）
 *
 * 交换 body 中目标组件与相邻位置，保持其他组件顺序不变。
 * @param id 目标组件 id
 * @param direction 'up' 上移 / 'down' 下移
 */
function handleMoveComp(id: string, direction: 'up' | 'down'): void {
  const body = [...schema.value.body]
  const idx = body.findIndex(c => c.id === id)
  if (idx < 0) return
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= body.length) return
  // 交换 idx 与 target
  ;[body[idx], body[target]] = [body[target], body[idx]]
  schema.value = { ...schema.value, body }
}

/**
 * 删除选中组件（来自 ConfigPanel 的 delete-comp 事件）
 *
 * 删除后取消选中并切回表单属性 tab。
 * @param id 目标组件 id
 */
function handleDeleteComp(id: string): void {
  const body = schema.value.body.filter(c => c.id !== id)
  schema.value = { ...schema.value, body }
  selectedCompId.value = null
  activeTab.value = 'form'
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

/**
 * 打开预览弹窗
 *
 * 传入当前 schema + 空数据对象（用户可在弹窗内编辑填入）。
 */
function handleOpenPreview(): void {
  previewData.value = {}
  previewVisible.value = true
}

/** 关闭预览弹窗 */
function handleClosePreview(): void {
  previewVisible.value = false
}

/**
 * 预览弹窗数据更新（来自 FormPreview 的 input 事件回写）
 */
function handleUpdatePreviewData(newData: Record<string, unknown>): void {
  previewData.value = newData
}
</script>

<template>
  <div class="designer">
    <Toolbar
      :schema="schema"
      @update:schema="handleSchemaUpdate"
      @load-mock-a4="loadMockA4"
      @load-mock-a3="loadMockA3"
      @open-preview="handleOpenPreview"
    />
    <div class="designer-body">
      <ComponentPalette />
      <GridSchemaRenderer :schema="gridPrototypeSchema" />
      <ConfigPanel
        :schema="schema"
        :selected-comp="selectedComp"
        :active-tab="activeTab"
        @update:schema="handleConfigUpdate"
        @update:active-tab="handleTabChange"
        @move-comp="handleMoveComp"
        @delete-comp="handleDeleteComp"
      />
    </div>
    <StatusBar
      :page-count="1"
      :warning-count="paginateResult?.warnings.length ?? 0"
    />
    <!-- 预览弹窗（Teleport to body，打印时隐藏设计器只输出纸张） -->
    <PreviewDialog
      :visible="previewVisible"
      :schema="schema"
      :data="previewData"
      @close="handleClosePreview"
      @update:data="handleUpdatePreviewData"
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
