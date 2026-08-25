<script setup lang="ts">
/**
 * 单张纸张渲染器
 *
 * 渲染一张纸：页眉槽 + 正文槽 + 页脚槽
 *
 * 容器尺寸用 mm 单位（CSS 标准 mm），与 @page size 严格对应，
 * 配合 @page margin:0 实现精准打印对齐。
 *
 * 页眉/页脚：
 *   - 高度由 schema.header.height / schema.footer.height 决定（缺省=边距）
 *   - 文本 + 可选页码（"第 n 页 / 共 N 页"）
 *
 * 正文 blocks：
 *   - item: CompP / CompImage
 *   - table-slice: CompTable 传本页承载行
 *   - 警告叠加：block 对应组件 id 在 warnings 中时，外层显示红色角标
 *
 * 设计依据：docs/design.md §2、docs/engine.md §3。
 */
import { computed, inject, ref } from 'vue'
import type { Ref } from 'vue'
import type { FormSchema, Page, Warning, Block } from '@/types'
import { geom } from '@/engine'
import CompP from '@/components/p/CompP.vue'
import CompImage from '@/components/image/CompImage.vue'
import CompTable from '@/components/table/CompTable.vue'
import WarningOverlay from './WarningOverlay.vue'

const props = defineProps<{
  /** 单页数据 */
  page: Page
  /** 表单 schema */
  schema: FormSchema
  /** 总页数（页码 N） */
  totalPages: number
  /** 引擎警告列表（用于超高标记叠加） */
  warnings: Warning[]
}>()

/**
 * 当前选中的组件 id（来自 DesignerApp provide，跨层级透传）
 *
 * 用于 .block 选中高亮（蓝色 outline）。
 * 设计器模式下注入；纯渲染器模式（如 FormRenderer 单独使用）未注入时为 null，无选中效果。
 */
const selectedCompId = inject<Ref<string | null>>('selectedCompId', ref(null))

/**
 * 判断某 block 是否处于选中态
 * @param block 当前 block
 */
function isSelected(block: Block): boolean {
  return selectedCompId.value === block.comp.id
}

/** 纸张几何（mm） */
const paperGeom = computed(() =>
  geom(props.schema.paper.size, props.schema.paper.orientation)
)

/** 纸张容器样式（mm 单位） */
const paperStyle = computed(() => ({
  width: `${paperGeom.value.w}mm`,
  // 用 calc(h mm - 1px) + overflow: hidden，严格小于纸张标称高度。
  // 浏览器把 mm 解析为 px 时存在亚像素舍入（如 297mm → 1122.52px → 渲染 1123px），
  // 会让 .paper 实际渲染高度略大于 @page 的 297mm，打印时多出空白页。
  // 减 1px 让 .paper 严格小于打印纸高度，避免多页；视觉上 1px 不可察觉。
  // 同步 paginate.ts 的 bodyPx 也减 1px，保持测量与渲染一致。
  height: `calc(${paperGeom.value.h}mm - 1px)`,
  overflow: 'hidden',
  paddingLeft: `${props.schema.margin}mm`,
  paddingRight: `${props.schema.margin}mm`,
}))

/** 页眉高度（mm），缺省=边距 */
const headerHeightMm = computed(() => props.schema.header?.height ?? props.schema.margin)
/** 页脚高度（mm），缺省=边距 */
const footerHeightMm = computed(() => props.schema.footer?.height ?? props.schema.margin)

/** 页眉文本 */
const headerText = computed(() => props.schema.header?.text ?? '')
/** 页脚文本 */
const footerText = computed(() => props.schema.footer?.text ?? '')

/** 页眉页码（启用时返回"第 n 页 / 共 N 页"） */
const headerPageNum = computed(() =>
  props.schema.header?.showPageNumber
    ? `第 ${props.page.index + 1} 页 / 共 ${props.totalPages} 页`
    : ''
)
/** 页脚页码 */
const footerPageNum = computed(() =>
  props.schema.footer?.showPageNumber
    ? `第 ${props.page.index + 1} 页 / 共 ${props.totalPages} 页`
    : ''
)

/**
 * 获取某 block 对应组件的所有警告
 * @param block 当前 block
 * @returns 警告子集
 */
function getWarnings(block: Block): Warning[] {
  return props.warnings.filter(w => w.compId === block.comp.id)
}

/**
 * 判断某 block 是否有警告
 * @param block 当前 block
 */
function hasWarning(block: Block): boolean {
  return getWarnings(block).length > 0
}
</script>

<template>
  <div class="paper" :style="paperStyle">
    <!-- 页眉槽 -->
    <div class="paper-header" :style="{ height: headerHeightMm + 'mm' }">
      <span class="header-text">{{ headerText }}</span>
      <span v-if="headerPageNum" class="header-pagenum">{{ headerPageNum }}</span>
    </div>

    <!-- 正文槽 -->
    <div class="paper-body">
      <div
        v-for="(block, idx) in page.blocks"
        :key="idx"
        class="block"
        :class="{ 'has-warning': hasWarning(block), 'selected': isSelected(block) }"
        :data-comp-id="block.comp.id"
      >
        <CompP v-if="block.type === 'item' && block.comp.type === 'p'" :comp="block.comp" />
        <CompImage
          v-else-if="block.type === 'item' && block.comp.type === 'image'"
          :comp="block.comp"
        />
        <CompTable
          v-else-if="block.type === 'table-slice'"
          :comp="block.comp"
          :rows="block.rows"
        />
        <WarningOverlay
          v-if="hasWarning(block)"
          :warnings="getWarnings(block)"
        />
      </div>
    </div>

    <!-- 页脚槽 -->
    <div class="paper-footer" :style="{ height: footerHeightMm + 'mm' }">
      <span class="footer-text">{{ footerText }}</span>
      <span v-if="footerPageNum" class="footer-pagenum">{{ footerPageNum }}</span>
    </div>
  </div>
</template>

<style scoped>
.paper {
  background: white;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
}

.paper-header,
.paper-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1mm;
  border-bottom: 1px dashed #d1d5db;
  font-size: 11px;
  color: #6b7280;
}

.paper-footer {
  border-bottom: none;
  border-top: 1px dashed #d1d5db;
}

.paper-body {
  flex: 1;
}

/* .block margin / has-warning 样式由全局 components.css 的 .form-renderer .block 提供，
   让 DomMeasure measurer 容器内的 .block 也能应用，保证测量与渲染一致 */
</style>
