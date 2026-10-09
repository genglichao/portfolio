# Ricardo Chance 滚动交互动效技术分析

> 聚焦：鼠标滚轮驱动的卡片切换机制
> 分析时间：2026-10-01
> 原网站：https://www.ricardochance.com/

---

## 一、核心交互效果

### 1.1 用户体验描述

**滚动过程：**
1. 用户向下滚动页面
2. Featured Work 区域**固定在视口中央**
3. 项目名称**逐个淡入淡出**（/nk.studio → Flixxo → Suku）
4. 每个项目名称的**字母逐个显现**（stagger 错开动画）
5. 滚动约 **4000px**（4.4倍视口高度）完成全部切换

### 1.2 技术实现原理

**核心机制：ScrollTrigger Pin + Opacity 映射**

```
滚动距离 (scrollY)  →  激活的卡片
─────────────────────────────────────
1976px - 2776px     →  /nk.studio (100%)
2776px - 3576px     →  Flixxo (100%)
3576px - 4376px     →  Suku (100%)
```

**每张卡片的生命周期：**
- 淡入阶段：400px 滚动距离（opacity: 0 → 1）
- 停留阶段：400px（opacity: 1 保持）
- 淡出阶段：400px（opacity: 1 → 0）

---

## 二、DOM 结构与 CSS

### 2.1 HTML 结构

```html
<!-- 固定在视口的容器 -->
<section class="container relative z-10">
  <div class="grid grid-cols-12">
    
    <!-- 卡片堆叠容器（关键！）-->
    <div class="grid col-start-1">
      
      <!-- 卡片1 -->
      <div style="grid-area: 1 / 1" class="s-split-lines">
        <div style="display: inline-block; opacity: 0">/</div>
        <div style="display: inline-block; opacity: 0">n</div>
        <div style="display: inline-block; opacity: 0">k</div>
        <!-- 每个字母是独立的 div -->
      </div>
      
      <!-- 卡片2：占据同一网格位置 -->
      <div style="grid-area: 1 / 1" class="s-split-lines">
        <div style="display: inline-block; opacity: 0">F</div>
        <div style="display: inline-block; opacity: 0">l</div>
        <!-- ... -->
      </div>
      
      <!-- 卡片3 -->
      <div style="grid-area: 1 / 1" class="s-split-lines">
        <!-- ... -->
      </div>
      
    </div>
  </div>
</section>

<!-- 滚动空间占位符（600vh = 5400px）-->
<section class="h-[600vh] hidden tablet-portrait:block">
  <!-- 空内容，仅用于创建滚动距离 -->
</section>
```

### 2.2 CSS 关键样式

```css
/* 卡片堆叠：所有卡片占据同一网格单元 */
.card-stack {
  display: grid;
}

.card {
  grid-area: 1 / 1; /* 堆叠在同一位置 */
}

/* 字母独立动画 */
.letter {
  display: inline-block;
  opacity: 0; /* 初始不可见 */
  transition: opacity 0.3s ease;
}
```

---

## 三、JavaScript 动画实现

### 3.1 Framer Motion 版本（原网站）

```jsx
import { motion, useScroll, useTransform } from 'framer-motion'

function FeaturedWork() {
  const containerRef = useRef(null)
  
  // 监听滚动进度
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })
  
  // 卡片1：0-33% 滚动区间
  const card1Opacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.25, 0.33],
    [0, 1, 1, 0]
  )
  
  // 卡片2：33-66% 滚动区间
  const card2Opacity = useTransform(
    scrollYProgress,
    [0.33, 0.43, 0.56, 0.66],
    [0, 1, 1, 0]
  )
  
  // 卡片3：66-100% 滚动区间
  const card3Opacity = useTransform(
    scrollYProgress,
    [0.66, 0.76, 0.9, 1],
    [0, 1, 1, 0]
  )
  
  return (
    <div ref={containerRef} className="h-[600vh]">
      {/* 固定在视口的内容 */}
      <div className="sticky top-0 h-screen">
        
        {/* 三张卡片堆叠 */}
        <motion.div style={{ opacity: card1Opacity }}>
          /nk.studio
        </motion.div>
        
        <motion.div style={{ opacity: card2Opacity }}>
          Flixxo
        </motion.div>
        
        <motion.div style={{ opacity: card3Opacity }}>
          Suku
        </motion.div>
        
      </div>
    </div>
  )
}
```

### 3.2 GSAP + ScrollTrigger 版本（适配你的项目）

```javascript
// 初始化
const cards = gsap.utils.toArray('.card');
const container = document.querySelector('.featured-work-container');

// 为每张卡片创建 ScrollTrigger
cards.forEach((card, i) => {
  const letters = card.querySelectorAll('.letter');
  
  // 计算滚动区间
  const start = i * 0.33; // 0%, 33%, 66%
  const fadeIn = start + 0.1;
  const fadeOut = start + 0.23;
  const end = start + 0.33;
  
  // 卡片整体透明度
  gsap.to(card, {
    opacity: 0,
    scrollTrigger: {
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const progress = self.progress;
        
        // 淡入阶段
        if (progress >= start && progress < fadeIn) {
          const fadeInProgress = (progress - start) / 0.1;
          card.style.opacity = fadeInProgress;
        }
        // 停留阶段
        else if (progress >= fadeIn && progress < fadeOut) {
          card.style.opacity = 1;
        }
        // 淡出阶段
        else if (progress >= fadeOut && progress < end) {
          const fadeOutProgress = (progress - fadeOut) / 0.1;
          card.style.opacity = 1 - fadeOutProgress;
        }
        // 其他时间不可见
        else {
          card.style.opacity = 0;
        }
      }
    }
  });
  
  // 字母 stagger 动画
  gsap.fromTo(letters,
    { opacity: 0, y: 20 },
    {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.03, // 每个字母延迟 0.03s
      ease: 'power2.out',
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        onEnter: () => {
          if (self.progress >= start && self.progress < fadeIn) {
            gsap.to(letters, {
              opacity: 1,
              y: 0,
              stagger: 0.03,
              duration: 0.4
            });
          }
        }
      }
    }
  );
});

// Pin 容器固定在视口
ScrollTrigger.create({
  trigger: container,
  start: 'top top',
  end: 'bottom bottom',
  pin: '.featured-work-sticky', // 固定的内容区域
  pinSpacing: false
});
```

---

## 四、滚动交互的数据映射

### 4.1 实测滚动区间

| 滚动位置 (scrollY) | 卡片1 | 卡片2 | 卡片3 |
|-------------------|-------|-------|-------|
| 1976px | 9% | 14% | 20% |
| **2376px** | **100%** ✅ | 14% | 20% |
| 2776px | 9% | 14% | 20% |
| **3176px** | 9% | **100%** ✅ | 20% |
| **3576px** | 9% | 14% | **100%** ✅ |
| 5976px | 9% | 14% | 20% |

**规律总结：**
- 每张卡片激活区间：**800px**
- 卡片间隔：**800px**
- 总滚动距离：**4000px**（约 4.4 倍视口高度）

### 4.2 归一化滚动进度

```javascript
// 将滚动位置映射到 0-1 进度
function getScrollProgress() {
  const container = document.querySelector('.featured-work-container');
  const rect = container.getBoundingClientRect();
  const scrollStart = container.offsetTop;
  const scrollEnd = scrollStart + container.offsetHeight;
  const currentScroll = window.scrollY;
  
  return Math.max(0, Math.min(1, 
    (currentScroll - scrollStart) / (scrollEnd - scrollStart)
  ));
}

// 根据进度计算卡片透明度
function getCardOpacity(cardIndex, progress) {
  const cardCount = 3;
  const segmentSize = 1 / cardCount; // 0.33
  const fadeTime = 0.1; // 10% 的区间用于淡入淡出
  
  const cardStart = cardIndex * segmentSize;
  const fadeIn = cardStart + fadeTime;
  const fadeOut = cardStart + segmentSize - fadeTime;
  const cardEnd = cardStart + segmentSize;
  
  if (progress < cardStart || progress >= cardEnd) {
    return 0;
  } else if (progress < fadeIn) {
    return (progress - cardStart) / fadeTime;
  } else if (progress < fadeOut) {
    return 1;
  } else {
    return 1 - (progress - fadeOut) / fadeTime;
  }
}

// 使用示例
const progress = getScrollProgress();
const card1Opacity = getCardOpacity(0, progress);
const card2Opacity = getCardOpacity(1, progress);
const card3Opacity = getCardOpacity(2, progress);
```

---

## 五、与你的 WebGL 转子对比

### 5.1 技术对比

| 对比项 | Ricardo 2D 堆叠 | 你的 WebGL 转子 |
|--------|----------------|----------------|
| **动画驱动** | 滚动进度 → opacity | 滚动进度 → rotation + bend |
| **视觉效果** | 平面淡入淡出 | 3D 旋转 + 实时弯曲 |
| **实现复杂度** | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐⭐ |
| **滚动距离** | 4000px (4.4vh) | 约 6480px (每卡1.8vh × 4卡) |
| **卡片可见数** | 同时1张 | 同时2-3张 |
| **空间利用** | 纯文字，无图片 | 横幅卡片，有封面图 |
| **技术亮点** | 字母 stagger 动画 | 顶点形变 + 弹簧物理 |

### 5.2 核心差异

**Ricardo 方案：**
- ✅ 极简设计，纯文字展示
- ✅ 实现简单，维护成本低
- ❌ 技术含量一般（标准 ScrollTrigger 用法）
- ❌ 视觉冲击力不足

**你的 WebGL 转子：**
- ✅ 3D 空间旋转，视觉震撼
- ✅ 实时顶点形变，技术难度高
- ✅ 面试时有技术谈资
- ❌ 实现复杂，调试成本高

---

## 六、可复用的部分

### ✅ 1. 滚动进度映射逻辑

**Ricardo 的滚动映射可以直接用于你的转子：**

```javascript
// 替换你现有的 segmentEase 函数
function smoothScrollMapping(progress, cardCount) {
  const segmentSize = 1 / (cardCount - 1);
  const cardIndex = Math.floor(progress / segmentSize);
  const segmentProgress = (progress % segmentSize) / segmentSize;
  
  // 使用 easeInOutCubic 平滑过渡
  const eased = segmentProgress < 0.5
    ? 4 * segmentProgress ** 3
    : 1 - Math.pow(-2 * segmentProgress + 2, 3) / 2;
  
  return (cardIndex + eased) * 90; // 90° = 你的 STAGE.STEP
}

// 在 ScrollTrigger 中使用
ScrollTrigger.create({
  trigger: stage,
  start: 'top top',
  end: '+=' + (window.innerHeight * PROJECTS.length * 1.8),
  scrub: 0.6,
  onUpdate: (self) => {
    rotTarget = smoothScrollMapping(self.progress, PROJECTS.length);
  }
});
```

### ✅ 2. 字母拆分动画

**可用于你的项目标题入场效果：**

```javascript
function splitTextToLetters(element) {
  const text = element.textContent;
  element.innerHTML = '';
  
  [...text].forEach((char, i) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? ' ' : char;
    span.style.display = 'inline-block';
    span.style.opacity = '0';
    element.appendChild(span);
  });
  
  // GSAP stagger 动画
  gsap.to(element.children, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    stagger: 0.02,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: element,
      start: 'top 80%'
    }
  });
}

// 使用
document.querySelectorAll('.work-title').forEach(splitTextToLetters);
```

### ❌ 3. 2D 堆叠切换

**不建议替换你的 3D 转子：**
- 理由：失去技术亮点，面试时无法展示 WebGL 能力
- 建议：保留 3D 转子，仅借鉴滚动映射逻辑

---

## 七、优化你的转子的建议

### 7.1 借鉴 Ricardo 的滚动节奏

**当前问题：**
- 你的转子每张卡 1.8vh 滚动距离
- 用户可能感觉滚动太长

**优化方案：**
```javascript
// 调整为更紧凑的节奏
const STAGE = {
  SCROLL_PER_CARD: 1.2, // 从 1.8 降到 1.2（减少33%滚动距离）
  // 其他参数保持不变
};

// ScrollTrigger end 计算
end: '+=' + (window.innerHeight * ((n - 1) * 1.2 + 0.25))
```

### 7.2 增加卡片停留时间

**借鉴 Ricardo 的 easing：**
- Ricardo：每张卡在正中停留 50% 的时间
- 你的：通过 `segmentEase` 已实现类似效果

**进一步优化：**
```javascript
// 增加停留区间（从 35% 提升到 45%）
function segmentEase(p, cards) {
  const seg = p * (cards - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  
  // 调整缓动曲线：前45%/后45% 几乎静止，中间10%快速翻转
  let fe;
  if (f < 0.45) {
    fe = 0.05 * (f / 0.45); // 慢速启动
  } else if (f < 0.55) {
    fe = 0.05 + 0.9 * ((f - 0.45) / 0.1); // 快速翻转
  } else {
    fe = 0.95 + 0.05 * ((f - 0.55) / 0.45); // 慢速停止
  }
  
  return (i + fe) * STAGE.STEP;
}
```

---

## 八、实现建议

### 方案 A：保持现状（推荐）

**不做任何改动，原因：**
1. ✅ 你的 3D 转子技术含量更高
2. ✅ 视觉效果更震撼
3. ✅ 面试时更有谈资

### 方案 B：微调优化（可选）

**仅借鉴以下细节：**
1. ✅ 优化滚动节奏（减少滚动距离）
2. ✅ 增加卡片停留时间（调整 easing）
3. ✅ 项目标题添加字母拆分动画

**工作量：1-2 小时**

### 方案 C：混合实现（不推荐）

**在 3D 转子基础上叠加 2D 文字层：**
- ❌ 复杂度高，两套系统需要同步
- ❌ 性能开销大
- ❌ 维护成本高

---

## 九、最终结论

### Ricardo 网站的核心技术

**滚动交互的本质：**
1. **ScrollTrigger Pin** → 固定区域在视口
2. **滚动进度映射** → scrollYProgress 转为卡片索引
3. **Opacity 动画** → 平滑淡入淡出
4. **字母 Stagger** → 逐个显现效果
5. **600vh 占位** → 提供滚动空间

**可复用评估：**
- ✅ 滚动映射逻辑：100% 可用
- ✅ 字母拆分动画：100% 可用
- ❌ 2D 堆叠切换：不建议（会失去你的技术特色）

### 对你的项目的建议

**最佳方案：保留 3D 转子 + 微调滚动节奏**

```javascript
// 只需修改这两个参数
const STAGE = {
  SCROLL_PER_CARD: 1.2,  // 从 1.8 改为 1.2（更紧凑）
  STEP: 90,              // 保持不变
  // ... 其他参数不变
};
```

**理由：**
- Ricardo 的交互是**标准 ScrollTrigger 用法**，技术含量一般
- 你的 WebGL 转子是**顶点级形变**，CSS 做不到
- 面试时讲解 Shader + 弹簧物理 > 讲解 opacity 动画

---

**结论：Ricardo 的滚动交互可以借鉴节奏和细节，但不建议替换你的核心技术。** 🎯
