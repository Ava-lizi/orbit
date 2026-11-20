window.createUranusInnerSky = function(publicArchive, THREE, landscapeTemplate) {
  const store = window.OrbitInnerSkyStore;
  const title = '思绪星海 · THE INNER SKY';
  const archiveIndex = '~archive';
  const root = document.createElement('section');
  root.id = 'uranusWorld';
  root.className = 'inner-sky';
  root.hidden = true;
  root.tabIndex = -1;
  root.setAttribute('aria-label', '未央');
  root.innerHTML = `
    <main class="sky-world" aria-label="思绪星海 · THE INNER SKY">
      <canvas data-sky tabindex="0" aria-label="想法星空。方向键浏览星体，回车查看，加号或减号缩放。"></canvas>
      <header class="sky-header">
        <button type="button" class="sky-home" data-orbit-home>← ORBIT</button>
        <h1 class="sky-identity">未央</h1>
      </header>
      <div class="sky-empty" data-empty hidden>
        <p>这里，还没有留下任何念头。</p>
        <button type="button" class="sky-first" data-first>记录第一个想法 <span aria-hidden="true">↗</span></button>
      </div>
      <div class="sky-hover" data-tooltip aria-hidden="true">
        <p class="sky-caption" data-tooltip-title></p>
      </div>
      <div class="sky-status" data-storage-status hidden>
        <p role="status" data-storage-message></p>
        <button type="button" data-retry hidden>重试</button>
      </div>
      <footer class="sky-actions">
        <button type="button" class="sky-add" data-add disabled>
          <span class="sky-fold" aria-hidden="true"></span><span>记下想法</span>
        </button>
        <div class="sky-secondary">
          <div class="sky-search" data-search-shell>
            <button type="button" data-search aria-label="搜索想法" aria-controls="sky-query sky-results" aria-expanded="false">搜索</button>
            <div class="sky-query-wrap" data-query-wrap inert>
              <input id="sky-query" data-query type="search" aria-label="搜索标题或正文" placeholder="搜索标题或正文" autocomplete="off">
              <div class="sky-results" id="sky-results" data-results hidden>
                <p class="sky-result-status" data-result-status role="status"></p>
                <ul data-result-list aria-label="匹配的想法"></ul>
              </div>
            </div>
          </div>
          <div class="sky-utility">
            <button type="button" data-tools aria-label="星空工具" aria-expanded="false" aria-controls="sky-tools">工具</button>
            <div class="sky-tools" id="sky-tools" data-tools-panel inert>
              <button type="button" data-reset>重置视角</button>
              <button type="button" data-export disabled>导出 JSON</button>
              <button type="button" data-archive hidden>公开档案</button>
            </div>
          </div>
        </div>
      </footer>
      <aside class="sky-detail" data-detail aria-labelledby="sky-detail-title" inert>
        <div class="sky-detail-bar"><button type="button" class="sky-close" data-close aria-label="关闭详情">×</button></div>
        <article class="sky-reading" data-reading tabindex="0" aria-label="想法正文">
          <time data-created></time>
          <h2 id="sky-detail-title" tabindex="-1" data-detail-title></h2>
          <p class="sky-prose" data-body></p>
        </article>
        <div class="sky-detail-actions">
          <button type="button" data-edit>编辑</button>
          <button type="button" class="sky-delete" data-delete>删除</button>
        </div>
      </aside>
      <dialog class="sky-dialog sky-writer" data-editor aria-labelledby="sky-editor-title">
        <form data-form>
          <header><h2 id="sky-editor-title" data-editor-title></h2><button type="button" class="sky-close" data-cancel-edit aria-label="关闭编辑器">×</button></header>
          <label class="sky-writer-title"><span class="sky-accessible">标题，选填</span><input name="title" type="text" autocomplete="off" placeholder="标题（选填）"></label>
          <label class="sky-writer-body"><span class="sky-accessible">正文</span><textarea name="body" required placeholder="写下此刻的想法…"></textarea></label>
          <p class="sky-form-error" data-form-error role="alert" hidden></p>
          <footer><button type="button" data-cancel>取消</button><button type="submit" class="sky-primary" data-save>保存想法 <span aria-hidden="true">↗</span></button></footer>
        </form>
      </dialog>
      <dialog class="sky-dialog sky-confirm" data-confirm aria-labelledby="sky-confirm-title">
        <div>
          <h2 id="sky-confirm-title">删除这条想法？</h2>
          <p>确认后，这条想法和它对应的星体都会被移除。</p>
          <p class="sky-form-error" data-delete-error role="alert" hidden></p>
          <footer><button type="button" data-cancel-delete autofocus>取消</button><button type="button" class="sky-delete sky-danger" data-confirm-delete>确认删除</button></footer>
        </div>
      </dialog>
      <p class="sky-accessible" role="status" data-announcement></p>
    </main>`;
  document.body.append(root);

  const $ = name => root.querySelector(`[data-${name}]`);
  const sky = root.querySelector('.sky-world');
  const canvas = $('sky'), panel = $('detail'), input = $('query');
  const editor = $('editor'), form = $('form'), confirmation = $('confirm'), tooltip = $('tooltip');
  const viewport = document.querySelector('meta[name=viewport]');
  const formatDate = new Intl.DateTimeFormat('zh-CN', {dateStyle: 'medium', timeStyle: 'short', hour12: false});
  const ideas = new Map();
  let portal, active = false, inArchive = false, loaded = false, searchOpen = false;
  let visit = 0, refreshSequence = 0, scope, channel, previousViewport, editing, deleting, writing = false;
  let selected, detailTrigger, tooltipIdea, tooltipPosition, query = '', toolsOpen = false;

  // Keep the former published material available through the same portal and detail URLs.
  publicArchive.root.id = 'uranusFutureArchive';
  root.append(publicArchive.root);
  $('archive').hidden = !window.ORBIT_FUTURE.ideas.length;

  const scene = window.createInnerSkyScene(canvas, {
    makeLandscape(onContextLost) {
      if (!landscapeTemplate || !window.createUranusLandscape) return null;
      const surface = landscapeTemplate.content.querySelector('canvas').cloneNode();
      const landscape = window.createUranusLandscape(THREE, surface, onContextLost);
      if (!landscape) return null;
      canvas.before(surface);
      return {
        render: landscape.render,
        dispose() {
          surface.remove();
          landscape.dispose();
        }
      };
    },
    detailSpace: () => panel.offsetLeft > 0
      ? {width: panel.offsetLeft, height: canvas.clientHeight}
      : {width: canvas.clientWidth, height: panel.offsetTop},
    onHit(hit) { canvas.classList.toggle('has-star', hit); },
    onHover(idea, point, width, height) {
      if (!idea) {
        tooltip.classList.remove('is-visible');
        return;
      }
      if (tooltipIdea !== idea) {
        $('tooltip-title').textContent = store.label(idea);
        tooltipIdea = idea;
      }
      const x = Math.round(point.x), y = Math.round(point.y);
      const position = `translate3d(${x}px, ${y}px, 0)`;
      if (position !== tooltipPosition) {
        tooltip.style.transform = position;
        tooltipPosition = position;
      }
      tooltip.classList.toggle('align-left', x > width - Math.min(254, width * .51));
      tooltip.classList.toggle('align-below', y < Math.min(128, height * .18));
      tooltip.classList.add('is-visible');
    },
    onSelect: id => openDetail(id, canvas),
    onKeyboardFocus: idea => { $('announcement').textContent = store.label(idea); }
  });

  function feedback(message, retry = false) {
    $('storage-status').hidden = !message;
    $('storage-message').textContent = message;
    $('retry').hidden = !retry;
  }

  function renderResults() {
    const matches = query ? [...ideas.values()].filter(idea => store.matches(idea, query))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
    scene.setMatches(query ? new Set(matches.map(idea => idea.id)) : null);
    $('results').hidden = !searchOpen || !query;
    $('result-status').textContent = query && !matches.length ? '没有找到匹配的想法。' : '';
    $('result-status').hidden = Boolean(matches.length);
    const buttons = document.createDocumentFragment();
    // Limit the result DOM while keeping every match highlighted in the sky.
    for (const idea of matches.slice(0, 30)) {
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = store.label(idea);
      button.dataset.ideaId = idea.id;
      row.append(button);
      buttons.append(row);
    }
    if (matches.length > 30) {
      const more = document.createElement('li');
      more.className = 'sky-result-status';
      more.textContent = '请缩小关键词范围以查看其他匹配。';
      buttons.append(more);
    }
    $('result-list').replaceChildren(buttons);
  }

  function setSearch(open, {clear = false, focus = true} = {}) {
    searchOpen = open;
    if (!open && focus) $('search').focus({preventScroll: true});
    $('query-wrap').inert = !open;
    $('search-shell').classList.toggle('is-open', open);
    $('search').setAttribute('aria-expanded', String(open));
    if (clear) input.value = query = '';
    $('search').classList.toggle('has-query', Boolean(query));
    renderResults();
    if (open && focus) input.focus({preventScroll: true});
  }

  function setTools(open, focus = false) {
    toolsOpen = open;
    if (open && searchOpen) setSearch(false, {clear: true, focus: false});
    const toggle = $('tools');
    if (focus) toggle.focus({preventScroll: true});
    toggle.setAttribute('aria-expanded', String(open));
    $('tools-panel').inert = !open;
  }

  function renderDetail(idea) {
    $('detail-title').textContent = idea.title || '未命名想法';
    $('created').dateTime = idea.createdAt;
    $('created').textContent = formatDate.format(new Date(idea.createdAt));
    $('body').textContent = idea.body;
  }

  function openDetail(id, trigger, center = false) {
    const idea = ideas.get(id);
    if (!idea) return;
    selected = id;
    detailTrigger = trigger;
    setTools(false);
    if (searchOpen) setSearch(false, {focus: false});
    renderDetail(idea);
    $('reading').scrollTop = 0;
    panel.inert = false;
    panel.classList.add('is-open');
    scene.select(id, center);
    $('detail-title').focus({preventScroll: true});
  }

  function closeDetail(restore = true) {
    if (!selected) return;
    selected = null;
    if (restore) (detailTrigger?.isConnected ? detailTrigger : canvas).focus({preventScroll: true});
    detailTrigger = null;
    panel.inert = true;
    panel.classList.remove('is-open');
    scene.select(null);
  }

  function renderIdeas(newId) {
    $('empty').hidden = !loaded || ideas.size > 0;
    $('add').disabled = !loaded;
    $('export').disabled = !loaded || !ideas.size;
    scene.setIdeas([...ideas.values()], newId);
    renderResults();
    if (selected && ideas.has(selected)) renderDetail(ideas.get(selected));
    else closeDetail();
  }

  async function refresh() {
    const sequence = ++refreshSequence;
    try {
      const records = await store.list();
      if (sequence !== refreshSequence) return;
      ideas.clear();
      for (const idea of records) ideas.set(idea.id, idea);
      loaded = true;
      feedback(scene.available ? '' : '星空无法绘制，仍可通过搜索打开想法。');
      renderIdeas();
    } catch {
      if (sequence !== refreshSequence) return;
      feedback('无法读取本地想法。请检查浏览器的站点数据设置。', true);
    }
  }

  function edit(idea = null, origin = 'center') {
    if (!loaded || writing || editor.open || confirmation.open) return;
    editing = idea;
    editor.dataset.origin = origin;
    setTools(false);
    $('editor-title').textContent = idea ? '编辑想法' : '记下想法';
    form.elements.title.value = idea?.title || '';
    form.elements.body.value = idea?.body || '';
    $('form-error').hidden = true;
    editor.showModal();
    form.elements.body.focus();
  }

  function errorText(error, fallback) {
    return error?.name === 'Error' && error.message ? error.message : fallback;
  }

  function setBusy(value) {
    writing = value;
    $('save').disabled = $('confirm-delete').disabled = value;
    form.elements.title.readOnly = form.elements.body.readOnly = value;
    for (const name of ['cancel', 'cancel-edit', 'cancel-delete']) $(name).disabled = value;
  }

  $('orbit-home').onclick = () => portal.requestClose();
  $('tools').onclick = () => setTools(!toolsOpen);
  $('reset').onclick = () => { scene.reset(); setTools(false, toolsOpen); };
  $('add').onclick = () => edit(null, 'seed');
  $('first').onclick = () => edit();
  $('edit').onclick = () => edit(ideas.get(selected));
  $('close').onclick = () => closeDetail();
  $('archive').onclick = () => portal.detail(archiveIndex);
  $('retry').onclick = refresh;
  $('search').onclick = () => {
    setTools(false);
    if (!searchOpen && selected) closeDetail(false);
    setSearch(!searchOpen, {clear: searchOpen});
  };
  input.oninput = () => {
    query = input.value.trim().toLowerCase();
    $('search').classList.toggle('has-query', Boolean(query));
    renderResults();
  };
  input.onkeydown = event => {
    if (event.key === 'ArrowDown' || (event.key === 'Enter' && !event.isComposing)) {
      const first = $('result-list').querySelector('button');
      if (!first) return;
      event.preventDefault();
      if (event.key === 'Enter') first.click();
      else first.focus();
    }
  };
  $('result-list').onclick = event => {
    const item = event.target.closest('[data-idea-id]');
    if (item) openDetail(item.dataset.ideaId, $('search'), true);
  };
  $('export').onclick = async () => {
    const version = visit;
    try {
      const records = await store.list();
      if (version !== visit) return;
      const url = URL.createObjectURL(new Blob([store.backup(records)], {type: 'application/json'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = `orbit-inner-sky-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (version === visit) feedback('无法导出想法。请检查本地存储后重试。');
    }
  };
  sky.addEventListener('pointerdown', event => {
    if (toolsOpen && !event.target.closest('.sky-utility')) setTools(false);
  });

  $('cancel').onclick = $('cancel-edit').onclick = () => editor.close();
  $('cancel-delete').onclick = () => confirmation.close();
  for (const dialog of [editor, confirmation]) dialog.addEventListener('cancel', event => {
    if (writing) event.preventDefault();
  });
  form.onsubmit = async event => {
    event.preventDefault();
    if (writing) return;
    const version = visit, previous = editing, error = $('form-error');
    error.hidden = true;
    setBusy(true);
    try {
      const title = form.elements.title.value, body = form.elements.body.value;
      const idea = previous ? await store.update(previous, title, body) : await store.create(title, body);
      channel?.postMessage('changed');
      if (version !== visit) { if (active && !inArchive) refresh(); return; }
      ++refreshSequence;
      ideas.set(idea.id, idea);
      if (!previous && query && !store.matches(idea, query)) setSearch(false, {clear: true, focus: false});
      editor.close();
      renderIdeas(previous ? null : idea.id);
      if (!previous) {
        scene.reveal(idea.id);
        canvas.focus({preventScroll: true});
      }
      $('announcement').textContent = previous ? '想法已更新。' : '新的想法已点亮。';
    } catch (cause) {
      if (version !== visit) return;
      error.textContent = errorText(cause, '无法保存想法。请检查本地存储后重试。');
      error.hidden = false;
    } finally {
      setBusy(false);
    }
  };
  $('delete').onclick = () => {
    if (writing || !ideas.has(selected)) return;
    deleting = ideas.get(selected);
    $('delete-error').hidden = true;
    confirmation.showModal();
  };
  $('confirm-delete').onclick = async () => {
    if (writing || !deleting) return;
    const version = visit, id = deleting.id, error = $('delete-error');
    error.hidden = true;
    setBusy(true);
    try {
      await store.remove(deleting);
      channel?.postMessage('changed');
      if (version !== visit) { if (active && !inArchive) refresh(); return; }
      ++refreshSequence;
      ideas.delete(id);
      confirmation.close();
      renderIdeas();
      $('announcement').textContent = '想法已删除。';
    } catch (cause) {
      if (version !== visit) return;
      error.textContent = errorText(cause, '无法删除想法。请检查本地存储后重试。');
      error.hidden = false;
    } finally {
      setBusy(false);
    }
  };
  root.addEventListener('keydown', event => {
    if (inArchive || editor.open || confirmation.open) return;
    if (event.key === 'Escape' && !event.isComposing) {
      event.preventDefault();
      if (selected) closeDetail();
      else if (searchOpen || query) setSearch(false, {clear: true});
      else if (toolsOpen) setTools(false, true);
      else portal.requestClose();
    }
    if (event.key === 'Tab') {
      const all = [...sky.querySelectorAll('button:not(:disabled), input, canvas, [tabindex="0"]')]
        .filter(node => node.getClientRects().length && !node.closest('[inert]'));
      const first = all[0], last = all.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  });

  function startSky() {
    sky.hidden = false;
    document.title = '未央 · ' + title;
    if (scope) return;
    scope = new AbortController();
    try {
      if (typeof BroadcastChannel === 'function') {
        channel = new BroadcastChannel(store.databaseName);
        channel.onmessage = refresh;
      }
    } catch { /* Some browser contexts only support the focus-based refresh. */ }
    window.addEventListener('focus', refresh, {signal: scope.signal});
    scene.start();
    renderIdeas();
    refresh();
  }

  function stopSky() {
    ++visit;
    ++refreshSequence;
    scope?.abort();
    scope = null;
    channel?.close();
    channel = null;
    if (editor.open) editor.close();
    if (confirmation.open) confirmation.close();
    form.reset();
    editing = deleting = null;
    closeDetail(false);
    setSearch(false, {clear: true, focus: false});
    setTools(false);
    scene.stop();
    ideas.clear();
    loaded = false;
    renderIdeas();
    for (const name of ['detail-title', 'created', 'body', 'tooltip-title', 'announcement']) $(name).textContent = '';
    tooltipIdea = null;
    $('created').removeAttribute('datetime');
    feedback('');
    sky.hidden = true;
  }

  function hideArchive() {
    publicArchive.deactivate();
    publicArchive.root.hidden = true;
    publicArchive.root.classList.remove('is-open');
    inArchive = false;
  }

  return {
    root,
    connect(api) {
      portal = api;
      publicArchive.connect({
        ...api,
        detail: (slug, replace) => api.detail(slug || archiveIndex, replace || !slug)
      });
    },
    activate(slug) {
      if (!active) {
        active = true;
        previousViewport = viewport?.content;
        viewport?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
      }
      if (slug !== null) {
        if (!inArchive) stopSky();
        inArchive = true;
        publicArchive.root.hidden = false;
        publicArchive.root.classList.add('is-open');
        publicArchive.root.focus({preventScroll: true});
        publicArchive.activate(slug === archiveIndex || !slug ? null : slug);
      } else {
        if (inArchive) hideArchive();
        startSky();
        if (!root.contains(document.activeElement) || document.activeElement === publicArchive.root) root.focus({preventScroll: true});
      }
    },
    deactivate() {
      active = false;
      if (inArchive) hideArchive();
      stopSky();
      if (viewport && previousViewport != null) viewport.content = previousViewport;
    }
  };
};
