/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// vuedraggable 的类型声明（v4 无官方 TS 类型）
declare module 'vuedraggable' {
  import type { DefineComponent } from 'vue'
  const VueDraggable: DefineComponent<any, any, any>
  export default VueDraggable
}
