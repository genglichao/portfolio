/* ============================================================
 * main.js —— 渲染、交互与动效
 * 依赖：js/data.js（PROJECTS）、GSAP + ScrollTrigger、Lenis（均为 CDN，可降级）
 * ============================================================ */
(function () {
  'use strict';

  /* 滚动条宽度（px）暴露给 CSS：100vw 含滚动条，而布局坐标不含，
   * 卡片文案要靠它精确对齐到页面左边距线（见 .card-caption-left） */
  function publishScrollbarWidth() {
    var w = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--sbw', w + 'px');
  }
  publishScrollbarWidth();
  window.addEventListener('resize', publishScrollbarWidth);

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var animEnabled = hasGsap && !prefersReduced;

  if (animEnabled) {
    document.documentElement.classList.add('anim');
    if (window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
  }

  /* ---------------- 工具 ---------------- */
  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }
  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function coverStyle(item) {
    // 优先使用图片，未配置图片时用渐变占位
    if (item.coverImg) return "background-image:url('" + esc(item.coverImg) + "');";
    if (item.cover) return 'background-image:' + item.cover + ';';
    return 'background:#222;';
  }

  var ARROW_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg>';

  /* ---------------- 流程图渲染 ---------------- */
  function flowNodesHtml(nodes) {
    return (nodes || []).map(function (n, i) {
      var item = typeof n === 'string' ? { t: n } : n;
      var arrow = i > 0 ? '<div class="flow-arrow">↓</div>' : '';
      return arrow + '<div class="flow-node' + (item.decision ? ' flow-node-decision' : '') + '">' + esc(item.t) + '</div>';
    }).join('');
  }

  function buildFlow(flow) {
    var html = '<div class="md-flow">';
    flow.forEach(function (blk, bi) {
      if (bi > 0) html += '<div class="flow-arrow flow-arrow-big">↓</div>';
      if (blk.note) html += '<p class="flow-link-label">' + esc(blk.note) + '</p>';
      if (blk.stage) {
        html += '<div class="flow-stage tone-' + (blk.tone || 'plain') + '">' +
          '<p class="flow-stage-name">' + esc(blk.stage) + '</p>' + flowNodesHtml(blk.nodes) + '</div>';
      } else if (blk.paths) {
        html += '<div class="flow-branch">' + blk.paths.map(function (p) {
          return '<div class="flow-stage tone-' + (p.tone || 'plain') + '">' +
            '<p class="flow-stage-name">' + esc(p.name) + '</p>' + flowNodesHtml(p.nodes) + '</div>';
        }).join('') + '</div>';
      }
    });
    html += '</div>';
    return html;
  }

  /* ---------------- 渲染项目列表 ---------------- */
  function renderWorks() {
    var list = document.getElementById('works-list');
    if (!list || typeof PROJECTS === 'undefined') return;

    PROJECTS.forEach(function (p, i) {
      var num = ('0' + (i + 1)).slice(-2);
      var article = el('article', 'work');
      article.setAttribute('data-reveal', '');
      article.id = 'work-' + p.id;

      var mediaKind = p.media && p.media.kind;
      var hasLink = mediaKind === 'link' && p.media.url;
      var hasBoards = mediaKind === 'board' && ((p.media.boards || []).length || p.media.video);
      var liveCta = hasLink
        ? '<a class="btn btn-accent" href="' + esc(p.media.url) + '" target="_blank" rel="noopener" data-magnetic>访问线上站点 ' + ARROW_SVG + '</a>' +
          (p.media.urlNote ? '<span class="link-note">' + esc(p.media.urlNote) + '</span>' : '')
        : '';
      var detailCtaLabel = hasBoards ? '查看展板与详情' : '查看案例详情';

      article.innerHTML =
        '<div class="work-cover-wrap" data-cursor-label="查看" data-open="' + p.id + '">' +
          '<div class="work-cover" style="' + coverStyle(p) + '">' +
            (p.coverImg ? '' : '<span class="work-num">' + num + '</span>') +
          '</div>' +
        '</div>' +
        '<div class="work-info">' +
          '<div class="work-top">' +
            '<span class="work-type">' + esc(p.typeLabel) + '</span>' +
            '<span class="work-year">' + esc(p.year) + '</span>' +
          '</div>' +
          '<h3 class="work-title"><a href="#work-' + p.id + '" data-open="' + p.id + '">' + esc(p.title) + '</a></h3>' +
          '<p class="work-desc">' + esc(p.desc) + '</p>' +
          '<p class="work-metric">' + esc(p.metric) + '</p>' +
          '<ul class="work-tags">' + p.tags.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
          '<div class="work-actions">' +
            '<button class="btn" data-magnetic data-open="' + p.id + '">' + detailCtaLabel + '</button>' +
            liveCta +
          '</div>' +
        '</div>';

      list.appendChild(article);
    });
  }

  /* ---------------- Works 舞台：WebGL 柔性卡片转子（对齐 nk.studio 技术链路） ----------------
   * 两层系统：
   *  1. 位置层（滚动量驱动）：卡片绕水平轴公转，ScrollTrigger pin + 分段 ease
   *  2. 形变层（滚动速度驱动）：卡片弯成圆柱面，弯曲量 ∝ 滚动速度，方向随滚动方向，
   *     停止滚动后弹簧回弹到平面矩形 —— 顶点级形变，CSS 做不到，走 WebGL
   * 降级链：three 加载失败 / 无 WebGL → CSS 刚性转子 → 经典列表
   */
  var stageState = { active: -1 };

  var STAGE = {
    STEP: 90,             // 相邻卡圆心角（度）：切换瞬间角度和，静止时邻卡完全侧立不可见（对齐参考视频测量）
    RADIUS_K: 1.0,        // 转子半径 = 卡高 × 1.0（≈ 40% 视口高，参考视频反推值）
    SCROLL_PER_CARD: 1.8, // 每张卡的滚动行程（屏）
    BEND_K: 0.08,         // 滚动速度 → 弯曲目标 的比例（提高灵敏度，让慢速滚动也出明显弯曲）
    BEND_STIFF: 0.22,     // 弯曲弹簧刚度（提高响应速度，更跟手）
    BEND_DAMP: 0.68,      // 弹簧阻尼（略低于临界，回弹带轻微弹性感）
  };

  function syncCaption() {
    var p = PROJECTS[stageState.active];
    if (!p) return;
    var nameEl = document.getElementById('stage-name');
    var numEl = document.getElementById('stage-num');
    var metricEl = document.getElementById('stage-metric');
    var sideEl = document.getElementById('stage-side');
    var cta = document.getElementById('stage-cta');
    var shortName = p.title.split('·')[0].trim();
    cta.setAttribute('data-open', p.id);
    numEl.textContent = ('0' + (stageState.active + 1)).slice(-2);
    nameEl.textContent = shortName;
    if (metricEl) metricEl.textContent = p.metric || '';
    if (sideEl) sideEl.textContent = p.typeLabel + ' · ' + p.year;
    gsap.fromTo([numEl, nameEl, metricEl, cta].filter(Boolean),
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.05, overwrite: true });
  }

  function setStageCaptionTotal(n) {
    var totalEl = document.getElementById('stage-total');
    if (totalEl) totalEl.textContent = '/ ' + ('0' + n).slice(-2);
  }

  // 分段 easeInOutCubic：每张卡前 35%/后 35% 几乎停在正位，中段快速翻转（停留:过渡 ≈ 3:1）
  function segmentEase(p, cards) {
    var seg = p * (cards - 1);
    var i = Math.floor(seg);
    var f = seg - i;
    var fe = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
    return (i + fe) * STAGE.STEP;
  }

  function createStageScrollTrigger(stage, onUpdate) {
    var n = PROJECTS.length;
    return window.ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: function () { return '+=' + Math.round(window.innerHeight * ((n - 1) * STAGE.SCROLL_PER_CARD + 0.25)); },
      pin: true,
      scrub: 0.6,
      onUpdate: function (self) { onUpdate(self.progress); },
    });
  }

  /* ---------- WebGL 转子 ---------- */
  function initWorksStageGL() {
    var canvas = document.getElementById('works-gl');
    if (!canvas) return Promise.resolve(false);
    var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return Promise.resolve(false);

    return import('https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js')
      .then(function (THREE) {
        var stage = document.getElementById('works-stage');
        var drum = document.getElementById('works-drum');
        var n = PROJECTS.length;

        var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        var camera = new THREE.PerspectiveCamera(45, 1, 1, 8000);
        var scene = new THREE.Scene();
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');

        // 桶形畸变着色器（对齐 ricardochance.com 实现）
        var barrelVertexShader = `
          uniform float uBarrelStrength;
          uniform float uBarrelScale;
          uniform float uBarrelEdgeLift;
          uniform float uMeshX;
          uniform float uMeshWidth;
          uniform float uViewportWidth;

          varying vec2 vUv;

          const float M_PI = 3.14159265;

          vec3 globalViewportBarrelY(vec3 pos) {
            float vertexWorldX = uMeshX + pos.x * uMeshWidth;
            float normalizedX = clamp(vertexWorldX / (uViewportWidth * 0.5), -1.0, 1.0);
            float distFromCenter = abs(normalizedX);

            float pinchAtX = cos(distFromCenter * M_PI * 0.5);
            float edgeAtX = 1.0 - pinchAtX;
            float s = uBarrelStrength * uBarrelScale;

            pos.y *= 1.0 - pinchAtX * s;
            pos.y *= 1.0 + edgeAtX * s * uBarrelEdgeLift;

            return pos;
          }

          void main() {
            vUv = uv;
            vec3 pos = globalViewportBarrelY(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `;

        var barrelFragmentShader = `
          uniform sampler2D map;
          varying vec2 vUv;

          void main() {
            gl_FragColor = texture2D(map, vUv);
          }
        `;

        // 无封面项目：渐变 + 序号 兜底纹理
        function fallbackTexture(THREE, idx) {
          var c = document.createElement('canvas');
          c.width = 800; c.height = 500;
          var ctx = c.getContext('2d');
          var g = ctx.createLinearGradient(0, 0, 800, 500);
          g.addColorStop(0, '#1d2440'); g.addColorStop(1, '#0e1220');
          ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 500);
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.font = '600 130px Georgia, serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('0' + (idx + 1), 400, 260);
          var t = new THREE.CanvasTexture(c);
          t.colorSpace = THREE.SRGBColorSpace;
          return t;
        }

        var root = new THREE.Group();
        scene.add(root);
        var meshes = [];
        var state = { w: 0, h: 0, cardW: 0, cardH: 0, radius: 0, axisY: 0 };

        // 全局 barrel uniforms（所有卡片共享）
        var barrelUniforms = {
          uBarrelStrength: { value: 0.0 },
          uBarrelScale: { value: 0.28 },
          uBarrelEdgeLift: { value: 0.42 },
          uViewportWidth: { value: 0 },
        };

        function buildCards() {
          meshes.forEach(function (m) { root.remove(m.pivot); m.geometry.dispose(); m.material.dispose(); });
          meshes = [];
          var cardW = Math.min(1000, state.w * 0.66);
          var cardH = cardW / 2.75;
          var radius = cardH * STAGE.RADIUS_K;
          state.cardW = cardW; state.cardH = cardH; state.radius = radius;
          state.axisY = state.h * -0.065;
          barrelUniforms.uViewportWidth.value = state.w;

          var CARD_AR = cardW / cardH;
          PROJECTS.forEach(function (p, i) {
            var geo = new THREE.PlaneGeometry(cardW, cardH, 1, 24);
            var tex;
            var mesh;
            if (p.coverImg) {
              tex = loader.load(p.coverImg, function (t) {
                var imgAR = t.image.width / t.image.height;
                if (imgAR > CARD_AR) {
                  t.repeat.set(CARD_AR / imgAR, 1);
                  t.offset.set((1 - CARD_AR / imgAR) / 2, 0);
                } else {
                  t.repeat.set(1, imgAR / CARD_AR);
                  t.offset.set(0, (1 - imgAR / CARD_AR) / 2);
                }
                if (mesh) mesh.visible = true;
              });
              tex.colorSpace = THREE.SRGBColorSpace;
            } else {
              tex = fallbackTexture(THREE, i);
            }

            // 使用 ShaderMaterial + barrel 着色器
            var mat = new THREE.ShaderMaterial({
              vertexShader: barrelVertexShader,
              fragmentShader: barrelFragmentShader,
              uniforms: {
                map: { value: tex },
                uBarrelStrength: barrelUniforms.uBarrelStrength,
                uBarrelScale: barrelUniforms.uBarrelScale,
                uBarrelEdgeLift: barrelUniforms.uBarrelEdgeLift,
                uMeshX: { value: 0 },
                uMeshWidth: { value: cardW },
                uViewportWidth: barrelUniforms.uViewportWidth,
              },
              side: THREE.FrontSide,
            });

            mesh = new THREE.Mesh(geo, mat);
            mesh.visible = !p.coverImg;
            mesh.position.set(0, 0, radius);
            var pivot = new THREE.Group();
            pivot.position.set(0, state.axisY, -radius);
            pivot.add(mesh);
            root.add(pivot);
            meshes.push({
              pivot: pivot, mesh: mesh, geometry: geo, material: mat,
              h: cardH, id: p.id,
            });
          });
        }

        function layout() {
          state.w = stage.clientWidth;
          state.h = stage.clientHeight;
          renderer.setSize(state.w, state.h, false);
          camera.aspect = state.w / state.h;
          camera.updateProjectionMatrix();
          // 让 z=0 平面 1 world = 1 px
          camera.position.set(0, 0, (state.h / 2) / Math.tan(camera.fov * Math.PI / 360));
          buildCards();
        }

        // 更新全局 barrel 强度（所有卡片共享）
        // b ∈ [-1, 1]：滚动速度驱动，停止回 0
        function applyBend(m, b) {
          barrelUniforms.uBarrelStrength.value = b;
          // 更新每张卡片在全局视口中的 X 坐标
          var worldPos = new THREE.Vector3();
          m.mesh.getWorldPosition(worldPos);
          m.material.uniforms.uMeshX.value = worldPos.x - state.cardW / 2;
        }

        // ---- 驱动状态 ----
        var rotCur = 0, rotTarget = 0;
        var bendCur = 0, bendVel = 0, velRaw = 0;

        if (lenis) {
          lenis.on('scroll', function (e) { velRaw = e.velocity || 0; });
        } else {
          var lastY = window.scrollY;
          window.addEventListener('scroll', function () {
            velRaw = (window.scrollY - lastY);
            lastY = window.scrollY;
          }, { passive: true });
        }

        var st = null;
        function attachScroll() {
          // 必须在 CSS 转子的 ScrollTrigger 被 kill 之后再调用：
          // 两个 pin 同时作用于同一 stage 会互相争 pin-spacer，造成频闪/跳动
          st = createStageScrollTrigger(stage, function (progress) {
            rotTarget = segmentEase(progress, n);
          });
        }

        var D2R = Math.PI / 180;

        gsap.ticker.add(function () {
          // 弯曲目标：滚动速度驱动，停止即回 0
          // velRaw > 0：向下滚动（内凹）；velRaw < 0：向上滚动（外凸）
          var target = Math.max(-1, Math.min(1, velRaw * STAGE.BEND_K));
          velRaw *= 0.8;
          bendVel += (target - bendCur) * STAGE.BEND_STIFF;
          bendVel *= STAGE.BEND_DAMP;
          bendCur += bendVel;

          rotCur += (rotTarget - rotCur) * 0.18;

          meshes.forEach(function (m, i) {
            var theta = (i * STAGE.STEP - rotCur) * D2R;
            m.pivot.rotation.x = theta;
            // 视野内的卡才施加弯曲，bendCur 直接传入（已归一化到 [-1, 1]）
            applyBend(m, Math.abs(theta) < 1.65 ? bendCur : 0);
          });

          var idx = Math.min(n - 1, Math.max(0, Math.round(rotCur / STAGE.STEP)));
          if (idx !== stageState.active) {
            stageState.active = idx;
            syncCaption();
          }
          var rect = stage.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            renderer.render(scene, camera);
          }
        });

        layout();
        window.addEventListener('resize', layout);

        // 点击：raycaster 命中卡片 → 打开对应详情
        var raycaster = new THREE.Raycaster();
        var pointer = new THREE.Vector2();
        canvas.addEventListener('click', function (e) {
          var r = canvas.getBoundingClientRect();
          pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
          pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          var hits = raycaster.intersectObjects(meshes.map(function (m) { return m.mesh; }));
          if (hits.length) {
            var hit = meshes.find(function (m) { return m.mesh === hits[0].object; });
            if (hit) openModal(hit.id);
          }
        });

        return { attachScroll: attachScroll, teardown: function () { if (st) st.kill(); } };
      })
      .catch(function (err) {
        console.warn('[works-gl] fallback to CSS drum:', err);
        return false;
      });
  }

  /* ---------- CSS 刚性转子（WebGL 不可用时的降级） ---------- */
  function renderWorksStage() {
    var drum = document.getElementById('works-drum');
    if (!drum) return;
    drum.innerHTML = '';
    PROJECTS.forEach(function (p) {
      var panel = el('div', 'drum-panel');
      panel.setAttribute('style', coverStyle(p));
      panel.setAttribute('data-open', p.id);
      panel.setAttribute('data-cursor-label', '查看');
      panel.innerHTML = '<span class="drum-shade" aria-hidden="true"></span>';
      drum.appendChild(panel);
    });
  }

  function initWorksStage() {
    var stage = document.getElementById('works-stage');
    var drum = document.getElementById('works-drum');
    if (!stage || !drum || !window.ScrollTrigger) return null;

    stage.hidden = false;
    renderWorksStage();
    var panels = Array.prototype.slice.call(drum.children);
    var shades = panels.map(function (panel) { return panel.firstChild; });
    var n = panels.length;
    if (!n) return null;
    setStageCaptionTotal(n);

    var STEP = STAGE.STEP;
    var radius = 900;
    var currentRot = 0;

    function layout() {
      var h = panels[0].getBoundingClientRect().height || stage.clientHeight * 0.55;
      radius = (h / 2 + 84) / Math.sin((STEP / 2) * Math.PI / 180);
      panels.forEach(function (panel) {
        gsap.set(panel, {
          xPercent: -50, yPercent: -50,
          transformOrigin: '50% 50% ' + (-radius) + 'px',
          force3D: true,
        });
      });
    }

    function render() {
      panels.forEach(function (panel, i) {
        var net = i * STEP - currentRot;
        gsap.set(panel, { rotationX: -net });
        var d = Math.abs(net);
        var shade = Math.min(0.65, Math.max(0, (d - 18) / 55));
        shades[i].style.opacity = shade.toFixed(3);
      });
      var idx = Math.min(n - 1, Math.max(0, Math.round(currentRot / STEP)));
      if (idx !== stageState.active) {
        stageState.active = idx;
        syncCaption();
      }
    }

    layout();
    render();

    var st = createStageScrollTrigger(stage, function (progress) {
      currentRot = segmentEase(progress, n);
      render();
    });

    window.addEventListener('resize', function () { layout(); render(); });
    stageState.active = -1;
    render();
    return { st: st, teardown: function () { st.kill(); } };
  }

  /* ---------------- 项目详情弹层 ---------------- */
  var modal = document.getElementById('project-modal');
  var modalBody = document.getElementById('modal-body');
  var lenis = null;

  function buildDetail(p) {
    var html = '';
    var heroStyle = p.heroImg
      ? "background-image:url('" + esc(p.heroImg) + "');"
      : coverStyle(p);
    html += '<div class="md-hero' + ((p.heroImg || p.coverImg) ? ' has-image' : '') + '" style="' + heroStyle + '">' +
      '<p class="md-type">' + esc(p.typeLabel) + ' · ' + esc(p.year) + '</p>' +
      '<h2 class="md-title">' + esc(p.title) + '</h2>' +
      '</div>';

    html += '<div class="md-content">';

    if (p.detail.meta && p.detail.meta.length) {
      var metaHtml = p.detail.meta.map(function (m) {
        return '<div><dt>' + esc(m[0]) + '</dt><dd>' + esc(m[1]) + '</dd></div>';
      }).join('');
      // 有线上链接时在 meta 区放「访问线上站点」实心按钮
      if (p.media && p.media.kind === 'link' && p.media.url) {
        metaHtml += '<div class="md-meta-cta-cell"><a class="md-meta-live" href="' + esc(p.media.url) +
          '" target="_blank" rel="noopener">访问线上站点 ' + ARROW_SVG + '</a>' +
          (p.media.urlNote ? '<span class="link-note">' + esc(p.media.urlNote) + '</span>' : '') + '</div>';
      }
      html += '<dl class="md-meta">' + metaHtml + '</dl>';
    }

    html += '<p class="md-overview">' + esc(p.detail.overview) + '</p>';

    // 脱敏声明（实习项目涉敏感信息时使用）
    if (p.detail.note) {
      html += '<p class="md-note">' + esc(p.detail.note) + '</p>';
    }

    // 关键数据带：面试官 10 秒扫到核心数字
    if (p.detail.metrics && p.detail.metrics.length) {
      html += '<div class="md-metrics">' + p.detail.metrics.map(function (m) {
        return '<div class="md-metric"><span class="md-metric-value">' + esc(m.value) + '</span>' +
          '<span class="md-metric-label">' + esc(m.label) + '</span></div>';
      }).join('') + '</div>';
    }

    // 产品演示视频：紧跟数据带，先看到产品再读故事
    if (p.media && p.media.video) {
      var posterAttr = p.media.video.poster ? ' poster="' + esc(p.media.video.poster) + '"' : '';
      html += '<div class="md-section"><h3>产品演示 / Demo</h3>' +
        '<figure class="md-video">' +
        '<video controls preload="none" playsinline' + posterAttr + ' src="' + esc(p.media.video.src) + '"></video>' +
        '<figcaption>' + esc(p.media.video.caption || '') + '</figcaption>' +
        '</figure></div>';
    }

    // 项目展板 / 产品界面：紧跟演示视频，完整材料先看到
    if (p.media && p.media.kind === 'board' && p.media.boards && p.media.boards.length) {
      var boardsTitle = p.media.wideBoards ? '产品界面 / Screens' : '项目展板 / Boards';
      var boardsHint = p.media.wideBoards ? '关键界面截图，点击查看大图' : '完整展板大图，点击查看';
      html += '<div class="md-section"><h3>' + boardsTitle + '</h3><p class="md-board-hint">' + boardsHint +
        '</p><div class="md-boards' + (p.media.wideBoards ? ' md-boards-wide' : '') + '">';
      (p.media.boards).forEach(function (b, bi) {
        html += '<div class="md-board" data-board="' + bi + '" style="' + coverStyle(b) + '">' +
          '<span>' + esc(b.caption || '') + '</span></div>';
      });
      html += '</div></div>';
    }

    // 叙事区块：支持 paras / cards / steps / figure / list 组合
    (p.detail.sections || []).forEach(function (s) {
      html += '<div class="md-section"><h3>' + esc(s.title) + '</h3>';
      (s.paras || []).forEach(function (t) { html += '<p>' + esc(t) + '</p>'; });
      if (s.flow) html += buildFlow(s.flow);
      if (s.cards && s.cards.length) {
        html += '<div class="md-cards">' + s.cards.map(function (c, ci) {
          return '<div class="md-card"><span class="md-card-num">' + ('0' + (ci + 1)).slice(-2) + '</span>' +
            '<span class="md-card-name">' + esc(c.name) + '</span>' +
            '<span class="md-card-desc">' + esc(c.desc) + '</span></div>';
        }).join('') + '</div>';
      }
      if (s.steps && s.steps.length) {
        html += '<ol class="md-steps">' + s.steps.map(function (st, si) {
          return '<li class="md-step"><span class="md-step-num">' + (si + 1) + '</span>' +
            '<div><span class="md-step-name">' + esc(st.name) + '</span>' +
            '<span class="md-step-desc">' + esc(st.desc) + '</span></div></li>';
        }).join('') + '</ol>';
      }
      (s.parasAfter || []).forEach(function (t) { html += '<p>' + esc(t) + '</p>'; });
      if (s.figure && s.figure.img) {
        html += '<figure class="md-figure' + (s.figure.narrow ? ' md-figure-narrow' : '') + '" data-cursor-label="放大">' +
          '<img src="' + esc(s.figure.img) + '" alt="' + esc(s.figure.caption || '') + '" loading="lazy">' +
          (s.figure.caption ? '<figcaption>' + esc(s.figure.caption) + '</figcaption>' : '') +
          '</figure>';
      }
      if (s.list && s.list.length) {
        html += '<ul>' + s.list.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
      }
      html += '</div>';
    });

    // 线上链接 CTA（meta 区已有按钮时不重复渲染）
    if (p.media && p.media.kind === 'link' && p.media.url && !p.media.ctaInMeta) {
      html += '<div class="md-section md-cta"><a class="btn btn-accent" href="' + esc(p.media.url) +
        '" target="_blank" rel="noopener" data-magnetic>访问线上站点 ' + ARROW_SVG + '</a>' +
        (p.media.urlNote ? '<span class="link-note">' + esc(p.media.urlNote) + '</span>' : '') + '</div>';
    }

    html += '</div>';
    return html;
  }

  function openModal(id) {
    var p = PROJECTS.find(function (x) { return x.id === id; });
    if (!p || !modal) return;
    modalBody.innerHTML = buildDetail(p);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    modalBody.scrollTop = 0;
    // 锁背景滚动：不停 Lenis（stop 会拦截弹层内部滚轮），锁 html + body 即可
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // 视频文件缺失时降级为占位提示
    var video = modalBody.querySelector('video');
    if (video) {
      video.addEventListener('error', function () {
        var fig = video.closest('.md-video');
        if (fig) {
          var empty = el('div', 'md-video-empty', '演示视频暂未上传 —— 将 mp4 文件放入 assets/ 并在 js/data.js 中配置路径即可');
          fig.replaceChild(empty, video);
        }
      });
    }

    // 展板点击查看完整大图
    modalBody.querySelectorAll('[data-board]').forEach(function (board) {
      board.addEventListener('click', function () {
        var b = (p.media.boards || [])[Number(board.getAttribute('data-board'))];
        openLightbox(b);
      });
    });

    // 过程配图点击放大
    modalBody.querySelectorAll('.md-figure img').forEach(function (img) {
      img.addEventListener('click', function () {
        var fig = img.closest('.md-figure');
        var cap = fig.querySelector('figcaption');
        openLightbox({ coverImg: img.getAttribute('src'), caption: cap ? cap.textContent : '' });
      });
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    var video = modalBody.querySelector('video');
    if (video) video.pause();
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open]');
    if (opener) {
      e.preventDefault();
      openModal(opener.getAttribute('data-open'));
      return;
    }
    if (e.target.closest('[data-close-modal]')) closeModal();
    if (e.target.closest('[data-close-lightbox]') || e.target.closest('.lightbox-content')) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(); closeLightbox(); }
  });

  /* ---------------- Lightbox ---------------- */
  var lightbox = document.getElementById('lightbox');
  var lightboxContent = document.getElementById('lightbox-content');

  function openLightbox(board) {
    if (!lightbox || !board) return;
    // 有图时用 <img> 完整显示（contain 不裁切），无图时用渐变色块
    if (board.coverImg) {
      lightboxContent.innerHTML = '<img src="' + esc(board.coverImg) + '" alt="' + esc(board.caption || '展板大图') + '">';
    } else {
      lightboxContent.innerHTML = '<div class="lightbox-board" style="' + coverStyle(board) + '"></div>';
    }
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
  }

  /* ---------------- Lenis 平滑滚动 ---------------- */
  if (!prefersReduced && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({
      duration: 1.15,
      smoothWheel: true,
      // 弹层/灯箱内的滚轮事件交给原生滚动，Lenis 不接管
      prevent: function (node) {
        return !!(node.closest && node.closest('.modal-body, .lightbox'));
      },
    });
    // 暴露到全局，让 bend-scroll.js 可以读取真实速度
    window.lenis = lenis;
    if (hasGsap && window.ScrollTrigger) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      var rafLoop = function (t) { lenis.raf(t); requestAnimationFrame(rafLoop); };
      requestAnimationFrame(rafLoop);
    }
  }

  // 锚点跳转走 Lenis
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -70 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------------- 导航滚动态 ---------------- */
  var nav = document.getElementById('nav');
  function onScroll() {
    var y = lenis ? lenis.scroll : window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
  }
  if (lenis) lenis.on('scroll', onScroll);
  else window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- GSAP 动效 ---------------- */
  function initAnims() {
    if (!animEnabled) return;

    // 过场 + 首屏入场
    var intro = document.getElementById('intro');
    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to(intro, { yPercent: -100, duration: 0.9, delay: 0.55, ease: 'power4.inOut' })
      .set(intro, { display: 'none' })
      .to('.hero-title .line-inner', { y: 0, duration: 1.1, stagger: 0.12 }, '-=0.45')
      .to('.hero [data-reveal]', { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, '-=0.7');

    // 通用滚动进场
    if (window.ScrollTrigger) {
      gsap.utils.toArray('[data-reveal]').forEach(function (node) {
        if (node.closest('.hero')) return; // hero 已在时间轴中处理
        gsap.to(node, {
          opacity: 1, y: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: node, start: 'top 86%' },
        });
      });

      // 封面视差
      gsap.utils.toArray('.work-cover').forEach(function (cover) {
        gsap.fromTo(cover, { yPercent: -4 }, {
          yPercent: 4, ease: 'none',
          scrollTrigger: { trigger: cover.closest('.work'), start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });

      // 首屏装饰视差：背景大字下移、照片轻微上浮
      gsap.to('.hero-bg-word', {
        yPercent: 26, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero-visual', {
        yPercent: -8, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
    }
  }

  /* ---------------- 磁吸按钮 ---------------- */
  function initMagnetic() {
    if (!finePointer || prefersReduced) return;
    document.addEventListener('mousemove', function (e) {
      var btn = e.target.closest('[data-magnetic]');
      document.querySelectorAll('[data-magnetic]').forEach(function (m) {
        if (m !== btn) { m.style.transform = ''; return; }
        var r = m.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        m.style.transform = 'translate(' + dx * 0.18 + 'px,' + dy * 0.18 + 'px)';
      });
    });
  }

  /* ---------------- 自定义光标 ---------------- */
  function initCursor() {
    if (!finePointer || prefersReduced) return;
    document.body.classList.add('custom-cursor');
    var dot = document.getElementById('cursor-dot');
    var ring = document.getElementById('cursor-ring');
    var label = document.getElementById('cursor-label');
    var rx = -100, ry = -100, tx = -100, ty = -100;

    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      dot.style.left = tx + 'px'; dot.style.top = ty + 'px';

      var labelEl = e.target.closest('[data-cursor-label]');
      var interactive = e.target.closest('a, button, .md-board');
      if (labelEl) {
        ring.classList.add('has-label');
        ring.classList.remove('is-active');
        label.textContent = labelEl.getAttribute('data-cursor-label');
      } else {
        ring.classList.remove('has-label');
        ring.classList.toggle('is-active', !!interactive);
      }
    });

    (function follow() {
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(follow);
    })();
  }

  /* ---------------- Ricardo 风格垂直滚动舞台 ----------------
   * 架构（对齐 ricardochance.com 真实实现）：
   *   普通文档流卡片列 + bend-scroll.js 叠加视口曲率弯曲
   *   不做任何 GSAP pin / yPercent 动画 —— 滚动就是原生滚动
   * --------------------------------------------------------- */
  function initRicardoStage() {
    var stage = document.getElementById('works-stage-ricardo');
    var track = document.getElementById('works-cards-track');
    if (!stage || !track || typeof PROJECTS === 'undefined') return null;

    stage.hidden = false;

    PROJECTS.forEach(function (p, i) {
      var card = el('div', 'ricardo-card');
      card.setAttribute('data-index', i);
      card.setAttribute('data-open', p.id);
      if (p.coverImg) card.setAttribute('data-cover', p.coverImg); // 供 bend-gl.js 加载贴图

      var bgImg = p.coverImg
        ? "url('" + esc(p.coverImg) + "')"
        : (p.cover || 'linear-gradient(135deg, #1d2440, #0e1220)');

      var shortName = p.cardTitle || p.title.split('·')[0].trim();
      var keyTags = (p.tags || []).slice(0, 3);

      /* 结构说明：
       *  .card-bg             → 背景图与圆角（内层 overflow:hidden，不影响弯曲溢出）
       *  .card-caption-left   → 卡片左侧文案：项目名 + 关键标签
       *  .card-caption-cta    → 卡片右侧「查看详情」按钮，data-open 走全局事件委托
       * 文案层带 data-no-slice：bend-scroll.js 切分时会把它们从克隆体中剔除，
       * 使文案不随卡片弯曲、也不会被复制成 64 份。 */
      card.innerHTML =
        '<div class="card-bg" style="background-image:' + bgImg + ';"></div>' +
        '<div class="card-caption card-caption-left" data-no-slice>' +
          '<p class="card-caption-name">' + esc(shortName) + '</p>' +
          (keyTags.length
            ? '<ul class="card-caption-tags">' + keyTags.map(function (t) {
                return '<li>' + esc(t) + '</li>';
              }).join('') + '</ul>'
            : '') +
        '</div>' +
        '<button type="button" class="card-caption-cta" data-no-slice data-open="' + p.id + '"' +
          ' data-cursor-label="查看详情">查看详情' + ARROW_SVG + '</button>';

      track.appendChild(card);
    });

    /* double-rAF：确保浏览器完成布局后再调用 buildSlices
     * （同步调用时 offsetHeight=0，切片高度全部算错） */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { startBend(track); });
    });

    return { stage: stage };
  }

  /* 弯曲动效降级链：WebGL 版（四边起伏）→ DOM 切片版（仅左右边起伏）
   * URL 加 ?bend=slice 可强制使用切片版，便于对比两版效果 */
  function startBend(track) {
    function useSlices() {
      if (typeof applyBendScroll === 'function') applyBendScroll(track);
    }
    if (/[?&]bend=slice\b/.test(location.search) || typeof applyBendGL !== 'function') {
      useSlices();
      return;
    }
    applyBendGL(track).catch(function (err) {
      console.warn('[bend-gl] fallback to slices:', err);
      useSlices();
    });
  }

  /* ---------------- 启动 ---------------- */
  var stageEligible = animEnabled && finePointer &&
    window.matchMedia('(min-width: 640px)').matches;

  if (stageEligible) {
    var ricardoStage = initRicardoStage();
    if (!ricardoStage) renderWorks();
  } else {
    renderWorks();
  }

  initAnims();
  initMagnetic();
  initCursor();
})();
