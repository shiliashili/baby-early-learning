/**
 * JSON 备份 / 校验 / 恢复（需求文档第 8 节）。
 * - 导出文件名：baby-early-learning-backup_YYYY-MM-DD.json
 * - 导入前先完整校验格式、schemaVersion 与关键字段；校验不过不写库
 * - V4.0 策略：全量恢复并覆盖当前数据，事务化写入
 */
import type { BackupFile } from '../types'
import { SCHEMA_VERSION, openDB, putSetting, getAll, getSetting, STORES } from '../db/db'
import { readAllStores, replaceAllStores } from './courseService'
import { formatISODate } from './ageService'

const APP_VERSION = '4.0.0'

/** 导出完整备份并触发浏览器下载 */
export async function exportBackup(): Promise<string> {
  const data = await readAllStores()
  const db = await openDB()
  const settings = await getAll<{ key: string; value: unknown }>(db, STORES.appSettings)

  const backup: BackupFile = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: { ...data, app_settings: settings },
  }

  const filename = `baby-early-learning-backup_${formatISODate(new Date())}.json`
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  await putSetting(db, 'lastBackupAt', Date.now())
  return filename
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  backup?: BackupFile
}

/** 解析并校验备份文件，不做任何写操作 */
export function validateBackup(text: string): ValidationResult {
  const errors: string[] = []
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['文件不是合法的 JSON'] }
  }

  const b = parsed as Partial<BackupFile>
  if (typeof b !== 'object' || b === null) return { ok: false, errors: ['备份内容不是对象'] }
  if (typeof b.schemaVersion !== 'number') errors.push('缺少 schemaVersion 字段')
  else if (b.schemaVersion > SCHEMA_VERSION)
    errors.push(`备份 schemaVersion(${b.schemaVersion}) 高于当前应用支持的版本(${SCHEMA_VERSION})，请升级应用后再导入`)
  if (typeof b.exportedAt !== 'string') errors.push('缺少 exportedAt 字段')
  if (typeof b.appVersion !== 'string') errors.push('缺少 appVersion 字段')

  const data = b.data
  if (typeof data !== 'object' || data === null) {
    errors.push('缺少 data 字段')
  } else {
    for (const key of ['baby', 'course_plan', 'course_task', 'completion_record', 'app_settings'] as const) {
      if (!Array.isArray(data[key])) errors.push(`data.${key} 必须是数组`)
    }
    if (Array.isArray(data.baby)) {
      for (const [i, baby] of data.baby.entries()) {
        if (!baby?.id || !baby?.name || !baby?.birthDate)
          errors.push(`data.baby[${i}] 缺少 id/name/birthDate 关键字段`)
      }
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, errors: [], backup: b as BackupFile }
}

/** 全量恢复：仅在校验通过后调用；事务化写入，失败不影响现有数据 */
export async function importBackup(backup: BackupFile): Promise<void> {
  await replaceAllStores({
    baby: backup.data.baby,
    course_plan: backup.data.course_plan,
    course_task: backup.data.course_task,
    completion_record: backup.data.completion_record,
  })
}

/** 读取最近一次备份时间（设置页持续展示，需求文档 8 节） */
export async function getLastBackupAt(): Promise<number | null> {
  const db = await openDB()
  return getSetting<number>(db, 'lastBackupAt')
}
