/**
 * 分页引擎统一出口
 *
 * 外部使用方式：
 * ```ts
 * import { paginate, DomMeasure } from '@/engine'
 * import type { FormSchema, PaginateResult } from '@/types'
 *
 * const schema: FormSchema = { ... }
 * const measure = new DomMeasure()
 * const result = paginate(schema, { measure })
 * measure.destroy()
 * ```
 */

export * from './geom'
export * from './render-html'
export * from './measure'
export * from './paginate'
