# Ricardo Chance 网站项目卡片交互效果技术分析报告

> 原网站：https://www.ricardochance.com/
> 分析时间：2026-09-30
> 分析对象：Featured Work 区域的项目卡片交互效果
> **⚠️ 重要更新（视频分析完成）：这不是静态卡片的 Hover 效果，而是自动播放的垂直滚动轮播动画！**

---

## 零、视频分析核心发现（23秒演示视频完整解析）

### 0.1 真实效果：滚轮驱动的垂直卡片切换

**⚠️ 重要更正：这不是自动播放，而是用户滚动驱动的交互动画！**

视频中的效果本质：

1. **滚轮驱动**：用户向下滚动鼠标滚轮 → 卡片从下往上滑入
2. **垂直切换**：每张卡片占满视口，滚动一定距离后切换到下一张
3. **ScrollTrigger pin**：滚动时页面固定（pin），卡片在视口内滑动
4. **平滑过渡**：Lenis 平滑滚动 + GSAP 缓动，体验流畅

### 0.2 视频时间轴分析

| 时间戳 | 画面内容 | 关键观察 |
|--------|---------|---------|
| **0s** | FEATURED WORK 标题 + 描述文字 + "View all works" 按钮 | 初始状态，无卡片可见 |
| **5s** | /nk.studio 卡片（青绿色渐变）从下方滑入，占据视口上半部 | 卡片上升中，下方可见 "View all works" 按钮 |
| **10s** | /nk.studio 卡片继续上升到视口底部，标题 "FEATURED WORK" 和描述文字重新出现在上方 | 卡片即将滑出，标题文字已完全显示 |
| **15s** | sukupay 卡片（绿色渐变 + 亮绿色圆点 logo）完全占据视口中心 | /nk.studio 已滑出，sukupay 取代其位置 |
| **18s** | sukupay 卡片向上滑出，"View all works" 按钮和描述文字重新出现 | 过渡到下一张卡片的间隙 |
| **20s** | /nk.studio 卡片再次从下方滑入（新一轮循环开始），左侧显示项目名，右侧显示 "See live" 链接 | 循环重启，下方可见紫色卡片边缘（Flixxo） |
| **22s** | 回到初始状态，显示 "FEATURED WORK" 标题和描述文字 | 完整循环结束，准备重新开始 |

### 0.3 技术实现推测（修正版）

#### 核心机制：ScrollTrigger Pin + 垂直 Transform

```javascript
// Ricardo 网站的实现逻辑（推测）
const section = document.querySelector('.featured-work');
const cards = gsap.utils.toArray('.project-card');

// 创建 ScrollTrigger，固定整个区域
ScrollTrigger.create({
  trigger: section,
  start: 'top top',
  end: () => `+=${window.innerHeight * cards.length}`, // 每张卡 1 屏滚动距离
  pin: true,
  scrub: 1, // 平滑跟随滚动
  onUpdate: (self) => {
    const progress = self.progress;
    const activeIndex = Math.floor(progress * cards.length);
    
    // 更新卡片位置
    cards.forEach((card, i) => {
      const offset = (i - progress * cards.length) * 100; // 百分比偏移
      gsap.set(card, { yPercent: offset });
    });
  }
});
```

**关键参数：**
- `pin: true` - 滚动时固定容器，卡片在内部移动
- `scrub: 1` - 滚动进度直接映射到动画进度（1 秒缓冲）
- `yPercent` - 用百分比控制卡片垂直位置（0 = 视口中心，100 = 下方，-100 = 上方）

#### 与 Lenis 的集成

```javascript
// Lenis 提供平滑滚动，ScrollTrigger 监听滚动事件
const lenis = new Lenis({
  duration: 1.15,
  smoothWheel: true
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
```

### 0.4 与现有转子系统的对比（修正版）

| 维度 | Ricardo 视频效果 | 你的现有转子 |
|------|-----------------|-------------|
| **运动方向** | 垂直滚动（卡片从下往上） | 水平旋转（绕 X 轴转） |
| **驱动方式** | 用户滚动驱动（ScrollTrigger scrub） | 用户滚动驱动（ScrollTrigger 进度映射） |
| **视觉呈现** | 2D 平面滑动（yPercent） | 3D 圆柱面旋转 + 弯曲形变（rotationX + barrel shader） |
| **卡片布局** | 单列垂直堆叠，一次一张 | 环形排列，透视可见多张 |
| **ScrollTrigger 配置** | `pin: true, scrub: 1`（直接映射） | `pin: true, scrub: 0.6`（分段 ease） |
| **技术复杂度** | ⭐⭐⭐☆☆（2D 变换 + pin） | ⭐⭐⭐⭐⭐（3D WebGL + 顶点形变） |

**核心差异：**
- Ricardo：2D 垂直滑动，简洁直观，适合展示型网站
- 你的转子：3D 立体旋转 + 实时弯曲，技术含量更高，适合技术展示

---

## 一、整体架构

### 1.1 技术栈
- **框架：** Next.js (React)
- **3D 渲染：** Three.js (WebGL2)
- **平滑滚动：** Lenis
- **样式：** Tailwind CSS (utility-first)
- **字体：** Instrument Serif (衬线标题) + Red Hat Display (无衬线正文)

### 1.2 页面结构
```html
<body style="cursor: none">
  <!-- 背景 WebGL 渐变层 (z-0, opacity: 60%) -->
  <div class="gl-gradient fixed inset-0">
    <canvas></canvas>
  </div>
  
  <!-- 顶层 WebGL 效果层 (z-2) -->
  <div class="fixed top-0 left-0 z-2 h-screen w-screen pointer-events-none">
    <canvas></canvas>
  </div>
  
  <!-- 自定义光标系统 (z-100000001 ~ 100000002) -->
  <div class="fixed z-[100000001] pointer-events-none">
    <!-- 圆形外圈光标 -->
  </div>
  <div class="fixed z-[100000002] pointer-events-none">
    <!-- 十字光标 -->
  </div>
  
  <!-- 主内容区 -->
  <main>
    <section data-geometry="diamond">
      <!-- Featured Work 项目卡片 -->
    </section>
  </main>
</body>
```

---

## 二、项目卡片渲染机制

### 2.1 DOM 结构
```html
<div class="flex flex-col gap-2 tablet-portrait:block">
  <!-- 卡片容器 (800×500 比例) -->
  <div class="aspect-800/500 w-full relative">
    
    <!-- 透明交互按钮层 (z-10) -->
    <button 
      data-event="hover" 
      aria-label="/nk.studio"
      class="absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0">
    </button>
    
    <!-- 图片容器 (实际渲染层) -->
    <div 
      data-type="image" 
      data-src="/covers/nk.png"
      class="absolute inset-0 w-full h-full pointer-events-none">
      <!-- 这里通过 JavaScript 动态加载并渲染图片 -->
      <!-- 可能是 <img> 标签，也可能是 background-image -->
    </div>
    
  </div>
  
  <!-- 移动端标题和链接 -->
  <div class="flex tablet-portrait:hidden items-center justify-between">
    <p class="heading-5">/nk.studio</p>
    <a href="https://www.nk.studio/" target="_blank">See live</a>
  </div>
</div>
```

### 2.2 关键发现

#### ✅ 项目卡片的渐变背景**不是 CSS 渐变**
- `div[data-type="image"]` 元素本身的 `background-image` 是 `none`
- `background-color` 是 `rgba(0, 0, 0, 0)` (完全透明)

#### ✅ 项目卡片**不是通过 Canvas 直接渲染**
- 页面上的两个 Canvas 都是全屏固定定位
- Canvas #1 (z-2)：顶层效果层
- Canvas #2 (z-0)：背景渐变层 (gl-gradient)
- 两者都**不直接覆盖**项目卡片区域

#### ✅ 图片实际加载方式（推测）
根据分析，有以下几种可能：

**方式 1：JavaScript 动态插入 `<img>` 标签**
```javascript
// 伪代码
const imgDiv = document.querySelector('[data-type="image"]');
const img = document.createElement('img');
img.src = imgDiv.getAttribute('data-src');
imgDiv.appendChild(img);
```

**方式 2：JavaScript 动态设置 `background-image`**
```javascript
// 伪代码
const imgDiv = document.querySelector('[data-type="image"]');
imgDiv.style.backgroundImage = `url(${imgDiv.getAttribute('data-src')})`;
```

**方式 3：WebGL 纹理渲染（最可能）**
- 虽然没有直接覆盖项目卡片的 Canvas
- 但可能通过 Three.js 的 CSS3DRenderer 或类似技术
- 将 WebGL 渲染的纹理叠加到 DOM 元素上
- 这样可以实现**渐变 + 图片的混合效果**

### 2.3 渐变颜色分析
从截图可见：
- **/nk.studio** - 深青绿色渐变 (从深色到亮色，中心偏右有高光)
  - 色值推测：`#0d3d3d` → `#1a5a5a` → `#2d8080` (中心高光)
- **Flixxo** - 紫色渐变
  - 色值推测：`#3d1d4d` → `#5a2a6a`
- **Suku** - (未完全显示)

---

## 三、自定义光标系统

### 3.1 实现原理
```css
/* 全局禁用系统光标 */
html, body {
  cursor: none;
}
```

### 3.2 光标组件结构

#### 组件 1：圆形外圈光标 (z-100000001)
```html
<div class="pointer-events-none fixed top-0 left-0 z-[100000001]"
     style="transform: matrix(1, 0, 0, 1, 712, 462)">
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
              h-20 w-20 rounded-full 
              border border-brand-05/10 
              bg-brand-05/4 
              backdrop-blur-[1px] 
              scale-0 
              transition-all">
  </div>
</div>
```

**特性：**
- 尺寸：80px × 80px (h-20 w-20)
- 初始状态：`scale-0` (缩放为 0，不可见)
- Hover 状态：`scale-1` (展开显示)
- 背景：半透明白色 + 边框 + 1px 模糊
- 跟随鼠标：通过 `transform: matrix()` 更新位置

#### 组件 2：十字光标 (z-100000002)
```html
<div class="mix-blend-difference 
            pointer-events-none fixed top-0 left-0 z-[100000002] 
            h-1 w-1 
            transition-opacity duration-200"
     style="transform: matrix(1, 0, 0, 1, 710, 460)">
  
  <!-- 上竖线 -->
  <div class="absolute bottom-full left-1/2 -translate-x-1/2 
              w-0.5 h-1.5 bg-brand-05 
              -translate-y-full scale-60">
  </div>
  
  <!-- 下竖线 -->
  <div class="absolute top-full left-1/2 -translate-x-1/2 
              w-0.5 h-1.5 bg-brand-05 
              translate-y-full scale-60">
  </div>
  
  <!-- 左横线 -->
  <div class="absolute right-full top-1/2 -translate-y-1/2 
              h-0.5 w-1.5 bg-brand-05 
              -translate-x-full scale-60">
  </div>
  
  <!-- 右横线 -->
  <div class="absolute left-full top-1/2 -translate-y-1/2 
              h-0.5 w-1.5 bg-brand-05 
              translate-x-full scale-60">
  </div>
</div>
```

**特性：**
- 中心点：4px × 4px (h-1 w-1)
- 十字尺寸：每条线 6px × 2px (h-1.5 w-0.5 或 h-0.5 w-1.5)
- 缩放：`scale-60` (60% 大小)
- 混合模式：`mix-blend-difference` (反色效果，在深色背景上显示为白色)
- 跟随鼠标：通过 `transform: matrix()` 更新位置

### 3.3 光标跟随逻辑（推测）
```javascript
// 伪代码
document.addEventListener('mousemove', (e) => {
  const x = e.clientX;
  const y = e.clientY;
  
  // 更新十字光标位置（立即跟随）
  crossCursor.style.transform = `matrix(1, 0, 0, 1, ${x - 2}, ${y - 2})`;
  
  // 更新圆形光标位置（带缓动）
  gsap.to(circleCursor, {
    x: x,
    y: y,
    duration: 0.3,
    ease: 'power2.out'
  });
});

// Hover 时展开圆形光标
button.addEventListener('mouseenter', () => {
  circleCursor.classList.remove('scale-0');
  circleCursor.classList.add('scale-100');
});

button.addEventListener('mouseleave', () => {
  circleCursor.classList.remove('scale-100');
  circleCursor.classList.add('scale-0');
});
```

---

## 四、项目卡片交互效果

### 4.1 Hover 状态分析

经过实际测试，项目卡片在 Hover 时**没有明显的视觉变化**：
- ❌ 无缩放效果 (scale)
- ❌ 无位移效果 (transform)
- ❌ 无透明度变化 (opacity)
- ❌ 无滤镜效果 (filter)
- ❌ 无图片切换

**唯一的 Hover 反馈：**
- ✅ 圆形光标从 `scale-0` → `scale-100` 展开显示

### 4.2 渐变效果总结

项目卡片的**径向渐变效果是静态的**，不随 Hover 改变：
- 渐变中心：偏右上方（约 65% 水平，40% 垂直位置）
- 渐变方式：从中心向四周扩散，中心最亮
- 渐变平滑度：非常细腻，至少 4-5 个色阶
- 背景色：深色（接近黑色）

---

## 五、平滑滚动（Lenis）

### 5.1 配置
```javascript
// 伪代码
const lenis = new Lenis({
  duration: 1.15,      // 滚动持续时间
  smoothWheel: true,   // 平滑滚轮
  prevent: (node) => {
    // 排除弹层/灯箱内的滚动
    return !!(node.closest && node.closest('.modal-body, .lightbox'));
  }
});

// 与 ScrollTrigger 集成（如果使用）
lenis.on('scroll', ScrollTrigger.update);
```

### 5.2 特点
- 惯性滚动：类似 macOS 触控板的自然滚动
- 滚动速度：中等偏慢（duration: 1.15）
- 页面内锚点跳转也会使用平滑滚动

---

## 六、WebGL 背景渐变层

### 6.1 gl-gradient 组件
```html
<div class="gl-gradient js-gl-gradient 
            pointer-events-none fixed inset-0 z-0 
            overflow-hidden opacity-60">
  <canvas width="1425" height="900"></canvas>
</div>
```

### 6.2 特性
- **固定定位**：覆盖整个视口
- **WebGL2 渲染**：通过 Three.js 实现动态渐变
- **透明度**：60% (opacity-60)
- **不可交互**：pointer-events-none
- **层级**：z-0 (在所有内容下方)

### 6.3 渲染推测
可能使用 **Shader 着色器**实现动态彩色噪点渐变：
```glsl
// 伪代码 (Fragment Shader)
uniform float uTime;
uniform vec2 uMouse;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  // 噪点函数
  float noise = snoise(vec3(uv * 3.0, uTime * 0.1));
  
  // 径向渐变
  float dist = distance(uv, uMouse);
  float gradient = 1.0 - smoothstep(0.0, 1.0, dist);
  
  // 混合颜色
  vec3 color1 = vec3(0.2, 0.1, 0.4); // 深紫色
  vec3 color2 = vec3(0.0, 0.3, 0.4); // 深青色
  vec3 finalColor = mix(color1, color2, noise * gradient);
  
  gl_FragColor = vec4(finalColor, 0.6);
}
```

---

## 七、核心技术要点总结

### 7.1 必须实现的效果
1. ✅ **自定义光标系统**
   - 十字光标（4px 中心点 + 四条延伸线）
   - 圆形光标（80px，Hover 时展开）
   - `mix-blend-difference` 反色效果
   
2. ✅ **项目卡片渐变背景**
   - 径向渐变（中心偏右上，向四周扩散）
   - 每个项目不同颜色
   - 静态效果，无 Hover 动画
   
3. ✅ **平滑滚动**
   - 使用 Lenis 库
   - 惯性滚动效果

### 7.2 可选增强效果
1. ⭐ **WebGL 背景渐变层**
   - Three.js + Shader
   - 动态彩色噪点
   - 60% 透明度
   
2. ⭐ **图片加载方式**
   - 根据实际需求选择：
     - 简单版：`<img>` 标签或 `background-image`
     - 高级版：WebGL 纹理 + 渐变混合

### 7.3 技术难点

#### 难点 1：径向渐变的精确还原
- CSS `radial-gradient` 很难完全还原截图效果
- 建议使用 **Canvas 2D** 或 **WebGL Shader** 绘制

#### 难点 2：自定义光标的流畅跟随
- 十字光标需要**零延迟**跟随鼠标
- 圆形光标需要**缓动跟随**（0.3s ease-out）
- 需要使用 `requestAnimationFrame` 或 GSAP

#### 难点 3：图片与渐变的叠加
- 如果使用 CSS，需要精确控制 `mix-blend-mode`
- 如果使用 WebGL，需要实现纹理采样 + 渐变混合

---

## 八、实现建议

### 8.1 最小可行方案（MVP）
```
技术栈：
- HTML/CSS/JavaScript (Vanilla)
- Lenis (平滑滚动)
- 无需 Three.js

实现内容：
1. 自定义光标系统（纯 CSS + JS）
2. 项目卡片渐变背景（CSS radial-gradient）
3. Hover 时圆形光标展开
4. 平滑滚动（Lenis）

预计工作量：2-3 小时
```

### 8.2 完整还原方案
```
技术栈：
- HTML/CSS/JavaScript
- Three.js (WebGL)
- Lenis (平滑滚动)
- GSAP (可选，用于复杂动画)

实现内容：
1. 自定义光标系统（高精度跟随）
2. WebGL 背景渐变层（动态噪点）
3. 项目卡片 Shader 渐变（Canvas/WebGL）
4. 图片加载与渐变混合
5. 平滑滚动（Lenis）

预计工作量：6-8 小时
```

### 8.3 针对你的作品集项目
由于你的项目已经使用了：
- ✅ GSAP + ScrollTrigger
- ✅ Lenis 平滑滚动
- ✅ Three.js WebGL 转子

建议采用**渐进式集成**：
1. **第一步**：先实现自定义光标系统（独立模块）
2. **第二步**：为项目卡片添加 CSS 渐变背景
3. **第三步**：（可选）升级为 Shader 渐变，获得更精细的效果

---

## 九、待确认问题

### 9.1 渐变实现方式
❓ **问题：** 项目卡片的渐变到底是如何渲染的？

**可能性排查：**
- ✅ 图片文件存在：`https://www.ricardochance.com/covers/nk.png`
- ❌ 不是纯 CSS 渐变（`background-image: none`）
- ❌ 不是直接的 Canvas 覆盖（Canvas 是全屏固定的）
- ❓ 可能是 **预渲染的渐变图片**（PNG 文件本身就带渐变）
- ❓ 可能是 **JavaScript 动态绘制** Canvas 然后转为 Data URL

**建议：** 下载 `/covers/nk.png` 文件查看内容

### 9.2 Hover 效果确认
根据测试，Hover 时**只有光标变化**，卡片本身无任何动画。

❓ **问题：** 是否需要额外添加 Hover 动画（如轻微缩放、高光移动等）？

---

## 十、代码参考（伪代码）

### 10.1 自定义光标 HTML
```html
<!-- 圆形光标 -->
<div id="cursor-circle" 
     class="fixed pointer-events-none z-[100000001]"
     style="top: 0; left: 0; transform: translate(-50%, -50%)">
  <div class="w-20 h-20 rounded-full border border-white/10 
              bg-white/[0.04] backdrop-blur-sm 
              scale-0 transition-transform duration-300">
  </div>
</div>

<!-- 十字光标 -->
<div id="cursor-cross" 
     class="fixed pointer-events-none z-[100000002] mix-blend-difference"
     style="top: 0; left: 0; width: 4px; height: 4px">
  <div class="absolute bottom-full left-1/2 -translate-x-1/2 
              w-0.5 h-1.5 bg-white -translate-y-full scale-[0.6]">
  </div>
  <div class="absolute top-full left-1/2 -translate-x-1/2 
              w-0.5 h-1.5 bg-white translate-y-full scale-[0.6]">
  </div>
  <div class="absolute right-full top-1/2 -translate-y-1/2 
              h-0.5 w-1.5 bg-white -translate-x-full scale-[0.6]">
  </div>
  <div class="absolute left-full top-1/2 -translate-y-1/2 
              h-0.5 w-1.5 bg-white translate-x-full scale-[0.6]">
  </div>
</div>
```

### 10.2 自定义光标 JavaScript
```javascript
// 初始化
const cursorCircle = document.getElementById('cursor-circle');
const cursorCross = document.getElementById('cursor-cross');
const circleInner = cursorCircle.querySelector('div');

let mouseX = -100, mouseY = -100;
let circleX = -100, circleY = -100;

// 隐藏系统光标
document.body.style.cursor = 'none';

// 鼠标移动
document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  // 十字光标立即跟随
  cursorCross.style.transform = `translate(${mouseX - 2}px, ${mouseY - 2}px)`;
});

// 圆形光标缓动跟随
function animateCircle() {
  circleX += (mouseX - circleX) * 0.15;
  circleY += (mouseY - circleY) * 0.15;
  
  cursorCircle.style.transform = 
    `translate(${circleX}px, ${circleY}px) translate(-50%, -50%)`;
  
  requestAnimationFrame(animateCircle);
}
animateCircle();

// Hover 效果
document.querySelectorAll('button, a, .work-cover').forEach(el => {
  el.addEventListener('mouseenter', () => {
    circleInner.style.transform = 'scale(1)';
  });
  
  el.addEventListener('mouseleave', () => {
    circleInner.style.transform = 'scale(0)';
  });
});
```

### 10.3 项目卡片渐变 CSS
```css
/* 方案 1：CSS 渐变（简化版）*/
.work-cover {
  background: radial-gradient(
    circle at 65% 40%,
    rgba(45, 128, 128, 1) 0%,
    rgba(26, 90, 90, 1) 30%,
    rgba(13, 61, 61, 1) 60%,
    rgba(8, 40, 40, 1) 100%
  );
}

/* 方案 2：CSS 渐变 + 图片叠加 */
.work-cover {
  background-image: 
    radial-gradient(
      circle at 65% 40%,
      rgba(45, 128, 128, 0.8) 0%,
      rgba(13, 61, 61, 0.9) 100%
    ),
    url('/covers/nk.png');
  background-blend-mode: overlay;
  background-size: cover;
  background-position: center;
}
```

---

## 十一、实现建议（基于视频分析的最终方案）

### 11.1 核心决策：是否替换现有转子系统？

**方案对比：**

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **A. 完全替换为垂直滚动轮播** | 视觉效果简洁，实现简单，性能好 | 失去现有 3D 转子的技术亮点 | 追求极简风格，不强调技术复杂度 |
| **B. 保留转子，新增自定义光标** | 保留技术特色，仅增强交互细节 | 视觉效果与视频不同 | 展示 WebGL 能力，保持差异化 |
| **C. 双模式切换** | 两种效果都有，用户可选 | 代码复杂，维护成本高 | 作品集需要展示多种实现方案 |

**推荐方案：B（保留转子 + 自定义光标）**

理由：
1. 你的现有转子已实现 WebGL 弯曲形变，技术含量更高（视频中的垂直滚动是常规 GSAP 动画）
2. 3D 转子在秋招面试中更能体现前端技术深度
3. 自定义光标可以独立实现，不影响现有系统
4. Ricardo 的垂直滚动更适合展示型网站，你的转子更适合作品集（突出技术能力）

### 11.2 推荐实施步骤

#### 第一步：实现自定义光标系统（独立模块，1-2小时）
```javascript
// js/cursor.js（新建文件）
(function initCustomCursor() {
  if (!matchMedia('(pointer: fine)').matches) return;
  
  // HTML 注入
  const cursorHTML = `
    <div id="cursor-ring" class="cursor-ring">
      <div class="cursor-ring-inner"></div>
    </div>
    <div id="cursor-dot" class="cursor-dot">
      <div class="cursor-cross cursor-cross-v cursor-cross-v-top"></div>
      <div class="cursor-cross cursor-cross-v cursor-cross-v-bottom"></div>
      <div class="cursor-cross cursor-cross-h cursor-cross-h-left"></div>
      <div class="cursor-cross cursor-cross-h cursor-cross-h-right"></div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', cursorHTML);
  
  // 逻辑实现（参考十.2节代码）
  // ...
})();
```

**CSS 样式：**
```css
/* 全局禁用系统光标 */
.custom-cursor * {
  cursor: none !important;
}

/* 光标环（80px，缓动跟随） */
.cursor-ring {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100000001;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.cursor-ring-inner {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(1px);
  transform: scale(0);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.cursor-ring.is-active .cursor-ring-inner,
.cursor-ring.has-label .cursor-ring-inner {
  transform: scale(1);
}

/* 十字光标（4px 中心点，立即跟随） */
.cursor-dot {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100000002;
  width: 4px;
  height: 4px;
  pointer-events: none;
  mix-blend-mode: difference;
}

.cursor-cross {
  position: absolute;
  background: #fff;
  transform: scale(0.6);
}

.cursor-cross-v {
  width: 2px;
  height: 6px;
  left: 50%;
  transform: translateX(-50%) scale(0.6);
}

.cursor-cross-v-top {
  bottom: 100%;
  transform: translateX(-50%) translateY(-100%) scale(0.6);
}

.cursor-cross-v-bottom {
  top: 100%;
  transform: translateX(-50%) translateY(100%) scale(0.6);
}

.cursor-cross-h {
  width: 6px;
  height: 2px;
  top: 50%;
  transform: translateY(-50%) scale(0.6);
}

.cursor-cross-h-left {
  right: 100%;
  transform: translateY(-50%) translateX(-100%) scale(0.6);
}

.cursor-cross-h-right {
  left: 100%;
  transform: translateY(-50%) translateX(100%) scale(0.6);
}
```

#### 第二步（可选）：优化卡片渐变（如果想更接近 Ricardo 风格）
```css
/* 使用 Canvas 绘制更精细的径向渐变 */
.work-cover {
  position: relative;
}

.work-cover::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 65% 40%,
    rgba(45, 128, 128, 1) 0%,
    rgba(26, 90, 90, 1) 25%,
    rgba(13, 61, 61, 1) 50%,
    rgba(8, 40, 40, 1) 100%
  );
  opacity: 0.8;
  mix-blend-mode: overlay;
}
```

#### 第三步（可选）：添加 WebGL 背景渐变层（高级）
如果想要完全还原 Ricardo 的视觉氛围，可以添加全屏 WebGL 噪点渐变：
```javascript
// 使用 Three.js Shader，参考六.3节代码
// 60% 透明度，固定在 z-0 层
```

### 11.3 最小实施方案（推荐，2小时内完成）

**只实现自定义光标**，其他保持不变：

1. ✅ 新建 `js/cursor.js`，实现十字 + 圆环光标
2. ✅ 在 `index.html` 引入 `<script src="js/cursor.js"></script>`
3. ✅ 在 `css/style.css` 添加光标样式
4. ✅ 桌面端精细指针设备启用，移动端自动禁用
5. ✅ Hover 到 `button`、`a`、`.work-cover`、`[data-open]` 时圆环展开

**预期效果：**
- 保留现有 WebGL 转子的 3D 旋转 + 弯曲形变
- 增加 Ricardo 风格的自定义光标交互
- 不影响现有功能，纯增强体验

---

## 十二、最终结论与下一步

### 选项 A：最小化实现（推荐）
1. ✅ 实现自定义光标系统
2. ✅ 使用 CSS `radial-gradient` 实现卡片渐变
3. ✅ Hover 时光标展开效果
4. ✅ 保持现有的 Lenis 平滑滚动

**优点：** 快速实现，兼容性好，易维护  
**缺点：** 渐变效果可能不如原网站精细

### 选项 B：完整还原（高级）
1. ✅ 实现自定义光标系统（同上）
2. ✅ 使用 Canvas/WebGL Shader 实现卡片渐变
3. ✅ 添加 WebGL 背景渐变层（动态噪点）
4. ✅ 图片与渐变的精细混合

**优点：** 视觉效果最佳，高度还原  
**缺点：** 开发时间长，性能开销大

---

## 十二、补充信息

### 12.1 原网站性能观察
- 页面加载速度：中等（Next.js SSR）
- 滚动流畅度：非常流畅（Lenis + 60fps）
- WebGL 性能：良好（两个 Canvas，60fps）
- 无明显卡顿或掉帧

### 12.2 浏览器兼容性
- Chrome/Edge：✅ 完美支持
- Firefox：✅ 完美支持
- Safari：✅ 完美支持（需测试 `mix-blend-difference`）
- 移动端：⚠️ 自定义光标无意义（触摸屏无光标）

### 12.3 响应式设计
- 桌面端（>960px）：显示完整效果
- 平板端（768-960px）：自定义光标保留，布局调整
- 移动端（<768px）：
  - ❌ 自定义光标禁用
  - ✅ 项目卡片渐变保留
  - ✅ 平滑滚动保留（原生滚动）

---

## 十二、最终结论与下一步

### 12.1 视频分析核心结论（最终修正版）

**Ricardo Chance 网站的 Featured Work 效果本质：**
- ❌ **不是**静态卡片的 Hover 动画
- ❌ **不是**自动播放的轮播
- ✅ **是**用户滚轮驱动的垂直卡片切换（ScrollTrigger pin + scrub）
- ✅ 滚动时页面固定，卡片从下往上滑入/滑出，每张占满视口

**技术实现对比：**

| 技术点 | Ricardo 网站 | 你的现有转子 |
|--------|-------------|-------------|
| **滚动驱动** | ✅ 用户滚轮 | ✅ 用户滚轮 |
| **ScrollTrigger pin** | ✅ 固定容器 | ✅ 固定舞台 |
| **动画维度** | 2D（yPercent） | 3D（rotationX + z-depth） |
| **形变效果** | ❌ 无 | ✅ 实时弯曲（barrel shader） |
| **物理模拟** | ❌ 无 | ✅ 弹簧回弹（速度→弯曲量） |
| **技术难度** | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐⭐ |

**核心区别：**
- **Ricardo**：垂直方向的 2D 滑动（类似 Apple 产品页的分屏滚动）
- **你的转子**：水平轴的 3D 旋转 + 滚动速度驱动的实时形变

### 12.2 为什么你的方案更适合秋招作品集

**Ricardo 的实现（常规方案）：**
```javascript
// 标准 ScrollTrigger 用法，前端都会
ScrollTrigger.create({
  trigger: section,
  pin: true,
  scrub: 1,
  onUpdate: (self) => {
    cards.forEach((card, i) => {
      gsap.set(card, { yPercent: (i - self.progress * cards.length) * 100 });
    });
  }
});
```

**你的实现（高级方案）：**
```javascript
// 1. WebGL 渲染（非 DOM）
// 2. 顶点级形变（PlaneGeometry 分段 + 逐顶点变换）
// 3. 滚动速度物理模拟（弹簧插值）
// 4. barrel shader（全局视口坐标系桶形畸变）

// 面试时可以讲的技术点：
// - Three.js 场景搭建与性能优化
// - GLSL Shader 编写（顶点着色器 + 全局坐标变换）
// - 物理模拟（弹簧系统：刚度/阻尼调参）
// - 降级策略（WebGL → CSS 刚性转子 → 列表）
// - 资源管理（TextureLoader + 兜底纹理）
```

**结论：你的转子在面试中更有谈资，不建议替换！**

### 12.3 最终推荐方案

**方案 A：只加自定义光标（强烈推荐）** ⭐⭐⭐⭐⭐

实施内容：
1. ✅ 实现十字 + 圆环自定义光标（完全复刻 Ricardo 风格）
2. ✅ 保留现有 WebGL 转子不变
3. ✅ 移动端自动禁用光标

**优点：**
- 工作量小（2小时）
- 保留技术亮点
- 增强交互体验
- 不影响现有功能

**方案 B：加光标 + 优化视觉（可选）** ⭐⭐⭐☆☆

在方案 A 基础上：
1. ✅ 优化卡片渐变（更精细的径向渐变）
2. ✅ 调整配色（对齐 Ricardo 的青绿/紫色主题）
3. ⚠️ 可能需要重新设计封面图

**方案 C：完全改为垂直滑动（不推荐）** ⭐☆☆☆☆

替换转子为 Ricardo 的垂直滑动：
- ❌ 失去 WebGL 技术展示
- ❌ 失去顶点形变特效
- ❌ 面试时无差异化亮点
- ❌ 工作量大（需要重写 Works 区全部逻辑）

### 12.4 下一步待确认（请超哥选择）

**问题 1：是否实现自定义光标？**
- [ ] **是（推荐）** - 完全复刻 Ricardo 风格（十字 + 圆环，mix-blend-difference）
- [ ] 否 - 保持现有光标

**问题 2：是否保留现有 WebGL 转子？**
- [ ] **是（强烈推荐）** - 保留 3D 旋转 + 弯曲形变，技术含量更高
- [ ] 否 - 替换为 Ricardo 的垂直滑动（2D，技术含量低）

**问题 3：是否调整视觉风格？**
- [ ] 是 - 渐变色彩对齐 Ricardo（青绿/紫色主题）
- [ ] **否（推荐）** - 保持现有暖米白 + 克莱因蓝设计

**我的建议：1选是，2选是，3选否**
- 只加自定义光标，其他全部保持不变
- 既能学习 Ricardo 的交互细节，又保留你的技术特色
- 面试时可以说："我研究了 Ricardo Chance 的交互设计，借鉴了他的光标系统，但 Works 区用了更复杂的 WebGL 实现"

**方案 C：完全重构（不推荐）**
- ❌ 替换为垂直滚动轮播
- ❌ 失去现有技术亮点
- ❌ 面试时无法展示 WebGL 能力

### 12.4 下一步待确认事项

**请你确认以下问题，我再开始实现：**

1. **是否实现自定义光标？**
   - [ ] 是，完全按照 Ricardo 风格（十字 + 圆环，mix-blend-difference）
   - [ ] 否，保持现有光标

2. **是否保留现有 WebGL 转子？**
   - [ ] 是，保留 3D 旋转 + 弯曲形变
   - [ ] 否，替换为垂直滚动轮播

3. **是否需要优化视觉风格？**
   - [ ] 是，调整渐变色彩对齐 Ricardo
   - [ ] 否，保持现有设计

4. **是否需要添加 WebGL 背景层？**
   - [ ] 是，添加全屏噪点渐变（60% 透明度）
   - [ ] 否，背景保持纯色

**我的建议：** 选择「方案 A」，只实现自定义光标，其他保持不变。这样既能借鉴 Ricardo 的交互细节，又能保留你的技术特色。

---

## 附录：完整代码参考

### A.1 自定义光标完整实现（已在十.1 和 十.2 节）

### A.2 垂直滚动轮播实现（如选择方案 C）
```javascript
// 替换现有转子的代码（不推荐）
function initVerticalCarousel() {
  const cards = gsap.utils.toArray('.project-card');
  const tl = gsap.timeline({ 
    repeat: -1,
    defaults: { ease: 'power2.inOut', duration: 3 }
  });

  cards.forEach((card, i) => {
    tl.fromTo(card,
      { yPercent: 100, opacity: 0 },
      { yPercent: 0, opacity: 1 },
      i * 5
    );
    tl.to(card,
      { yPercent: -100, opacity: 0 },
      i * 5 + 4
    );
  });
}
```

---

**分析报告完成！等待超哥确认后开始实现。** 🎉
