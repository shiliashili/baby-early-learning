import { describe, it, expect } from 'vitest'
import { calcAge, fullMonthsBetween, addMonths, parseISODate } from './ageService'

describe('addMonths', () => {
  it('普通月份相加', () => {
    expect(addMonths(parseISODate('2025-01-15'), 1)).toEqual(parseISODate('2025-02-15'))
  })
  it('月末钳制：1月31日 + 1 月 = 2月28日（平年）', () => {
    expect(addMonths(parseISODate('2025-01-31'), 1)).toEqual(parseISODate('2025-02-28'))
  })
  it('月末钳制：1月31日 + 1 月 = 2月29日（闰年）', () => {
    expect(addMonths(parseISODate('2024-01-31'), 1)).toEqual(parseISODate('2024-02-29'))
  })
  it('跨年：12月15日 + 1 月', () => {
    expect(addMonths(parseISODate('2025-12-15'), 1)).toEqual(parseISODate('2026-01-15'))
  })
  it('30日月 + 1 月 = 31日（目标月天数足够时不钳制）', () => {
    expect(addMonths(parseISODate('2025-03-31'), 1)).toEqual(parseISODate('2025-04-30'))
  })
})

describe('fullMonthsBetween', () => {
  it('出生当天为 0 个月', () => {
    expect(fullMonthsBetween(parseISODate('2025-06-10'), parseISODate('2025-06-10'))).toBe(0)
  })
  it('差一天满月仍为 0', () => {
    expect(fullMonthsBetween(parseISODate('2025-06-10'), parseISODate('2025-07-09'))).toBe(0)
  })
  it('正好满月为 1', () => {
    expect(fullMonthsBetween(parseISODate('2025-06-10'), parseISODate('2025-07-10'))).toBe(1)
  })
  it('跨月末出生：1月31日出生，2月28日（平年）满 1 个月', () => {
    expect(fullMonthsBetween(parseISODate('2025-01-31'), parseISODate('2025-02-28'))).toBe(1)
  })
  it('闰年：2024-01-31 出生，2024-02-29 满 1 个月', () => {
    expect(fullMonthsBetween(parseISODate('2024-01-31'), parseISODate('2024-02-29'))).toBe(1)
  })
  it('闰日出生：2024-02-29 出生，2025-02-28 满 12 个月', () => {
    expect(fullMonthsBetween(parseISODate('2024-02-29'), parseISODate('2025-02-28'))).toBe(12)
  })
  it('目标日期早于出生日期返回 0', () => {
    expect(fullMonthsBetween(parseISODate('2025-06-10'), parseISODate('2025-06-09'))).toBe(0)
  })
})

describe('calcAge 周次划分', () => {
  const birth = '2025-01-01'
  it('进入月龄第 0 天 = 第 1 周', () => {
    const age = calcAge(birth, '2025-02-01')
    expect(age).toEqual({ monthAge: 1, week: 1, dayInMonthAge: 0 })
  })
  it('第 6 天 = 第 1 周', () => {
    expect(calcAge(birth, '2025-02-07').week).toBe(1)
  })
  it('第 7 天 = 第 2 周', () => {
    expect(calcAge(birth, '2025-02-08').week).toBe(2)
  })
  it('第 13 天 = 第 2 周', () => {
    expect(calcAge(birth, '2025-02-14').week).toBe(2)
  })
  it('第 14 天 = 第 3 周', () => {
    expect(calcAge(birth, '2025-02-15').week).toBe(3)
  })
  it('第 20 天 = 第 3 周', () => {
    expect(calcAge(birth, '2025-02-21').week).toBe(3)
  })
  it('第 21 天 = 第 4 周', () => {
    expect(calcAge(birth, '2025-02-22').week).toBe(4)
  })
  it('第 27 天（下一月龄前一天）= 第 4 周', () => {
    expect(calcAge(birth, '2025-02-28').week).toBe(4)
  })
  it('出生当天：月龄 0、第 1 周', () => {
    expect(calcAge(birth, '2025-01-01')).toEqual({ monthAge: 0, week: 1, dayInMonthAge: 0 })
  })
  it('跨不同天数月份：1月31日出生，3月30日 = 1 月龄第 4 周', () => {
    const age = calcAge('2025-01-31', '2025-03-30')
    expect(age.monthAge).toBe(1)
    expect(age.week).toBe(4)
  })
})
