import { describe, it, expect } from 'vitest'
import { validateCourseTemplate, TEMPLATE_TYPE } from './courseTemplateService'

const valid = {
  type: TEMPLATE_TYPE,
  templateVersion: 1,
  plans: [
    {
      monthAge: 3,
      week: 2,
      title: '抓握训练',
      tasks: [{ title: '摇铃抓握', description: '每次 2 分钟', sortOrder: 1 }],
    },
  ],
}

describe('validateCourseTemplate', () => {
  it('合法模板通过校验', () => {
    const r = validateCourseTemplate(JSON.stringify(valid))
    expect(r.ok).toBe(true)
    expect(r.template?.plans).toHaveLength(1)
  })
  it('非 JSON 文件报错', () => {
    const r = validateCourseTemplate('not json')
    expect(r.ok).toBe(false)
    expect(r.errors[0]).toContain('JSON')
  })
  it('type 不匹配报错', () => {
    const r = validateCourseTemplate(JSON.stringify({ ...valid, type: 'wrong' }))
    expect(r.ok).toBe(false)
    expect(r.errors.join()).toContain('type')
  })
  it('templateVersion 不匹配报错', () => {
    const r = validateCourseTemplate(JSON.stringify({ ...valid, templateVersion: 99 }))
    expect(r.ok).toBe(false)
  })
  it('plans 为空数组报错', () => {
    const r = validateCourseTemplate(JSON.stringify({ ...valid, plans: [] }))
    expect(r.ok).toBe(false)
  })
  it('week 超出 1-4 报错', () => {
    const bad = structuredClone(valid)
    bad.plans[0].week = 5
    expect(validateCourseTemplate(JSON.stringify(bad)).ok).toBe(false)
  })
  it('monthAge 为负数报错', () => {
    const bad = structuredClone(valid)
    bad.plans[0].monthAge = -1
    expect(validateCourseTemplate(JSON.stringify(bad)).ok).toBe(false)
  })
  it('任务标题为空报错', () => {
    const bad = structuredClone(valid)
    bad.plans[0].tasks[0].title = '  '
    expect(validateCourseTemplate(JSON.stringify(bad)).ok).toBe(false)
  })
  it('模板内重复计划报错', () => {
    const bad = structuredClone(valid)
    bad.plans.push({ ...bad.plans[0] })
    const r = validateCourseTemplate(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    expect(r.errors.join()).toContain('重复')
  })
  it('sortOrder 省略时合法', () => {
    const t = structuredClone(valid)
    delete (t.plans[0].tasks[0] as { sortOrder?: number }).sortOrder
    expect(validateCourseTemplate(JSON.stringify(t)).ok).toBe(true)
  })
})
