/* Read-only future manuscripts. All author prose is rendered as inert text. */
globalThis.OrbitFutureView = (() => {
  const core = globalThis.OrbitFutureCore;
  function text(tag, value, cls = '') { const n = document.createElement(tag); n.textContent = String(value || ''); n.className = cls; return n; }
  function blocks(target, content) {
    target.replaceChildren();
    for (const b of content || []) if (['paragraph', 'heading', 'quote'].includes(b.type)) target.append(text(b.type === 'heading' ? 'h3' : b.type === 'quote' ? 'blockquote' : 'p', b.text));
  }
  function sketch(data) {
    if (!data || !core.imagePath.test(data.src)) return null;
    const fig = document.createElement('figure'), img = document.createElement('img'); img.alt = String(data.alt || '构想草图'); img.width = data.width; img.height = data.height; img.loading = 'lazy'; img.decoding = 'async';
    const sources = (data.sources || []).filter(s => core.imagePath.test(s.src) && Number.isInteger(s.width) && s.width > 0 && s.width <= 10000);
    if (sources.length) { img.sizes = '(max-width: 700px) calc(100vw - 48px), 776px'; img.srcset = sources.map(s => `${s.src} ${s.width}w`).join(', '); } img.src = data.src;
    img.onerror = () => { img.hidden = true; if (!fig.querySelector('[data-error]')) { const p = text('p', '草图暂时无法载入，构想文字仍可阅读。', 'ura-caption'); p.dataset.error = ''; fig.prepend(p); } };
    fig.append(img); if (data.caption) fig.append(text('figcaption', data.caption, 'ura-caption')); return fig;
  }
  function publicCatalog() {
    return {
      mercury: (window.ORBIT_LABORATORY?.projects || []).filter(r => r.visibility === 'published'),
      mars: [...(window.ORBIT_FRONTIER?.experiments || []), ...(window.ORBIT_FRONTIER?.challenges || []), ...(window.ORBIT_FRONTIER?.observations || [])].filter(r => r.visibility === 'published'),
      jupiter: (window.ORBIT_GRAND_ARCHIVE?.works || []).filter(r => r.visibility === 'published' && r.status === 'completed')
    };
  }
  return {text, blocks, sketch, publicCatalog};
})();

window.createUranusFuture = function(data) {
  const core = globalThis.OrbitFutureCore, view = globalThis.OrbitFutureView;
  const ideas = data.ideas.filter(r => r.visibility === 'published').sort((a, b) => a.displayOrder - b.displayOrder || b.updatedAt.localeCompare(a.updatedAt) || a.slug.localeCompare(b.slug));
  const root = document.createElement('section'); root.id = 'uranusWorld'; root.className = 'uranus-world'; root.hidden = true; root.tabIndex = -1; root.setAttribute('aria-label', '未央 · 未来构想馆');
  root.innerHTML = `<a class="ura-skip" href="#uranusManuscripts">跳到灵感手稿</a><header class="ura-header"><button class="ura-brand" data-home>未央。<span>URANUS / THE UNWRITTEN FUTURE</span></button><nav aria-label="未央导航"><button data-jump="uranusManuscripts">灵感手稿</button><button data-jump="uranusBlueprints">未来蓝图</button><button data-jump="uranusPossibilities">可能性档案</button><button data-return>← 返回 ORBIT</button></nav></header>
    <main data-index><section class="ura-foyer"><div class="ura-space" aria-hidden="true"><svg viewBox="0 0 1000 740" fill="none"><path d="M350 190L790 65V540L350 685Z" fill="#12303C"/><path d="M415 225L730 138V495L415 594Z" fill="#09131D"/><path d="M350 190L415 225V594L350 685Z" fill="#264952" opacity=".55"/><path d="M350 190L790 65L730 138L415 225Z" fill="#B7D8DB" opacity=".28"/><path d="M415 594L730 495L930 600L560 730Z" fill="#79AFC1" opacity=".08"/><path d="M350 190L790 65V540M415 225L730 138V495L415 594" stroke="#B7D8DB" stroke-opacity=".36"/><path d="M350 685L560 730L930 600" stroke="#79AFC1" stroke-opacity=".2"/></svg></div><div class="ura-foyer-copy"><p class="ura-caption">未来构想馆</p><h1>未央。</h1><p class="ura-subtitle">写给尚未抵达的明天。</p><p class="ura-intro">有些想法尚未成形，<br>有些故事还没有开始。<br>而未来，仍然留有无限可能。</p><button class="ura-enter" data-jump="uranusManuscripts">探索未来构想 ↗</button></div><div class="ura-foyer-foot ura-caption"><span>故事尚未写完。</span><span>抽象空间示意<br>向未写下的部分敞开</span></div></section>
    <section class="ura-section" id="uranusManuscripts"><header class="ura-section-head"><div><p class="ura-caption">01 / 灵感手稿</p><h2>在成形之前，<br>先留下一点回声。</h2></div><p>一个念头，也可以有自己的位置。</p></header><div class="ura-categories" role="group" aria-label="灵感分类"></div><p class="ura-caption" data-manuscript-count role="status"></p><div data-manuscripts></div></section>
    <section class="ura-section ura-blueprints" id="uranusBlueprints"><header class="ura-section-head"><div><p class="ura-caption">02 / 未来蓝图</p><h2>有些远方，<br>还只是一张草图。</h2></div><p>来源、问题与初步设想，<br>都可以慢慢写下。</p></header><div data-blueprints></div></section>
    <section class="ura-section" id="uranusPossibilities"><header class="ura-section-head"><div><p class="ura-caption">03 / 可能性档案</p><h2>不急着决定，<br>也不急着抵达。</h2></div><label class="ura-status-filter">翻阅阶段 <select data-status aria-label="筛选可能性阶段"><option value="全部">全部阶段</option></select></label></header><p class="ura-caption" data-possibility-count role="status"></p><div data-possibilities></div></section></main>
    <main class="ura-reader" data-reader hidden><button data-catalog>← 返回灵感手稿</button><article><header><p class="ura-caption" data-meta></p><h1 data-title tabindex="-1"></h1><p class="ura-summary" data-summary></p><p class="ura-caption" data-dates></p></header><div class="ura-prose" data-prose></div><section class="ura-sketches" data-sketch-section hidden><h2>参考与草图</h2><div data-sketches></div></section><aside class="ura-related" data-related hidden></aside></article><nav class="ura-idea-nav" aria-label="构想切换"><button data-prev>← 上一份手稿</button><button data-next>下一份手稿 →</button></nav></main>
    <footer class="ura-footer"><p>故事尚未写完，<br>未来仍有回响。</p><button data-return>← 返回 ORBIT</button></footer>`;
  document.body.append(root); const $ = s => root.querySelector(s), viewport = document.querySelector('meta[name=viewport]');
  const sectionFor = {manuscript: 'uranusManuscripts', blueprint: 'uranusBlueprints', possibility: 'uranusPossibilities'}, kindNames = {manuscript: '灵感手稿', blueprint: '未来蓝图', possibility: '可能性档案'};
  let portal = null, active = false, category = '全部', status = '全部', catalogTop = 0, pendingSection = null, home = false, currentKind = 'manuscript', savedViewport = '';
  function openLink(idea, label = idea.title) { const a = view.text('a', label); a.href = '#/uranus/idea/' + encodeURIComponent(idea.slug); a.onclick = e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); catalogTop = root.scrollTop; portal.detail(idea.slug); }; return a; }
  function empty(target, title, description) { const div = document.createElement('div'); div.className = 'ura-empty'; div.append(view.text('h3', title), view.text('p', description)); target.append(div); }
  function row(idea, mode) {
    const article = document.createElement('article'); article.className = 'ura-idea-row ura-' + mode;
    const content = document.createElement('div'), meta = view.text('p', idea.category + ' / ' + idea.status, 'ura-caption'), title = document.createElement('h3'); title.append(openLink(idea)); content.append(meta, title);
    if (idea.summary) content.append(view.text('p', idea.summary, 'ura-description')); content.append(openLink(idea, mode === 'blueprint' ? '展开蓝图 ↗' : '翻阅手稿 ↗'));
    const date = view.text('time', idea.createdAt, 'ura-caption'); date.dateTime = idea.createdAt;
    article.append(content, date); if (mode !== 'possibility' && idea.sketches?.length) { const image = view.sketch(idea.sketches[0]); if (image) article.append(image); } return article;
  }
  function renderManuscripts() {
    const visible = ideas.filter(r => r.kind === 'manuscript' && (category === '全部' || r.category === category)); $('[data-manuscripts]').replaceChildren();
    for (const b of $('.ura-categories').children) b.setAttribute('aria-pressed', String(b.textContent === category)); $('[data-manuscript-count]').textContent = category + ' / ' + visible.length + ' 份手稿';
    if (!visible.length) empty($('[data-manuscripts]'), '手稿还留着空白。', '等待一个真正想记录的念头，不必急着填满。'); for (const r of visible) $('[data-manuscripts]').append(row(r, 'manuscript'));
  }
  for (const label of ['全部', ...data.categories]) { const b = view.text('button', label); b.onclick = () => { category = label; renderManuscripts(); }; $('.ura-categories').append(b); }
  const blueprints = ideas.filter(r => r.kind === 'blueprint');
  if (!blueprints.length) empty($('[data-blueprints]'), '蓝图尚未展开。', '这里留给作者真实的长期构想。尚未成形，也无需假装已有答案。'); for (const r of blueprints) $('[data-blueprints]').append(row(r, 'blueprint'));
  function renderPossibilities() {
    const visible = ideas.filter(r => r.kind === 'possibility' && (status === '全部' || r.status === status)); $('[data-possibilities]').replaceChildren(); $('[data-possibility-count]').textContent = status + ' / ' + visible.length + ' 个可能';
    if (!visible.length) empty($('[data-possibilities]'), '可能性，仍然敞开。', '尚未决定的想法，可以在这里停留。'); for (const r of visible) $('[data-possibilities]').append(row(r, 'possibility'));
  }
  for (const value of data.statuses) { const o = view.text('option', value); o.value = value; $('[data-status]').append(o); } $('[data-status]').onchange = e => { status = e.target.value; renderPossibilities(); };
  function showIndex() {
    const fromReader = !$('[data-reader]').hidden; $('[data-reader]').hidden = true; $('[data-index]').hidden = false; document.title = '未央。 · URANUS / THE UNWRITTEN FUTURE';
    catalogTop = home ? 0 : pendingSection ? $('#' + pendingSection).offsetTop : fromReader ? (catalogTop || $('#' + sectionFor[currentKind]).offsetTop) : catalogTop;
    root.scrollTo({top: catalogTop, behavior: 'auto'}); home = false; pendingSection = null;
  }
  function showIdea(slug) {
    const idea = ideas.find(r => r.slug === slug); currentKind = idea?.kind || 'manuscript'; $('[data-index]').hidden = true; $('[data-reader]').hidden = false; root.scrollTo({top: 0, behavior: 'auto'});
    for (const selector of ['[data-prose]', '[data-sketches]', '[data-related]']) $(selector).replaceChildren(); $('[data-sketch-section]').hidden = true; $('[data-related]').hidden = true;
    $('[data-title]').textContent = idea ? idea.title : '这份构想暂未公开。'; $('[data-meta]').textContent = idea ? [kindNames[idea.kind], idea.category, idea.status].join(' / ') : '未找到公开构想';
    $('[data-summary]').textContent = idea ? idea.summary : '请返回目录，翻阅已公开的手稿。'; $('[data-summary]').hidden = !!idea && !idea.summary;
    $('[data-dates]').textContent = idea ? '创建 / ' + idea.createdAt + '　整理 / ' + idea.updatedAt : ''; $('[data-catalog]').textContent = '← 返回' + kindNames[currentKind]; document.title = idea ? idea.title + ' · 未央' : '未找到构想 · 未央';
    if (idea) {
      for (const [key, title] of Object.entries(core.sections)) { const content = (idea[key] || []).filter(b => typeof b.text === 'string' && b.text.trim()); if (!content.length) continue; const section = document.createElement('section'); section.dataset.chapter = key; section.append(view.text('h2', title)); const prose = document.createElement('div'); view.blocks(prose, content); section.append(prose); $('[data-prose]').append(section); }
      for (const data of idea.sketches || []) { const image = view.sketch(data); if (image) $('[data-sketches]').append(image); } $('[data-sketch-section]').hidden = !$('[data-sketches]').children.length;
      const related = core.relatedRoute(idea, view.publicCatalog()); if (related) { const names = {mercury: '初序', mars: '拓荒', jupiter: '万象'}, link = view.text('a', '已转化的公开项目 / ' + names[idea.relatedPlanet] + '：' + related.title + ' ↗'); link.href = related.hash; link.onclick = e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); portal.leaveTo(related.hash); }; $('[data-related]').append(link); $('[data-related]').hidden = false; }
    }
    const collection = ideas.filter(r => r.kind === currentKind), i = collection.indexOf(idea); for (const [selector, offset] of [['[data-prev]', -1], ['[data-next]', 1]]) { const next = idea && collection[i + offset], b = $(selector); b.hidden = !next; if (next) b.onclick = () => portal.detail(next.slug, true); }
    $('[data-title]').focus({preventScroll: true});
  }
  function jump(id) { if (!$('[data-reader]').hidden) { pendingSection = id; portal.detail(null); } else $('#' + id).scrollIntoView({behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth'}); }
  root.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => jump(b.dataset.jump)); $('.ura-skip').onclick = e => { e.preventDefault(); jump('uranusManuscripts'); $('.ura-categories button').focus({preventScroll: true}); };
  $('[data-home]').onclick = () => { if (!$('[data-reader]').hidden) { home = true; portal.detail(null); } else root.scrollTo({top: 0, behavior: 'auto'}); }; $('[data-catalog]').onclick = () => portal.detail(null); root.querySelectorAll('[data-return]').forEach(b => b.onclick = () => portal.requestClose());
  root.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); if (!$('[data-reader]').hidden) portal.detail(null); else portal.requestClose(); }
    if (e.key === 'Tab') { const all = [...root.querySelectorAll('button:not(:disabled),a[href],select')].filter(n => n.getClientRects().length), first = all[0], last = all.at(-1); if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
  });
  renderManuscripts(); renderPossibilities();
  return {root, connect: p => portal = p, activate(slug) {
    if (!active) { active = true; savedViewport = viewport?.content || ''; viewport?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover'); }
    if (slug) showIdea(slug); else showIndex();
  }, deactivate() { active = false; catalogTop = 0; pendingSection = null; home = false; $('[data-reader]').hidden = true; $('[data-index]').hidden = false; if (viewport && savedViewport) viewport.content = savedViewport; }};
};
