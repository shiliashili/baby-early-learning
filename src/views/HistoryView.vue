<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getHistory, type HistoryItem } from '../services/courseService'

const items = ref<HistoryItem[]>([])
const filterDate = ref('')
const loading = ref(true)

const filtered = computed(() =>
  filterDate.value ? items.value.filter((i) => i.record.date === filterDate.value) : items.value
)

const grouped = computed(() => {
  const map = new Map<string, HistoryItem[]>()
  for (const item of filtered.value) {
    const list = map.get(item.record.date) ?? []
    list.push(item)
    map.set(item.record.date, list)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
})

const totalCount = computed(() => items.value.length)
const dayCount = computed(() => new Set(items.value.map((i) => i.record.date)).size)

function fmtTime(ts: number) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(async () => {
  items.value = await getHistory()
  loading.value = false
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">历史记录</h1>

    <div class="card row">
      <div class="grow" style="text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--primary-dark)">{{ totalCount }}</div>
        <div class="text-secondary">累计打卡</div>
      </div>
      <div class="grow" style="text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--primary-dark)">{{ dayCount }}</div>
        <div class="text-secondary">坚持天数</div>
      </div>
    </div>

    <label>按日期筛选</label>
    <div class="row">
      <input v-model="filterDate" type="date" class="grow" />
      <button v-if="filterDate" class="badge" style="border:none;cursor:pointer;padding:10px 14px" @click="filterDate = ''">清除</button>
    </div>

    <div v-if="loading" class="empty">加载中…</div>
    <div v-else-if="grouped.length === 0" class="empty">暂无打卡记录</div>

    <template v-else>
      <div v-for="[date, list] in grouped" :key="date" class="card">
        <div style="font-weight:700;margin-bottom:8px">{{ date }} <span class="badge">{{ list.length }} 项</span></div>
        <div v-for="item in list" :key="item.record.id" class="row" style="padding:5px 0">
          <span style="color:var(--success)">✓</span>
          <div class="grow">
            <span>{{ item.taskTitle }}</span>
            <span class="text-secondary"> · {{ item.planTitle }}</span>
            <div v-if="item.record.note" class="text-secondary">备注：{{ item.record.note }}</div>
          </div>
          <span class="text-secondary">{{ fmtTime(item.record.completedAt) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
