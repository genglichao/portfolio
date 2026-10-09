# Ricardo Chance Featured Work 交互效果技术分析

> 分析时间：2026-10-01
> 原网站：https://www.ricardochance.com/
> 分析对象：Featured Work 区域的滚动切换效果

---

## 一、核心技术实现

### 1.1 技术架构

**Ricardo 网站使用的技术栈：**
- Next.js (React 框架)
- Three.js (WebGL2 渲染)
- **Framer Motion**（模块化导入，未暴露全局变量）
- Lenis 平滑滚动
- Tailwind CSS

**关键发现：**
- ❌ 不使用 GSAP + ScrollTrigger
- ✅ 使用 Framer Motion 的 scroll 动画
- ✅ WebGL Canvas 只用于背景渐变层（不渲染项目卡片）

### 1.2 DOM 结构

```html
<!-- Section 2: 项目名称切换区（固定在视口） -->
<section class="container relative z-10">
  <div class="grid grid-cols-12">
    <!-- 左侧：FEATURED WORK 标题 -->
    <div class="col-span-9">
      <h2>FEATURED WORK</h2>
    </div>
    
    <!-- 中间：项目名称堆叠（关键！）-->
    <div class="grid col-start-1">
      <div style="grid-area: 1 / 1" class="s-split-lines">
        /nk.studio
      </div>
      <div style="grid-area: 1 / 1" class="s-split-lines">
        Flixxo
      </div>
      <div style="grid-area: 1 / 1" class="s-split-lines">
        Suku
      </div>
    </div>
    
    <!-- 右侧：See live 链接 -->
    <div class="sticky">See live</div>
  </div>
</section>

<!-- Section 3: 滚动空间占位（600vh 高度）-->
<section class="h-[600vh] hidden tablet-portrait:block">
  <!-- 空内容，只用于创建滚动距离 -->
</section>

<!-- WebGL 背景层（全屏固定）-->
<div class="gl-gradient fixed inset-0 z-0 opacity-60">
  <canvas width="1425" height="900"></canvas>
</div>

<!-- WebGL 顶层效果（全屏固定）-->
<div class="fixed top-0 left-0 z-2 h-screen w-screen">
  <canvas width="1440" height="900"></canvas>
</div>
```

---

## 二、实现原理详解

### 2.1 核心技巧：CSS Grid 堆叠 + Framer Motion

**三张卡片通过 `grid-area: 1 / 1` 堆叠在同一位置：**

```css
.card-stack {
  display: grid;
}

.card {
  grid-area: 1 / 1; /* 所有卡片占据同一网格单元 */
}
```

**滚动时通过 Framer Motion 控制：**
1. **字母拆分动画**（`s-split-lines` 类）
   - 每个字母是独立的 `<div style="display: inline-block">`
   - 滚动进度 → 字母逐个淡入淡出（stagger 错开）

2. **卡片整体透明度/位移**
   - 不同滚动区间激活不同卡片
   - 通过 `useScroll` + `useTransform` 映射滚动进度

### 2.2 Framer Motion 实现（推测）

```jsx
import { motion, useScroll, useTransform } from 'framer-motion'

function FeaturedWork() {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"]
  })
  
  // 三张卡片的激活区间
  const card1Opacity = useTransform(scrollYProgress, [0, 0.15, 0.3], [1, 1, 0])
  const card2Opacity = useTransform(scrollYProgress, [0.25, 0.4, 0.65], [0, 1, 0])
  const card3Opacity = useTransform(scrollYProgress, [0.6, 0.75, 1], [0, 1, 1])
  
  return (
    <section ref={ref} className="h-[600vh]">
      <div className="sticky top-0">
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
    </section>
  )
}
```

### 2.3 项目卡片视觉效果

**渐变背景来源：**
- ❌ 不是 `background-image: radial-gradient(...)`
- ❌ 不是独立的项目卡片图片
- ✅ **全屏 WebGL Canvas 动态渲染**（Three.js Shader）

**实现推测：**
```glsl
// Fragment Shader 伪代码
uniform vec3 color1; // 项目1的主色（青绿色）
uniform vec3 color2; // 项目2的主色（紫色）
uniform float mixRatio; // 滚动进度控制混合比例

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  float dist = distance(uv, vec2(0.65, 0.4)); // 径向渐变中心
  float gradient = 1.0 - smoothstep(0.0, 1.2, dist);
  
  vec3 color = mix(color1, color2, mixRatio); // 根据滚动切换颜色
  gl_FragColor = vec4(color * gradient, 0.6);
}
```

---

## 三、与你的项目对比

| 对比项 | Ricardo 网站 | 你的作品集 WebGL 转子 |
|--------|-------------|---------------------|
| **技术栈** | Framer Motion | GSAP + ScrollTrigger + Three.js |
| **动画驱动** | Framer Motion useScroll | ScrollTrigger scrub |
| **卡片切换** | 2D 堆叠 + opacity | 3D 旋转 + 顶点形变 |
| **视觉效果** | 平面淡入淡出 | 立体弯曲 + 弹簧物理 |
| **渐变实现** | WebGL 全屏背景 | 图片 banner + CSS |
| **技术难度** | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐⭐ |
| **面试价值** | 常规实现 | **技术亮点** |

---

## 四、可复用性分析

### 4.1 完全复用 Ricardo 方案（不推荐）

**需要做的改动：**
1. ✅ 保留 GSAP（你的项目已用，改用 Framer Motion 成本高）
2. ✅ 用 ScrollTrigger 替代 Framer Motion useScroll
3. ✅ 实现 CSS Grid 堆叠 + 字母拆分动画
4. ❌ 需要重写 WebGL Shader（渐变背景动态切换）

**成本评估：**
- 工作量：6–8 小时
- 技术难点：WebGL Shader 编写 + 颜色切换逻辑
- 结果：失去你的 3D 转子特色

### 4.2 部分借鉴（推荐）

**只实现以下元素：**

#### ✅ 1. 自定义光标系统（2小时）
- 十字 + 圆环，`mix-blend-difference` 反色效果
- 与你的项目无冲突，可直接添加

#### ✅ 2. 字母拆分动画（可选，1小时）
- 用于标题或项目名称的入场效果
- GSAP SplitText 插件可实现（需付费）或手动拆分

#### ❌ 3. WebGL 背景渐变（不推荐）
- 你的项目已有 WebGL 转子占用 Canvas
- 再加一层全屏 Canvas 性能开销大

---

## 五、最终建议

### 方案 A：最小改动（强烈推荐）

**只实现自定义光标 + 优化现有转子：**

1. ✅ 添加 Ricardo 风格的自定义光标
2. ✅ 保留你的 WebGL 3D 转子（技术含量更高）
3. ✅ 为转子卡片添加更精细的渐变背景（CSS radial-gradient）
4. ✅ 工作量：2–3 小时

**优势：**
- 借鉴 Ricardo 的交互细节（光标）
- 保留你的技术亮点（WebGL 形变）
- 面试时既能展示审美，又有技术深度

### 方案 B：混合方案（可选）

**在保留转子的基础上，增加字母动画：**

1. ✅ 自定义光标
2. ✅ 3D 转子保留
3. ✅ 项目标题使用字母拆分淡入效果
4. ✅ 工作量：4–5 小时

### 方案 C：完全替换（不推荐）

**彻底模仿 Ricardo 的实现：**
- ❌ 失去 WebGL 3D 转子
- ❌ 技术含量下降
- ❌ 面试时无法展示顶点形变能力

---

## 六、技术要点总结

### 6.1 Ricardo 网站的核心技术

1. **CSS Grid 堆叠** → 卡片占据同一位置
2. **Framer Motion useScroll** → 滚动进度驱动动画
3. **字母拆分** → 每个字符独立动画（stagger）
4. **WebGL 全屏背景** → 动态渐变色切换
5. **600vh 占位 section** → 提供滚动空间

### 6.2 可直接复用的部分

✅ **自定义光标系统**（100% 可复用）
```css
/* 十字光标 */
.cursor-cross {
  position: fixed;
  width: 4px;
  height: 4px;
  mix-blend-mode: difference;
  pointer-events: none;
  z-index: 100000002;
}

/* 圆环光标 */
.cursor-ring {
  position: fixed;
  width: 80px;
  height: 80px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  border-radius: 50%;
  backdrop-filter: blur(1px);
  pointer-events: none;
  z-index: 100000001;
  transform: scale(0);
  transition: transform 0.3s ease;
}

.cursor-ring.is-active {
  transform: scale(1);
}
```

✅ **字母拆分动画**（需适配 GSAP）
```javascript
// GSAP 手动拆分版本
function splitText(element) {
  const text = element.textContent;
  element.innerHTML = '';
  
  [...text].forEach(char => {
    const span = document.createElement('span');
    span.textContent = char;
    span.style.display = 'inline-block';
    span.style.opacity = '0';
    element.appendChild(span);
  });
  
  // GSAP 动画
  gsap.to(element.children, {
    opacity: 1,
    duration: 0.6,
    stagger: 0.03,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: element,
      start: 'top 80%'
    }
  });
}
```

❌ **WebGL 渐变背景**（不建议复用）
- 理由：你的项目已有 WebGL 转子，性能优先

---

## 七、下一步行动

**请超哥确认：**

### 问题 1：是否实现自定义光标？
- [ ] A. 是，完全按照 Ricardo 风格（十字 + 圆环）
- [ ] B. 否，保持现有光标

### 问题 2：是否保留你的 WebGL 3D 转子？
- [ ] A. 是，保留 3D 旋转 + 弯曲形变（推荐）
- [ ] B. 否，替换为 Ricardo 的 2D 堆叠切换

### 问题 3：是否添加字母拆分动画？
- [ ] A. 是，用于项目标题入场效果
- [ ] B. 否，保持现有动画

### 问题 4：是否优化卡片渐变背景？
- [ ] A. 是，用 CSS radial-gradient 增强视觉效果
- [ ] B. 否，保持现有 banner 图

---

## 八、技术债务警告

如果选择完全模仿 Ricardo：

⚠️ **需要处理的问题：**
1. Framer Motion 需要 React 环境（你的项目是纯 JS）
2. 600vh 占位会让移动端体验变差（滚动距离太长）
3. WebGL 双层 Canvas 在低端设备可能掉帧
4. 字母拆分会增加 DOM 节点数量（性能影响）

⚠️ **你的 WebGL 转子的优势：**
1. 顶点级形变（CSS 做不到）
2. 弹簧物理模拟（技术含金量高）
3. 实时响应滚动速度（更有交互感）
4. 3D 空间旋转（视觉冲击力强）

---

**结论：建议采用「方案 A」—— 只实现自定义光标，保留你的技术特色！** 🎯
