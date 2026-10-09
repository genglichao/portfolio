# Ricardo Chance 滚动效果实现方案

> 目标：一比一还原 Ricardo 网站 Featured Work 区域的滚动交互效果
> 视频参考：/Users/michael_ggg/Downloads/20260930224034.mp4

---

## 一、核心效果描述（基于视频分析）

### 1.1 用户操作 → 视觉反馈

**滚动行为：**
- 用户向下滚动鼠标滚轮
- 内容区域**固定在视口中央**（ScrollTrigger pin）
- 项目卡片/文字**垂直向上移动**，跟随滚动距离
- **不是淡入淡出**，而是**连续的位移动画**
- 每张卡片从底部进入 → 中央停留 → 顶部离开

### 1.2 可能的扭曲变形效果

根据你提到的"扭曲变形"，推测可能是：
1. **透视效果**（perspective）：卡片向上移动时有近大远小的效果
2. **3D 旋转**（rotateX）：卡片进入/离开时有轻微的 X 轴旋转
3. **Scale 缩放**：中央卡片放大，两端卡片缩小
4. **模糊效果**（blur）：非当前卡片模糊化

需要通过视频逐帧分析确认具体是哪种效果。

---

## 二、技术实现方案

### 2.1 DOM 结构

```html
<section class="works-stage" id="works-stage">
  <div class="works-stage-scroll-container">
    <!-- 固定在视口的可视区域 -->
    <div class="works-stage-viewport">
      
      <!-- 卡片容器：所有卡片垂直堆叠，通过 transform translateY 控制位置 -->
      <div class="works-cards-track" id="works-cards-track">
        
        <!-- 卡片1 -->
        <div class="work-card" data-index="0">
          <div class="work-card-content">
            <h3 class="work-card-title">EditLoop</h3>
            <p class="work-card-desc">AI 剪辑协作系统</p>
          </div>
        </div>
        
        <!-- 卡片2 -->
        <div class="work-card" data-index="1">
          <!-- ... -->
        </div>
        
        <!-- 卡片3 -->
        <div class="work-card" data-index="2">
          <!-- ... -->
        </div>
        
      </div>
      
    </div>
  </div>
  
  <!-- 滚动空间占位符（提供滚动距离）-->
  <div class="works-stage-spacer"></div>
</section>
```

### 2.2 CSS 关键样式

```css
/* 舞台容器：固定在视口 */
.works-stage {
  position: relative;
  height: 100vh; /* ScrollTrigger pin 的固定高度 */
  width: 100vw;
  overflow: hidden;
}

/* 可视区域 */
.works-stage-viewport {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1200px; /* 透视效果（如果需要）*/
}

/* 卡片轨道：垂直堆叠 */
.works-cards-track {
  position: relative;
  width: min(900px, 80vw);
  height: 100vh;
  will-change: transform;
}

/* 单张卡片 */
.work-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 60vh; /* 卡片高度 */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #1a5a5a, #0d3d3d);
  will-change: transform, opacity;
}

/* 滚动占位符：提供滚动距离 */
.works-stage-spacer {
  height: 400vh; /* 4 张卡片 × 每卡 100vh */
}
```

### 2.3 JavaScript 滚动逻辑

```javascript
// 初始化
const track = document.getElementById('works-cards-track');
const cards = document.querySelectorAll('.work-card');
const cardCount = cards.length;

// ScrollTrigger: pin 舞台，映射滚动进度
ScrollTrigger.create({
  trigger: '.works-stage',
  start: 'top top',
  end: `+=${window.innerHeight * cardCount}`,
  pin: '.works-stage-viewport',
  scrub: true,
  onUpdate: (self) => {
    const progress = self.progress; // 0 → 1
    updateCardsPosition(progress);
  }
});

// 根据滚动进度更新卡片位置
function updateCardsPosition(progress) {
  const viewportHeight = window.innerHeight;
  const cardHeight = viewportHeight * 0.6; // 卡片高度 60vh
  const spacing = viewportHeight; // 每张卡间隔 100vh
  
  cards.forEach((card, i) => {
    // 计算卡片的垂直偏移
    // progress = 0 时，卡片0 在中央，其他在下方
    // progress = 1 时，最后一张在中央，其他在上方
    const baseY = i * spacing; // 初始堆叠位置
    const scrollOffset = progress * (cardCount - 1) * spacing; // 滚动偏移
    const finalY = baseY - scrollOffset; // 最终 Y 位置
    
    // 转换为相对于视口中央的偏移
    const centerY = (viewportHeight - cardHeight) / 2;
    const translateY = finalY - centerY;
    
    // 应用变换
    card.style.transform = `translateY(${translateY}px)`;
    
    // 可选：添加透视/缩放效果
    const distanceFromCenter = Math.abs(finalY - viewportHeight / 2);
    const scale = 1 - Math.min(1, distanceFromCenter / viewportHeight) * 0.2;
    const opacity = 1 - Math.min(1, distanceFromCenter / viewportHeight) * 0.6;
    
    card.style.transform = `translateY(${translateY}px) scale(${scale})`;
    card.style.opacity = opacity;
  });
}
```

---

## 三、实现步骤

### 步骤 1：备份现有代码
- ✅ 保存当前 main.js（含 WebGL 转子）
- ✅ 保存当前 index.html（Works 区域）
- ✅ 保存当前 style.css（Works 样式）

### 步骤 2：修改 HTML 结构
- 🔄 替换 `<div class="works-stage">` 内部结构
- 🔄 移除 WebGL canvas 和转子相关 DOM
- 🔄 添加新的卡片轨道结构

### 步骤 3：修改 CSS 样式
- 🔄 移除 WebGL 转子样式（.works-gl, .works-drum）
- 🔄 添加新的卡片轨道样式
- 🔄 添加透视/变形效果（如需要）

### 步骤 4：修改 JavaScript 逻辑
- 🔄 移除 initWorksStageGL() 函数
- 🔄 移除 initWorksStage() CSS 转子函数
- 🔄 添加新的 initRicardoScrollEffect() 函数
- 🔄 保留 renderWorks() 作为移动端降级

### 步骤 5：测试与调优
- ⏳ 本地预览滚动效果
- ⏳ 对比视频，调整参数（速度、缩放、透视）
- ⏳ 确认移动端降级正常

---

## 四、待确认问题

### 问题 1：卡片内容
- [ ] 只显示项目标题？
- [ ] 还是显示完整信息（标题 + 描述 + 标签）？
- [ ] 参考视频：Ricardo 只显示项目名称（/nk.studio）

### 问题 2：扭曲变形具体效果
- [ ] 透视效果（perspective + translateZ）？
- [ ] 3D 旋转（rotateX）？
- [ ] 缩放（scale）？
- [ ] 模糊（filter: blur）？
- **需要查看视频确认**

### 问题 3：字母拆分动画
- [ ] 是否需要实现字母逐个显示效果？
- [ ] 还是简单的整体移动？

---

## 五、下一步

**等待超哥确认后开始实现：**
1. 我先逐帧分析视频 `/Users/michael_ggg/Downloads/20260930224034.mp4`，确认具体的变形效果
2. 根据视频还原卡片内容布局（是否只显示标题）
3. 开始修改代码

**或者：**
如果网络恢复，我可以重新访问 Ricardo 网站，实时滚动测试，记录每个滚动位置的 DOM 状态。
