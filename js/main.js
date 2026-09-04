/* ============================================================
 * main.js —— 渲染、交互与动效
 * 依赖：js/data.js（PROJECTS）、GSAP + ScrollTrigger、Lenis（均为 CDN，可降级）
 * ============================================================ */
(function () {
  'use strict';

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
        ? '<a class="btn btn-accent" href="' + esc(p.media.url) + '" target="_blank" rel="noopener" data-magnetic>访问线上站点 ' + ARROW_SVG + '</a>'
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
          '" target="_blank" rel="noopener">访问线上站点 ' + ARROW_SVG + '</a></div>';
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
        '" target="_blank" rel="noopener" data-magnetic>访问线上站点 ' + ARROW_SVG + '</a></div>';
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

  /* ---------------- 启动 ---------------- */
  renderWorks();
  initAnims();
  initMagnetic();
  initCursor();
})();
