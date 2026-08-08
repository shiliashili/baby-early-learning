/**
 * Service Worker 注册与版本更新提示（需求文档第 7 节）。
 * registerType: 'prompt' —— 检测到新版本时提示用户「发现新版本，刷新后更新」，
 * 不做静默更新，避免数据或界面状态丢失。
 */
import { registerSW } from 'virtual:pwa-register'

export const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa:need-refresh'))
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('pwa:offline-ready'))
  },
})
