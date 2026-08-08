<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Baby } from '../types'
import { getBabies, getTodayPlan, toggleTask, type TodayPlan } from '../services/courseService'
import { reminderAdapter, type TodayReminder } from '../services/reminderAdapter'

const baby = ref<Baby | null>(null)
const plan = ref<TodayPlan | null>(null)
const reminder = ref<TodayReminder | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  const babies = await getBabies()
  baby.value = babies[0] ?? null
  plan.value = baby.value ? await getTodayPlan(baby.value) : null
  reminder.value = await reminderAdapter.getTodayReminder()
  loading.value = false
}

async function onToggle(taskId: string) {
  await toggleTask(taskId)
  await load()
}

function onVisibility() {
  if (document.visibilityState === 'visible') load()
}

onMounted(() => {
  load()
  document.addEventListener('visibilitychange', onVisibility)
})
onUnmounted(() => document.removeEventListener('visibilitychange', onVisibility))

const progress = () =>
  plan.value && plan.value.total > 0 ? Math.round((plan.value.done / plan.value.total) * 100) : 0
</script>

<template>
  <div class="page">
    <h1 class="page-title">今日计划</h1>

    <div v-if="loading" class="empty">加载中…</div>

    <template v-else>
      <div v-if="!baby" class="card" style="text-align:center">
        <p style="margin-bottom:12px">还没有宝宝档案</p>
        <router-link to="/baby" class="btn" style="text-decoration:none">去创建宝宝档案</router-link>
      </div>

      <template v-else>
        <div class="card">
          <div class="row">
            <div class="grow">
              <div style="font-size:18px;font-weight:700">{{ baby.name }}</div>
              <div class="text-secondary">
                {{ plan!.age.monthAge }} 月龄 · 第 {{ plan!.age.week }} 周
              </div>
            </div>
            <span class="badge" :class="{ 'badge-success': plan!.total > 0 && plan!.done === plan!.total }">
              {{ plan!.done }}/{{ plan!.total }}
            </span>
          </div>
          <div style="height:8px;background:#f6e8e0;border-radius:99px;margin-top:12px;overflow:hidden">
            <div :style="{ width: progress() + '%', height: '100%', background: 'var(--primary)', borderRadius: '99px', transition: 'width .3s' }"></div>
          </div>
          <p v-if="reminder" class="text-secondary" style="margin-top:10px">{{ reminder.message }}</p>
        </div>

        <div v-if="plan!.tasks.length === 0" class="empty">
          当前月龄周次暂无课程<br />
          <router-link to="/courses" style="color:var(--primary-dark)">去添加课程计划 →</router-link>
        </div>

        <div v-for="task in plan!.tasks" :key="task.id" class="card row" style="cursor:pointer" @click="onToggle(task.id)">
          <div
            :style="{
              width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
              border: task.completed ? 'none' : '2px solid var(--border)',
              background: task.completed ? 'var(--success)' : '#fff',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
            }"
          >{{ task.completed ? '✓' : '' }}</div>
          <div class="grow">
            <div :style="{ fontWeight: 600, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text)' }">
              {{ task.title }}
            </div>
            <div class="text-secondary">{{ task.planTitle }}<template v-if="task.description"> · {{ task.description }}</template></div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
