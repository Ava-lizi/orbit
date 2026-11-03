/* Public read-only archive. Content and source snippets are never parsed as HTML. */
globalThis.OrbitMercuryView = (() => {
  const core = globalThis.OrbitMercuryCore;
  function text(tag, value, cls = '') { const n = document.createElement(tag); n.textContent = String(value || ''); n.className = cls; return n; }
  function image(data) {
    if (!data || !core.imagePath.test(data.src)) return null;
    const figure = document.createElement('figure'), img = document.createElement('img');
    img.src = data.src; img.alt = String(data.alt || '项目截图'); img.width = data.width; img.height = data.height; img.loading = 'lazy'; img.decoding = 'async';
    img.onerror = () => { img.hidden = true; if (!figure.querySelector('[data-error]')) { const p = text('p', '截图暂时无法载入，项目说明仍可阅读。', 'mer-caption'); p.dataset.error = ''; figure.prepend(p); } };
    figure.append(img); if (data.caption) figure.append(text('figcaption', data.caption, 'mer-caption')); return figure;
  }
  function renderBlocks(target, blocks) {
    target.replaceChildren();
    for (const block of blocks || []) {
      if (block.type === 'code') {
        const wrapper = document.createElement('figure'); wrapper.className = 'mer-code-block';
        const bar = document.createElement('figcaption'); bar.append(text('span', ['javascript', 'python'].includes(block.language) ? block.language : 'text'));
        const copy = text('button', '复制代码'), status = text('span', '', 'mer-copy-status'); copy.type = 'button'; status.setAttribute('role', 'status'); bar.append(status, copy);
        const pre = document.createElement('pre'), code = document.createElement('code'); pre.tabIndex = 0; pre.setAttribute('aria-label', '代码，可横向滚动');
        for (const token of core.tokens(block.text, block.language)) code.append(text('span', token.text, 'mer-token-' + token.kind));
        pre.append(code); wrapper.append(bar, pre); target.append(wrapper);
        copy.onclick = async () => {
          copy.disabled = true; status.textContent = '';
          try { if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable'); await navigator.clipboard.writeText(String(block.text)); status.textContent = '已复制'; }
          catch { const range = document.createRange(); range.selectNodeContents(code); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); pre.focus({preventScroll: true}); status.textContent = '已选中，请手动复制'; }
          finally { copy.disabled = false; }
        };
      } else if (['paragraph', 'heading', 'quote'].includes(block.type)) target.append(text(block.type === 'heading' ? 'h2' : block.type === 'quote' ? 'blockquote' : 'p', block.text));
    }
  }
  function externalLink(value, label, repository = false) {
    const url = core.safeUrl(value, repository); if (!url) return null;
    const a = text('a', label); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  return {text, image, renderBlocks, externalLink};
})();

window.createMercuryLaboratory = function(data) {
  const view = globalThis.OrbitMercuryView;
  const projects = data.projects.filter(p => p.visibility === 'published');
  const notes = data.notes.filter(n => n.visibility === 'published');
  const root = document.createElement('section'); root.id = 'mercuryWorld'; root.className = 'mercury-world'; root.hidden = true; root.tabIndex = -1; root.setAttribute('aria-label', '初序 · 编程实验室');
  root.innerHTML = `<a class="mer-skip" href="#mercuryProjects">跳到项目档案</a>
    <header class="mer-header"><button class="mer-brand" data-home>初序。<span>MERCURY / CODE LABORATORY</span></button><nav aria-label="初序导航"><button data-jump="mercuryProjects">项目档案</button><button data-jump="mercuryBench">实验台</button><button data-jump="mercuryNotes">开发手记</button><button data-return>← 返回 ORBIT</button></nav></header>
    <main data-index>
      <section class="mer-hero"><div class="mer-hero-copy"><p class="mer-caption">个人编程实验室</p><h1>初序<span>。</span></h1><p class="mer-subtitle">一切创造，<br>始于第一行代码。</p><p class="mer-intro">从最简单的语法，到真正运行的程序。<br>这里收藏每一次尝试与创造。</p><button class="mer-primary" data-jump="mercuryProjects">探索实验室 ↗</button></div><div class="mer-hero-algorithm"><p class="mer-caption">一次搜索的路径</p><div data-hero-graph></div></div><div class="mer-hero-foot mer-caption"><span>代码 / 逻辑 / 可运行的想法</span><span>从一个小实验开始。</span></div></section>
      <section id="mercuryProjects" class="mer-section"><header class="mer-section-head"><div><p class="mer-caption">01 / 项目档案</p><h2>让想法，真正运行。</h2></div><p class="mer-section-aside">记录代码如何成为作品。</p></header><div class="mer-filters" role="group" aria-label="项目类型"></div><p class="mer-caption" data-count role="status"></p><div data-projects></div></section>
      <section id="mercuryBench" class="mer-section"><header class="mer-section-head"><div><p class="mer-caption">02 / 在线实验台</p><h2>亲手运行一段逻辑。</h2></div><p class="mer-section-aside">所有计算只发生在你的浏览器。</p></header><div data-experiment></div><p class="mer-caption mer-bench-note">算法可视化 / 小游戏 / 计算工具 · 后续通过本地代码逐步加入。</p></section>
      <section id="mercuryNotes" class="mer-section"><header class="mer-section-head"><div><p class="mer-caption">03 / 开发手记</p><h2>代码之外，留下思考。</h2></div><p class="mer-section-aside">实现过程 / 问题与解法 / 版本记录</p></header><div data-notes></div></section>
    </main>
    <main class="mer-reader" data-reader hidden><button data-catalog>← 返回档案</button><article><header><p class="mer-caption" data-meta></p><h1 data-title tabindex="-1"></h1><p class="mer-demo" data-demo></p><p class="mer-summary" data-summary></p><ul class="mer-tech" data-tech aria-label="项目技术栈"></ul></header><div data-cover></div><div class="mer-prose" data-content></div><aside class="mer-detail-links" data-links></aside></article><nav class="mer-entry-nav" aria-label="档案切换"><button data-prev>← 上一条</button><button data-next>下一条 →</button></nav></main>
    <footer class="mer-footer"><p>从第一行代码，<br>走向一个可以运行的世界。</p><button data-return>← 返回 ORBIT</button></footer>`;
  document.body.append(root);
  const $ = s => root.querySelector(s), viewport = document.querySelector('meta[name=viewport]');
  let portal = null, active = false, filter = '全部', catalogTop = 0, pendingSection = null, home = false, currentKind = 'project', savedViewport = '';
  const hero = globalThis.OrbitMercuryExperiments.createHero($('[data-hero-graph]'));
  const experiment = data.experiments.find(e => e.id === 'binary-search' && e.implementation === 'binary-search');
  const bench = experiment ? globalThis.OrbitMercuryExperiments.createSearch($('[data-experiment]')) : {stop() {}};
  if (!experiment) $('[data-experiment]').append(view.text('p', '实验台尚未收录可运行的实验。', 'mer-empty'));
  function openLink(item, label = item.title) {
    const a = view.text('a', label); a.href = '#/mercury/entry/' + encodeURIComponent(item.slug);
    a.onclick = event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); catalogTop = root.scrollTop; portal.detail(item.slug); }; return a;
  }
  function techList(target, technologies) { target.replaceChildren(); for (const name of technologies) target.append(view.text('li', name)); }
  function renderProjects() {
    const visible = projects.filter(p => filter === '全部' || p.category === filter); $('[data-projects]').replaceChildren();
    $('[data-count]').textContent = filter + ' / ' + visible.length + ' 个项目';
    for (const b of $('.mer-filters').children) b.setAttribute('aria-pressed', String(b.textContent === filter));
    if (!visible.length) $('[data-projects]').append(view.text('p', filter === '全部' ? '项目档案尚未收录作品，等待真实的创造。' : filter + ' 作品尚未收录。下一次尝试，可以从这里开始。', 'mer-empty'));
    for (const [i, project] of visible.entries()) {
      const row = document.createElement('article'); row.className = 'mer-project';
      const info = document.createElement('div'), h = document.createElement('h3'); h.append(openLink(project));
      const meta = view.text('p', String(i + 1).padStart(2, '0') + ' / ' + project.category + ' / ' + project.status, 'mer-caption');
      info.append(meta, h, view.text('p', project.summary, 'mer-description'));
      const tech = document.createElement('ul'); tech.className = 'mer-tech'; techList(tech, project.technologies); info.append(tech);
      const time = view.text('time', '开发 ' + project.createdAt + ' / 更新 ' + project.updatedAt, 'mer-caption'); time.dateTime = project.createdAt; info.append(time);
      if (project.demo) info.append(view.text('p', '本轮内置演示 · 非作者历史作品', 'mer-caption'));
      const links = document.createElement('div'); links.className = 'mer-project-links'; links.append(openLink(project, '查看项目 ↗'));
      for (const a of [view.externalLink(project.repositoryUrl, 'GitHub ↗', true), view.externalLink(project.demoUrl, '在线演示 ↗')]) if (a) links.append(a);
      if (project.experimentId && experiment) { const b = view.text('button', '运行实验 ↗'); b.onclick = () => jump('mercuryBench'); links.append(b); }
      info.append(links); row.append(info);
      const img = view.image(project.coverImage); if (img) row.append(img); else { const blank = view.text('p', '项目截图待添加', 'mer-image-empty mer-caption'); row.append(blank); }
      $('[data-projects]').append(row);
    }
  }
  for (const label of ['全部', ...data.categories]) { const b = view.text('button', label); b.onclick = () => { filter = label; renderProjects(); }; $('.mer-filters').append(b); }
  if (!notes.length) $('[data-notes]').append(view.text('p', '下一篇手记，留给真实的开发过程。', 'mer-empty'));
  for (const note of notes) {
    const row = document.createElement('article'); row.className = 'mer-note-row'; const date = view.text('time', note.publishedAt, 'mer-caption'); date.dateTime = note.publishedAt;
    const body = document.createElement('div'), h = document.createElement('h3'); h.append(openLink(note)); body.append(h, view.text('p', note.summary, 'mer-description'), openLink(note, '阅读手记 ↗'));
    if (note.demo) body.append(view.text('p', '本轮内置演示的实现说明', 'mer-caption')); row.append(date, body); $('[data-notes]').append(row);
  }
  function showIndex() {
    const fromReader = !$('[data-reader]').hidden; $('[data-reader]').hidden = true; $('[data-index]').hidden = false;
    document.title = '初序。 · MERCURY / CODE LABORATORY';
    const fallback = currentKind === 'note' ? 'mercuryNotes' : 'mercuryProjects';
    // popstate and hashchange can both fire for one back action; retain the resolved destination.
    catalogTop = home ? 0 : pendingSection ? $('#' + pendingSection).offsetTop : fromReader ? (catalogTop || $('#' + fallback).offsetTop) : catalogTop;
    root.scrollTo({top: catalogTop, behavior: 'auto'});
    home = false; pendingSection = null; hero.setActive(active);
  }
  function showEntry(slug) {
    const project = projects.find(p => p.slug === slug), note = notes.find(n => n.slug === slug), entry = project || note;
    currentKind = note ? 'note' : 'project'; hero.setActive(false); bench.stop();
    $('[data-index]').hidden = true; $('[data-reader]').hidden = false; root.scrollTo({top: 0, behavior: 'auto'});
    for (const selector of ['[data-cover]', '[data-content]', '[data-links]', '[data-tech]']) $(selector).replaceChildren();
    $('[data-catalog]').textContent = note ? '← 返回开发手记' : '← 返回项目档案';
    $('[data-title]').textContent = entry ? entry.title : '这份档案暂未公开。';
    $('[data-meta]').textContent = project ? [project.category, project.status, project.updatedAt].join(' / ') : note ? '开发手记 / ' + note.publishedAt : '未找到公开内容';
    $('[data-demo]').textContent = entry?.demo ? '本轮 V1 内置演示与实现说明，不代表作者以往作品或经历。' : '';
    $('[data-summary]').textContent = entry ? entry.summary : '请返回档案，选择已公开的项目或手记。';
    document.title = entry ? entry.title + ' · 初序' : '未找到档案 · 初序';
    if (entry) {
      view.renderBlocks($('[data-content]'), project ? project.description : note.content);
      if (project) {
        techList($('[data-tech]'), project.technologies); const img = view.image(project.coverImage); if (img) $('[data-cover]').append(img);
        for (const a of [view.externalLink(project.repositoryUrl, '查看 GitHub 仓库 ↗', true), view.externalLink(project.demoUrl, '打开在线演示 ↗')]) if (a) $('[data-links]').append(a);
        if (project.experimentId && experiment) { const b = view.text('button', '运行这个实验 ↗'); b.onclick = () => jump('mercuryBench'); $('[data-links]').append(b); }
      }
    }
    const collection = note ? notes : projects, i = collection.indexOf(entry);
    for (const [selector, offset] of [['[data-prev]', -1], ['[data-next]', 1]]) { const next = entry && collection[i + offset], b = $(selector); b.hidden = !next; if (next) b.onclick = () => portal.detail(next.slug, true); }
    $('[data-title]').focus({preventScroll: true});
  }
  function jump(id) {
    if (!$('[data-reader]').hidden) { pendingSection = id; portal.detail(null); }
    else $('#' + id).scrollIntoView({behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth'});
  }
  root.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => jump(b.dataset.jump));
  $('.mer-skip').onclick = event => { event.preventDefault(); jump('mercuryProjects'); $('.mer-filters button').focus({preventScroll: true}); };
  $('[data-home]').onclick = () => { if (!$('[data-reader]').hidden) { home = true; portal.detail(null); } else root.scrollTo({top: 0, behavior: 'auto'}); };
  $('[data-catalog]').onclick = () => portal.detail(null); root.querySelectorAll('[data-return]').forEach(b => b.onclick = () => portal.requestClose());
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); if (!$('[data-reader]').hidden) portal.detail(null); else portal.requestClose(); }
    if (event.key === 'Tab') {
      const all = [...root.querySelectorAll('button:not(:disabled),a[href],input,pre[tabindex]')].filter(n => n.getClientRects().length), first = all[0], last = all.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  renderProjects();
  return {
    root, connect: p => portal = p,
    activate(slug) {
      if (!active) { active = true; savedViewport = viewport?.content || ''; viewport?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover'); }
      if (slug) showEntry(slug); else showIndex();
    },
    deactivate() {
      active = false; hero.setActive(false); bench.stop(); catalogTop = 0; home = false; pendingSection = null;
      $('[data-reader]').hidden = true; $('[data-index]').hidden = false;
      if (viewport && savedViewport) viewport.content = savedViewport;
    }
  };
};
