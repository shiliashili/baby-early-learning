<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { exportBackup, validateBackup, importBackup, getLastBackupAt } from '../services/backupService'
import { reminderAdapter } from '../services/reminderAdapter'

const lastBackupAt = ref<number | null>(null)
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function toast(text: string) {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: text }))
}

function fmt(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function onExport() {
  const filename = await exportBackup()
  lastBackupAt.value = await getLastBackupAt()
  toast(`已导出 ${filename}，请保存到「文件」或 iCloud Drive`)
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true
  try {
    const text = await file.text()
    const result = validateBackup(text)
    if (!result.ok) {
      alert('导入失败，现有数据未被修改：\n' + result.errors.join('\n'))
      return
    }
    const b = result.backup!
    const summary = `备份时间：${b.exportedAt}\n宝宝 ${b.data.baby.length} 个 · 计划 ${b.data.course_plan.length} 个 · 任务 ${b.data.course_task.length} 个 · 打卡 ${b.data.completion_record.length} 条`
    if (!confirm(`将采用「全量恢复并覆盖当前数据」策略导入：\n\n${summary}\n\n确定继续吗？`)) return
    await importBackup(b)
    toast('恢复完成')
  } catch (err) {
    alert('导入失败：' + (err instanceof Error ? err.message : String(err)))
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

onMounted(async () => {
  lastBackupAt.value = await getLastBackupAt()
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">设置</h1>

    <div class="card">
      <div style="font-weight:700;margin-bottom:8px">数据备份与恢复</div>
      <p class="text-secondary" style="margin-bottom:12px">
        所有数据仅保存在本机浏览器中。卸载应用或清理浏览器数据会导致丢失，请定期导出备份。
      </p>
      <p class="text-secondary" style="margin-bottom:12px">
        最近一次备份：<strong v-if="lastBackupAt">{{ fmt(lastBackupAt) }}</strong>
        <strong v-else style="color:#d32f2f">从未备份</strong>
      </p>
      <button class="btn" @click="onExport">导出 JSON 备份</button>
      <div style="height:8px"></div>
      <button class="btn btn-secondary" :disabled="importing" @click="fileInput?.click()">
        {{ importing ? '导入中…' : '导入 JSON 恢复（覆盖当前数据）' }}
      </button>
      <input ref="fileInput" type="file" accept="application/json,.json" style="display:none" @change="onFileChange" />
    </div>

    <div class="card">
      <div style="font-weight:700;margin-bottom:8px">每日提醒</div>
      <p class="text-secondary">
        当前提醒方式：<strong>{{ reminderAdapter.name }}</strong><br />
        纯离线 PWA 无法在应用关闭后定时弹出系统通知。如需固定时间提醒，可使用 iOS「快捷指令 → 自动化」设置每天定时打开本应用。
      </p>
    </div>

    <div class="card">
      <div style="font-weight:700;margin-bottom:8px">关于</div>
      <p class="text-secondary">
        宝宝早教计划 V4.0<br />
        静态 PWA · 离线优先 · 无业务后端<br />
        数据仅存储于本机 IndexedDB，不上传任何服务器。
      </p>
    </div>
  </div>
</template>
