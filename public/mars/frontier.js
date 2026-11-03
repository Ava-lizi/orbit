/* Technical archives are read-only; all author fields use text nodes, never executable markup. */
globalThis.OrbitFrontierView = (() => {
  const imagePath = /^\.\/public\/mars\/images\/[a-z0-9][a-z0-9_-]*\.(jpg|jpeg|png|webp|avif)$/;
  function text(tag, value, cls = '') { const n = document.createElement(tag); n.textContent = String(value || ''); n.className = cls; return n; }
  function blocks(target, content) {
    target.replaceChildren();
    for (const b of content || []) if (['paragraph', 'heading', 'quote'].includes(b.type)) target.append(text(b.type === 'heading' ? 'h3' : b.type === 'quote' ? 'blockquote' : 'p', b.text));
  }
  function image(data) {
    if (!data || !imagePath.test(data.src)) return null;
    const figure = document.createElement('figure'), img = document.createElement('img'); img.src = data.src; img.alt = String(data.alt || '实验配图'); img.width = data.width; img.height = data.height; img.loading = 'lazy'; img.decoding = 'async';
    img.onerror = () => { img.hidden = true; if (!figure.querySelector('[data-error]')) { const p = text('p', '配图暂时无法载入，探索记录仍可阅读。', 'mar-caption'); p.dataset.error = ''; figure.prepend(p); } };
    figure.append(img); if (data.caption) figure.append(text('figcaption', data.caption, 'mar-caption')); return figure;
  }
  function relatedProject(id) {
    if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return null;
    const p = window.ORBIT_LABORATORY?.projects.find(p => p.id === id && p.visibility === 'published');
    return p && typeof p.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) ? {title: p.title, hash: '#/mercury/entry/' + encodeURIComponent(p.slug)} : null;
  }
  return {text, blocks, image, imagePath, relatedProject};
})();

window.createMarsFrontier = function(data) {
  const view = globalThis.OrbitFrontierView;
  const experiments = data.experiments.filter(r => r.visibility === 'published');
  const challenges = data.challenges.filter(r => r.visibility === 'published');
  const observations = data.observations.filter(r => r.visibility === 'published');
  const root = document.createElement('section'); root.id = 'marsWorld'; root.className = 'mars-world'; root.hidden = true; root.tabIndex = -1; root.setAttribute('aria-label', '拓荒 · 技术探索档案馆');
  root.innerHTML = `<a class="mar-skip" href="#marsExperiments">跳到实验档案</a><header class="mar-header"><button class="mar-brand" data-home>拓荒。<span>MARS / EXPERIMENTAL FRONTIER</span></button><nav aria-label="拓荒导航"><button data-jump="marsExperiments">实验档案</button><button data-jump="marsChallenges">挑战记录</button><button data-jump="marsObservations">前沿观察</button><button data-return>← 返回 ORBIT</button></nav></header>
    <main data-index>
      <section class="mar-hero"><p class="mar-caption mar-hero-label">技术探索基地 / 留下每一次尝试</p><div class="mar-hero-top"><h1>拓荒<span>。</span></h1><div><p class="mar-subtitle">向未知之处，<br>迈出第一步。</p><p class="mar-intro">这里记录尚未被解决的问题，<br>以及每一次向答案靠近的尝试。</p><button class="mar-primary" data-jump="marsExperiments">查看探索档案 ↗</button></div></div><figure class="mar-terrain"><img data-terrain alt="好奇号拍摄的火星纳米布沙丘背风坡纹理，NASA/JPL 官方白平衡拼接影像" width="1600" height="1806" decoding="async"><figcaption class="mar-caption"><span>纳米布沙丘 / Curiosity / PIA20283</span><a href="https://www.jpl.nasa.gov/images/pia20283-mastcam-telephoto-of-a-martian-dunes-downwind-face/" target="_blank" rel="noopener noreferrer">Courtesy NASA/JPL-Caltech ↗</a></figcaption></figure><p class="mar-caption mar-positioning">初序收藏可运行的作品。拓荒留下问题、尝试，以及尚未抵达的答案。</p></section>
      <section class="mar-section" id="marsExperiments"><header class="mar-section-head"><div><p class="mar-caption">01 / 实验档案</p><h2>问题，是探索的起点。</h2></div><p>先保留过程，<br>再谈结果。</p></header><p class="mar-demo" data-notice></p><div class="mar-filter-row"><label>研究方向 <select data-category aria-label="筛选实验研究方向"><option value="全部">全部方向</option></select></label><label>当前状态 <select data-status aria-label="筛选实验当前状态"><option value="全部">全部状态</option></select></label></div><p class="mar-caption" role="status" data-count></p><div data-experiments></div></section>
      <section class="mar-section" id="marsChallenges"><header class="mar-section-head"><div><p class="mar-caption">02 / 挑战记录</p><h2>没有解决，也值得记录。</h2></div><p>问题 / 尝试 / 复盘</p></header><div data-challenges></div></section>
      <section class="mar-section" id="marsObservations"><header class="mar-section-head"><div><p class="mar-caption">03 / 前沿观察</p><h2>为下一次好奇，留出方向。</h2></div><p>这是待探索的清单，<br>不是已经掌握的技术。</p></header><div class="mar-direction-filters" role="group" aria-label="前沿观察分类"></div><p class="mar-caption" role="status" data-direction-count></p><div data-observations></div></section>
    </main>
    <main class="mar-reader" data-reader hidden><button data-catalog>← 返回探索档案</button><article><header><p class="mar-caption" data-meta></p><h1 data-title tabindex="-1"></h1><p class="mar-demo" data-demo></p><p class="mar-objective" data-objective></p><ul class="mar-technologies" data-tech aria-label="使用技术"></ul></header><div data-image></div><div class="mar-prose" data-content></div><aside class="mar-related" data-related></aside></article><nav class="mar-record-nav" aria-label="档案切换"><button data-prev>← 上一条</button><button data-next>下一条 →</button></nav></main>
    <footer class="mar-footer"><p>未抵达的地方，<br>也有值得留下的足迹。</p><button data-return>← 返回 ORBIT</button></footer>`;
  document.body.append(root); const $ = s => root.querySelector(s);
  let portal = null, active = false, category = '全部', status = '全部', direction = '全部', catalogTop = 0, pendingSection = null, home = false, currentSection = 'marsExperiments', savedViewport = '';
  const viewport = document.querySelector('meta[name=viewport]');
  function openLink(record, label = record.title) {
    const a = view.text('a', label); a.href = '#/mars/record/' + encodeURIComponent(record.slug);
    a.onclick = event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); catalogTop = root.scrollTop; portal.detail(record.slug); }; return a;
  }
  function time(record) { const n = view.text('time', record.updatedAt, 'mar-caption'); n.dateTime = record.updatedAt; return n; }
  function empty(target, message) { target.append(view.text('p', message, 'mar-empty')); }
  function renderExperiments() {
    const shown = experiments.filter(r => (category === '全部' || r.category === category) && (status === '全部' || r.status === status));
    $('[data-experiments]').replaceChildren(); $('[data-count]').textContent = `${category} / ${status} / ${shown.length} 份档案`;
    if (!shown.length) empty($('[data-experiments]'), '这个范围还没有公开档案。真实的探索，可以从一个问题开始。');
    for (const [i, r] of shown.entries()) {
      const row = document.createElement('article'); row.className = 'mar-experiment-row';
      const label = document.createElement('aside'); label.append(view.text('span', String(i + 1).padStart(2, '0'), 'mar-number'), view.text('p', r.status, 'mar-status'));
      const content = document.createElement('div'), h = document.createElement('h3'); h.append(openLink(r)); content.append(view.text('p', r.category + (r.demo ? ' / 演示数据' : ''), 'mar-caption'), h, view.text('p', r.objective, 'mar-description'));
      const tech = document.createElement('ul'); tech.className = 'mar-technologies'; for (const t of r.technologies) tech.append(view.text('li', t)); content.append(tech, openLink(r, '翻阅过程 ↗'));
      const meta = document.createElement('aside'); meta.className = 'mar-record-date'; meta.append(view.text('span', '最近整理', 'mar-caption'), time(r)); if (r.demo) meta.append(view.text('span', '示例日期', 'mar-caption'));
      row.append(label, content, meta); $('[data-experiments]').append(row);
    }
  }
  for (const [selector, options] of [['[data-category]', data.categories], ['[data-status]', data.statuses]]) for (const value of options) { const option = view.text('option', value); option.value = value; $(selector).append(option); }
  $('[data-category]').onchange = e => { category = e.target.value; renderExperiments(); }; $('[data-status]').onchange = e => { status = e.target.value; renderExperiments(); };
  for (const r of challenges) {
    const row = document.createElement('article'); row.className = 'mar-challenge-row'; const meta = document.createElement('aside'); meta.append(view.text('p', r.resolution ? '已记录方案' : '尚未解决', 'mar-status'), time(r));
    const content = document.createElement('div'), h = document.createElement('h3'); h.append(openLink(r)); content.append(h, view.text('p', r.problem, 'mar-description'), openLink(r, '查看尝试与复盘 ↗')); if (r.demo) content.append(view.text('p', '演示情境 · 不代表作者真实经历', 'mar-caption')); row.append(meta, content); $('[data-challenges]').append(row);
  }
  if (!challenges.length) empty($('[data-challenges]'), '挑战记录尚未收录。暂未解决的问题，也可以被认真留下。');
  function renderObservations() {
    const shown = observations.filter(r => direction === '全部' || r.category === direction); $('[data-observations]').replaceChildren();
    for (const b of $('.mar-direction-filters').children) b.setAttribute('aria-pressed', String(b.textContent === direction)); $('[data-direction-count]').textContent = `${direction} / ${shown.length} 个方向`;
    if (!shown.length) empty($('[data-observations]'), '这个方向还留着空白。');
    for (const r of shown) {
      const row = document.createElement('article'); row.className = 'mar-observation-row'; const h = document.createElement('h3'); h.append(openLink(r)); row.append(view.text('p', r.category + ' / 待探索' + (r.demo ? ' / 方向示例' : ''), 'mar-caption'), h, view.text('p', r.summary, 'mar-description'), openLink(r, '阅读问题清单 ↗')); $('[data-observations]').append(row);
    }
  }
  for (const value of ['全部', ...data.directions]) { const b = view.text('button', value); b.onclick = () => { direction = value; renderObservations(); }; $('.mar-direction-filters').append(b); }
  function section(title, content, fallback) {
    const wrap = document.createElement('section'); wrap.append(view.text('h2', title)); const body = document.createElement('div'); view.blocks(body, content); if (!content?.length) body.append(view.text('p', fallback, 'mar-unresolved')); wrap.append(body); $('[data-content]').append(wrap);
  }
  function questions(title, items, fallback) { section(title, [], fallback); const body = $('[data-content]').lastElementChild.lastElementChild; if (items.length) { body.replaceChildren(); const ul = document.createElement('ul'); for (const q of items) ul.append(view.text('li', q)); body.append(ul); } }
  function loadTerrain() {
    const terrain = $('[data-terrain]'); if (terrain.hasAttribute('src')) return;
    terrain.onerror = () => { terrain.hidden = true; if (!$('.mar-terrain [data-error]')) { const p = view.text('p', '地貌影像暂时无法载入，探索档案仍可阅读。', 'mar-caption'); p.dataset.error = ''; $('.mar-terrain').prepend(p); } };
    terrain.src = './public/mars/images/namib-1600.jpg';
  }
  function showIndex() {
    loadTerrain();
    const fromReader = !$('[data-reader]').hidden; $('[data-reader]').hidden = true; $('[data-index]').hidden = false; document.title = '拓荒。 · MARS / EXPERIMENTAL FRONTIER';
    catalogTop = home ? 0 : pendingSection ? $('#' + pendingSection).offsetTop : fromReader ? (catalogTop || $('#' + currentSection).offsetTop) : catalogTop;
    root.scrollTo({top: catalogTop, behavior: 'auto'}); home = false; pendingSection = null;
  }
  function showRecord(id) {
    const experiment = experiments.find(r => r.slug === id), challenge = challenges.find(r => r.slug === id), observation = observations.find(r => r.slug === id), record = experiment || challenge || observation;
    const collection = experiment ? experiments : challenge ? challenges : observations;
    currentSection = challenge ? 'marsChallenges' : observation ? 'marsObservations' : 'marsExperiments';
    $('[data-index]').hidden = true; $('[data-reader]').hidden = false; root.scrollTo({top: 0, behavior: 'auto'});
    for (const selector of ['[data-content]', '[data-tech]', '[data-image]', '[data-related]']) $(selector).replaceChildren();
    $('[data-title]').textContent = record ? record.title : '这份探索档案暂未公开。';
    $('[data-meta]').textContent = record ? [record.category, experiment ? record.status : challenge ? record.resolution ? '已记录方案' : '尚未解决' : '待探索方向', record.updatedAt].join(' / ') : '未找到公开内容';
    $('[data-demo]').textContent = record?.demo ? '演示数据 · 情境与日期仅用于展示结构，不代表作者真实实验、经历或技术成就。' : '';
    $('[data-objective]').textContent = experiment ? experiment.objective : challenge ? challenge.problem : observation ? observation.summary : '请返回目录，选择已公开的内容。';
    $('[data-catalog]').textContent = challenge ? '← 返回挑战记录' : observation ? '← 返回前沿观察' : '← 返回实验档案'; document.title = record ? record.title + ' · 拓荒' : '未找到档案 · 拓荒';
    if (experiment) {
      for (const t of record.technologies) $('[data-tech]').append(view.text('li', t)); const img = view.image(record.image); if (img) $('[data-image]').append(img);
      section('实验过程', record.process, '过程尚未记录。'); section('结果与发现', record.findings, '尚无可确认的结果与发现。'); section('经验与复盘', record.lessons, '经验留待实际验证后整理。'); questions('仍待解答', record.openQuestions, '暂未补充新的问题。');
      if (record.startedAt) $('[data-content]').append(view.text('p', '开始日期 / ' + record.startedAt + (record.demo ? '（示例）' : ''), 'mar-caption'));
      if (record.relatedProjectId) { const related = view.relatedProject(record.relatedProjectId); if (related) { const a = view.text('a', '到「初序」查看关联项目：' + related.title + ' ↗'); a.href = related.hash; a.onclick = e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); portal.leaveTo(related.hash); }; $('[data-related]').append(a); } else $('[data-related]').append(view.text('p', '关联项目尚未公开。', 'mar-caption')); }
    } else if (challenge) {
      section('问题背景', [{type: 'paragraph', text: record.background}]);
      section('尝试过的方法', record.attempts.flatMap((a, i) => [{type: 'heading', text: String(i + 1).padStart(2, '0') + ' / ' + a.method}, {type: 'paragraph', text: a.result}]), '尚未记录尝试。');
      section('失败原因', record.failureCause ? [{type: 'paragraph', text: record.failureCause}] : [], '原因尚未确认，暂不写入结论。');
      section('最终解决方案', record.resolution ? [{type: 'paragraph', text: record.resolution}] : [], '尚无最终解决方案。'); section('经验总结', record.lessons, '总结留待验证后补充。');
    } else if (observation) { questions('想继续追问的事', record.questions, '新的问题留待下一次探索。'); section('阅读与研究计划', record.readingPlan, '计划尚未展开。'); }
    const i = collection.indexOf(record); for (const [selector, offset] of [['[data-prev]', -1], ['[data-next]', 1]]) { const next = record && collection[i + offset], b = $(selector); b.hidden = !next; if (next) b.onclick = () => portal.detail(next.slug, true); }
    $('[data-title]').focus({preventScroll: true});
  }
  function jump(id) { if (!$('[data-reader]').hidden) { pendingSection = id; portal.detail(null); } else $('#' + id).scrollIntoView({behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth'}); }
  root.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => jump(b.dataset.jump)); $('.mar-skip').onclick = e => { e.preventDefault(); jump('marsExperiments'); $('[data-category]').focus({preventScroll: true}); };
  $('[data-home]').onclick = () => { if (!$('[data-reader]').hidden) { home = true; portal.detail(null); } else root.scrollTo({top: 0, behavior: 'auto'}); }; $('[data-catalog]').onclick = () => portal.detail(null); root.querySelectorAll('[data-return]').forEach(b => b.onclick = () => portal.requestClose());
  root.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); if (!$('[data-reader]').hidden) portal.detail(null); else portal.requestClose(); }
    if (e.key === 'Tab') { const all = [...root.querySelectorAll('button:not(:disabled),a[href],select')].filter(n => n.getClientRects().length), first = all[0], last = all.at(-1); if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
  });
  const demo = [...experiments, ...challenges, ...observations].some(r => r.demo);
  $('[data-notice]').textContent = demo ? '当前包含明确标注的演示档案、情境与示例日期，不代表作者真实实验或技术成就。' : '进度如实记录，结论保留依据。已完成，也不等于实验成功。';
  renderExperiments(); renderObservations();
  return {root, connect: p => portal = p, activate(id) {
    if (!active) { active = true; savedViewport = viewport?.content || ''; viewport?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    }
    if (id) showRecord(id); else showIndex();
  }, deactivate() { active = false; catalogTop = 0; home = false; pendingSection = null; $('[data-reader]').hidden = true; $('[data-index]').hidden = false; if (viewport && savedViewport) viewport.content = savedViewport; }};
};
