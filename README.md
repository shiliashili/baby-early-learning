# 宝宝早教计划 PWA（V4.0）

面向家长的宝宝早教计划管理工具：根据宝宝生日自动计算月龄与周次，匹配家长规划的课程，支持每日打卡、历史统计与 JSON 备份恢复。

- **离线优先**：Service Worker 预缓存应用壳，飞行模式下可用
- **数据仅存本机**：IndexedDB（`baby_early_learning_db`），无后端、无云数据库、无任何数据上传
- **备份恢复**：JSON 全量导出 / 导入（导入前校验，事务化覆盖写入）
- **课程批量导入**：课程页可下载 JSON 模板，填写后批量导入（同月龄+周次+标题自动去重合并，只补缺失任务）
- **技术栈**：Vue 3 + TypeScript + Vite + vite-plugin-pwa + IndexedDB

## 本地开发

```bash
npm install
npm run dev       # 开发调试
npm test          # 月龄/周次计算单元测试（含月末、闰年边界）
npm run build     # 产出 dist/
npm run preview   # 本地预览构建产物
```

## 部署

详见 [部署手册_GitHubPages.md](./部署手册_GitHubPages.md)。仓库已内置 GitHub Actions 工作流（`.github/workflows/deploy.yml`），推送到 `main` 分支即可自动发布到 GitHub Pages。

## iPhone 安装

用 Safari 打开部署后的网址 → 分享按钮 →「添加到主屏幕」，即可像原生 App 一样独立窗口启动并离线使用。

## 隐私说明

不接入任何第三方分析、广告或远程日志 SDK；网络面板中不存在上传宝宝档案、打卡记录的业务请求。源码与静态资源公开可加载，但业务数据因浏览器同源隔离仅存在于访问者各自设备上。
