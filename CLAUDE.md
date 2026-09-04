# 个人作品集网站 — 项目规则

## 项目概述

个人作品集网站，用于 2026 届秋招（AI 产品经理方向），向面试官展示 3–4 个项目（个人项目 + 实习项目）。

## 技术栈

- 纯静态站：HTML + CSS + 原生 JS，**零构建**（无 npm、无打包器）。
- 动效：GSAP 3.12 + ScrollTrigger（CDN：jsDelivr），Lenis 平滑滚动（CDN）。
- 字体：Playfair Display + Inter（fonts.loli.net 镜像），中文走系统字体栈。

## 目录约定

- `index.html` — 单页结构（Hero / Works / About / Contact + 详情弹层 + Lightbox）。
- `css/style.css` — 全部样式；设计变量在 `:root`（配色、字体、间距、easing）。
- `js/data.js` — **项目数据唯一入口**。新增/修改作品只改这个文件，字段说明见文件头注释。
- `js/main.js` — 渲染与动效逻辑，一般不用动。
- `assets/` — 图片（建议 WebP）、视频（mp4）、`resume.pdf`。

## 本地预览

```bash
python3 serve.py 8080   # 支持 Range 请求，视频可拖动快进
# 打开 http://localhost:8080
```

## 部署

目标平台：Vercel（静态托管，零配置直接部署）。

## 设计规范

- 配色：暖米白底 `--bg:#F4F1EA`，近黑正文 `--ink:#16150F`，克莱因蓝点缀 `--accent:#002FA7`（仅用于强调/悬停/选中）。
- 动效统一 easing `cubic-bezier(0.16,1,0.3,1)`，时长 200–600ms；必须尊重 `prefers-reduced-motion`。
- 项目卡片封面未配图时用渐变色 + 序号占位，配图后填 `coverImg` 字段。

## 提交规范

- 重要功能完成后向用户展示 commit message，确认后再提交。
