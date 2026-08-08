import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// base 使用相对路径 './'，可部署到 GitHub Pages 项目页（/<repo>/）而无需修改配置
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: false, // 使用 public/manifest.webmanifest 中的静态配置
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false
      }
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
