/**
 * 提醒能力抽象（需求文档第 5 节）。
 * V4.0 纯离线 PWA 不依赖 iOS 原生通知框架：
 * - 基础方案：应用启动/回到前台时展示今日待完成提示（LocalReminderAdapter）
 * - 未来如接入 Web Push 或原生封装，实现同一接口即可，不影响课程与数据层
 */

export interface TodayReminder {
  /** 今日待完成任务数 */
  pendingCount: number
  /** 今日总任务数 */
  totalCount: number
  /** 提示文案 */
  message: string
}

export interface ReminderAdapter {
  /** 适配器名称，便于设置页展示当前提醒方式 */
  readonly name: string
  /** 获取今日提醒信息（启动/回前台时调用） */
  getTodayReminder(): Promise<TodayReminder>
}

import { getBabies, getTodayPlan } from './courseService'

/** 本地提醒适配器：纯前端计算，无任何网络与系统通知依赖 */
export class LocalReminderAdapter implements ReminderAdapter {
  readonly name = '应用内今日提示'

  async getTodayReminder(): Promise<TodayReminder> {
    const babies = await getBabies()
    if (babies.length === 0) {
      return { pendingCount: 0, totalCount: 0, message: '先为宝宝建立档案，开始早教计划吧' }
    }
    // V4.0 单宝宝场景取第一个宝宝
    const plan = await getTodayPlan(babies[0])
    const pending = plan.total - plan.done
    return {
      pendingCount: pending,
      totalCount: plan.total,
      message:
        plan.total === 0
          ? '今日暂无匹配的课程，可在「课程」页添加计划'
          : pending === 0
            ? '太棒了！今日课程已全部完成'
            : `今日还有 ${pending} 项课程等待完成（${plan.done}/${plan.total}）`,
    }
  }
}

/** 当前生效的适配器实例；未来替换为 WebPushReminderAdapter 即可 */
export const reminderAdapter: ReminderAdapter = new LocalReminderAdapter()
