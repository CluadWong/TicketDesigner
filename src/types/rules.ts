/**
 * 权限规则类型定义
 *
 * 权限配置不在表单 Schema 内（design-biz.md §4），
 * 由专门的流程配置页面处理，运行时传给 FormPreview。
 *
 * v1 范围：readonly / hidden；required 暂不实现。
 */

/**
 * 单个字段在某流程节点的权限规则
 */
export interface FieldRule {
  /** 只读：字段不可编辑（去掉 contenteditable） */
  readonly?: boolean
  /** 隐藏：字段不显示（display: none） */
  hidden?: boolean
  /** 必填：字段必须填写（v1 暂不实现） */
  required?: boolean
}

/** 权限规则集：field → FieldRule */
export type RulesMap = Record<string, FieldRule>
