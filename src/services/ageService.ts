/**
 * 月龄与周次计算（需求文档第 4 节）。
 * 纯函数实现，便于单元测试覆盖月末、闰年、不同月份天数等边界情况。
 *
 * 规则：
 * - 完整月龄 = 出生日期到目标日期经过的整月数
 * - 每个月龄最多划分 5 周：进入月龄后第 0–6 天为第 1 周，7–13 天为第 2 周，
 *   14–20 天为第 3 周，21–27 天为第 4 周；若该月龄超过 28 天，
 *   第 28 天至下一月龄前一天为第 5 周（仅 29–31 天的月龄会出现）
 */

export interface AgeInfo {
  /** 完整月龄，出生当天为 0 */
  monthAge: number
  /** 当前月龄内周次 1-5 */
  week: number
  /** 进入当前月龄后的第几天（从 0 开始） */
  dayInMonthAge: number
}

function daysInMonth(year: number, month: number): number {
  // month 为 1-12
  return new Date(year, month, 0).getDate()
}

/** 解析 YYYY-MM-DD 为本地日期（避免 new Date(string) 的 UTC 解析差异） */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 将 date 向后加 n 个月；若目标月没有对应日（如 1月31日 + 1 月），
 * 则钳制到目标月最后一天。
 */
export function addMonths(date: Date, n: number): Date {
  const y = date.getFullYear()
  const m = date.getMonth() + n
  const targetY = y + Math.floor(m / 12)
  const targetM = ((m % 12) + 12) % 12
  const maxDay = daysInMonth(targetY, targetM + 1)
  const day = Math.min(date.getDate(), maxDay)
  return new Date(targetY, targetM, day)
}

/** 计算两个日期之间的完整月数（birth <= target 时非负） */
export function fullMonthsBetween(birth: Date, target: Date): number {
  if (target.getTime() < birth.getTime()) return 0
  let months =
    (target.getFullYear() - birth.getFullYear()) * 12 +
    (target.getMonth() - birth.getMonth())
  // 如果加上 months 个月后的日期超过了 target，说明还差几天才满这个月
  if (addMonths(birth, months).getTime() > target.getTime()) {
    months -= 1
  }
  return Math.max(0, months)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 计算目标日期对应的月龄信息 */
export function calcAge(birthDate: string | Date, targetDate: string | Date = new Date()): AgeInfo {
  const birth = typeof birthDate === 'string' ? parseISODate(birthDate) : birthDate
  const target = typeof targetDate === 'string' ? parseISODate(targetDate) : targetDate

  const monthAge = fullMonthsBetween(birth, target)
  const monthStart = addMonths(birth, monthAge)
  const dayInMonthAge = Math.max(
    0,
    Math.floor((startOfDay(target).getTime() - startOfDay(monthStart).getTime()) / DAY_MS)
  )
  const week = Math.min(5, Math.floor(dayInMonthAge / 7) + 1)

  return { monthAge, week, dayInMonthAge }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
