/* Structured prose is rendered using DOM nodes and textContent, never rich-text HTML. */
window.OrbitWritingsView = (()=>{
 const imagePath=/^\.\/public\/(earth|neptune)\/images\/[a-z0-9][a-z0-9_-]*\.(jpg|jpeg|png|webp|avif)$/;
 function image(block){
  if(typeof block.src!=='string'||!imagePath.test(block.src))return null;
  const figure=document.createElement('figure'),img=document.createElement('img');img.loading='lazy';img.decoding='async';img.alt=String(block.alt||'文章配图');img.width=Number(block.width)>0?Math.min(Number(block.width),10000):960;img.height=Number(block.height)>0?Math.min(Number(block.height),10000):640;img.src=block.src;
  img.onerror=()=>{img.hidden=true;let p=figure.querySelector('[data-error]');if(!p){p=document.createElement('p');p.dataset.error='';figure.prepend(p);}p.textContent='配图暂时无法载入，文字仍可继续阅读。';};
  figure.append(img);if(block.caption){const caption=document.createElement('figcaption');caption.className='nep-caption';caption.textContent=String(block.caption);figure.append(caption);}return figure;
 }
 function renderBlocks(target,blocks){target.replaceChildren();for(const block of blocks||[]){let node;if(block.type==='image'){node=image(block);}else if(['paragraph','heading','quote'].includes(block.type)){node=document.createElement(block.type==='heading'?(block.level===3?'h3':'h2'):block.type==='quote'?'blockquote':'p');node.textContent=String(block.text||'');}if(node)target.append(node);}}
 return {renderBlocks,imagePath};
})();

window.createNeptuneReader = function(data) {
  const indexHash = '#/neptune';
  const articlePrefix = indexHash + '/article/';
  const sizeKey = 'orbit.neptune.text-size';
  const sizes = ['small', 'regular', 'large'];
  const sortPublished = items => items
    .filter(article => article.status === 'published')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  let articles = sortPublished(window.OrbitNeptuneFile?.embedded() ?? data.articles);
  data.articles = articles;

  const root = document.createElement('section');
  root.id = 'neptuneWorld';
  root.className = 'neptune-world';
  root.hidden = true;
  root.tabIndex = -1;
  root.setAttribute('aria-label', '深蓝 · 文学馆');
  root.innerHTML = `
    <a class="neptune-skip" href="#neptuneMain">跳至主要内容</a>
    <header class="neptune-header">
      <button type="button" class="neptune-brand" data-foyer>NEPTUNE <span>/</span> WRITINGS</button>
      <nav aria-label="文学馆导航">
        <button type="button" data-directory>文字档案</button>
        <div class="neptune-return">
          <button type="button" data-return-toggle aria-expanded="false" aria-controls="neptuneReturnChoices"><span aria-hidden="true">←</span> 返回</button>
          <div class="neptune-return-choices" id="neptuneReturnChoices" role="group" aria-label="返回目的地" hidden>
            <button type="button" data-return-home>深蓝。首页</button>
            <button type="button" data-return-orbit>返回海王星</button>
          </div>
        </div>
      </nav>
    </header>
    <main class="neptune-index" id="neptuneMain" data-index>
      <section class="neptune-foyer" data-cover aria-labelledby="neptuneCoverTitle">
        <div class="neptune-cover-title">
          <h1 id="neptuneCoverTitle" tabindex="-1">深蓝。</h1>
          <p class="neptune-subtitle">在世界的尽头，听见自己的回声。</p>
        </div>
        <div class="neptune-intro">
          <p>我想记下一些普通的时刻。</p>
          <p>傍晚经过窗边的风，<br>雨后迟迟未干的街道，<br>还有那些说到一半，便停住的话。</p>
          <p>不为证明什么。<br>只是不想忘记。</p>
          <button type="button" class="neptune-start" data-directory>翻阅文字 <span aria-hidden="true">→</span></button>
        </div>
      </section>
      <section class="neptune-directory" id="neptuneDirectory" aria-labelledby="neptuneDirectoryTitle" hidden>
        <header class="neptune-directory-head">
          <div>
            <p class="neptune-directory-label">文学档案 <span aria-hidden="true">/</span> <span lang="en">THE ARCHIVE</span></p>
            <h1 id="neptuneDirectoryTitle" tabindex="-1">深蓝。</h1>
          </div>
          <div class="neptune-directory-tools">
            <p>文字留在这里，时间继续向前。</p>
            <button type="button" data-local-author hidden>文稿管理</button>
          </div>
        </header>
        <div class="neptune-directory-bar">
          <div class="neptune-filters" role="group" aria-label="文章分类"></div>
          <p class="nep-caption" data-count aria-live="polite"></p>
        </div>
        <div class="neptune-empty" data-archive-empty hidden>
          <p class="nep-caption neptune-empty-label" lang="en">THE FIRST PAGE</p>
          <div class="neptune-empty-copy">
            <h2>尚未写下的篇章。</h2>
            <p>每一座档案馆，都从第一篇文字开始。</p>
            <button type="button" data-start-writing hidden>开始写作 <span aria-hidden="true">↗</span></button>
          </div>
        </div>
        <div class="neptune-empty" data-category-empty hidden>
          <p class="nep-caption neptune-empty-label">分类</p>
          <div class="neptune-empty-copy">
            <h2>此分类暂无公开文稿。</h2>
            <button type="button" data-clear-filter>查看全部 <span aria-hidden="true">→</span></button>
          </div>
        </div>
        <div data-list></div>
      </section>
    </main>
    <main class="neptune-reader" data-reader hidden>
      <div class="neptune-reader-toolbar">
        <button type="button" data-catalog><span aria-hidden="true">←</span> 返回文字档案</button>
        <div class="neptune-reader-tools">
          <button type="button" data-focus aria-pressed="false">专注阅读</button>
          <div class="neptune-type-controls" role="group" aria-label="正文字号">
            <button type="button" data-smaller aria-label="缩小正文字号">字−</button>
            <button type="button" data-larger aria-label="放大正文字号">字＋</button>
          </div>
        </div>
      </div>
      <article aria-labelledby="neptuneArticleTitle">
        <header class="neptune-article-header">
          <p class="nep-caption" data-category></p>
          <h1 id="neptuneArticleTitle" data-title tabindex="-1"></h1>
          <div class="neptune-article-meta nep-caption">
            <time data-date></time>
            <span data-demo></span>
          </div>
        </header>
        <div class="neptune-prose" data-prose></div>
        <aside class="neptune-related" data-related aria-label="关联影像" hidden></aside>
      </article>
      <nav class="neptune-article-nav" aria-label="文章切换">
        <button type="button" data-prev><small>上一篇</small><span></span></button>
        <button type="button" data-next><small>下一篇</small><span></span></button>
      </nav>
    </main>
    <div class="neptune-progress" role="progressbar" aria-label="正文阅读进度"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden><span></span></div>
    <footer class="neptune-footer" hidden>
      <p data-footer>本馆收录了已标记的演示文章，日期与情节均为示例。</p>
    </footer>`;
  document.body.append(root);

  const $ = selector => root.querySelector(selector);
  const header = $('.neptune-header');
  const returnGroup = $('.neptune-return');
  const returnToggle = $('[data-return-toggle]');
  const returnChoices = $('#neptuneReturnChoices');
  const returnHome = $('[data-return-home]');
  const index = $('[data-index]');
  const cover = $('[data-cover]');
  const directory = $('#neptuneDirectory');
  const footer = $('.neptune-footer');
  const reader = $('[data-reader]');
  const title = $('[data-title]');
  const prose = $('[data-prose]');
  const progress = $('.neptune-progress');
  const focusButton = $('[data-focus]');
  const smaller = $('[data-smaller]');
  const larger = $('[data-larger]');
  const filters = $('.neptune-filters');
  const viewport = document.querySelector('meta[name="viewport"]');
  let portal;
  let active = false;
  let focused = false;
  let filter = null;
  let catalogScroll = 0;
  let catalogRequested = false;
  let savedViewport = null;
  let progressFrame = 0;
  let size = 1;

  try {
    const savedSize = sizes.indexOf(localStorage.getItem(sizeKey));
    if (savedSize !== -1) size = savedSize;
  } catch {
    // The reader still works when browser storage is unavailable.
  }

  function applySize() {
    reader.dataset.size = sizes[size];
    smaller.disabled = size === 0;
    larger.disabled = size === sizes.length - 1;
  }

  function changeSize(delta, button) {
    size = Math.max(0, Math.min(sizes.length - 1, size + delta));
    applySize();
    if (button.disabled) (delta < 0 ? larger : smaller).focus({preventScroll: true});
    try {
      localStorage.setItem(sizeKey, sizes[size]);
    } catch {
      // Keep the preference for the current page.
    }
    scheduleProgress();
  }

  function focusMode(on) {
    focused = on;
    root.classList.toggle('is-focused', on);
    focusButton.textContent = on ? '退出专注' : '专注阅读';
    focusButton.setAttribute('aria-pressed', String(on));
    scheduleProgress();
  }

  function setProgress(fraction) {
    progress.style.setProperty('--neptune-progress', String(fraction));
    const percent = String(Math.round(fraction * 100));
    if (progress.getAttribute('aria-valuenow') !== percent) progress.setAttribute('aria-valuenow', percent);
  }

  function scheduleProgress() {
    if (progress.hidden || progressFrame) return;
    progressFrame = requestAnimationFrame(() => {
      progressFrame = 0;
      const end = prose.getBoundingClientRect().bottom - root.getBoundingClientRect().top;
      const range = root.scrollTop + end - root.clientHeight;
      setProgress(range <= 0 ? 1 : Math.max(0, Math.min(1, root.scrollTop / range)));
    });
  }

  const progressObserver = new ResizeObserver(scheduleProgress);
  function stopProgress() {
    progress.hidden = true;
    progressObserver.disconnect();
    root.removeEventListener('scroll', scheduleProgress);
    cancelAnimationFrame(progressFrame);
    progressFrame = 0;
    setProgress(0);
  }

  function startProgress() {
    if (!prose.childElementCount) return;
    progress.hidden = false;
    progressObserver.observe(reader);
    progressObserver.observe(root);
    root.addEventListener('scroll', scheduleProgress, {passive: true});
    scheduleProgress();
  }

  function localLink(event) {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }

  function dateLabel(date) {
    return date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3');
  }

  function renderList() {
    const list = $('[data-list]');
    list.replaceChildren();
    let count = 0;
    for (const [i, article] of articles.entries()) {
      if (filter !== null && article.category !== filter) continue;
      count++;
      const row = document.createElement('article');
      row.className = 'neptune-row';
      const number = document.createElement('span');
      number.className = 'neptune-number nep-caption';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = String(i + 1).padStart(2, '0');
      const copy = document.createElement('div');
      copy.className = 'neptune-row-copy';
      const heading = document.createElement('h2');
      const link = document.createElement('a');
      link.href = articlePrefix + encodeURIComponent(article.slug);
      link.textContent = article.title;
      link.onclick = event => {
        if (!localLink(event)) return;
        event.preventDefault();
        catalogScroll = root.scrollTop;
        link.focus({preventScroll: true});
        portal.detail(article.slug);
      };
      heading.append(link);
      copy.append(heading);
      if (article.summary) {
        const summary = document.createElement('p');
        summary.textContent = article.summary;
        copy.append(summary);
      }
      const meta = document.createElement('div');
      meta.className = 'neptune-row-meta nep-caption';
      const category = document.createElement('span');
      category.textContent = article.category;
      meta.append(category);
      if (article.publishedAt) {
        const date = document.createElement('time');
        date.dateTime = article.publishedAt;
        date.textContent = dateLabel(article.publishedAt);
        meta.append(date);
      }
      if (article.demo) {
        const demo = document.createElement('span');
        demo.textContent = '演示';
        meta.append(demo);
      }
      row.append(number, copy, meta);
      list.append(row);
    }
    $('[data-archive-empty]').hidden = articles.length !== 0;
    $('[data-category-empty]').hidden = filter === null || count !== 0;
    $('[data-count]').textContent = `${count} 篇`;
    for (const button of filters.children) {
      button.setAttribute('aria-pressed', String((button.dataset.category ?? null) === filter));
    }
  }

  function closeReturn(restoreFocus = false) {
    if (returnChoices.hidden) return;
    returnChoices.hidden = true;
    returnToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) returnToggle.focus({preventScroll: true});
  }

  function showIndex(moveFocus = false) {
    closeReturn();
    const fromReader = !reader.hidden;
    if (catalogRequested && history.state?.neptuneView !== 'catalog') {
      history.replaceState({...history.state, neptuneView: 'catalog'}, '', indexHash);
    }
    const isCatalog = history.state?.neptuneView === 'catalog';
    if (!isCatalog) editor?.close(true);
    catalogRequested = false;
    stopProgress();
    focusMode(false);
    reader.hidden = true;
    header.hidden = index.hidden = false;
    cover.hidden = isCatalog;
    directory.hidden = !isCatalog;
    footer.hidden = !isCatalog || !articles.some(article => article.demo);
    const directoryButton = header.querySelector('[data-directory]');
    if (isCatalog) directoryButton.setAttribute('aria-current', 'page');
    else directoryButton.removeAttribute('aria-current');
    document.title = isCatalog ? '文字档案 · 深蓝' : '深蓝。 · NEPTUNE / WRITINGS';
    root.scrollTop = isCatalog ? catalogScroll : 0;

    if (moveFocus) (isCatalog ? directory : cover).querySelector('h1').focus({preventScroll: true});
    if (fromReader) {
      // The portal restores the originating link after this render. A direct URL has no link to restore.
      queueMicrotask(() => {
        if (document.activeElement === root && !index.hidden) {
          (isCatalog ? directory : cover).querySelector('h1').focus({preventScroll: true});
        }
      });
    }
  }

  function switchIndex(isCatalog) {
    if (!reader.hidden) {
      catalogRequested = true;
      portal.detail(null);
      return;
    }
    if (isCatalog === cover.hidden) return;
    if (cover.hidden) catalogScroll = root.scrollTop;
    history.pushState({...history.state, neptuneView: isCatalog ? 'catalog' : 'foyer'}, '', indexHash);
    showIndex(true);
  }

  function renderRelated(article) {
    const related = $('[data-related]');
    related.replaceChildren();
    for (const id of article?.relatedPhotoIds || []) {
      if (!/^[a-z0-9_-]+$/.test(id)) continue;
      const photo = window.ORBIT_PHOTOGRAPHY?.works.find(work => work.id === id);
      if (!photo) continue;
      const link = document.createElement('a');
      link.href = '#/earth/photo/' + encodeURIComponent(id);
      link.textContent = '到「人间」查看影像：' + photo.title + (photo.placeholder ? '（占位摄影）' : '');
      link.onclick = event => {
        if (!localLink(event)) return;
        event.preventDefault();
        portal.leaveTo(link.hash);
      };
      related.append(link);
    }
    related.hidden = !related.childElementCount;
  }

  function showArticle(slug) {
    editor?.close(true);
    closeReturn();
    const articleIndex = articles.findIndex(article => article.slug === slug);
    const article = articles[articleIndex];
    const category = $('[data-category]');
    const date = $('[data-date]');
    const demo = $('[data-demo]');
    stopProgress();
    if (!article) focusMode(false);
    header.hidden = index.hidden = footer.hidden = true;
    reader.hidden = false;
    title.textContent = article?.title ?? '这一页暂未公开。';
    document.title = title.textContent + ' · 深蓝';
    category.textContent = article?.category ?? '未找到公开文章';
    date.hidden = !article?.publishedAt;
    date.dateTime = article?.publishedAt ?? '';
    date.textContent = dateLabel(date.dateTime);
    demo.textContent = article
      ? (article.demo ? '演示文章 · 日期为示例' : '')
      : '请返回目录，选择已公开的文字。';
    demo.hidden = !demo.textContent;
    smaller.hidden = larger.hidden = focusButton.hidden = !article;

    window.OrbitWritingsView.renderBlocks(prose, article?.content);
    if (article?.coverImage) {
      const coverImage = typeof article.coverImage === 'string'
        ? {src: article.coverImage, alt: article.title}
        : article.coverImage;
      const image = document.createElement('div');
      window.OrbitWritingsView.renderBlocks(image, [{...coverImage, type: 'image'}]);
      if (image.firstChild) prose.prepend(image.firstChild);
    }
    renderRelated(article);
    const nav = $('.neptune-article-nav');
    let hasAdjacent = false;
    for (const [selector, offset] of [['[data-prev]', -1], ['[data-next]', 1]]) {
      const button = $(selector);
      const adjacent = article && articles[articleIndex + offset];
      button.hidden = !adjacent;
      button.querySelector('span').textContent = adjacent?.title ?? '';
      button.onclick = adjacent ? () => portal.detail(adjacent.slug, true) : null;
      hasAdjacent ||= Boolean(adjacent);
    }
    nav.hidden = !hasAdjacent;

    root.scrollTop = 0;
    title.focus({preventScroll: true});
    startProgress();
  }

  function renderFilters() {
    const categories = new Set(articles.length ? [
      ...articles.map(article => article.category).filter(Boolean),
      ...data.categories
    ] : []);
    if (!categories.has(filter)) filter = null;
    filters.replaceChildren();
    for (const category of [null, ...categories]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = category === '全部' ? '分类：全部' : category ?? '全部';
      if (category !== null) button.dataset.category = category;
      button.onclick = () => {
        if (filter === category) return;
        filter = category;
        renderList();
      };
      filters.append(button);
    }
  }

  returnToggle.onclick = () => {
    if (!returnChoices.hidden) {
      closeReturn(true);
      return;
    }
    returnChoices.hidden = false;
    returnToggle.setAttribute('aria-expanded', 'true');
    returnHome.focus({preventScroll: true});
  };
  returnHome.onclick = () => {
    closeReturn(true);
    switchIndex(false);
  };
  $('[data-return-orbit]').onclick = () => portal.leaveTo(location.pathname + location.search);
  document.addEventListener('pointerdown', event => {
    if (!returnGroup.contains(event.target)) closeReturn(returnChoices.contains(document.activeElement));
  });
  returnGroup.addEventListener('focusout', event => {
    if (event.relatedTarget && !returnGroup.contains(event.relatedTarget)) closeReturn();
  });
  root.querySelectorAll('[data-directory]').forEach(button => {
    button.onclick = () => switchIndex(true);
  });
  $('[data-foyer]').onclick = () => switchIndex(false);
  $('[data-catalog]').onclick = () => switchIndex(true);
  focusButton.onclick = () => focusMode(!focused);
  smaller.onclick = () => changeSize(-1, smaller);
  larger.onclick = () => changeSize(1, larger);
  $('.neptune-skip').onclick = event => {
    event.preventDefault();
    const heading = reader.hidden ? (cover.hidden ? directory : cover).querySelector('h1') : title;
    heading.focus();
  };

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !active || root.hidden || event.defaultPrevented) return;
    event.preventDefault();
    if (event.repeat) return;
    if (editor?.isOpen()) editor.escape();
    else if (!returnChoices.hidden) closeReturn(true);
    else if (focused) {
      focusMode(false);
      focusButton.focus({preventScroll: true});
    } else if (!reader.hidden) switchIndex(true);
    else if (cover.hidden) switchIndex(false);
  });

  root.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || editor?.isOpen()) return;
    const controls = [...root.querySelectorAll('button:not(:disabled), a[href]')]
      .filter(control => control.getClientRects().length && getComputedStyle(control).visibility === 'visible');
    const first = controls[0];
    const last = controls.at(-1);
    const target = document.activeElement;
    const followsLast = last?.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING;
    if (event.shiftKey && (target === first || target === root)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && last && (target === last || followsLast)) {
      event.preventDefault();
      first.focus();
    }
  });

  // Foyer and catalog share the legacy index hash. The portal handles article and planet routes.
  window.addEventListener('popstate', () => {
    if (!active || location.hash !== indexHash || index.hidden) return;
    if ((history.state?.neptuneView === 'catalog') === cover.hidden) return;
    if (cover.hidden) catalogScroll = root.scrollTop;
    showIndex(true);
  });

  const authorTrigger = $('[data-local-author]');
  const editor = window.OrbitNeptuneFile?.mount({
    root, trigger: authorTrigger, categories: data.categories, fallback: data.articles,
    onChange(items) {
      articles = sortPublished(items);
      data.articles = articles;
      renderFilters();
      renderList();
      footer.hidden = index.hidden || directory.hidden || !articles.some(article => article.demo);
    }
  });
  const startWriting = $('[data-start-writing]');
  startWriting.hidden = !editor;
  startWriting.onclick = () => authorTrigger.click();
  $('[data-clear-filter]').onclick = () => {
    filters.firstElementChild.click();
    filters.firstElementChild.focus({preventScroll: true});
  };
  applySize();
  if (!editor) {
    renderFilters();
    renderList();
  }

  return {
    root,
    connect(adapter) { portal = adapter; },
    activate(slug) {
      if (!active) {
        active = true;
        savedViewport = viewport?.getAttribute('content') ?? null;
        viewport?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
      }
      if (location.hash.startsWith(articlePrefix)) showArticle(slug);
      else showIndex();
    },
    deactivate() {
      editor?.close(true);
      closeReturn();
      active = false;
      catalogRequested = false;
      catalogScroll = 0;
      stopProgress();
      focusMode(false);
      if (savedViewport === null) viewport?.removeAttribute('content');
      else viewport?.setAttribute('content', savedViewport);
    }
  };
};
