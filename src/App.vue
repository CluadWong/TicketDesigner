<script setup lang="ts">
/**
 * 应用根组件（dev 入口）
 *
 * 设计器核心不依赖 `dev` 样例目录（B3）：样例与预览数据由本 dev 入口通过 props 注入，
 * 生产/消费端可传入自己的样例集，无需改动 `DesignerApp`。
 */

import DesignerApp from '@/components/designer/DesignerApp.vue'
import { makeYunlvSecondTicketFullSchema } from '@/dev/yunlv-second-ticket-full'
import demoData from '@/dev/demoData'
import type { SampleEntry } from '@/samples/types'

const samples: SampleEntry[] = [
  {
    id: 'yunlv-second-ticket-full',
    label: '完整工作票',
    loadSchema: makeYunlvSecondTicketFullSchema,
    previewData: demoData,
  },
]
</script>

<template>
  <DesignerApp :samples="samples" :preview-data="demoData" />
</template>
