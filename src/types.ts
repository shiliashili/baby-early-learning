/** 全局类型定义 —— 与需求文档 V4.0 第 6 节 IndexedDB 数据设计对应 */

export interface Baby {
  id: string
  name: string
  /** ISO 日期字符串，如 2025-01-31 */
  birthDate: string
  createdAt: number
  updatedAt: number
}

export interface CoursePlan {
  id: string
  /** 适用的完整月龄，从 0 开始 */
  monthAge: number
  /** 月龄内周次 1-5（第 5 周仅出现在 29-31 天的月龄） */
  week: number
  title: string
  version: number
  enabled: boolean
}

export interface CourseTask {
  id: string
  planId: string
  title: string
  description: string
  sortOrder: number
}

export interface CompletionRecord {
  id: string
  taskId: string
  /** ISO 日期字符串，如 2026-08-08 */
  date: string
  completedAt: number
  note?: string
}

export interface AppSetting {
  key: string
  value: unknown
}

/** JSON 备份文件结构 */
export interface BackupFile {
  schemaVersion: number
  exportedAt: string
  appVersion: string
  data: {
    baby: Baby[]
    course_plan: CoursePlan[]
    course_task: CourseTask[]
    completion_record: CompletionRecord[]
    app_settings: AppSetting[]
  }
}
