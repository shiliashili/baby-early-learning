/**
 * IndexedDB 初始化与 schema migration。
 * - 数据库名：baby_early_learning_db（需求文档 6 节）
 * - 结构升级通过 IDB 版本号 + schemaVersion（存于 app_settings）管理，
 *   绝不清空数据库来解决升级。
 */
import type { AppSetting } from '../types'

export const DB_NAME = 'baby_early_learning_db'
export const DB_VERSION = 1
export const SCHEMA_VERSION = 1

export const STORES = {
  baby: 'baby',
  coursePlan: 'course_plan',
  courseTask: 'course_task',
  completionRecord: 'completion_record',
  appSettings: 'app_settings',
} as const

let dbPromise: Promise<IDBDatabase> | null = null

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = req.result
      const oldVersion = event.oldVersion

      // v1：初始结构
      if (oldVersion < 1) {
        const baby = db.createObjectStore(STORES.baby, { keyPath: 'id' })
        baby.createIndex('birthDate', 'birthDate', { unique: false })

        const plan = db.createObjectStore(STORES.coursePlan, { keyPath: 'id' })
        plan.createIndex('monthAge', 'monthAge', { unique: false })
        plan.createIndex('week', 'week', { unique: false })

        const task = db.createObjectStore(STORES.courseTask, { keyPath: 'id' })
        task.createIndex('planId', 'planId', { unique: false })

        const record = db.createObjectStore(STORES.completionRecord, { keyPath: 'id' })
        record.createIndex('taskId', 'taskId', { unique: false })
        record.createIndex('date', 'date', { unique: false })

        db.createObjectStore(STORES.appSettings, { keyPath: 'key' })
      }
      // 未来结构升级在此追加 if (oldVersion < 2) { ... }，不做清空式升级
    }

    req.onsuccess = async () => {
      const db = req.result
      await runDataMigrations(db)
      resolve(db)
    }
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

/** 数据层 migration：依据 app_settings 中的 schemaVersion 逐步升级 */
async function runDataMigrations(db: IDBDatabase): Promise<void> {
  const current = await getSetting<number>(db, 'schemaVersion')
  if (current == null) {
    await putSetting(db, 'schemaVersion', SCHEMA_VERSION)
    return
  }
  // 未来数据迁移示例：
  // if (current < 2) { ...迁移逻辑... ; await putSetting(db, 'schemaVersion', 2) }
}

export async function getSetting<T>(db: IDBDatabase, key: string): Promise<T | null> {
  const item = await promisify<AppSetting | undefined>(
    txStore(db, STORES.appSettings, 'readonly').get(key)
  )
  return item ? (item.value as T) : null
}

export async function putSetting(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  await promisify(txStore(db, STORES.appSettings, 'readwrite').put({ key, value }))
}

/** 以下为通用 IndexedDB Promise 封装 */
export function txStore(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode
): IDBObjectStore {
  return db.transaction(storeName, mode).objectStore(storeName)
}

export function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return promisify<T[]>(txStore(db, storeName, 'readonly').getAll() as IDBRequest<T[]>)
}

export async function getById<T>(db: IDBDatabase, storeName: string, id: string): Promise<T | undefined> {
  return promisify<T | undefined>(txStore(db, storeName, 'readonly').get(id))
}

export async function put<T>(db: IDBDatabase, storeName: string, value: T): Promise<void> {
  await promisify(txStore(db, storeName, 'readwrite').put(value))
}

export async function remove(db: IDBDatabase, storeName: string, id: string): Promise<void> {
  await promisify(txStore(db, storeName, 'readwrite').delete(id))
}

export async function getAllByIndex<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const store = txStore(db, storeName, 'readonly')
  return promisify<T[]>(store.index(indexName).getAll(value) as IDBRequest<T[]>)
}

export function newId(): string {
  return crypto.randomUUID()
}
