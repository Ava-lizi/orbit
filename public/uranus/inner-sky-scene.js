/* A single canvas; world coordinates and the drawn hit targets share one projection. */
window.createInnerSkyScene = function(canvas, {onHover, onHit, onSelect, onKeyboardFocus, detailSpace, makeLandscape}) {
  const ctx = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const {depthScale} = window.OrbitInnerSkyStore;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const ease = t => t * t * (3 - 2 * t);
  const camera = {x: 0, y: 0, zoom: 1, px: 0, py: 0};
  const target = {...camera};
  const stars = new Map();
  let width = 1, height = 1, unit = 1, frame = 0, lastTime = 0;
  let listeners, observer, points = [], hovered, keyboardStar, pointer, gesture, selected, matches;
  let hoverSince = 0, exposure = 0, nearbyStars = [], landscape;
  const backdrop = document.createElement('canvas');
  function radialSprite(stops) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const ink = sprite.getContext('2d');
    if (!ink) return sprite;
    const glow = ink.createRadialGradient(32, 32, 0, 32, 32, 32);
    for (const [offset, color] of stops) glow.addColorStop(offset, color);
    ink.fillStyle = glow;
    ink.fillRect(0, 0, 64, 64);
    return sprite;
  }

  const core = radialSprite([[0, '#fffdf8ef'], [.28, '#fffdf8e9'], [.55, '#fffaf2c4'],
    [.78, '#fbf5eb68'], [1, '#fbf5eb00']]);
  const innerGlow = radialSprite([[0, '#fff7e69d'], [.22, '#fff7e675'], [.44, '#f7efde45'],
    [.70, '#e9e3d219'], [1, '#e9e3d200']]);
  const outerGlow = radialSprite([[0, '#f3ecda21'], [.24, '#f3ecda1a'], [.52, '#dedcd610'],
    [.77, '#c7ced205'], [1, '#c7ced200']]);

  function hash(value) {
    let result = 2166136261;
    for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
    return (result >>> 0) / 4294967296;
  }

  function drawFieldStar(ink, star, x, y, scale = 1) {
    ink.globalAlpha = star.light;
    ink.fillStyle = star.tint;
    ink.beginPath();
    ink.arc(x, y, star.radius * scale, 0, Math.PI * 2);
    ink.fill();
  }

  function paintNight() {
    const scale = Math.min(1, 960 / width, 672 / height);
    backdrop.width = Math.max(1, Math.round(width * scale));
    backdrop.height = Math.max(1, Math.round(height * scale));
    const night = backdrop.getContext('2d', {alpha: false});
    const image = night.createImageData(backdrop.width, backdrop.height);
    const {data} = image;
    const longitudes = Array.from({length: image.width}, (_, x) => {
      const u = (x + .5) / image.width;
      const angle = (u - 1.08) / .61;
      return {offset: (1 - u) * .13, scatter: Math.exp(-angle * angle)};
    });
    // A long line of sight through the air below the frame lifts the lower-right sky.
    // The field is smooth; the small ordered offset only breaks up 8-bit quantization.
    const dither = [-.375, .125, .375, -.125];
    for (let y = 0; y < image.height; y++) {
      const v = (y + .5) / image.height;
      for (let x = 0; x < image.width; x++) {
        const {offset, scatter} = longitudes[x];
        const elevation = .15 + (1 - v) * 1.14 + offset;
        const column = Math.exp(-elevation * 3.45);
        const rounding = dither[(x & 1) + (y & 1) * 2];
        const i = (y * image.width + x) * 4;
        data[i] = 4 + 5 * v + column * (8 + 40 * scatter) + rounding;
        data[i + 1] = 7 + 7 * v + column * (12 + 67 * scatter) + rounding;
        data[i + 2] = 14 + 8 * v + column * (16 + 77 * scatter) + rounding;
        data[i + 3] = 255;
      }
    }
    night.putImageData(image, 0, 0);

    let seed = 1517303;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    // Loose stellar associations leave gaps between fields. The lower sky attenuates the fainter points.
    const weight = (u, v, x, y, rx, ry) => Math.exp(-(((u - x) / rx) ** 2 + ((v - y) / ry) ** 2));
    const count = Math.round(clamp(width * height / 2500, 230, 640));
    nearbyStars = [];
    for (const near of [false, true]) {
      const margin = near ? .13 : 0;
      const candidates = near ? Math.round(count * .27) : count;
      for (let i = 0; i < candidates; i++) {
        const x = random() * (1 + margin * 2) - margin;
        const y = random() * (1 + margin * 2) - margin;
        const acceptance = random(), magnitude = random(), color = random();
        const field = .21 + .32 * weight(x, y, .67, .26, .36, .17) + .24 * weight(x, y, .23, .40, .24, .30);
        if (acceptance > field) continue;
        const extinction = .58 + .42 * clamp((1 - y) / .72, 0, 1);
        const star = {
          x, y, depth: .038 + magnitude * .024,
          radius: (near ? .40 : .28) + (near ? .59 : .54) * magnitude ** 3.4,
          light: extinction * ((near ? .25 : .20) + (near ? .34 : .42) * magnitude ** 2.5),
          tint: color > .84 ? '#e3cfb4' : color < .24 ? '#bacfeb' : '#dce2e6'
        };
        if (near) nearbyStars.push(star);
        else drawFieldStar(night, star, x * backdrop.width, y * backdrop.height, Math.max(.8, scale));
      }
    }
  }

  function drawNearbyStars() {
    for (const star of nearbyStars) {
      const scale = 1 + Math.log(camera.zoom) * star.depth;
      const dx = clamp((-camera.x * unit - camera.px * 16) * star.depth, -width * .065, width * .065);
      const dy = clamp((-camera.y * unit - camera.py * 16) * star.depth, -height * .065, height * .065);
      drawFieldStar(ctx, star, (.5 + (star.x - .5) * scale) * width + dx,
        (.5 + (star.y - .5) * scale) * height + dy, scale);
    }
  }

  function schedule() {
    if (!listeners || document.hidden || frame || !ctx) return;
    frame = requestAnimationFrame(draw);
  }

  function resize() {
    const nextWidth = canvas.clientWidth || 1, nextHeight = canvas.clientHeight || 1;
    const ratio = Math.min(devicePixelRatio || 1, 1.75, Math.sqrt(4500000 / (nextWidth * nextHeight)));
    const pixelWidth = Math.max(1, Math.floor(nextWidth * ratio)), pixelHeight = Math.max(1, Math.floor(nextHeight * ratio));
    if (nextWidth === width && nextHeight === height && canvas.width === pixelWidth &&
        canvas.height === pixelHeight && (landscape || backdrop.width > 1)) return;
    width = nextWidth;
    height = nextHeight;
    unit = Math.min(width / 1.48, height);
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    ctx?.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    if (ctx && !landscape) paintNight();
    if (selected && stars.has(selected)) focus(selected, true, true);
    schedule();
  }

  function project({x, y, z}, view = camera) {
    const scale = unit * view.zoom * depthScale(z);
    return {
      x: width / 2 + (x - view.x) * scale - z * view.px * 4,
      y: height / 2 + (y - view.y) * scale - z * view.py * 4
    };
  }

  function nearest({x, y, touch}) {
    let best;
    let distance = (touch ? 23 : 15) ** 2;
    for (const point of points) {
      const squared = (point.x - x) ** 2 + (point.y - y) ** 2;
      if (squared < distance) {
        best = point;
        distance = squared;
      }
    }
    return best;
  }

  function updateHover(now) {
    const canHover = pointer && !gesture;
    const hit = canHover ? nearest(pointer) : null;
    let candidate = keyboardStar ? points.find(point => point.id === keyboardStar) : hit;
    // A slightly larger exit radius keeps the caption steady during parallax and tiny mouse movements.
    if (canHover && hovered && (!hit || hit.id !== hovered.id)) {
      const previous = points.find(point => point.id === hovered.id);
      if (previous && Math.hypot(previous.x - pointer.x, previous.y - pointer.y) < 23) candidate = previous;
    }
    if (candidate?.id !== hovered?.id) hoverSince = now;
    hovered = candidate;
    const waiting = candidate && !keyboardStar && now - hoverSince < 112;
    onHit(Boolean(hit));
    if (candidate && !waiting) {
      onHover(candidate.star.idea, candidate, width, height);
    } else onHover(null);
    return Boolean(waiting);
  }

  function stamp(sprite, x, y, radius, opacity) {
    if (opacity <= 0) return;
    ctx.globalAlpha = clamp(opacity, 0, 1);
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  }

  function draw(now) {
    frame = 0;
    const dt = lastTime ? Math.min(50, now - lastTime) : 16;
    lastTime = now;
    const step = motion.matches ? 1 : 1 - Math.exp(-dt / 85);
    let moving = false;
    for (const axis of Object.keys(camera)) {
      const delta = target[axis] - camera[axis];
      camera[axis] = Math.abs(delta) < .00015 ? target[axis] : camera[axis] + delta * step;
      moving ||= camera[axis] !== target[axis];
    }

    ctx.globalAlpha = 1;
    const landscapeReady = landscape?.render(width, height, camera);
    if (landscapeReady) {
      ctx.clearRect(0, 0, width, height);
    } else {
      if (landscape) {
        landscape.dispose();
        landscape = null;
      }
      if (backdrop.width < 2) paintNight();
      ctx.drawImage(backdrop, 0, 0, width, height);
      drawNearbyStars();
    }
    const darken = selected ? .38 : 0;
    const exposureDelta = darken - exposure;
    exposure = Math.abs(exposureDelta) < .002 || motion.matches ? darken :
      exposure + exposureDelta * (1 - Math.exp(-dt / 138));
    moving ||= exposure !== darken;
    if (exposure) {
      ctx.globalAlpha = exposure;
      ctx.fillStyle = '#070808';
      ctx.fillRect(0, 0, width, height);
    }

    points = [];
    for (const star of stars.values()) {
      const point = project(star.idea.position);
      if (point.x < -20 || point.y < -20 || point.x > width + 20 || point.y > height + 20) continue;
      if (star.born && !motion.matches && now < star.born) {
        moving = true;
        continue;
      }
      points.push({...point, star, id: star.idea.id});
    }
    moving = updateHover(now) || moving;
    const zoomSize = clamp(Math.sqrt(camera.zoom), .82, 1.23);
    const proximity = !gesture && pointer;

    for (const {x, y, id, star} of points) {
      const depth = star.idea.position.z;
      const dimmed = matches && !matches.has(id);
      const distance = proximity && Math.abs(proximity.x - x) < 84 && Math.abs(proximity.y - y) < 84
        ? Math.hypot(proximity.x - x, proximity.y - y) : Infinity;
      const nearby = keyboardStar === id ? 1 : ease(clamp(1 - (distance - 8) / 76, 0, 1));
      const base = matches ? (dimmed ? .14 : .96) : selected ? .50 : .875 - depth * .032 + (star.phase - .5) * .018;
      const wanted = selected === id ? 1 : base + (1 - base) * nearby * (dimmed ? .16 : .84);
      const delta = wanted - star.light;
      const response = delta > 0 ? 115 : 205;
      star.light = Math.abs(delta) < .002 || motion.matches ? wanted : star.light + delta * (1 - Math.exp(-dt / response));
      moving ||= star.light !== wanted;
      const birth = star.born && !motion.matches ? clamp((now - star.born) / 850, 0, 1) : 1;
      if (birth === 1) star.born = null;
      moving ||= birth < 1;
      const shine = star.light;
      const coreBirth = ease(clamp(birth / .74, 0, 1));
      const bloom = ease(clamp((birth - .19) / .81, 0, 1));
      const coreSize = (1.78 - depth * .12 + (star.phase - .5) * .12) * zoomSize;
      const innerSize = coreSize * 1.74;
      const outerSize = 1.55 + innerSize * 1.40;
      stamp(outerGlow, x, y, outerSize, shine * bloom * .80);
      stamp(innerGlow, x, y, innerSize * (.86 + .14 * coreBirth), shine * coreBirth);
      stamp(core, x, y, Math.max(.65, coreSize * (.43 + .57 * coreBirth)), shine * coreBirth);
    }
    if (moving) schedule();
    else lastTime = 0;
  }

  function focus(id, withPanel, onlyIfOutside = false) {
    const star = stars.get(id);
    if (!star) return;
    const position = star.idea.position;
    const area = withPanel ? detailSpace() : {width, height};
    const point = project(position, target);
    const marginX = Math.min(72, area.width * .24);
    const marginY = Math.min(96, area.height * .24);
    if (onlyIfOutside && point.x >= marginX && point.x <= area.width - marginX &&
        point.y >= marginY && point.y <= area.height - marginY) return;
    const scale = unit * target.zoom * depthScale(position.z);
    target.x = position.x - (area.width * .5 - width / 2) / scale;
    target.y = position.y - (area.height * .5 - height / 2) / scale;
    target.px = target.py = 0;
    schedule();
  }

  function zoomAt(x, y, factor) {
    const next = clamp(target.zoom * factor, .45, 4);
    const anchor = (1 / target.zoom - 1 / next) / unit;
    target.x += (x - width / 2) * anchor;
    target.y += (y - height / 2) * anchor;
    target.zoom = next;
    schedule();
  }

  function where(event) {
    return {x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch'};
  }

  function clearGesture() {
    gesture = null;
    canvas.classList.remove('is-dragging');
  }

  function stopGesture() {
    const id = gesture?.pointerId;
    clearGesture();
    if (id != null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }

  function clearPointer() {
    pointer = null;
    target.px = target.py = 0;
    schedule();
  }

  function start() {
    if (listeners) return;
    landscape = ctx ? makeLandscape?.(schedule) : null;
    listeners = new AbortController();
    const options = {signal: listeners.signal};
    observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = lastTime = 0;
        stopGesture();
        clearPointer();
      } else schedule();
    }, options);
    motion.addEventListener('change', () => {
      if (motion.matches) {
        target.px = target.py = 0;
      }
      schedule();
    }, options);
    canvas.addEventListener('pointermove', event => {
      if (gesture && gesture.pointerId !== event.pointerId) return;
      const point = where(event);
      if (gesture) {
        const dx = point.x - gesture.x;
        const dy = point.y - gesture.y;
        if (gesture.moved || Math.hypot(dx, dy) > 5) {
          gesture.moved = true;
          if (!gesture.star) {
            canvas.classList.add('is-dragging');
            target.x = gesture.viewX - dx / (unit * target.zoom);
            target.y = gesture.viewY - dy / (unit * target.zoom);
          }
        }
      }
      keyboardStar = null;
      pointer = point.touch ? null : point;
      if (!motion.matches && !gesture) {
        target.px = clamp(point.x / width * 2 - 1, -1, 1);
        target.py = clamp(point.y / height * 2 - 1, -1, 1);
      }
      schedule();
    }, options);
    canvas.addEventListener('pointerleave', clearPointer, options);
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || gesture) return;
      const point = where(event);
      gesture = {...point, pointerId: event.pointerId, viewX: camera.x, viewY: camera.y, star: nearest(point)?.id};
      canvas.setPointerCapture(event.pointerId);
    }, options);
    canvas.addEventListener('pointerup', event => {
      if (gesture?.pointerId !== event.pointerId) return;
      const id = !gesture.moved && nearest(where(event))?.id === gesture.star ? gesture.star : null;
      // The browser releases capture on pointerup; avoid scheduling a second release.
      clearGesture();
      if (id) {
        clearPointer();
        onSelect(id);
      }
      schedule();
    }, options);
    canvas.addEventListener('lostpointercapture', event => {
      if (gesture?.pointerId !== event.pointerId || canvas.hasPointerCapture(event.pointerId)) return;
      if (event.buttons & 1) canvas.setPointerCapture(event.pointerId);
      else clearGesture();
    }, options);
    canvas.addEventListener('pointercancel', event => {
      if (gesture?.pointerId === event.pointerId) clearGesture();
    }, options);
    canvas.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const point = where(event);
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      zoomAt(point.x, point.y, Math.exp(clamp(-pixels * .0015, -.7, .7)));
    }, {...options, passive: false});
    canvas.addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight'].includes(event.key) && stars.size) {
        event.preventDefault();
        const ids = [...stars.keys()];
        const current = ids.indexOf(keyboardStar);
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        keyboardStar = ids[current < 0 ? (direction > 0 ? 0 : ids.length - 1) : (current + direction + ids.length) % ids.length];
        focus(keyboardStar, Boolean(selected), true);
        onKeyboardFocus(stars.get(keyboardStar).idea);
        schedule();
      } else if (event.key === 'Enter' && keyboardStar) {
        event.preventDefault();
        onSelect(keyboardStar);
      } else if (['+', '=', '-'].includes(event.key)) {
        event.preventDefault();
        zoomAt(width / 2, height / 2, event.key === '-' ? .8 : 1.25);
      }
    }, options);
    canvas.addEventListener('blur', () => { keyboardStar = null; schedule(); }, options);
    resize();
  }

  return {
    available: Boolean(ctx),
    start,
    stop() {
      stopGesture();
      listeners?.abort();
      listeners = null;
      observer?.disconnect();
      cancelAnimationFrame(frame);
      frame = lastTime = 0;
      pointer = keyboardStar = selected = hovered = null;
      exposure = 0;
      landscape?.dispose();
      landscape = null;
      onHit(false);
      backdrop.width = backdrop.height = 1;
      nearbyStars = [];
      points = [];
      stars.clear();
      Object.assign(camera, {x: 0, y: 0, zoom: 1, px: 0, py: 0});
      Object.assign(target, camera);
      onHover(null);
    },
    setIdeas(ideas, newId) {
      const next = ideas.map(idea => {
        const existing = stars.get(idea.id);
        const born = idea.id === newId && !motion.matches ? performance.now() + 110 : existing?.born;
        return [idea.id, {idea, born, light: existing?.light ?? .67, phase: existing?.phase ?? hash(idea.id)}];
      });
      stars.clear();
      for (const [id, star] of next) stars.set(id, star);
      if (!stars.has(keyboardStar)) keyboardStar = null;
      schedule();
    },
    setMatches(value) { matches = value; schedule(); },
    select(id, center = false) {
      selected = id;
      if (id) focus(id, true, !center);
      schedule();
    },
    reveal(id) { focus(id, false, true); },
    reset() {
      Object.assign(target, {x: 0, y: 0, zoom: 1, px: 0, py: 0});
      if (selected) focus(selected, true, true);
      schedule();
    }
  };
};
