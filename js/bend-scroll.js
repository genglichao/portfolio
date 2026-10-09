/* ============================================================
 * bend-scroll.js — 速度驱动弯曲动效（对齐 ricardochance.com）
 * API: applyBendScroll(container, options) → { destroy }
 *
 * 运动模型：
 *   滚动速度（px/s）→ 指数平滑 vs → 目标弯曲 = 极限 × tanh(vs / VEL_REF)
 *     tanh 软饱和：越快越逼近极限，但永不越过；外凸/内凹各有独立极限 OUT_MAX / IN_MAX
 *   弯曲变大（attack）：临界阻尼弹簧，跟手
 *   弯曲变小（release）：指数缓出，先快后慢，时间常数 RELEASE_TAU
 *   视口坐标系 d ∈ [-1,+1]（d=0 视口中线，d=±1 视口上下边缘）
 *   scaleX = 1 + bend * (1 - d²)  ← 视口中线处最宽/窄，越靠上下边缘越趋于不变
 *   下滚 bend>0 → barrel（外凸），上滚 bend<0 → pincushion（内凹）
 *   全部按真实帧间隔计算，60Hz / 120Hz 屏幕手感一致
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---- 默认参数 ---- */
  var DEFAULTS = {
    OUT_MAX:     0.40,   // 外凸极限（下滚）：视口中线处卡片最宽 = 原宽 × 1.40
    IN_MAX:      0.40,   // 内凹极限（上滚）：视口中线处卡片最窄 = 原宽 × 0.60
    VEL_REF:     3000,   // 速度参考值（px/s）：达到该速度时弯曲到极限的 76%，再快只逼近、不越过
    SMOOTH:      0.22,   // 速度指数平滑系数（按 60fps 一帧计）
    STIFFNESS:   100,    // 弯曲变大时的弹簧刚度（临界阻尼 = 2√100 = 20）
    DAMPING:     20,     // 弹簧阻尼（须与刚度配对，保持临界阻尼）
    RELEASE_TAU: 0.5,    // 回弹时间常数（s）：指数缓出，0.5s 收回 63%，约 1.5s 基本复原
    SLICES:      64,     // 水平切片数：64 片使每片高约 9px，相邻片 scaleX 差减半，边缘锯齿不明显
  };

  /* ---- 工具：合并配置 ---- */
  function merge(a, b) {
    var out = {};
    for (var k in a) out[k] = a[k];
    if (b) for (var k2 in b) out[k2] = b[k2];
    return out;
  }

  /* ============================================================
   * buildSlices(card, numSlices)
   * 把 card 切成 numSlices 个水平切片，每片克隆卡片内容
   * 原卡片 opacity:0（保留布局和 pointer-events）
   * 返回 { card, wrapper, slices[] }
   * ============================================================ */
  function buildSlices(card, numSlices) {
    /* 确保 card 有相对/绝对定位，使绝对子元素以其为基准 */
    var cs = window.getComputedStyle(card);
    if (cs.position === 'static') card.style.position = 'relative';

    /* 在设置 opacity 之前克隆，baseClone 内容干净 */
    var baseClone = card.cloneNode(true);
    /* 从克隆体中剔除：
     *  .bend-wrapper  —— 避免无限套娃
     *  [data-no-slice] —— 卡片两侧文案层，不应被复制进每个切片、也不应随卡片弯曲 */
    var staleNodes = baseClone.querySelectorAll('.bend-wrapper, [data-no-slice]');
    for (var wi = 0; wi < staleNodes.length; wi++) {
      staleNodes[wi].parentNode.removeChild(staleNodes[wi]);
    }

    /* 原卡片：不可见但保留布局与事件。
     * 用 visibility:hidden 而非 opacity:0 —— opacity 作用于整棵子树，
     * 绝对子元素无法覆盖；visibility 则允许后代设置 visibility:visible 逃出。 */
    card.style.visibility = 'hidden';

    /* 获取卡片高度 */
    var H = card.offsetHeight || parseInt(cs.height, 10) || 500;
    var sliceH = H / numSlices;

    /* wrapper 绝对覆盖 card，pointer-events:none 不拦截卡片事件 */
    var wrapper = document.createElement('div');
    wrapper.className = 'bend-wrapper';
    wrapper.setAttribute('aria-hidden', 'true');
    /* 把 data-open / data-cursor-label 转移到 wrapper，
     * 原 card 因 visibility:hidden 不接收点击，wrapper 需要自己响应事件委托 */
    var dataOpen = card.getAttribute('data-open');
    if (dataOpen) wrapper.setAttribute('data-open', dataOpen);
    var dataLabel = card.getAttribute('data-cursor-label');
    if (dataLabel) wrapper.setAttribute('data-cursor-label', dataLabel);
    wrapper.style.cssText = [
      'position:absolute', 'top:0', 'left:0',
      'width:100%', 'height:100%',
      /* pointer-events:auto：切片全部 pointer-events:none，点击穿透到此处触发 data-open */
      'cursor:pointer',
      'overflow:visible',
      'visibility:visible',
    ].join(';');
    card.appendChild(wrapper);

    var slices = [];
    for (var k = 0; k < numSlices; k++) {
      /* 切片容器：overflow:hidden 裁剪出对应水平条带 */
      var sl = document.createElement('div');
      sl.className = 'bend-slice';
      sl.setAttribute('aria-hidden', 'true');
      sl.style.cssText = [
        'position:absolute', 'left:0', 'right:0',
        'top:'    + (k * sliceH)  + 'px',
        'height:' + (sliceH + 1)  + 'px',  /* +1px 覆盖亚像素缝隙 */
        'overflow:hidden',
        'transform-origin:50% 50%',
        'will-change:transform',
        'pointer-events:none',
        'backface-visibility:hidden',
      ].join(';');

      /* 克隆卡片内容，向上偏移 k*sliceH 使该片对准切片窗口 */
      var cl = baseClone.cloneNode(true);
      cl.style.cssText = [
        'position:absolute',
        'top:'    + (-k * sliceH) + 'px',
        'left:0', 'width:100%',
        'height:' + H + 'px',
        'opacity:1',
        'pointer-events:none',
        'transform:none',
        'will-change:auto',
      ].join(';');

      sl.appendChild(cl);
      wrapper.appendChild(sl);
      slices.push(sl);
    }

    return { card: card, wrapper: wrapper, slices: slices };
  }

  /* ============================================================
   * createDriver(C) → { step(now) → bend }
   * 运动模型（切片版与 WebGL 版 bend-gl.js 共用，保证两者手感一致）：
   * 读取滚动速度 → 指数平滑 → tanh 软饱和得到目标 → attack 弹簧 / release 缓出，
   * 每帧返回当前弯曲量，且始终落在 [-IN_MAX, OUT_MAX] 内
   * ============================================================ */
  function createDriver(C) {
    var bend   = 0;    // 当前弯曲量
    var bendV  = 0;    // 弯曲变化速度（1/s）
    var vs     = 0;    // 指数平滑滚动速度（px/s）
    var lastY  = window.scrollY;
    var lastNow = 0;

    return {
      step: function (now) {
        /* 真实帧间隔（s）：120Hz 屏每帧更短，夹住上下限防止切后台回来时跳变 */
        var dt = lastNow ? Math.min(1 / 30, Math.max(1 / 240, (now - lastNow) / 1000)) : 1 / 60;
        lastNow = now;

        /* 滚动速度（px/s）：Lenis.velocity 与 scrollY 差值都是「本帧位移 px」，除以 dt 换算 */
        var dy;
        if (window.lenis) {
          dy = window.lenis.velocity || 0;
        } else {
          var curY = window.scrollY;
          dy = curY - lastY;
          lastY = curY;
        }
        var v = dy / dt;

        /* 速度平滑：加速时指数平滑防抖（SMOOTH 按 60fps 一帧定义，换算到实际 dt）；
         * 减速时直接跟随，否则松手瞬间会滞后一拍，回弹的平滑统一交给 release 缓出 */
        if (v * vs >= 0 && Math.abs(v) < Math.abs(vs)) vs = v;
        else vs += (v - vs) * (1 - Math.pow(1 - C.SMOOTH, dt * 60));

        /* 目标弯曲：tanh 软饱和，外凸 / 内凹各自的极限 */
        var n = Math.tanh(vs / C.VEL_REF);
        var target = n >= 0 ? n * C.OUT_MAX : n * C.IN_MAX;

        /* 目标比当前更接近平面（同向或已归零）→ release；否则 → attack */
        var sameSide = target * bend >= 0 || Math.abs(target) < 0.01;
        if (sameSide && Math.abs(target) < Math.abs(bend)) {
          /* release：一阶指数逼近，起步最快、越接近平面越慢（ease-out） */
          var prev = bend;
          bend = target + (bend - target) * Math.exp(-dt / C.RELEASE_TAU);
          bendV = (bend - prev) / dt; // 记下速度，中途重新滚动时弹簧无缝接管
        } else {
          /* attack：临界阻尼弹簧（半隐式欧拉） */
          var acc = -C.STIFFNESS * (bend - target) - C.DAMPING * bendV;
          bendV += acc * dt;
          bend  += bendV * dt;
        }

        /* 硬极限：弹簧过冲也不允许越界 */
        if (bend > C.OUT_MAX) { bend = C.OUT_MAX; if (bendV > 0) bendV = 0; }
        else if (bend < -C.IN_MAX) { bend = -C.IN_MAX; if (bendV < 0) bendV = 0; }

        /* 已基本复原时强制清零，防止浮点漂移（指数缓出的尾巴拖得很长，需要一个收尾阈值） */
        if (Math.abs(target) < 2e-3 && Math.abs(bend) < 2e-3) {
          bend = 0; bendV = 0;
        }
        return bend;
      }
    };
  }

  /* ============================================================
   * applyBendScroll(container, options) → { destroy }
   *
   * container: 卡片的父节点；卡片是其直接子元素
   * options:   覆盖 DEFAULTS 中的任意字段
   * ============================================================ */
  function applyBendScroll(container, options) {
    var C = merge(DEFAULTS, options);

    /* 构建每张卡片的切片 */
    var rawCards = Array.prototype.slice.call(container.children);
    var cardDataList = rawCards
      .filter(function (c) { return !c.classList.contains('bend-wrapper'); })
      .map(function (card) { return buildSlices(card, C.SLICES); });

    var driver = createDriver(C);
    var rafId  = null;
    var destroyed = false;

    /* ---- 将 bend 写入所有切片 ---- */
    function applyBend(b) {
      var halfVh = window.innerHeight * 0.5;

      cardDataList.forEach(function (data) {
        var rect   = data.card.getBoundingClientRect();
        var sliceH = (data.card.offsetHeight || Math.max(rect.height, C.SLICES * 20)) / C.SLICES;

        data.slices.forEach(function (sl, k) {
          /* 全局视口曲率场：d 由切片在视口中的 Y 位置决定。
           * d=0 → 视口中心（弯曲最多），d=±1 → 视口上下边缘（趋向不变）。
           * 4 张卡共享同一个场，整体像一块内容在同一曲率下变形，
           * 而不是每张卡各自独立弯曲。
           * b>0(下滚) → barrel(外凸)，b<0(上滚) → pincushion(内凹) */
          var cy = rect.top + (k + 0.5) * sliceH;
          var d  = Math.max(-1.3, Math.min(1.3, (cy - halfVh) / halfVh));
          var sx = 1 + b * (1 - d * d);
          sl.style.transform = 'scaleX(' + sx.toFixed(5) + ')';
        });
      });
    }

    /* ---- rAF 主循环 ---- */
    function tick(now) {
      if (destroyed) return;
      rafId = requestAnimationFrame(tick);
      applyBend(driver.step(now));
    }

    rafId = requestAnimationFrame(tick);

    /* ---- 销毁（可选清理） ---- */
    return {
      destroy: function () {
        destroyed = true;
        if (rafId) cancelAnimationFrame(rafId);
        cardDataList.forEach(function (data) {
          data.card.style.visibility = '';
          if (data.wrapper && data.wrapper.parentNode) {
            data.wrapper.parentNode.removeChild(data.wrapper);
          }
        });
      }
    };
  }

  /* 挂载到全局；BendMotion 供 bend-gl.js 复用同一套参数与运动模型 */
  global.applyBendScroll = applyBendScroll;
  global.BendMotion = { DEFAULTS: DEFAULTS, merge: merge, createDriver: createDriver };

}(window));
