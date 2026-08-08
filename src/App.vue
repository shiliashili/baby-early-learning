<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { updateSW } from './pwa/registerSW'

const showUpdatePrompt = ref(false)
const toast = ref('')
let toastTimer: number | undefined

function notify(text: string) {
  toast.value = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = ''), 2600)
}

function onNeedRefresh() {
  showUpdatePrompt.value = true
}
function onOfflineReady() {
  notify('应用已缓存完成，可离线使用')
}
function onToast(e: Event) {
  notify((e as CustomEvent<string>).detail)
}

async function applyUpdate() {
  showUpdatePrompt.value = false
  await updateSW(true)
}

onMounted(() => {
  window.addEventListener('pwa:need-refresh', onNeedRefresh)
  window.addEventListener('pwa:offline-ready', onOfflineReady)
  window.addEventListener('app:toast', onToast)
})
onUnmounted(() => {
  window.removeEventListener('pwa:need-refresh', onNeedRefresh)
  window.removeEventListener('pwa:offline-ready', onOfflineReady)
  window.removeEventListener('app:toast', onToast)
})

const tabs = [
  { to: '/', icon: '📋', label: '今日' },
  { to: '/baby', icon: '👶', label: '宝宝' },
  { to: '/courses', icon: '📚', label: '课程' },
  { to: '/history', icon: '🗓️', label: '历史' },
  { to: '/settings', icon: '⚙️', label: '设置' },
]
</script>

<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" />
  </router-view>

  <nav class="tabbar">
    <router-link v-for="t in tabs" :key="t.to" :to="t.to" :class="{ active: $route.path === t.to }">
      <span class="icon">{{ t.icon }}</span>
      <span>{{ t.label }}</span>
    </router-link>
  </nav>

  <div v-if="showUpdatePrompt" class="toast" style="top:auto;bottom:90px">
    发现新版本
    <button class="badge" style="border:none;margin-left:8px;cursor:pointer" @click="applyUpdate">刷新更新</button>
    <button class="badge" style="border:none;margin-left:6px;cursor:pointer;background:#eee;color:#666" @click="showUpdatePrompt = false">稍后</button>
  </div>

  <div v-if="toast" class="toast">{{ toast }}</div>
</template>
