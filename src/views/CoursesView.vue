<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { CoursePlan, CourseTask } from '../types'
import {
  getPlans, savePlan, deletePlan, getTasksByPlan, saveTask, deleteTask,
} from '../services/courseService'
import {
  downloadCourseTemplate, validateCourseTemplate, previewCourseImport, importCourseTemplate,
  type CourseTemplate,
} from '../services/courseTemplateService'

const plans = ref<CoursePlan[]>([])
const tasksByPlan = ref<Record<string, CourseTask[]>>({})
const expanded = ref<Set<string>>(new Set())

const showPlanForm = ref(false)
const planForm = ref({ id: '', monthAge: 0, week: 1, title: '' })

const showTaskForm = ref(false)
const taskForm = ref({ id: '', planId: '', title: '', description: '', sortOrder: 0 })

function toast(text: string) {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: text }))
}

async function load() {
  plans.value = await getPlans()
  const map: Record<string, CourseTask[]> = {}
  for (const p of plans.value) map[p.id] = await getTasksByPlan(p.id)
  tasksByPlan.value = map
}

function toggleExpand(id: string) {
  expanded.value.has(id) ? expanded.value.delete(id) : expanded.value.add(id)
  expanded.value = new Set(expanded.value)
}

function openPlanForm(p?: CoursePlan) {
  planForm.value = p
    ? { id: p.id, monthAge: p.monthAge, week: p.week, title: p.title }
    : { id: '', monthAge: 0, week: 1, title: '' }
  showPlanForm.value = true
}

async function submitPlan() {
  if (!planForm.value.title.trim()) return toast('请填写计划标题')
  await savePlan({
    id: planForm.value.id || undefined,
    monthAge: Number(planForm.value.monthAge),
    week: Number(planForm.value.week),
    title: planForm.value.title.trim(),
    version: 1,
    enabled: true,
  })
  showPlanForm.value = false
  toast('课程计划已保存')
  await load()
}

async function onDeletePlan(p: CoursePlan) {
  if (!confirm(`删除计划「${p.title}」及其全部任务？`)) return
  await deletePlan(p.id)
  toast('已删除')
  await load()
}

async function onToggleEnabled(p: CoursePlan) {
  await savePlan({ ...p, enabled: !p.enabled })
  await load()
}

function openTaskForm(planId: string, t?: CourseTask) {
  taskForm.value = t
    ? { id: t.id, planId: t.planId, title: t.title, description: t.description, sortOrder: t.sortOrder }
    : { id: '', planId, title: '', description: '', sortOrder: (tasksByPlan.value[planId]?.length ?? 0) + 1 }
  showTaskForm.value = true
}

async function submitTask() {
  if (!taskForm.value.title.trim()) return toast('请填写任务名称')
  await saveTask({
    id: taskForm.value.id || undefined,
    planId: taskForm.value.planId,
    title: taskForm.value.title.trim(),
    description: taskForm.value.description.trim(),
    sortOrder: Number(taskForm.value.sortOrder) || 0,
  })
  showTaskForm.value = false
  toast('任务已保存')
  await load()
}

async function onDeleteTask(t: CourseTask) {
  if (!confirm(`删除任务「${t.title}」？`)) return
  await deleteTask(t.id)
  await load()
}

/* ---------- 模板下载与批量导入 ---------- */

const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const pendingTemplate = ref<CourseTemplate | null>(null)
const previewText = ref('')

function onDownloadTemplate() {
  const filename = downloadCourseTemplate()
  toast(`模板 ${filename} 已下载，填写后再导入`)
}

async function onTemplateFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true
  try {
    const text = await file.text()
    const result = validateCourseTemplate(text)
    if (!result.ok) {
      alert('模板校验失败，未导入任何数据：\n' + result.errors.slice(0, 10).join('\n'))
      return
    }
    const summary = await previewCourseImport(result.template!)
    pendingTemplate.value = result.template!
    previewText.value =
      `将新建 ${summary.plansCreated} 个计划、合并进 ${summary.plansMerged} 个已有计划；` +
      `新增 ${summary.tasksAdded} 个任务、跳过 ${summary.tasksSkipped} 个重复任务。\n\n确定导入吗？`
  } catch (err) {
    alert('导入失败：' + (err instanceof Error ? err.message : String(err)))
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function confirmImport() {
  if (!pendingTemplate.value) return
  const summary = await importCourseTemplate(pendingTemplate.value)
  pendingTemplate.value = null
  toast(`导入完成：新建 ${summary.plansCreated} 计划，新增 ${summary.tasksAdded} 任务`)
  await load()
}

onMounted(load)
</script>

<template>
  <div class="page">
    <h1 class="page-title">课程计划</h1>
    <p class="text-secondary" style="margin-bottom:12px">按月龄和周次规划课程，宝宝进入对应月龄后自动出现在「今日」页。</p>

    <div v-if="plans.length === 0 && !showPlanForm" class="empty">还没有课程计划，点击下方按钮创建</div>

    <div v-for="p in plans" :key="p.id" class="card">
      <div class="row" style="cursor:pointer" @click="toggleExpand(p.id)">
        <div class="grow">
          <div style="font-weight:700">{{ p.title }}</div>
          <div class="text-secondary">{{ p.monthAge }} 月龄 · 第 {{ p.week }} 周 · {{ tasksByPlan[p.id]?.length ?? 0 }} 个任务</div>
        </div>
        <span class="badge" :class="{ 'badge-success': p.enabled }">{{ p.enabled ? '启用中' : '已停用' }}</span>
        <span>{{ expanded.has(p.id) ? '▲' : '▼' }}</span>
      </div>

      <div v-if="expanded.has(p.id)" style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
        <div v-for="t in tasksByPlan[p.id]" :key="t.id" class="row" style="padding:6px 0">
          <div class="grow">
            <div style="font-weight:600">{{ t.sortOrder }}. {{ t.title }}</div>
            <div v-if="t.description" class="text-secondary">{{ t.description }}</div>
          </div>
          <button class="badge" style="border:none;cursor:pointer" @click="openTaskForm(p.id, t)">编辑</button>
          <button class="badge" style="border:none;cursor:pointer;background:#fdecea;color:#d32f2f" @click="onDeleteTask(t)">删除</button>
        </div>
        <div class="row" style="margin-top:10px">
          <button class="btn btn-secondary grow" @click="openTaskForm(p.id)">＋ 任务</button>
          <button class="btn btn-secondary grow" @click="openPlanForm(p)">编辑计划</button>
        </div>
        <div class="row" style="margin-top:8px">
          <button class="btn btn-secondary grow" @click="onToggleEnabled(p)">{{ p.enabled ? '停用' : '启用' }}</button>
          <button class="btn btn-danger grow" @click="onDeletePlan(p)">删除计划</button>
        </div>
      </div>
    </div>

    <div v-if="showPlanForm" class="card">
      <div style="font-weight:700">{{ planForm.id ? '编辑计划' : '新建计划' }}</div>
      <label>计划标题</label>
      <input v-model="planForm.title" placeholder="如：大运动训练" />
      <div class="row">
        <div class="grow">
          <label>适用月龄</label>
          <input v-model.number="planForm.monthAge" type="number" min="0" max="72" />
        </div>
        <div class="grow">
          <label>周次</label>
          <select v-model.number="planForm.week">
            <option :value="1">第 1 周</option>
            <option :value="2">第 2 周</option>
            <option :value="3">第 3 周</option>
            <option :value="4">第 4 周</option>
            <option :value="5">第 5 周</option>
          </select>
        </div>
      </div>
      <div class="row" style="margin-top:16px">
        <button class="btn grow" @click="submitPlan">保存</button>
        <button class="btn btn-secondary grow" @click="showPlanForm = false">取消</button>
      </div>
    </div>

    <div v-if="showTaskForm" class="card">
      <div style="font-weight:700">{{ taskForm.id ? '编辑任务' : '新建任务' }}</div>
      <label>任务名称</label>
      <input v-model="taskForm.title" placeholder="如：俯卧抬头练习 3 分钟" />
      <label>说明（可选）</label>
      <textarea v-model="taskForm.description" rows="2" placeholder="玩法要点、注意事项"></textarea>
      <label>排序</label>
      <input v-model.number="taskForm.sortOrder" type="number" min="0" />
      <div class="row" style="margin-top:16px">
        <button class="btn grow" @click="submitTask">保存</button>
        <button class="btn btn-secondary grow" @click="showTaskForm = false">取消</button>
      </div>
    </div>

    <button v-if="!showPlanForm && !showTaskForm" class="btn" @click="openPlanForm()">＋ 添加课程计划</button>

    <div v-if="!showPlanForm && !showTaskForm" class="card">
      <div style="font-weight:700;margin-bottom:8px">批量导入课程</div>
      <p class="text-secondary" style="margin-bottom:12px">
        下载 JSON 模板，按月龄/周次填写计划与任务后导入。同月龄+周次+标题的已有计划只会补充缺失任务，不会重复创建。
      </p>
      <div class="row">
        <button class="btn btn-secondary grow" @click="onDownloadTemplate">下载导入模板</button>
        <button class="btn grow" :disabled="importing" @click="fileInput?.click()">
          {{ importing ? '校验中…' : '导入课程' }}
        </button>
      </div>
      <input ref="fileInput" type="file" accept="application/json,.json" style="display:none" @change="onTemplateFile" />
    </div>

    <div v-if="pendingTemplate" class="card">
      <div style="font-weight:700;margin-bottom:8px">确认导入</div>
      <p class="text-secondary" style="white-space:pre-line;margin-bottom:12px">{{ previewText }}</p>
      <div class="row">
        <button class="btn grow" @click="confirmImport">确认导入</button>
        <button class="btn btn-secondary grow" @click="pendingTemplate = null">取消</button>
      </div>
    </div>
  </div>
</template>
