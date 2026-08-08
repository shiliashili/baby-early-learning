import { describe, it, expect } from 'vitest'
import {
  validateCourseTemplate, resolveTaskTitle, TEMPLATE_TYPE,
} from './courseTemplateService'

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
  it('week 超出 1-5 报错', () => {
    const bad = structuredClone(valid)
    bad.plans[0].week = 6
    expect(validateCourseTemplate(JSON.stringify(bad)).ok).toBe(false)
  })
  it('week 为 5 合法（29-31 天的月龄存在第 5 周）', () => {
    const t = structuredClone(valid)
    t.plans[0].week = 5
    expect(validateCourseTemplate(JSON.stringify(t)).ok).toBe(true)
  })
  it('monthAge 为负数报错', () => {
    const bad = structuredClone(valid)
    bad.plans[0].monthAge = -1
    expect(validateCourseTemplate(JSON.stringify(bad)).ok).toBe(false)
  })
  it('任务标题为空时合法（导入时自动从描述回填）', () => {
    const t = structuredClone(valid)
    t.plans[0].tasks[0].title = ''
    expect(validateCourseTemplate(JSON.stringify(t)).ok).toBe(true)
  })
  it('任务 title 字段类型错误仍报错', () => {
    const bad = structuredClone(valid) as { plans: Array<{ tasks: Array<{ title: unknown }> }> }
    bad.plans[0].tasks[0].title = 123
    const r = validateCourseTemplate(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    expect(r.errors.join()).toContain('必须是字符串')
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

describe('resolveTaskTitle', () => {
  it('原始标题非空时取原值', () => {
    expect(resolveTaskTitle('  抓握  ', '描述', 1)).toBe('抓握')
  })
  it('原始标题为空、描述非空时用描述', () => {
    expect(resolveTaskTitle('', '拼音第1节（上）：a', 1)).toBe('拼音第1节（上）：a')
  })
  it('描述过长时截断为 30 字 + …', () => {
    const long = '一二三四五六七八九十'.repeat(5) // 50 字
    const r = resolveTaskTitle('', long, 1)
    expect(r.length).toBeLessThanOrEqual(31)
    expect(r.endsWith('…')).toBe(true)
  })
  it('标题描述都为空时使用「任务 #N」', () => {
    expect(resolveTaskTitle(undefined, undefined, 3)).toBe('任务 #3')
    expect(resolveTaskTitle('', '   ', 7)).toBe('任务 #7')
  })
})
