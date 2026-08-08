<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Baby } from '../types'
import { getBabies, saveBaby, deleteBaby } from '../services/courseService'
import { calcAge } from '../services/ageService'

const babies = ref<Baby[]>([])
const showForm = ref(false)
const editing = ref<Baby | null>(null)
const name = ref('')
const birthDate = ref('')

function toast(text: string) {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: text }))
}

async function load() {
  babies.value = await getBabies()
}

function openForm(b?: Baby) {
  editing.value = b ?? null
  name.value = b?.name ?? ''
  birthDate.value = b?.birthDate ?? ''
  showForm.value = true
}

async function submit() {
  if (!name.value.trim()) return toast('请填写宝宝姓名/昵称')
  if (!birthDate.value) return toast('请选择出生日期')
  if (new Date(birthDate.value) > new Date()) return toast('出生日期不能晚于今天')
  await saveBaby({ id: editing.value?.id, name: name.value.trim(), birthDate: birthDate.value })
  showForm.value = false
  toast(editing.value ? '已保存修改' : '宝宝档案已创建')
  await load()
}

async function onDelete(b: Baby) {
  if (!confirm(`确定删除「${b.name}」的档案吗？打卡记录会保留但不再关联展示。`)) return
  await deleteBaby(b.id)
  toast('已删除')
  await load()
}

onMounted(load)
</script>

<template>
  <div class="page">
    <h1 class="page-title">宝宝档案</h1>

    <div v-if="babies.length === 0 && !showForm" class="empty">还没有宝宝档案，点击下方按钮创建</div>

    <div v-for="b in babies" :key="b.id" class="card">
      <div class="row">
        <div style="font-size:32px">👶</div>
        <div class="grow">
          <div style="font-weight:700;font-size:17px">{{ b.name }}</div>
          <div class="text-secondary">
            {{ b.birthDate }} 出生 · {{ calcAge(b.birthDate).monthAge }} 月龄第 {{ calcAge(b.birthDate).week }} 周
          </div>
        </div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn btn-secondary grow" @click="openForm(b)">编辑</button>
        <button class="btn btn-danger grow" @click="onDelete(b)">删除</button>
      </div>
    </div>

    <div v-if="showForm" class="card">
      <div style="font-weight:700;margin-bottom:4px">{{ editing ? '编辑档案' : '新建档案' }}</div>
      <label>姓名 / 昵称</label>
      <input v-model="name" placeholder="宝宝的小名" />
      <label>出生日期</label>
      <input v-model="birthDate" type="date" />
      <div class="row" style="margin-top:16px">
        <button class="btn grow" @click="submit">保存</button>
        <button class="btn btn-secondary grow" @click="showForm = false">取消</button>
      </div>
    </div>

    <button v-if="!showForm" class="btn" @click="openForm()">＋ 添加宝宝</button>
  </div>
</template>
