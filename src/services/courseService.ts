/**
 * 课程匹配与计划读取：根据月龄 + 周次匹配当前课程计划，管理打卡记录。
 */
import type { Baby, CoursePlan, CourseTask, CompletionRecord } from '../types'
import {
  openDB, STORES, getAll, getAllByIndex, put, remove, newId, getById, putSetting, SCHEMA_VERSION,
} from '../db/db'
import { calcAge, formatISODate, type AgeInfo } from './ageService'

export interface TodayTask extends CourseTask {
  planTitle: string
  completed: boolean
  record?: CompletionRecord
}

export interface TodayPlan {
  age: AgeInfo
  tasks: TodayTask[]
  total: number
  done: number
}

/* ---------- 宝宝档案 ---------- */

export async function getBabies(): Promise<Baby[]> {
  const db = await openDB()
  const list = await getAll<Baby>(db, STORES.baby)
  return list.sort((a, b) => a.createdAt - b.createdAt)
}

export async function saveBaby(input: Pick<Baby, 'name' | 'birthDate'> & { id?: string }): Promise<Baby> {
  const db = await openDB()
  const now = Date.now()
  const baby: Baby = input.id
    ? { ...(await getById<Baby>(db, STORES.baby, input.id))!, name: input.name, birthDate: input.birthDate, updatedAt: now }
    : { id: newId(), name: input.name, birthDate: input.birthDate, createdAt: now, updatedAt: now }
  await put(db, STORES.baby, baby)
  return baby
}

export async function deleteBaby(id: string): Promise<void> {
  const db = await openDB()
  await remove(db, STORES.baby, id)
}

/* ---------- 课程计划 ---------- */

export async function getPlans(): Promise<CoursePlan[]> {
  const db = await openDB()
  const list = await getAll<CoursePlan>(db, STORES.coursePlan)
  return list.sort((a, b) => a.monthAge - b.monthAge || a.week - b.week)
}

export async function savePlan(input: Omit<CoursePlan, 'id'> & { id?: string }): Promise<CoursePlan> {
  const db = await openDB()
  const plan: CoursePlan = { ...input, id: input.id ?? newId() }
  await put(db, STORES.coursePlan, plan)
  return plan
}

export async function deletePlan(id: string): Promise<void> {
  const db = await openDB()
  await remove(db, STORES.coursePlan, id)
  const tasks = await getAllByIndex<CourseTask>(db, STORES.courseTask, 'planId', id)
  for (const t of tasks) await remove(db, STORES.courseTask, t.id)
}

export async function getTasksByPlan(planId: string): Promise<CourseTask[]> {
  const db = await openDB()
  const list = await getAllByIndex<CourseTask>(db, STORES.courseTask, 'planId', planId)
  return list.sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function saveTask(input: Omit<CourseTask, 'id'> & { id?: string }): Promise<CourseTask> {
  const db = await openDB()
  const task: CourseTask = { ...input, id: input.id ?? newId() }
  await put(db, STORES.courseTask, task)
  return task
}

export async function deleteTask(id: string): Promise<void> {
  const db = await openDB()
  await remove(db, STORES.courseTask, id)
}

/* ---------- 今日课程与打卡 ---------- */

/** 根据宝宝出生日期匹配当前月龄+周次的启用课程，并合并今日打卡状态 */
export async function getTodayPlan(baby: Baby, date: Date = new Date()): Promise<TodayPlan> {
  const db = await openDB()
  const age = calcAge(baby.birthDate, date)
  const today = formatISODate(date)

  const plans = (await getAllByIndex<CoursePlan>(db, STORES.coursePlan, 'monthAge', age.monthAge))
    .filter((p) => p.enabled && p.week === age.week)

  const todayRecords = await getAllByIndex<CompletionRecord>(db, STORES.completionRecord, 'date', today)
  const recordByTask = new Map(todayRecords.map((r) => [r.taskId, r]))

  const tasks: TodayTask[] = []
  for (const plan of plans) {
    const planTasks = await getTasksByPlan(plan.id)
    for (const t of planTasks) {
      const record = recordByTask.get(t.id)
      tasks.push({ ...t, planTitle: plan.title, completed: !!record, record })
    }
  }
  tasks.sort((a, b) => a.sortOrder - b.sortOrder)

  const done = tasks.filter((t) => t.completed).length
  return { age, tasks, total: tasks.length, done }
}

/** 打卡 / 取消打卡 */
export async function toggleTask(taskId: string, date: Date = new Date(), note?: string): Promise<void> {
  const db = await openDB()
  const today = formatISODate(date)
  const records = await getAllByIndex<CompletionRecord>(db, STORES.completionRecord, 'taskId', taskId)
  const existing = records.find((r) => r.date === today)
  if (existing) {
    await remove(db, STORES.completionRecord, existing.id)
  } else {
    await put(db, STORES.completionRecord, {
      id: newId(), taskId, date: today, completedAt: Date.now(), note,
    } satisfies CompletionRecord)
  }
}

/* ---------- 历史记录 ---------- */

export interface HistoryItem {
  record: CompletionRecord
  taskTitle: string
  planTitle: string
}

export async function getHistory(): Promise<HistoryItem[]> {
  const db = await openDB()
  const records = await getAll<CompletionRecord>(db, STORES.completionRecord)
  const tasks = await getAll<CourseTask>(db, STORES.courseTask)
  const plans = await getAll<CoursePlan>(db, STORES.coursePlan)
  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const planMap = new Map(plans.map((p) => [p.id, p]))

  return records
    .map((record) => {
      const task = taskMap.get(record.taskId)
      const plan = task ? planMap.get(task.planId) : undefined
      return {
        record,
        taskTitle: task?.title ?? '（任务已删除）',
        planTitle: plan?.title ?? '（计划已删除）',
      }
    })
    .sort((a, b) => b.record.completedAt - a.record.completedAt)
}

/* ---------- 备份用全量读取（供 backupService 使用） ---------- */

export async function readAllStores() {
  const db = await openDB()
  return {
    baby: await getAll<Baby>(db, STORES.baby),
    course_plan: await getAll<CoursePlan>(db, STORES.coursePlan),
    course_task: await getAll<CourseTask>(db, STORES.courseTask),
    completion_record: await getAll<CompletionRecord>(db, STORES.completionRecord),
  }
}

/** 事务化全量覆盖写入（导入恢复用）：任一失败则整体回滚，不破坏现有数据 */
export async function replaceAllStores(data: {
  baby: Baby[]
  course_plan: CoursePlan[]
  course_task: CourseTask[]
  completion_record: CompletionRecord[]
}): Promise<void> {
  const db = await openDB()
  const storeNames = [STORES.baby, STORES.coursePlan, STORES.courseTask, STORES.completionRecord]
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite')
    tx.objectStore(STORES.baby).clear()
    tx.objectStore(STORES.coursePlan).clear()
    tx.objectStore(STORES.courseTask).clear()
    tx.objectStore(STORES.completionRecord).clear()
    for (const b of data.baby) tx.objectStore(STORES.baby).put(b)
    for (const p of data.course_plan) tx.objectStore(STORES.coursePlan).put(p)
    for (const t of data.course_task) tx.objectStore(STORES.courseTask).put(t)
    for (const r of data.completion_record) tx.objectStore(STORES.completionRecord).put(r)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  // 单独更新 schemaVersion，避免覆盖备份中自带的设置项
  await putSetting(db, 'schemaVersion', SCHEMA_VERSION)
}
