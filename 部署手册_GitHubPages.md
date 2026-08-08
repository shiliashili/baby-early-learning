# 宝宝早教计划 PWA —— GitHub Pages 部署手册

> 适用版本：V4.0（静态 PWA，无业务后端）
> 目标：把应用发布到 GitHub Pages，iPhone Safari 添加到主屏幕后可离线使用。

---

## 0. 前置准备

| 项目 | 要求 |
| --- | --- |
| GitHub 账号 | 任意免费账号即可 |
| 本机环境 | Node.js 18+（推荐 20/22）、npm、git |
| 项目代码 | 本目录（baby-early-learning） |

GitHub Pages 默认通过 HTTPS 提供服务，满足 PWA 安装与 Service Worker 的强制 HTTPS 要求，无需额外证书配置。

---

## 1. 本地验证（部署前）

在项目根目录执行：

```bash
npm install      # 首次或依赖变更后执行
npm test         # 月龄/周次计算单元测试，应全部通过
npm run build    # 构建，产物输出到 dist/
npm run preview  # 本地预览，默认 http://localhost:4173
```

确认 `dist/` 目录中包含：`index.html`、`manifest.webmanifest`、`sw.js`、`icons/`、`assets/`。

---

## 2. 创建 GitHub 仓库并推送代码

在 GitHub 网页上新建一个仓库（建议设为 **Private 私有仓库**，Pages 功能对私有仓库同样可用）：

- 仓库名示例：`baby-early-learning`
- 部署后的访问地址将是：`https://<你的用户名>.github.io/baby-early-learning/`

> 本项目构建时使用相对路径（`base: './'`），**无论仓库叫什么名字都不需要修改配置**。

然后在本地项目目录执行：

```bash
git init
git add .
git commit -m "feat: 宝宝早教计划 PWA V4.0"
git branch -M main
git remote add origin git@github.com:<你的用户名>/baby-early-learning.git
git push -u origin main
```

（如果使用 HTTPS 方式，把 remote 地址换成 `https://github.com/<你的用户名>/baby-early-learning.git`）

---

## 3. 开通 GitHub Pages（两种方式任选其一）

### 方式 A：GitHub Actions 自动部署（推荐，已内置工作流）

仓库已包含 `.github/workflows/deploy.yml`，每次推送 `main` 分支自动：安装依赖 → 跑单元测试 → 构建 → 发布。

只需在仓库页面做一次设置：

1. 打开仓库 → **Settings** → 左侧 **Pages**
2. **Source** 选择 **GitHub Actions**（不是 "Deploy from a branch"）
3. 保存后，推送代码或在 **Actions** 页手动运行 "Deploy to GitHub Pages" 工作流
4. 工作流变绿后，访问 `https://<你的用户名>.github.io/baby-early-learning/`

后续每次 `git push` 都会自动更新线上版本。

### 方式 B：手动发布 dist 目录（无 Actions）

1. 本地执行 `npm run build`
2. 安装一次性的发布工具并推送 dist 到 `gh-pages` 分支：

```bash
npx gh-pages -d dist
```

3. 仓库 **Settings → Pages → Source** 选择 **Deploy from a branch**，分支选 `gh-pages`、目录选 `/ (root)`
4. 几分钟后访问 `https://<你的用户名>.github.io/baby-early-learning/`

---

## 4. iPhone 安装与离线验证（验收步骤）

1. iPhone 上用 **Safari** 打开部署地址（必须是 Safari，「添加到主屏幕」才可用）
2. 点击底部分享按钮 → **添加到主屏幕**
3. 从主屏幕图标启动，确认是独立窗口（无 Safari 地址栏）
4. **离线验证**：打开应用一次后，开启飞行模式，再从主屏幕启动
   - 能进入首页、查看宝宝信息、当前课程
   - 能完成打卡、查看历史记录
5. 杀掉应用重新打开，数据仍在（IndexedDB 持久化）
6. 在「设置」页导出 JSON 备份；删除测试数据后导入，数据一致恢复

---

## 5. 版本更新机制说明

- 应用每次部署后 Service Worker 文件内容变化，用户端会在下次打开时检测到新版本
- 界面底部会提示「发现新版本，刷新后更新」，**点击后才会更新**，不做静默强制刷新
- 旧版本缓存由 Workbox 自动清理（`cleanupOutdatedCaches`）
- 应用升级**不会**清空 IndexedDB 中的宝宝数据

---

## 6. 隐私与安全注意事项（重要）

1. **仓库建议设为私有**：公开仓库意味着源代码公开。即使如此，业务数据也只存在各用户本机，不会泄露。
2. **网址本身不是访问控制**：知道网址的人可以加载相同的前端程序，但无法读取你手机里的数据（浏览器同源隔离）。如介意网址被猜测，可使用无规律的仓库名。
3. **不要**在代码、示例数据、URL 中写入真实宝宝信息。
4. 本项目未接入任何第三方分析 / 广告 / 日志 SDK，请保持这一点。
5. IndexedDB 不是永久备份：iOS 清理网站数据或删除主屏幕图标会删除数据。**请定期在「设置」页导出 JSON 备份**到 iCloud Drive。

---

## 7. 常见问题

| 问题 | 排查 |
| --- | --- |
| 打开网址 404 | 确认 Pages 已启用且工作流运行成功；地址末尾要带 `/`，仓库名大小写需一致 |
| 页面空白、资源 404 | 不要用 Browser 路由；本项目已用 hash 路由 + 相对路径，若自己改过配置请恢复 `base: './'` |
| 主屏幕打开仍是 Safari 页面 | 必须从 Safari 的分享菜单「添加到主屏幕」；iOS 16.4+ 第三方浏览器也支持 |
| 离线打不开 | 首次必须在线完整打开一次让 Service Worker 完成缓存；可在「设置 → Safari → 高级」中确认未禁用缓存 |
| 数据突然消失 | iOS 长期未使用的 PWA 数据可能被系统清理；用最近的 JSON 备份导入恢复 |
| 想改应用名/图标 | 修改 `public/manifest.webmanifest` 与 `public/icons/` 后重新部署 |

---

## 8. 目录结构速查

```
baby-early-learning/
├── .github/workflows/deploy.yml   # 自动部署工作流
├── public/
│   ├── manifest.webmanifest       # PWA 清单
│   └── icons/                     # 应用图标
├── src/
│   ├── components/                # 通用 UI 组件
│   ├── views/                     # 今日 / 宝宝 / 课程 / 历史 / 设置
│   ├── services/
│   │   ├── ageService.ts          # 月龄与周次计算（纯函数）
│   │   ├── ageService.test.ts     # 单元测试（月末、闰年边界）
│   │   ├── courseService.ts       # 课程匹配、打卡、历史
│   │   ├── backupService.ts       # JSON 导出 / 校验 / 导入
│   │   ├── courseTemplateService.ts # 课程模板下载 / 校验 / 批量导入
│   │   └── reminderAdapter.ts     # 提醒能力抽象
│   ├── db/db.ts                   # IndexedDB 初始化与 migration
│   └── pwa/registerSW.ts          # Service Worker 注册与更新提示
├── vite.config.ts                 # Vite + PWA 配置（base: './'）
└── 部署手册_GitHubPages.md         # 本文档
```
