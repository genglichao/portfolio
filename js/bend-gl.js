/* ============================================================
 * bend-gl.js — WebGL 版速度驱动弯曲（卡片四条边都起伏）
 * API: applyBendGL(container, options) → Promise<{ destroy }>
 *      失败（无 WebGL / three 加载失败 / 贴图失败）时 reject，由调用方降级到 bend-scroll.js 切片版
 *
 * 架构：
 *   卡片 DOM 照常在文档流中布局（负责尺寸、点击、两侧文案），只隐藏其 .card-bg；
 *   一块 position:fixed 的透明 canvas 盖在视口上，每帧读取卡片 getBoundingClientRect，
 *   在顶点着色器中把平面网格映射到卡片的视口像素位置，再施加全局视口曲率场。
 *
 * 变形（b = 弯曲量，由 BendMotion 驱动器给出，与切片版手感完全一致）：
 *   横向：x' = cx + (x - cx)·(1 + b·(1 - dy²))   dy = 顶点在视口中的归一化 Y  ← 与切片版相同
 *   纵向：y' = cy + (y - cy)·(1 + b·Y_GAIN)
 *   纵向项以视口中心为基准整体缩放：b>0 时上下边向外张开，b<0 时向内收缩，
 *   每条水平边保持笔直、整条平移（不弯成弧线）。离视口中心越远的边位移越大；
 *   卡片间距随之等比缩放，不会互相重叠。
 * ============================================================ */
(function (global) {
  'use strict';

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

  /* WebGL 版独有参数；运动参数（OUT_MAX / IN_MAX / 弹簧 / 回弹等）沿用 BendMotion.DEFAULTS */
  var GL_DEFAULTS = {
    Y_GAIN:   0.3,   // 纵向张开/收缩强度（相对横向）：到达极限时高度 ×(1 ± 0.40×0.3) = ±12%
    RADIUS:   16,    // 卡片圆角（CSS px），与 .card-bg 的 border-radius 一致
    SEGMENTS: 32,    // 网格细分（横竖各 32 段），保证弧线平滑
  };

  var VERT = [
    'uniform vec4 uRect;      // 卡片 DOM 矩形（视口 CSS px）：left, top, width, height',
    'uniform vec2 uViewport;  // 视口尺寸（CSS px）',
    'uniform float uBend;',
    'uniform float uYGain;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  // 平面顶点 → 视口像素坐标（y 向下）',
    '  vec2 p = vec2(uRect.x + uv.x * uRect.z, uRect.y + (1.0 - uv.y) * uRect.w);',
    '  vec2 c = uViewport * 0.5;',
    '  float dy = clamp((p.y - c.y) / c.y, -1.3, 1.3);',
    '  // 横向：与切片版一致，视口中线处最宽/窄，越靠视口上下边缘越趋于不变',
    '  p.x = c.x + (p.x - c.x) * (1.0 + uBend * (1.0 - dy * dy));',
    '  // 纵向：以视口中心为基准整体张开/收缩，每条水平边保持笔直、整条平移',
    '  p.y = c.y + (p.y - c.y) * (1.0 + uBend * uYGain);',
    '  gl_Position = vec4(p.x / uViewport.x * 2.0 - 1.0, 1.0 - p.y / uViewport.y * 2.0, 0.0, 1.0);',
    '}',
  ].join('\n');

  var FRAG = [
    'uniform sampler2D uMap;',
    'uniform vec4 uRect;',
    'uniform float uImgAR;    // 贴图宽高比',
    'uniform float uRadius;',
    'varying vec2 vUv;',
    '// 等价于 background-size:cover + background-position:center',
    'vec2 coverUv(vec2 uv) {',
    '  float cardAR = uRect.z / uRect.w;',
    '  vec2 s = cardAR > uImgAR ? vec2(1.0, uImgAR / cardAR) : vec2(cardAR / uImgAR, 1.0);',
    '  return (uv - 0.5) * s + 0.5;',
    '}',
    '// 圆角矩形 SDF（卡片本地像素坐标，变形前），1px 抗锯齿',
    'float roundedAlpha(vec2 uv) {',
    '  vec2 size = uRect.zw;',
    '  vec2 q = abs((uv - 0.5) * size) - size * 0.5 + uRadius;',
    '  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;',
    '  return clamp(0.5 - d, 0.0, 1.0);',
    '}',
    'void main() {',
    '  vec3 col = texture2D(uMap, coverUv(vUv)).rgb;',
    '  // 复刻 .card-bg::before 的 135° 压暗渐变：左上 0.3 → 右下 0.1',
    '  float t = (vUv.x + (1.0 - vUv.y)) * 0.5;',
    '  col *= 1.0 - mix(0.3, 0.1, t);',
    '  gl_FragColor = vec4(col, roundedAlpha(vUv));',
    '}',
  ].join('\n');

  function loadTexture(loader, url) {
    return new Promise(function (resolve, reject) {
      loader.load(url, resolve, undefined, reject);
    });
  }

  function applyBendGL(container, options) {
    var M = global.BendMotion;
    if (!M) return Promise.reject(new Error('BendMotion 未加载（需先引入 bend-scroll.js）'));
    var C = M.merge(M.merge(M.DEFAULTS, GL_DEFAULTS), options);

    var probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) {
      return Promise.reject(new Error('当前环境不支持 WebGL'));
    }

    var cards = Array.prototype.slice.call(container.children);
    var urls = cards.map(function (card) { return card.getAttribute('data-cover'); });
    if (!cards.length || urls.some(function (u) { return !u; })) {
      return Promise.reject(new Error('存在未配置 coverImg 的卡片，WebGL 版无法渲染渐变占位'));
    }

    var canvas = null, renderer = null, geo = null, items = [];
    var rafId = null, destroyed = false;

    function destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      container.classList.remove('is-gl');
      items.forEach(function (it) { it.material.dispose(); it.texture.dispose(); });
      if (geo) geo.dispose();
      if (renderer) renderer.dispose();
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    var uViewport = { value: null };
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      uViewport.value.set(w, h);
    }

    return import(THREE_URL).then(function (THREE) {
      canvas = document.createElement('canvas');
      canvas.className = 'bend-gl-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);

      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);

      var scene = new THREE.Scene();
      var camera = new THREE.Camera(); // gl_Position 在着色器内直接算出，相机不参与
      geo = new THREE.PlaneGeometry(1, 1, C.SEGMENTS, C.SEGMENTS);
      uViewport.value = new THREE.Vector2();
      var uBend = { value: 0 };
      var maxAniso = renderer.capabilities.getMaxAnisotropy();
      var loader = new THREE.TextureLoader();

      return Promise.all(urls.map(function (u) { return loadTexture(loader, u); }))
        .then(function (textures) {
          if (destroyed) return;
          items = textures.map(function (tex, i) {
            tex.anisotropy = maxAniso;
            var material = new THREE.ShaderMaterial({
              vertexShader: VERT,
              fragmentShader: FRAG,
              transparent: true,
              uniforms: {
                uMap:      { value: tex },
                uRect:     { value: new THREE.Vector4() },
                uImgAR:    { value: tex.image.width / tex.image.height },
                uRadius:   { value: C.RADIUS },
                uYGain:    { value: C.Y_GAIN },
                uBend:     uBend,
                uViewport: uViewport,
              },
            });
            var mesh = new THREE.Mesh(geo, material);
            mesh.frustumCulled = false; // 顶点位置由着色器决定，包围盒无意义
            scene.add(mesh);
            return { card: cards[i], mesh: mesh, material: material, texture: tex };
          });

          resize();
          window.addEventListener('resize', resize);

          var driver = M.createDriver(C);
          var wasVisible = true;

          function tick(now) {
            if (destroyed) return;
            rafId = requestAnimationFrame(tick);
            uBend.value = driver.step(now);

            /* 卡片列整体不在视口内时不渲染（清空一次后跳过） */
            var vh = uViewport.value.y;
            var tr = container.getBoundingClientRect();
            var visible = tr.bottom > -vh * 0.5 && tr.top < vh * 1.5;
            if (!visible) {
              if (wasVisible) renderer.clear();
              wasVisible = false;
              return;
            }
            wasVisible = true;

            items.forEach(function (it) {
              var r = it.card.getBoundingClientRect();
              it.material.uniforms.uRect.value.set(r.left, r.top, r.width, r.height);
            });
            renderer.render(scene, camera);
          }

          /* 先同步画一帧再隐藏 DOM 背景，避免切换瞬间闪白 */
          tick(performance.now());
          container.classList.add('is-gl');
          return { destroy: destroy };
        });
    }).catch(function (err) {
      destroy();
      throw err;
    });
  }

  global.applyBendGL = applyBendGL;

}(window));
