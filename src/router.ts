import { createRouter, createWebHashHistory } from 'vue-router'
import TodayView from './views/TodayView.vue'
import BabyView from './views/BabyView.vue'
import CoursesView from './views/CoursesView.vue'
import HistoryView from './views/HistoryView.vue'
import SettingsView from './views/SettingsView.vue'

// 使用 hash 路由：GitHub Pages 等纯静态托管不支持 history fallback
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'today', component: TodayView },
    { path: '/baby', name: 'baby', component: BabyView },
    { path: '/courses', name: 'courses', component: CoursesView },
    { path: '/history', name: 'history', component: HistoryView },
    { path: '/settings', name: 'settings', component: SettingsView },
  ],
})
