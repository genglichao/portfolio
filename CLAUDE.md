# 个人作品集网站 — 项目规则

## 项目概述

个人作品集网站，用于 2026 届秋招（AI 产品经理方向），向面试官展示 3–4 个项目（个人项目 + 实习项目）。

## 技术栈

- 纯静态站：HTML + CSS + 原生 JS，**零构建**（无 npm、无打包器）。
- 动效：GSAP 3.12 + ScrollTrigger（CDN：jsDelivr），Lenis 平滑滚动（CDN），Works 区 three.js 0.164（CDN ES module，`import()` 动态加载）。
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
- Works 区（2026-09-30 重构，对齐 nk.studio 技术链路）：桌面端（>960px、精细指针、GSAP 就绪）为 **WebGL 柔性卡片转子**（three.js 渲染在 `#works-gl` canvas 上，舞台 full-bleed 满视口宽），两层系统——①位置层：ScrollTrigger pin + 分段 easeInOutCubic（停留:过渡 ≈ 3:1），卡片尺寸按参考视频像素测量：**卡宽 66% 视口、宽高比 2.75:1 横幅卡、卡中心在 43.5% 视口高**，转子半径 = 卡高×1.0（≈40% 视口高），相邻卡圆心角 90°，每卡 1.8 屏滚动；**封面用 `assets/*-banner.webp`（2.75:1 专用横幅版，由原封面 canvas cover 裁剪生成），新素材请按此比例提供**，贴图加载完成前隐藏 mesh 并按 cover 裁剪兜底（防跳变/拉伸）；②形变层（灵魂）：**滚动速度驱动弯曲**——Lenis velocity → 弹簧插值 bend 值 → 逐顶点把卡片贴到圆柱面（PlaneGeometry 1×24 段，`applyBend`），最大弯曲 1.5 rad、速度系数 0.035、弹簧刚度 0.16/阻尼 0.72，弯曲方向随滚动方向（下滚内凹/上滚外凸），**停止滚动后 bend 弹簧回 0，卡片快速回弹为平面矩形**。参数集中在 `STAGE` 对象。点击 canvas 经 Raycaster 命中卡片打开详情。降级链：three 加载失败 / 无 WebGL → CSS 刚性转子（`#works-drum`，rotationX 近似，同尺寸）→ 移动端 / reduced-motion → 经典交替网格列表（`renderWorks()`）。**GL 接管顺序严格：先隐藏 drum → kill CSS 转子的 pin → 再 `glStage.attachScroll()` 挂 GL 的 pin → refresh（双 pin 共存会争 pin-spacer 造成频闪）**。caption 为 DOM 覆盖层，不随卡片弯曲。
- 项目卡片封面未配图时用渐变色 + 序号占位，配图后填 `coverImg` 字段。

## 提交规范

- 重要功能完成后向用户展示 commit message，确认后再提交。
