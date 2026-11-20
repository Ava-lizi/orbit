(() => {
  'use strict';

  const assetBase = new URL('.', document.currentScript.src);
  const singularityFiles = ['singularity-formulas.js', 'singularity-surface.js', 'singularity-hole.js', 'singularity.js'];
  function loadSingularity() {
    return Promise.all(singularityFiles.map((file) => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(file, assetBase);
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    })));
  }

  const functions = {
    linear: {
      name: '一次函数', number: '01', form: 'y = ax + b',
      parameters: [['a', '斜率', -4, 4, .05, 1.5], ['b', '截距', -8, 8, .05, -2]],
      evaluate: ({ a, b }, x) => a * x + b
    },
    quadratic: {
      name: '二次函数', number: '02', form: 'y = ax² + bx + c',
      parameters: [['a', '二次项', -3, 3, .05, .7], ['b', '一次项', -6, 6, .05, -1], ['c', '常数项', -8, 8, .05, -2]],
      evaluate: ({ a, b, c }, x) => (a * x + b) * x + c
    },
    sine: {
      name: '正弦函数', number: '03', form: 'y = A sin(Bx + C)',
      parameters: [['A', '振幅', 0, 6, .05, 2.5], ['B', '角频率', 0, 5, .05, 1], ['C', '相位 · 弧度', -6.28, 6.28, .01, 0]],
      evaluate: ({ A, B, C }, x) => A * Math.sin(B * x + C)
    }
  };
  const ranges = [24, 16, 10, 6, 4, 2.5];
  const defaults = (definition) => Object.fromEntries(definition.parameters.map(([key, , , , , value]) => [key, value]));
  const number = (value) => Number(value.toFixed(2)).toString().replace('-', '−');
  const term = (value, variable = '') => ` ${value < 0 ? '−' : '+'} ${number(Math.abs(value))}${variable}`;

  function expression(type, values) {
    if (type === 'linear') return `y = ${number(values.a)}x${term(values.b)}`;
    if (type === 'quadratic') return `y = ${number(values.a)}x²${term(values.b, 'x')}${term(values.c)}`;
    return `y = ${number(values.A)} sin(${number(values.B)}x${term(values.C)})`;
  }

  // The same pixel unit is used on both axes, even when the viewport is rectangular.
  function plotCoordinates(width, height, range) {
    const unit = Math.min(width, height) / (2 * range);
    const cx = width / 2;
    const cy = height / 2;
    return { width, height, unit, cx, cy, x: (value) => cx + value * unit, y: (value) => cy - value * unit };
  }

  // World x and y are expressed in viewport units at the focal distance.
  const focalLength = 640;
  const farPlane = 1710;
  const nearPlane = 245;
  const restPose = { x: 0, y: 0, z: 0, mix: 0 };
  const formulaField = [
    ['e<sup>iπ</sup> + 1 = 0', -.35, -.32, 620, 27],
    ['a² + b² = c²', .37, -.31, 735, 31],
    ['x² + y² = r²', -.44, .24, 675, 35],
    ['∫<sub>0</sub><sup>1</sup> x² dx = ⅓', .33, .29, 770, 29],
    ['lim<sub>x→0</sub> <span class="venus-fraction"><span>sin x</span><span>x</span></span> = 1', -.39, -.04, 880, 23],
    ['∇ · <b>E</b> = ρ / ε<sub>0</sub>', .46, -.08, 910, 33],
    ['φ = (1 + √5) / 2', .02, -.4, 855, 28],
    ['cos² θ + sin² θ = 1', .10, .41, 925, 26],
    ['∑<sub>n=1</sub><sup>∞</sup> 1 / n² = π² / 6', -.25, .11, 1165, 35],
    ['F<sub>n+2</sub> = F<sub>n+1</sub> + F<sub>n</sub>', .34, .19, 1130, 31],
    ['∂²u / ∂t² = c²∇²u', .14, -.25, 1290, 26],
    ['e<sup>x</sup> = ∑<sub>n=0</sub><sup>∞</sup> x<sup>n</sup> / n!', -.13, .39, 1370, 30],
    ['P(A ∩ B) = P(A) P(B | A)', -.63, -.26, 1080, 28],
    ['f′(x) = 3x²', .57, .37, 995, 25],
    ['(a + b)² = a² + 2ab + b²', -.08, -.49, 1170, 34],
    ['det R(θ) = 1', .58, -.48, 995, 32],
    ['i² = −1', -.35, .49, 965, 23],
    ['d(sin x) / dx = cos x', .11, .08, 1530, 28]
  ];
  const functionLanes = {
    linear: { x: -.2, y: -.17, narrowX: -.1, narrowY: -.21, z: 605, speed: 14 },
    quadratic: { x: .2, y: -.025, narrowX: .065, narrowY: .02, z: 695, speed: 17 },
    sine: { x: -.035, y: .23, narrowX: -.045, narrowY: .21, z: 650, speed: 15 }
  };
  const smooth = (low, high, value) => {
    const t = Math.min(1, Math.max(0, (value - low) / (high - low)));
    return t * t * (3 - 2 * t);
  };
  const mix = (a, b, t) => a + (b - a) * t;

  function mount(root) {
    const overture = root.querySelector('#venusOverture');
    const scroll = root.querySelector('#venusScroll');
    const canPreview = location.protocol === 'file:' || window.ORBIT_CONFIG?.mode === 'mock';
    let previewFrame, singularity;
    const scene = document.createElement('section');
    scene.className = 'venus-observatory';
    scene.dataset.mode = 'sky';
    scene.setAttribute('aria-labelledby', 'venusSkyTitle');
    const glyph = (formula) => `<span class="venus-formula-glyph">
      <span class="venus-formula-echo" aria-hidden="true">${formula}</span>
      <span class="venus-formula-ink">${formula}</span>
    </span>`;
    const buttons = Object.entries(functions).map(([key, { name, form }]) =>
      `<button type="button" class="venus-depth-formula venus-formula-node" data-function="${key}" aria-label="探索${name}，${form}">
        ${glyph(form)}<span class="venus-node-arrow" aria-hidden="true">↗</span>
        <span class="venus-node-hint" aria-hidden="true">${name}</span>
      </button>`).join('');
    scene.innerHTML = `
      <h1 id="venusSkyTitle" class="venus-sky-title">演绎 · 数学星海</h1>
      <div class="venus-singularity" inert></div>
      <div class="venus-sky-camera">
        ${formulaField.map(([formula]) => `<span class="venus-depth-formula venus-distant-formula" aria-hidden="true">${glyph(formula)}</span>`).join('')}
        ${buttons}
      </div>
      <section class="venus-experiment" aria-labelledby="venusExperimentTitle" inert>
        <header class="venus-exp-head"><div><p class="venus-exp-kicker"></p>
          <h2 class="venus-exp-title" id="venusExperimentTitle" tabindex="-1"></h2>
          <p class="venus-exp-expression"></p></div>
          <button type="button" class="venus-exp-return" data-back>← 返回星海</button>
          <nav class="venus-exp-types" aria-label="切换函数">${Object.entries(functions).map(([key, { name }]) =>
            `<button type="button" data-switch="${key}" aria-pressed="false">${name}</button>`).join('')}</nav>
        </header>
        <div class="venus-exp-stage">
          <svg role="img" aria-label="函数坐标图">
            <defs><clipPath id="venusExperimentClip"><rect></rect></clipPath></defs>
            <g clip-path="url(#venusExperimentClip)">
              <g data-grid></g><path data-guide></path><path data-curve pathLength="1"></path>
              <circle data-vertex r="3" data-marker hidden></circle><circle data-pointer r="4" data-marker hidden></circle>
            </g>
          </svg>
          <p class="venus-exp-readout" aria-hidden="true"></p>
          <div class="venus-zoom" role="group" aria-label="坐标图缩放">
            <button type="button" data-zoom="-1" aria-label="缩小坐标图">−</button>
            <button type="button" data-zoom="1" aria-label="放大坐标图">+</button>
          </div>
        </div>
        <div class="venus-exp-controls"><div class="venus-exp-params"></div>
          <button type="button" class="venus-exp-reset" data-reset>重置参数 ↺</button>
          <p class="venus-exp-note"></p></div>
      </section>`;

    const get = (selector) => scene.querySelector(selector);
    const singularityStage = get('.venus-singularity');
    const camera = get('.venus-sky-camera');
    const experiment = get('.venus-experiment');
    const plot = get('.venus-exp-stage');
    const svg = get('svg');
    const grid = get('[data-grid]');
    const curve = get('[data-curve]');
    const guide = get('[data-guide]');
    const vertex = get('[data-vertex]');
    const pointer = get('[data-pointer]');
    const readout = get('.venus-exp-readout');
    const params = get('.venus-exp-params');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const values = Object.fromEntries(Object.entries(functions).map(([key, definition]) => [key, defaults(definition)]));
    const objects = Array.from(camera.querySelectorAll('.venus-distant-formula'), (node, index) => {
      const [, x, y, z, speed] = formulaField[index];
      return { node, x, y, z, speed };
    });
    const targets = new Map(Object.entries(functionLanes).map(([key, lane]) => {
      const object = { ...lane, node: get(`[data-function="${key}"]`), key, emphasis: 0 };
      objects.push(object);
      return [key, object];
    }));
    const pose = { ...restPose };
    let type = 'linear', zoom = 2, geometry, curveMotion;
    let width = 0, height = 0, narrow = false, visibleObjects = objects;
    let frame = 0, previousFrame = 0, flight = null;
    let hovered, pressed, focused;
    let stageRect;

    function coordinates(object) {
      return narrow && object.key ? [object.narrowX, object.narrowY] : [object.x, object.y];
    }

    function paintSky() {
      if (scene.dataset.singularity || !width || !height) return;
      const inSky = scene.dataset.mode === 'sky';
      const stationary = reduced.matches;
      const focusAreas = [];
      if (inSky) {
        for (const target of targets.values()) {
          if (target.z < 535 || target.z > 975) continue;
          const [x, y] = coordinates(target);
          const scale = focalLength / target.z;
          focusAreas.push([x * scale, y * scale]);
        }
      }
      for (const object of visibleObjects) {
        const { node, z, key } = object;
        const [x, y] = coordinates(object);
        const depth = z - pose.z;
        const scale = focalLength / Math.max(depth, nearPlane * .65);
        const screenX = width * (.5 + (x - pose.x) * scale);
        const screenY = height * (.5 + (y - pose.y) * scale);
        const near = key ? 505 : nearPlane;
        const far = key ? 1010 : farPlane;
        const presence = smooth(near, near + (key ? 44 : 190), z) *
          (1 - smooth(far - (key ? 66 : 570), far, z));
        const color = key ? mix(.88, 1, object.emphasis)
          : mix(.68, .28, smooth(360, 1390, z));
        let clearance = 1;
        if (!key && focusAreas.length) {
          const restingScale = focalLength / z;
          for (const [focusX, focusY] of focusAreas) {
            const dx = (x * restingScale - focusX) / (narrow ? .36 : .18);
            const dy = (y * restingScale - focusY) / .065;
            clearance = Math.min(clearance, mix(.16, 1, smooth(.18, 1, dx * dx + dy * dy)));
          }
        }
        const alpha = presence * color * clearance * smooth(nearPlane * .65, nearPlane, depth) *
          (key === type && key ? 1 - .64 * pose.mix : 1 - .94 * pose.mix);
        const defocus = key ? .15 * (1 - object.emphasis)
          : Math.max(1 - smooth(290, 640, depth), smooth(770, 1630, depth));
        const echo = stationary ? 0 : mix(.09, .45, defocus) * (1 - pose.mix) *
          (key ? 1 - object.emphasis : 1);
        node.style.transform = `translate3d(${screenX.toFixed(2)}px, ${screenY.toFixed(2)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(4)})`;
        node.style.opacity = alpha.toFixed(3);
        node.style.zIndex = String(Math.round(2000 - depth));
        node.style.setProperty('--echo-opacity', echo.toFixed(2));
        node.style.setProperty('--ink-opacity', (stationary ? 1 : mix(1, .56, defocus)).toFixed(2));
        if (key) node.classList.toggle('is-pickable', presence > .48);
      }
    }

    function skyVisible() {
      return root.classList.contains('is-open') && !root.hidden &&
        !root.classList.contains('is-closing') && !root.classList.contains('reader-open') &&
        root.dataset.venusMode !== 'notes' && root.dataset.venusMode !== 'preview';
    }

    function mayAnimate() {
      return !scene.dataset.singularity && !document.hidden && skyVisible() &&
        !reduced.matches && (flight || scene.dataset.mode === 'sky');
    }

    function tick(now) {
      frame = 0;
      if (!mayAnimate()) return;
      const dt = previousFrame ? (now - previousFrame) / 1000 : 0;
      previousFrame = now;
      if (flight) {
        const t = Math.min(1, (now - flight.start) / flight.duration);
        const eased = smooth(0, 1, t);
        for (const key of ['x', 'y', 'z', 'mix']) pose[key] = mix(flight.from[key], flight.to[key], eased);
        if (t >= 1) flight = null;
      } else {
        for (const object of visibleObjects) {
          const locked = object === hovered || object === pressed || object === focused;
          if (object.key) object.emphasis = mix(object.emphasis, locked ? 1 : 0, 1 - Math.exp(-dt * 11));
          if (locked) continue;
          const near = object.key ? 505 : nearPlane;
          const far = object.key ? 1010 : farPlane;
          const span = far - near;
          // Ease the projected acceleration at close range without changing the path.
          const velocity = object.speed * mix(.58, 1, smooth(near, near + 440, object.z));
          const step = (object.z - near - velocity * dt) % span;
          object.z = near + (step < 0 ? step + span : step);
        }
      }
      paintSky();
      if (mayAnimate()) frame = requestAnimationFrame(tick);
    }

    function syncSky() {
      singularity?.setActive(skyVisible() && scene.dataset.mode === 'sky');
      if (mayAnimate()) {
        if (flight?.pausedAt) {
          flight.start += performance.now() - flight.pausedAt;
          delete flight.pausedAt;
        }
        if (!frame) frame = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(frame);
        frame = previousFrame = 0;
        if (flight) flight.pausedAt ??= performance.now();
      }
    }

    function flyTo(target) {
      const [x, y] = target ? coordinates(target) : [0, 0];
      const to = target ? { x, y, z: target.z * .61, mix: 1 } : restPose;
      if (scene.dataset.singularity || reduced.matches || !skyVisible()) {
        flight = null;
        Object.assign(pose, reduced.matches && target ? { ...restPose, mix: 1 } : to);
        paintSky();
      } else {
        flight = { from: { ...pose }, to, start: performance.now(), duration: target ? 1120 : 820 };
      }
      syncSky();
    }

    function resizeSky() {
      width = camera.clientWidth;
      height = camera.clientHeight;
      narrow = width <= 760;
      visibleObjects = narrow ? [...objects.slice(0, 12), ...targets.values()] : objects;
      for (const object of objects) object.node.hidden = !visibleObjects.includes(object);
      paintSky();
    }

    function revealTarget(object) {
      if (!object.node.classList.contains('is-pickable')) object.z = functionLanes[object.key].z;
      object.emphasis = 1;
      paintSky();
    }

    function paintGrid() {
      const width = plot.clientWidth;
      const height = plot.clientHeight;
      if (!width || !height) return;
      geometry = plotCoordinates(width, height, ranges[zoom]);
      const { unit, cx, cy, x, y } = geometry;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      const clip = get('clipPath rect');
      clip.setAttribute('width', width);
      clip.setAttribute('height', height);
      const step = [1, 2, 5, 10, 20].find((value) => value * unit >= 34) ?? 20;
      const lines = [], labels = [];
      const tick = (px, py, value, anchor) =>
        `<text x="${px}" y="${py}" text-anchor="${anchor}">${number(value)}</text>`;
      const countX = Math.floor((cx - 18) / (unit * step));
      const countY = Math.floor((cy - 18) / (unit * step));
      for (let i = -countX; i <= countX; i++) {
        if (!i) continue;
        const value = i * step, px = x(value);
        lines.push(`M${px} 0V${height}`);
        labels.push(tick(px, cy + 17, value, 'middle'));
      }
      for (let i = -countY; i <= countY; i++) {
        if (!i) continue;
        const value = i * step, py = y(value);
        lines.push(`M0 ${py}H${width}`);
        labels.push(tick(cx - 8, py - 4, value, 'end'));
      }
      grid.innerHTML = `<path d="${lines.join(' ')}"></path><path d="M0 ${cy}H${width}M${cx} 0V${height}"></path>
        ${labels.join('')}${tick(cx - 8, cy + 17, 0, 'end')}
        <text x="${width - 18}" y="${cy - 8}">x</text><text x="${cx + 8}" y="16">y</text>`;
      get('[data-zoom="-1"]').disabled = zoom === 0;
      get('[data-zoom="1"]').disabled = zoom === ranges.length - 1;
      stageRect = svg.getBoundingClientRect();
    }

    function setPoint(element, x, y) {
      element.setAttribute('cx', x);
      element.setAttribute('cy', y);
      element.removeAttribute('hidden');
    }

    function clearPointer() {
      pointer.setAttribute('hidden', '');
      readout.textContent = '';
    }

    function drawFunction() {
      if (!geometry) return;
      const { width, height, unit, cx, x, y } = geometry;
      const definition = functions[type];
      const current = values[type];
      const formula = expression(type, current);
      get('.venus-exp-expression').textContent = formula;
      svg.setAttribute('aria-label', `${definition.name} ${formula} 的等比例坐标图`);
      const path = [];
      // Sample fast sine waves more densely when a wide range is visible.
      const radians = type === 'sine' ? Math.abs(current.B) * width / unit : 0;
      const samples = Math.min(3072, Math.max(280, Math.ceil(radians * 4)));
      for (let i = 0; i <= samples; i++) {
        const px = width * i / samples;
        const py = y(definition.evaluate(current, (px - cx) / unit));
        path.push(`${i ? 'L' : 'M'}${px.toFixed(2)} ${py.toFixed(2)}`);
      }
      curve.setAttribute('d', path.join(' '));
      guide.removeAttribute('d');
      vertex.setAttribute('hidden', '');
      const note = get('.venus-exp-note');
      note.textContent = type === 'sine' ? 'C 以弧度计' : '';
      if (type === 'quadratic') {
        if (current.a === 0) {
          note.textContent = 'a = 0，图像退化为直线';
        } else {
          const vx = -current.b / (2 * current.a);
          const vy = definition.evaluate(current, vx);
          const px = x(vx), py = y(vy);
          if (px >= 0 && px <= width) {
            guide.setAttribute('d', `M${px} 0V${height}`);
            if (py >= 0 && py <= height) setPoint(vertex, px, py);
          }
          note.textContent = `顶点 (${number(vx)}, ${number(vy)})`;
        }
      }
      clearPointer();
    }

    function renderParameters() {
      params.innerHTML = functions[type].parameters.map(([key, name, min, max, step]) => `
        <label><span><span>${key} · ${name}</span><output for="venus-param-${key}">${number(values[type][key])}</output></span>
          <input id="venus-param-${key}" type="range" name="${key}" min="${min}" max="${max}" step="${step}" value="${values[type][key]}">
        </label>`).join('');
    }

    function animateCurve(reverse = false, delay = 0) {
      const currentOffset = reverse ? parseFloat(getComputedStyle(curve).strokeDashoffset) : 1;
      curveMotion?.cancel();
      if (reduced.matches || !curve.animate) return;
      const frame = (offset) => ({ strokeDasharray: '1', strokeDashoffset: offset });
      curveMotion = curve.animate([frame(currentOffset || 0), frame(reverse ? 1 : 0)], {
        duration: reverse ? 360 : 660, delay, easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: reverse ? 'both' : 'backwards'
      });
    }

    function enter(key, source) {
      const wasSky = scene.dataset.mode === 'sky';
      if (!wasSky && type === key) return;
      type = key;
      const definition = functions[key];
      const target = targets.get(key);
      revealTarget(target);
      hovered = pressed = focused = null;
      scene.querySelectorAll('[data-switch]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.switch === key)));
      get('.venus-exp-title').textContent = definition.name;
      get('.venus-exp-kicker').textContent = `${definition.number} / 函数实验`;
      renderParameters();
      paintGrid();
      drawFunction();
      scene.dataset.mode = 'experiment';
      root.dataset.venusMode = 'experiment';
      camera.inert = true;
      experiment.inert = false;
      if (wasSky) get('.venus-exp-title').focus({ preventScroll: true });
      else source?.focus({ preventScroll: true });
      animateCurve(false, wasSky && !scene.dataset.singularity ? 570 : 0);
      flyTo(target);
    }

    function returnToSky({ focus = true, animate = true } = {}) {
      if (scene.dataset.mode === 'sky') return;
      if (animate) animateCurve(true);
      else curveMotion?.cancel();
      scene.dataset.mode = 'sky';
      root.dataset.venusMode = 'sky';
      experiment.inert = true;
      camera.inert = false;
      clearPointer();
      if (focus) targets.get(type).node.focus({ preventScroll: true });
      if (animate) flyTo(null);
      else {
        flight = null;
        Object.assign(pose, restPose);
        paintSky();
        syncSky();
      }
    }

    scene.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const { function: key, switch: next, zoom: change } = button.dataset;
      if (key || next) enter(key || next, button);
      else if (button.hasAttribute('data-back')) returnToSky();
      else if (change) {
        zoom = Math.max(0, Math.min(ranges.length - 1, zoom + Number(change)));
        curveMotion?.cancel();
        paintGrid();
        drawFunction();
      } else if (button.hasAttribute('data-reset')) {
        values[type] = defaults(functions[type]);
        params.querySelectorAll('input').forEach((input) => {
          input.value = values[type][input.name];
          input.parentElement.querySelector('output').value = number(values[type][input.name]);
        });
        curveMotion?.cancel();
        drawFunction();
      }
    });
    params.addEventListener('input', ({ target }) => {
      if (target.type !== 'range' || !Number.isFinite(target.valueAsNumber)) return;
      values[type][target.name] = target.valueAsNumber;
      target.parentElement.querySelector('output').value = number(target.valueAsNumber);
      curveMotion?.cancel();
      drawFunction();
    });
    svg.addEventListener('pointerenter', () => { stageRect = svg.getBoundingClientRect(); });
    svg.addEventListener('pointermove', (event) => {
      if (!geometry || event.pointerType === 'touch') return;
      stageRect ??= svg.getBoundingClientRect();
      const { cx, unit, height, y } = geometry;
      const px = event.clientX - stageRect.left;
      const x = (px - cx) / unit;
      const value = functions[type].evaluate(values[type], x);
      const py = y(value);
      if (py < 0 || py > height || Math.abs(py - (event.clientY - stageRect.top)) > 16) {
        clearPointer();
        return;
      }
      setPoint(pointer, px, py);
      readout.textContent = `(${number(x)}, ${number(value)})`;
    });
    svg.addEventListener('pointerleave', clearPointer);
    scroll.addEventListener('scroll', () => {
      stageRect = null;
      clearPointer();
    }, { passive: true });
    for (const object of targets.values()) {
      object.node.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') hovered = object;
      });
      object.node.addEventListener('pointerleave', () => {
        if (hovered === object) hovered = null;
      });
      object.node.addEventListener('pointerdown', () => { pressed = object; });
      object.node.addEventListener('focus', () => {
        if (!object.node.matches(':focus-visible')) return;
        focused = object;
        revealTarget(object);
      });
      object.node.addEventListener('blur', () => {
        if (focused === object) focused = null;
      });
    }
    window.addEventListener('pointerup', () => { pressed = null; });
    window.addEventListener('pointercancel', () => { pressed = null; });
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || scene.dataset.mode === 'sky' || root.classList.contains('reader-open')) return;
      event.preventDefault();
      event.stopPropagation();
      returnToSky();
    }, true);
    function showSection(mode) {
      if (mode === 'notes' || mode === 'preview') {
        returnToSky({ focus: false, animate: false });
        flight = hovered = pressed = focused = null;
        Object.assign(pose, restPose);
      }
      else if (scene.dataset.mode === 'experiment') returnToSky({ focus: false });
      root.dataset.venusMode = mode;
      if (mode === 'preview') {
        if (!previewFrame) {
          previewFrame = document.createElement('iframe');
          previewFrame.className = 'venus-void-preview';
          previewFrame.title = '数学虚空 · 金星视觉原型';
          previewFrame.setAttribute('sandbox', 'allow-scripts');
          const fromLocalBuild = location.protocol === 'file:' && /\/dist\/(?:index\.html)?$/i.test(location.pathname);
          const prototypeRoot = fromLocalBuild ? '../prototypes/' : './prototypes/';
          previewFrame.src = prototypeRoot + 'venus-void/index.html';
          scroll.append(previewFrame);
        }
      } else if (previewFrame) {
        previewFrame.remove();
        previewFrame = null;
      }
      scroll.scrollTo({ top: 0, behavior: 'instant' });
      root.querySelectorAll('.venus-nav [data-vtarget]').forEach((button) => {
        const active = button.dataset.vtarget === (mode === 'notes' ? 'venusNotes' : 'venusOverture');
        button.classList.toggle('is-active', active);
        if (active) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      resizeSky();
      syncSky();
    }
    root.addEventListener('click', (event) => {
      const destination = event.target.closest('[data-vtarget]')?.dataset.vtarget;
      if (destination === 'venusNotes' || destination === 'venusOverture') {
        event.stopPropagation();
        showSection(destination === 'venusNotes' ? 'notes' : 'sky');
      }
    }, true);

    // The hall's notes and reader continue to use the original navigation handlers.
    [...overture.children].forEach((child) => { child.hidden = true; });
    overture.setAttribute('aria-labelledby', 'venusSkyTitle');
    const legacyLab = root.querySelector('#venusLab');
    legacyLab.hidden = true;
    legacyLab.removeAttribute('id');
    root.querySelector('.venus-nav [data-vtarget="venusLab"]').hidden = true;
    root.querySelector('.venus-nav [data-vtarget="venusOverture"]').textContent = '数学星海';
    root.querySelector('.venus-brand').setAttribute('aria-label', '回到数学星海');
    root.classList.add('venus-immersive');
    overture.append(scene);
    const previewVoid = canPreview && new URLSearchParams(location.search).get('venus-preview') === 'void';
    showSection(previewVoid ? 'preview' : 'sky');
    loadSingularity().then(() => {
      singularity = window.mountVenusSingularity(singularityStage, {
        onReady(ready) {
          if (ready) {
            scene.dataset.singularity = 'ready';
            for (const { node } of targets.values()) {
              node.style.removeProperty('opacity');
              node.style.removeProperty('transform');
            }
          } else {
            delete scene.dataset.singularity;
            paintSky();
          }
          root.classList.toggle('venus-singularity-ready', ready);
          singularityStage.inert = !ready;
          syncSky();
        },
        onLayout(view, anchor) {
          for (const [key, { node }] of targets) {
            const { x, y, angle = 0 } = anchor(view, key);
            node.style.setProperty('--anchor-x', `${x}px`);
            node.style.setProperty('--anchor-y', `${y}px`);
            node.style.setProperty('--anchor-angle', `${angle}rad`);
          }
        }
      });
      window.venusSingularity = {
        getState: singularity.getState,
        selectFunction(key) { if (skyVisible() && targets.has(key)) enter(key, targets.get(key).node); }
      };
      syncSky();
    }).catch(() => { /* The existing formula sky is usable while the renderer is unavailable. */ });

    const resize = new ResizeObserver(() => {
      resizeSky();
      paintGrid();
      drawFunction();
    });
    resize.observe(scene);
    resize.observe(plot);
    let worldWasOpen = !root.hidden && root.classList.contains('is-open') && !root.classList.contains('is-closing');
    const visibility = new MutationObserver(() => {
      const worldIsOpen = !root.hidden && root.classList.contains('is-open') && !root.classList.contains('is-closing');
      if (worldIsOpen && !worldWasOpen && previewVoid) {
        showSection('preview');
      }
      worldWasOpen = worldIsOpen;
      if (root.hidden) {
        returnToSky({ focus: false, animate: false });
        flight = hovered = pressed = focused = null;
        Object.assign(pose, restPose);
        showSection('sky');
      }
      syncSky();
    });
    visibility.observe(root, { attributeFilter: ['class', 'hidden'] });
    document.addEventListener('visibilitychange', syncSky);
    window.addEventListener('pagehide', (event) => {
      singularity?.setActive(false);
      if (!event.persisted) singularity?.dispose();
    });
    window.addEventListener('pageshow', syncSky);
    reduced.addEventListener('change', () => {
      if (reduced.matches) {
        curveMotion?.cancel();
        for (const target of targets.values()) {
          if (!target.node.classList.contains('is-pickable')) target.z = functionLanes[target.key].z;
        }
        flyTo(scene.dataset.mode === 'experiment' ? targets.get(type) : null);
      }
      syncSky();
    });
  }

  window.createVenusScene = mount;
})();
