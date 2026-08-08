/**
 * 课程模板批量导入（需求文档 11 节·阶段 3：课程模板批量导入）。
 * - 下载 JSON 模板，用户按格式填写月龄/周次/计划/任务后导入
 * - 导入前完整校验结构与字段；校验不过不写库
 * - 导入策略：按计划（月龄+周次+标题）去重合并——
 *   已存在的计划只补充缺失的任务（按任务标题判断），不覆盖、不重复创建
 */
import type { CoursePlan, CourseTask } from '../types'
import {
  openDB, STORES, getAll, put, newId,
} from '../db/db'
import { getPlans, getTasksByPlan } from './courseService'

export const TEMPLATE_TYPE = 'baby-early-learning-course-template'
export const TEMPLATE_VERSION = 1

/* ---------- 模板结构 ---------- */

export interface CourseTemplateTask {
  title: string
  description?: string
  sortOrder?: number
}

export interface CourseTemplatePlan {
  monthAge: number
  week: number
  title: string
  enabled?: boolean
  tasks: CourseTemplateTask[]
}

export interface CourseTemplate {
  type: typeof TEMPLATE_TYPE
  templateVersion: number
  plans: CourseTemplatePlan[]
}

/* ---------- 模板下载 ---------- */

/** 生成带示例的模板并触发浏览器下载 */
export function downloadCourseTemplate(): string {
  const template: CourseTemplate = {
    type: TEMPLATE_TYPE,
    templateVersion: TEMPLATE_VERSION,
    plans: [
      {
        monthAge: 0,
        week: 1,
        title: '示例：新生儿感知启蒙',
        enabled: true,
        tasks: [
          { title: '黑白卡追视', description: '距离宝宝眼睛约 20cm，缓慢移动', sortOrder: 1 },
          { title: '俯卧抬头练习', description: '每次 1-2 分钟，一天 2 次', sortOrder: 2 },
        ],
      },
      {
        monthAge: 1,
        week: 2,
        title: '示例：大运动训练',
        enabled: true,
        tasks: [
          { title: '被动操', description: '上肢伸展 4 个八拍', sortOrder: 1 },
        ],
      },
    ],
  }
  const filename = 'baby-early-learning-course-template.json'
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return filename
}

/* ---------- 校验 ---------- */

export interface TemplateValidationResult {
  ok: boolean
  errors: string[]
  template?: CourseTemplate
}

/** 解析并校验课程模板，纯函数不写库 */
export function validateCourseTemplate(text: string): TemplateValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['文件不是合法的 JSON'] }
  }
  const t = parsed as Partial<CourseTemplate>
  const errors: string[] = []

  if (typeof t !== 'object' || t === null) return { ok: false, errors: ['模板内容不是对象'] }
  if (t.type !== TEMPLATE_TYPE)
    errors.push(`type 必须是 "${TEMPLATE_TYPE}"，请使用应用下载的模板填写`)
  if (t.templateVersion !== TEMPLATE_VERSION)
    errors.push(`templateVersion 必须是 ${TEMPLATE_VERSION}（当前为 ${t.templateVersion}）`)
  if (!Array.isArray(t.plans) || t.plans.length === 0) {
    errors.push('plans 必须是非空数组')
  } else {
    t.plans.forEach((p, i) => {
      const prefix = `plans[${i}]`
      if (typeof p !== 'object' || p === null) return errors.push(`${prefix} 不是对象`)
      if (!Number.isInteger(p.monthAge) || (p.monthAge as number) < 0 || (p.monthAge as number) > 72)
        errors.push(`${prefix}.monthAge 必须是 0-72 的整数`)
      if (!Number.isInteger(p.week) || (p.week as number) < 1 || (p.week as number) > 5)
        errors.push(`${prefix}.week 必须是 1-5 的整数（第 5 周仅存在于 29-31 天的月龄）`)
      if (typeof p.title !== 'string' || !p.title.trim())
        errors.push(`${prefix}.title 不能为空`)
      if (!Array.isArray(p.tasks) || p.tasks.length === 0) {
        errors.push(`${prefix}.tasks 必须是非空数组`)
      } else {
        p.tasks.forEach((task, j) => {
          if (typeof task?.title !== 'string' || !task.title.trim())
            errors.push(`${prefix}.tasks[${j}].title 不能为空`)
          if (task?.sortOrder !== undefined && typeof task.sortOrder !== 'number')
            errors.push(`${prefix}.tasks[${j}].sortOrder 必须是数字`)
        })
      }
    })
    // 模板内部重复计划检查
    if (Array.isArray(t.plans)) {
      const seen = new Set<string>()
      t.plans.forEach((p, i) => {
        if (!p?.title) return
        const key = `${p.monthAge}|${p.week}|${String(p.title).trim()}`
        if (seen.has(key)) errors.push(`plans[${i}] 与前面的计划重复（同月龄+周次+标题）`)
        seen.add(key)
      })
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, errors: [], template: t as CourseTemplate }
}

/* ---------- 导入（合并策略） ---------- */

export interface CourseImportSummary {
  plansCreated: number
  plansMerged: number
  tasksAdded: number
  tasksSkipped: number
}

/** 预览导入结果（只读，不写库） */
export async function previewCourseImport(template: CourseTemplate): Promise<CourseImportSummary> {
  const existingPlans = await getPlans()
  const planKey = (m: number, w: number, title: string) => `${m}|${w}|${title.trim()}`
  const planMap = new Map(existingPlans.map((p) => [planKey(p.monthAge, p.week, p.title), p]))

  const summary: CourseImportSummary = { plansCreated: 0, plansMerged: 0, tasksAdded: 0, tasksSkipped: 0 }
  for (const tp of template.plans) {
    const existing = planMap.get(planKey(tp.monthAge, tp.week, tp.title))
    if (!existing) {
      summary.plansCreated++
      summary.tasksAdded += tp.tasks.length
    } else {
      summary.plansMerged++
      const existingTasks = await getTasksByPlan(existing.id)
      const existingTitles = new Set(existingTasks.map((t) => t.title.trim()))
      for (const tt of tp.tasks) {
        existingTitles.has(tt.title.trim()) ? summary.tasksSkipped++ : summary.tasksAdded++
      }
    }
  }
  return summary
}

/** 执行导入：去重合并写入 */
export async function importCourseTemplate(template: CourseTemplate): Promise<CourseImportSummary> {
  const db = await openDB()
  const existingPlans = await getAll<CoursePlan>(db, STORES.coursePlan)
  const planKey = (m: number, w: number, title: string) => `${m}|${w}|${title.trim()}`
  const planMap = new Map(existingPlans.map((p) => [planKey(p.monthAge, p.week, p.title), p]))

  const summary: CourseImportSummary = { plansCreated: 0, plansMerged: 0, tasksAdded: 0, tasksSkipped: 0 }

  for (const tp of template.plans) {
    let plan = planMap.get(planKey(tp.monthAge, tp.week, tp.title))
    if (!plan) {
      plan = {
        id: newId(),
        monthAge: tp.monthAge,
        week: tp.week,
        title: tp.title.trim(),
        version: 1,
        enabled: tp.enabled !== false,
      }
      await put(db, STORES.coursePlan, plan)
      planMap.set(planKey(plan.monthAge, plan.week, plan.title), plan)
      summary.plansCreated++
    } else {
      summary.plansMerged++
    }

    const existingTasks = await getTasksByPlan(plan.id)
    const existingTitles = new Set(existingTasks.map((t) => t.title.trim()))
    let nextOrder = existingTasks.reduce((max, t) => Math.max(max, t.sortOrder), 0)

    for (const [idx, tt] of tp.tasks.entries()) {
      if (existingTitles.has(tt.title.trim())) {
        summary.tasksSkipped++
        continue
      }
      const task: CourseTask = {
        id: newId(),
        planId: plan.id,
        title: tt.title.trim(),
        description: tt.description?.trim() ?? '',
        sortOrder: typeof tt.sortOrder === 'number' ? tt.sortOrder : nextOrder + idx + 1,
      }
      await put(db, STORES.courseTask, task)
      existingTitles.add(task.title)
      nextOrder = Math.max(nextOrder, task.sortOrder)
      summary.tasksAdded++
    }
  }
  return summary
}
