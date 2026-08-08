// 用真实用户文件做一次性端到端验证
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { validateCourseTemplate, resolveTaskTitle } from './courseTemplateService'

describe('用户实际 JSON 文件', () => {
  it('校验通过且无错误', () => {
    const text = readFileSync('/Users/shilia/Downloads/baby-early-learning-course.json', 'utf-8')
    const r = validateCourseTemplate(text)
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
    expect(r.template?.plans).toHaveLength(172)
  })
  it('空标题可被自动从 description 回填', () => {
    const text = readFileSync('/Users/shilia/Downloads/baby-early-learning-course.json', 'utf-8')
    const r = validateCourseTemplate(text)
    const tasks = r.template!.plans.flatMap((p) => p.tasks)
    const emptyTitleCount = tasks.filter((t) => !String(t.title ?? '').trim()).length
    expect(emptyTitleCount).toBeGreaterThan(0)
    const sample = tasks.find((t) => !String(t.title ?? '').trim())!
    expect(resolveTaskTitle(sample.title, sample.description, 1)).toBe(sample.description?.trim())
  })
})
