/* A read-only exhibition. Optional sections stay absent until real content is supplied. */
globalThis.OrbitGrandArchiveView = (() => {
  const core = globalThis.OrbitGrandArchiveCore;
  function text(tag, value, cls = '') { const n = document.createElement(tag); n.textContent = String(value || ''); n.className = cls; return n; }
  function image(data, eager = false) {
    if (!data || !core.imagePath.test(data.src)) return null;
    const figure = document.createElement('figure'), img = document.createElement('img');
    img.alt = String(data.alt || '作品图像'); img.width = data.width; img.height = data.height; img.loading = eager ? 'eager' : 'lazy'; img.decoding = 'async';
    const sources = (data.sources || []).filter(s => core.imagePath.test(s.src) && Number.isInteger(s.width) && s.width > 0 && s.width <= 10000);
    if (sources.length) { img.sizes = eager ? '(max-width: 700px) calc(100vw - 48px), 66vw' : '(max-width: 700px) calc(100vw - 48px), 776px'; img.srcset = sources.map(s => `${s.src} ${s.width}w`).join(', '); }
    img.src = data.src;
    img.onerror = () => { img.hidden = true; if (!figure.querySelector('[data-error]')) { const p = text('p', '图像暂时无法载入，作品文字仍可阅读。', 'jup-caption'); p.dataset.error = ''; figure.prepend(p); } };
    figure.append(img); if (data.caption) figure.append(text('figcaption', data.caption, 'jup-caption')); return figure;
  }
  function blocks(target, content) {
    target.replaceChildren();
    for (const b of content || []) {
      if (b.type === 'code') {
        const figure = document.createElement('figure'); figure.className = 'jup-code';
        const label = text('figcaption', ['javascript', 'python'].includes(b.language) ? b.language : 'text');
        const pre = document.createElement('pre'), code = text('code', b.text); pre.tabIndex = 0; pre.setAttribute('aria-label', '代码片段，可横向滚动'); pre.append(code); figure.append(label, pre); target.append(figure);
      } else if (['paragraph', 'heading', 'quote'].includes(b.type)) target.append(text(b.type === 'heading' ? 'h3' : b.type === 'quote' ? 'blockquote' : 'p', b.text));
    }
  }
  function external(value, label, repository = false) {
    const safe = core.safeUrl(value, repository); if (!safe) return null;
    const a = text('a', label); a.href = safe; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  function publicCatalog() {
    return {
      mercury: (window.ORBIT_LABORATORY?.projects || []).filter(p => p.visibility === 'published'),
      earth: window.ORBIT_PHOTOGRAPHY?.works || [],
      mars: [...(window.ORBIT_FRONTIER?.experiments || []), ...(window.ORBIT_FRONTIER?.challenges || []), ...(window.ORBIT_FRONTIER?.observations || [])].filter(p => p.visibility === 'published'),
      saturn: (window.ORBIT_CHRONICLES?.records || []).filter(p => p.status === 'published'),
      neptune: (window.ORBIT_WRITINGS?.articles || []).filter(p => p.status === 'published')
    };
  }
  return {text, image, blocks, external, publicCatalog};
})();

window.createJupiterArchive = function(data) {
  const core = globalThis.OrbitGrandArchiveCore, view = globalThis.OrbitGrandArchiveView;
  const works = data.works.filter(w => w.visibility === 'published' && w.status === 'completed').sort((a, b) => a.displayOrder - b.displayOrder || b.completedAt.localeCompare(a.completedAt) || a.slug.localeCompare(b.slug));
  const featured = works.filter(w => w.featured), first = featured[0] || works[0];
  const root = document.createElement('section'); root.id = 'jupiterWorld'; root.className = 'jupiter-world'; root.hidden = true; root.tabIndex = -1; root.setAttribute('aria-label', '万象 · 综合作品陈列馆');
  root.innerHTML = `<a class="jup-skip" href="#jupiterExhibition">跳到精选展览</a>
    <header class="jup-header"><button class="jup-brand" data-home>万象。<span>JUPITER / THE GRAND ARCHIVE</span></button><nav aria-label="万象导航"><button data-jump="jupiterExhibition">精选展览</button><button data-jump="jupiterCollection">作品档案</button><button data-return>← 返回 ORBIT</button></nav></header>
    <main data-index><section class="jup-foyer"><div class="jup-hero-copy"><p class="jup-caption">综合作品陈列馆</p><h1>万象。</h1><p class="jup-subtitle">让想象，<br>拥有真实的形状。</p><p class="jup-intro">这里收藏那些从一个念头出发，<br>最终成为真实作品的创造。</p><button class="jup-enter" data-jump="jupiterExhibition">进入展览 ↗</button></div>
    <div class="jup-stage"><div class="jup-stage-empty" data-stage-empty><span class="jup-caption">展陈空间 / 留待首件作品</span><p>让空白，<br>等待真实的创造。</p><span class="jup-caption">作品完成后，再认真陈列。</span></div><div data-stage-image hidden></div><div class="jup-stage-meta" data-stage-meta></div></div></section>
    <section class="jup-section" id="jupiterExhibition"><header class="jup-section-head"><div><p class="jup-caption">01 / 精选展览</p><h2>每一件作品，<br>都有自己的空间。</h2></div><p>从想法，到完成。<br>只收录可以认真呈现的成果。</p></header><div data-exhibits></div></section>
    <section class="jup-section" id="jupiterCollection"><header class="jup-section-head"><div><p class="jup-caption">02 / 作品档案</p><h2>创作的来路，<br>也值得被看见。</h2></div><p class="jup-caption" data-count role="status"></p></header><div data-collection></div></section></main>
    <main class="jup-reader" data-reader hidden><button data-catalog>← 返回作品档案</button><article><header class="jup-work-header"><p class="jup-caption" data-meta></p><h1 data-title tabindex="-1"></h1><p class="jup-work-subtitle" data-subtitle></p><p class="jup-summary" data-summary></p><ul class="jup-tech" data-tech aria-label="作品技术栈"></ul></header><div data-cover></div><div class="jup-prose" data-prose></div><section class="jup-gallery" data-gallery-section hidden><h2>作品影像</h2><div data-gallery></div></section><section class="jup-video" data-video-section hidden><h2>项目视频</h2><div data-video></div></section><aside class="jup-links" data-links hidden></aside><section class="jup-relations" data-relations-section hidden><h2>星系关联</h2><div data-relations></div></section></article><nav class="jup-work-nav" aria-label="作品切换"><button data-prev>← 上一件作品</button><button data-next>下一件作品 →</button></nav></main>
    <footer class="jup-footer"><p>让每一次完成，<br>被认真看见。</p><button data-return>← 返回 ORBIT</button></footer>`;
  document.body.append(root); const $ = s => root.querySelector(s), viewport = document.querySelector('meta[name=viewport]');
  let portal = null, active = false, heroLoaded = false, catalogTop = 0, pendingSection = null, home = false, savedViewport = '';
  function openLink(work, label = work.title) {
    const a = view.text('a', label); a.href = '#/jupiter/work/' + encodeURIComponent(work.slug);
    a.onclick = e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); catalogTop = root.scrollTop; portal.detail(work.slug); }; return a;
  }
  function empty(target, heading, body) {
    const section = document.createElement('div'); section.className = 'jup-empty'; section.append(view.text('h3', heading), view.text('p', body)); target.append(section);
  }
  function loadHero() {
    if (heroLoaded || !first) return; heroLoaded = true;
    const cover = view.image(first.coverImage, true);
    if (cover) { $('[data-stage-image]').append(cover); $('[data-stage-image]').hidden = false; $('[data-stage-empty]').hidden = true; }
    else { $('[data-stage-empty]>p').textContent = first.title; $('[data-stage-empty]>.jup-caption:first-child').textContent = '作品封面尚未提供'; $('[data-stage-empty]>.jup-caption:last-child').textContent = first.category + ' / ' + first.completedAt; }
    $('[data-stage-meta]').append(openLink(first, first.title + ' ↗'));
  }
  if (!featured.length) empty($('[data-exhibits]'), '展厅已留白，等待作品入馆。', works.length ? '精选作品尚未选定，可以先翻阅下方的完整作品档案。' : '目前尚未收录已确认完成的综合作品。等它拥有真实的形状，再为它留下一整个空间。');
  for (const [i, work] of featured.entries()) {
    const row = document.createElement('article'); row.className = 'jup-exhibit';
    const cover = view.image(work.coverImage); if (cover) row.append(cover);
    const meta = document.createElement('div'); meta.className = 'jup-exhibit-caption'; const h = document.createElement('h3'); h.append(openLink(work));
    const info = document.createElement('div'); info.append(view.text('p', String(i + 1).padStart(2, '0') + ' / ' + work.category + ' / ' + work.completedAt, 'jup-caption'), h, view.text('p', work.summary, 'jup-description'), openLink(work, '走近作品 ↗')); meta.append(info); row.append(meta); $('[data-exhibits]').append(row);
  }
  if (!works.length) empty($('[data-collection]'), '第一份作品档案，留给真实的完成。', '背景、设计、实现与思考，会随作品一起被保存。');
  $('[data-count]').textContent = works.length ? works.length + ' 件公开作品' : '尚未收录作品';
  for (const work of works) {
    const row = document.createElement('article'); row.className = 'jup-collection-row'; const h = document.createElement('h3'); h.append(openLink(work));
    row.append(view.text('p', work.category, 'jup-caption'), h); const time = view.text('time', work.completedAt, 'jup-caption'); time.dateTime = work.completedAt; row.append(time, openLink(work, '查看档案 ↗')); $('[data-collection]').append(row);
  }
  function showIndex() {
    const fromReader = !$('[data-reader]').hidden; $('[data-reader]').hidden = true; $('[data-index]').hidden = false; loadHero(); document.title = '万象。 · JUPITER / THE GRAND ARCHIVE';
    catalogTop = home ? 0 : pendingSection ? $('#' + pendingSection).offsetTop : fromReader ? (catalogTop || $('#jupiterCollection').offsetTop) : catalogTop;
    root.scrollTo({top: catalogTop, behavior: 'auto'}); home = false; pendingSection = null;
  }
  function showWork(slug) {
    const work = works.find(w => w.slug === slug); $('[data-index]').hidden = true; $('[data-reader]').hidden = false; root.scrollTo({top: 0, behavior: 'auto'});
    for (const selector of ['[data-tech]', '[data-cover]', '[data-prose]', '[data-gallery]', '[data-video]', '[data-links]', '[data-relations]']) $(selector).replaceChildren();
    for (const selector of ['[data-gallery-section]', '[data-video-section]', '[data-links]', '[data-relations-section]']) $(selector).hidden = true;
    $('[data-title]').textContent = work ? work.title : '这件作品暂未公开。'; $('[data-meta]').textContent = work ? work.category + ' / 完成于 ' + work.completedAt : '未找到公开作品';
    $('[data-subtitle]').textContent = work?.subtitle || ''; $('[data-subtitle]').hidden = !work?.subtitle; $('[data-summary]').textContent = work ? work.summary : '请返回作品档案，选择已公开的作品。'; document.title = work ? work.title + ' · 万象' : '未找到作品 · 万象';
    if (work) {
      for (const name of work.technologies) $('[data-tech]').append(view.text('li', name)); const cover = view.image(work.coverImage); if (cover) $('[data-cover]').append(cover);
      for (const [key, heading] of Object.entries(core.sections)) {
        const content = (work.description?.[key] || []).filter(b => typeof b.text === 'string' && b.text.trim()); if (!content.length) continue;
        const section = document.createElement('section'); section.dataset.chapter = key; section.append(view.text('h2', heading)); const body = document.createElement('div'); view.blocks(body, content); section.append(body); $('[data-prose]').append(section);
      }
      for (const item of work.gallery || []) { const figure = view.image(item); if (figure) $('[data-gallery]').append(figure); }
      $('[data-gallery-section]').hidden = !$('[data-gallery]').children.length;
      if (work.video) {
        const poster = view.image(work.video.poster); if (poster) $('[data-video]').append(poster);
        const link = view.external(work.video.url, (work.video.label || '观看项目视频') + ' ↗'); if (link) $('[data-video]').append(link);
        $('[data-video-section]').hidden = !$('[data-video]').children.length;
      }
      for (const a of [view.external(work.demoUrl, '打开作品演示 ↗'), view.external(work.repositoryUrl, '查看 GitHub 仓库 ↗', true)]) if (a) $('[data-links]').append(a);
      $('[data-links]').hidden = !$('[data-links]').children.length;
      const catalog = view.publicCatalog(), names = {mercury: '初序', venus: '演绎', earth: '人间', mars: '拓荒', saturn: '年轮', neptune: '深蓝'};
      for (const relation of work.relatedPlanets || []) {
        const hash = core.relatedRoute(relation, catalog); if (!hash) continue;
        const a = view.text('a', (relation.label ? relation.label + ' / ' : '') + names[relation.planet] + ' ↗'); a.href = hash;
        a.onclick = e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); portal.leaveTo(hash); }; $('[data-relations]').append(a);
      }
      $('[data-relations-section]').hidden = !$('[data-relations]').children.length;
    }
    const i = works.indexOf(work); for (const [selector, offset] of [['[data-prev]', -1], ['[data-next]', 1]]) { const next = work && works[i + offset], b = $(selector); b.hidden = !next; if (next) b.onclick = () => portal.detail(next.slug, true); }
    $('[data-title]').focus({preventScroll: true});
  }
  function jump(id) { if (!$('[data-reader]').hidden) { pendingSection = id; portal.detail(null); } else $('#' + id).scrollIntoView({behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth'}); }
  root.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => jump(b.dataset.jump)); $('.jup-skip').onclick = e => { e.preventDefault(); jump('jupiterExhibition'); $('#jupiterExhibition').tabIndex = -1; $('#jupiterExhibition').focus({preventScroll: true}); };
  $('[data-home]').onclick = () => { if (!$('[data-reader]').hidden) { home = true; portal.detail(null); } else root.scrollTo({top: 0, behavior: 'auto'}); }; $('[data-catalog]').onclick = () => portal.detail(null); root.querySelectorAll('[data-return]').forEach(b => b.onclick = () => portal.requestClose());
  root.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); if (!$('[data-reader]').hidden) portal.detail(null); else portal.requestClose(); }
    if (e.key === 'Tab') { const all = [...root.querySelectorAll('button:not(:disabled),a[href],pre[tabindex]')].filter(n => n.getClientRects().length), first = all[0], last = all.at(-1); if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
  });
  return {root, connect: p => portal = p, activate(slug) {
    if (!active) { active = true; savedViewport = viewport?.content || ''; viewport?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover'); }
    if (slug) showWork(slug); else showIndex();
  }, deactivate() { active = false; catalogTop = 0; pendingSection = null; home = false; $('[data-reader]').hidden = true; $('[data-index]').hidden = false; if (viewport && savedViewport) viewport.content = savedViewport; }};
};
