import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WarningOverlay from '@/components/renderer/WarningOverlay.vue'
import type { Warning } from '@/types'

describe('WarningOverlay', () => {
  it('渲染每条警告的角标', () => {
    const warnings: Warning[] = [
      { compId: 'p1', message: '组件高度超过正文可用高，已裁剪' },
      { compId: 'p1', message: '另一条警告' },
    ]
    const wrapper = mount(WarningOverlay, { props: { warnings } })
    const badges = wrapper.findAll('.warning-badge')
    expect(badges).toHaveLength(2)
    expect(badges[0].text()).toContain('组件高度超过正文可用高')
    expect(badges[1].text()).toContain('另一条警告')
  })

  it('空 warnings 时不渲染角标', () => {
    const wrapper = mount(WarningOverlay, {
      props: { warnings: [] },
    })
    expect(wrapper.findAll('.warning-badge')).toHaveLength(0)
  })

  it('角标含警告标识符号 ⚠', () => {
    const warnings: Warning[] = [{ compId: 'p1', message: '超高' }]
    const wrapper = mount(WarningOverlay, { props: { warnings } })
    expect(wrapper.find('.warning-badge').text()).toContain('⚠')
    expect(wrapper.find('.warning-badge').text()).toContain('超高')
  })
})
