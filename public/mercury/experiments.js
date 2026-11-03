/* Reviewed local implementations only. Visitor input is data, never executable code. */
globalThis.OrbitMercuryExperiments = (() => {
  const values = Object.freeze([3, 8, 13, 21, 34, 42, 55, 63, 72, 81, 89, 97, 105, 118, 130, 144]);
  const core = globalThis.OrbitMercuryCore;
  const el = (tag, text, cls = '') => {
    const node = document.createElement(tag); node.textContent = text; node.className = cls; return node;
  };

  function createSearch(host) {
    host.innerHTML = `<div class="mer-lab-head"><div><p class="mer-caption">运行于浏览器 / JavaScript</p><h3>二分查找</h3></div><span class="mer-caption">16 个有序整数</span></div>
      <p class="mer-lab-intro">每一次比较，都让答案更近一点。</p>
      <form class="mer-controls" novalidate><label>查找目标 <input data-target type="number" min="-999" max="999" step="1" value="81" inputmode="numeric" aria-describedby="mercuryInputHelp mercuryInputError"></label><button type="submit" data-step>下一步</button><button type="button" data-play aria-pressed="false">自动演示</button><button type="button" data-reset>重置</button></form>
      <p id="mercuryInputHelp" class="mer-caption">输入 −999 至 999 的整数。只改变本次演示，不保存数据。</p><p id="mercuryInputError" class="mer-input-error" role="alert"></p>
      <div class="mer-array" role="list" aria-label="有序整数序列"></div><p class="mer-lab-state" role="status" aria-live="polite" data-result></p><div class="mer-lab-legend mer-caption"><span>待查范围</span><span>当前比较</span><span>已排除</span></div>`;
    const $ = s => host.querySelector(s), input = $('[data-target]');
    let trace = null, index = -1, timer = 0, target = null;
    for (const [i, number] of values.entries()) {
      const item = el('div', '', 'mer-cell'); item.setAttribute('role', 'listitem');
      item.append(el('span', String(number)), el('small', String(i).padStart(2, '0'))); $('.mer-array').append(item);
    }
    function stop() { clearTimeout(timer); timer = 0; $('[data-play]').textContent = '自动演示'; $('[data-play]').setAttribute('aria-pressed', 'false'); }
    function render() {
      const step = trace?.steps[index];
      [...$('.mer-array').children].forEach((item, i) => {
        const excluded = step && (i < step.low || i > step.high);
        item.className = 'mer-cell' + (excluded ? ' is-excluded' : '') + (step?.mid === i ? ' is-current' : '') + (step?.outcome === 'found' && step.mid === i ? ' is-found' : '');
        item.setAttribute('aria-label', `${values[i]}，索引 ${i}${excluded ? '，已排除' : step?.mid === i ? '，当前比较' : '，待查范围'}`);
      });
      $('[data-step]').disabled = !!step && index >= trace.steps.length - 1;
      if (!trace) { $('[data-result]').textContent = '请先输入有效的整数。'; return; }
      if (!step) { $('[data-result]').textContent = `查找 ${target}。从完整序列开始，点击「下一步」进行比较。`; return; }
      const comparison = index + 1;
      $('[data-result]').textContent = step.outcome === 'found' ? `找到 ${target}，索引 ${step.mid}。共比较 ${trace.comparisons} 次。` :
        step.outcome === 'missing' ? `序列中没有 ${target}。共比较 ${trace.comparisons} 次，查找结束。` :
        `第 ${comparison} 次比较：${step.value} ${step.outcome === 'right' ? '小于' : '大于'} ${target}，下一步保留${step.outcome === 'right' ? '右' : '左'}半区间。`;
    }
    function prepare() {
      stop(); index = -1;
      const value = Number(input.value);
      const valid = input.value.trim() !== '' && Number.isSafeInteger(value) && value >= -999 && value <= 999;
      input.setAttribute('aria-invalid', String(!valid));
      $('#mercuryInputError').textContent = valid ? '' : '请输入 −999 至 999 之间的整数。';
      trace = valid ? core.binarySearchTrace([...values], value) : null; target = valid ? value : null; render(); return valid;
    }
    function next() {
      if (!trace && !prepare()) return false;
      if (index < trace.steps.length - 1) index++;
      render(); return index < trace.steps.length - 1;
    }
    function tick() { if (!next()) { stop(); return; } timer = setTimeout(tick, 850); }
    $('form').onsubmit = event => { event.preventDefault(); stop(); next(); };
    input.addEventListener('input', prepare);
    $('[data-reset]').onclick = prepare;
    $('[data-play]').onclick = () => {
      if (timer) { stop(); return; }
      if ((!trace || index >= trace.steps.length - 1) && !prepare()) return;
      $('[data-play]').textContent = '暂停演示'; $('[data-play]').setAttribute('aria-pressed', 'true');
      timer = setTimeout(tick, 100);
    };
    const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }); observer.observe(host);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    prepare();
    return {stop};
  }

  function createHero(host) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 640 440'); svg.setAttribute('aria-hidden', 'true');
    const nodes = new Map(), edges = new Map(), trace = core.binarySearchTrace([...values], 81);
    function node(tag, attributes) { const n = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attributes)) n.setAttribute(key, value); svg.append(n); return n; }
    function tree(low, high, left, right, depth, parent) {
      if (low > high) return;
      const mid = low + Math.floor((high - low) / 2), x = (left + right) / 2, y = 48 + depth * 82;
      if (parent) edges.set(mid, node('line', {x1: parent.x, y1: parent.y, x2: x, y2: y}));
      const g = document.createElementNS(ns, 'g'); g.dataset.mid = mid;
      const circle = document.createElementNS(ns, 'circle'); circle.setAttribute('cx', x); circle.setAttribute('cy', y); circle.setAttribute('r', 15);
      const label = document.createElementNS(ns, 'text'); label.setAttribute('x', x); label.setAttribute('y', y + 4); label.textContent = values[mid];
      g.append(circle, label); svg.append(g); nodes.set(mid, g);
      tree(low, mid - 1, left, x, depth + 1, {x, y}); tree(mid + 1, high, x, right, depth + 1, {x, y});
    }
    tree(0, values.length - 1, 8, 632, 0, null); host.prepend(svg);
    const caption = el('p', '', 'mer-caption'); host.append(caption);
    let active = false, visible = false, timer = 0, index = 0;
    const reduced = matchMedia('(prefers-reduced-motion:reduce)');
    function paint() {
      const upto = reduced.matches ? trace.steps.length - 1 : index, path = trace.steps.slice(0, upto + 1).map(s => s.mid);
      for (const [mid, n] of nodes) n.classList.toggle('is-path', path.includes(mid));
      for (const [mid, n] of edges) n.classList.toggle('is-path', path.includes(mid));
      caption.textContent = '二分查找 / 目标 81 / ' + (reduced.matches || index === trace.steps.length - 1 ? `找到索引 ${trace.result}` : `第 ${index + 1} 次比较`);
    }
    function stop() { clearTimeout(timer); timer = 0; }
    function sync() {
      stop(); paint();
      if (active && visible && !document.hidden && !reduced.matches) timer = setTimeout(() => { index = (index + 1) % trace.steps.length; sync(); }, 1400);
    }
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }); observer.observe(host);
    reduced.addEventListener('change', sync); document.addEventListener('visibilitychange', sync); paint();
    return {setActive(value) { active = value; sync(); }};
  }
  return Object.freeze({createSearch, createHero});
})();
