(() => {
  'use strict';

  const vertex = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition * .5 + .5;
      gl_Position = vec4(aPosition, 0., 1.);
    }`;

  function createProgram(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram();
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
        const shader = gl.createShader(type);
        try {
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
          gl.attachShader(program, shader);
        } finally {
          gl.deleteShader(shader);
        }
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
      return program;
    } catch (error) {
      gl.deleteProgram(program);
      throw error;
    }
  }

  function mount(stage, { onReady, onLayout } = {}) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '金星数学星海，公式沿弯曲的网格流向带有吸积盘的黑洞');
    const hold = document.createElement('button');
    hold.type = 'button';
    hold.className = 'venus-singularity-hold';
    hold.setAttribute('aria-label', '按住黑洞加速数学星海，松开后减速');
    hold.setAttribute('aria-pressed', 'false');
    hold.innerHTML = '<span aria-hidden="true">按住加速</span>';
    const pause = document.createElement('button');
    pause.type = 'button';
    pause.className = 'venus-singularity-pause';
    pause.setAttribute('aria-pressed', 'false');
    pause.textContent = '暂停运动';
    stage.append(canvas, hold, pause);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const events = new AbortController();
    const listen = (target, type, handler) => target.addEventListener(type, handler, { signal: events.signal });
    const baseSpeed = .032;
    const maxSpeed = 4.2;
    const fullPixelBudget = 1500000;
    const view = { time: 0, travel: 0, boost: 0 };
    let gl, resources, frame = 0, last = 0, speed = 1, targetSpeed = 1;
    let active = false, paused = false, disposed = false, ready = false, failed = false, pointerId = null;
    let pointerBounds, desktopPixelBudget = fullPixelBudget, slowFrameSeconds = 0;

    function release() {
      targetSpeed = 1;
      hold.setAttribute('aria-pressed', 'false');
      const id = pointerId;
      pointerId = null;
      pointerBounds = null;
      if (id !== null && hold.hasPointerCapture(id)) hold.releasePointerCapture(id);
    }

    function accelerate() {
      if (!mayAnimate()) return false;
      targetSpeed = maxSpeed;
      hold.setAttribute('aria-pressed', 'true');
      return true;
    }

    function freeResources() {
      if (!resources) return;
      gl.useProgram(null);
      resources.surface?.dispose();
      gl.deleteProgram(resources.hole);
      gl.deleteBuffer(resources.quad);
      resources = null;
    }

    function initialize() {
      if (failed || disposed || gl?.isContextLost()) return false;
      if (resources) return true;
      try {
        gl ??= canvas.getContext('webgl', {
          alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power'
        });
        if (!gl) throw Error('WebGL unavailable');
        resources = {};
        const compile = (vs, fs) => createProgram(gl, vs, fs);
        resources.surface = window.createVenusSingularitySurface(gl, { createProgram: compile });
        resources.hole = compile(vertex, window.venusSingularityHoleFragment);
        resources.position = gl.getAttribLocation(resources.hole, 'aPosition');
        resources.uniforms = Object.fromEntries(['Resolution', 'Center', 'Radius', 'Time', 'Boost', 'Compact']
          .map((name) => [name, gl.getUniformLocation(resources.hole, 'u' + name)]));
        resources.quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, resources.quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        return true;
      } catch (error) {
        freeResources();
        failed = true;
        onReady?.(false);
        console.warn('VENUS singularity unavailable.', error);
        return false;
      }
    }

    function resize(paintWhenIdle = true) {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height) return;
      const compact = width < 760 || width / height < 1;
      const scale = Math.min(devicePixelRatio || 1, compact ? 1.25 : 1.5,
        Math.sqrt((compact ? 500000 : desktopPixelBudget) / (width * height)));
      const pixelWidth = Math.max(1, Math.round(width * scale));
      const pixelHeight = Math.max(1, Math.round(height * scale));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      Object.assign(view, {
        width, height, compact, centerX: width * (compact ? .44 : .25),
        centerY: height * (compact ? .34 : .462),
        radius: Math.min(height * .177, width * (compact ? .253 : .155))
      });
      Object.assign(hold.style, {
        left: view.centerX + 'px', top: view.centerY + 'px',
        width: 2 * view.radius + 'px', height: 2 * view.radius + 'px'
      });
      if (resources) onLayout?.(view, resources.surface.anchor);
      if (paintWhenIdle && !frame) paint();
    }

    function paint() {
      const needsLayout = !resources;
      if (!active || document.hidden || !view.width || !initialize()) return;
      const { quad, hole, position, uniforms, surface } = resources;
      if (needsLayout) onLayout?.(view, surface.anchor);
      const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
      gl.viewport(0, 0, width, height);
      gl.clearColor(.018, .015, .014, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      surface.draw(view);
      gl.useProgram(hole);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uniforms.Resolution, width, height);
      gl.uniform2f(uniforms.Center, view.centerX / view.width, 1 - view.centerY / view.height);
      gl.uniform1f(uniforms.Radius, view.radius / view.height);
      gl.uniform1f(uniforms.Time, view.time);
      gl.uniform1f(uniforms.Boost, view.boost);
      gl.uniform1f(uniforms.Compact, Number(view.compact));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(position);
      if (!ready) {
        ready = true;
        onReady?.(true);
      }
    }

    function mayAnimate() {
      return active && !paused && !disposed && !document.hidden && !reduced.matches && !failed && !gl?.isContextLost();
    }

    function tick(now) {
      frame = 0;
      if (!mayAnimate()) {
        sync();
        return;
      }
      const dt = last ? Math.min((now - last) / 1000, .05) : 0;
      last = now;
      if (!view.compact && desktopPixelBudget === fullPixelBudget) {
        // Ignore brief stalls. A sustained slow cadence gets one resolution step down.
        slowFrameSeconds = Math.max(0, slowFrameSeconds + (dt > .032 ? dt : -dt));
        if (slowFrameSeconds > 1.2) {
          desktopPixelBudget = 1000000;
          resize(false);
        }
      }
      const response = targetSpeed > speed ? 4.8 : 2.9;
      speed += (targetSpeed - speed) * -Math.expm1(-dt * response);
      view.travel += baseSpeed * dt * speed;
      view.time += dt * (1 + (speed - 1) * .16);
      view.boost = (speed - 1) / (maxSpeed - 1);
      paint();
      if (mayAnimate() && !frame) frame = requestAnimationFrame(tick);
    }

    function sync() {
      if (mayAnimate()) {
        if (!frame) frame = requestAnimationFrame(tick);
      } else {
        release();
        cancelAnimationFrame(frame);
        frame = last = 0;
        slowFrameSeconds = 0;
        if (reduced.matches) {
          speed = 1;
          view.boost = 0;
        }
        paint();
      }
      hold.hidden = pause.hidden = reduced.matches;
      hold.disabled = paused;
    }

    function setActive(value) {
      if (active === value || disposed) return;
      active = value;
      if (active) resize();
      sync();
      if (!active) {
        freeResources();
        canvas.width = canvas.height = 1;
      }
    }

    listen(hold, 'pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      const bounds = hold.getBoundingClientRect();
      const distance = Math.hypot(event.clientX - bounds.left - bounds.width / 2,
        event.clientY - bounds.top - bounds.height / 2);
      if (distance > bounds.width / 2 || !accelerate()) return;
      event.preventDefault();
      pointerBounds = bounds;
      pointerId = event.pointerId;
      hold.setPointerCapture(pointerId);
    });
    listen(hold, 'pointermove', (event) => {
      if (event.pointerId !== pointerId || !pointerBounds) return;
      const { left, top, width, height } = pointerBounds;
      if (Math.hypot(event.clientX - left - width / 2, event.clientY - top - height / 2) > width / 2) release();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      listen(hold, name, (event) => { if (event.pointerId === pointerId) release(); });
    }
    listen(hold, 'contextmenu', (event) => event.preventDefault());
    listen(hold, 'keydown', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (!event.repeat) accelerate();
    });
    listen(hold, 'keyup', (event) => { if (event.key === ' ' || event.key === 'Enter') release(); });
    listen(hold, 'blur', release);
    listen(window, 'blur', release);
    listen(pause, 'click', () => {
      paused = !paused;
      pause.setAttribute('aria-pressed', String(paused));
      pause.textContent = paused ? '继续运动' : '暂停运动';
      sync();
    });
    listen(document, 'visibilitychange', sync);
    listen(reduced, 'change', sync);
    listen(canvas, 'webglcontextlost', (event) => {
      event.preventDefault();
      resources = null;
      ready = false;
      sync();
      onReady?.(false);
    });
    listen(canvas, 'webglcontextrestored', sync);
    const observer = new ResizeObserver(() => { if (active) resize(); });
    observer.observe(stage);

    function dispose() {
      setActive(false);
      disposed = true;
      observer.disconnect();
      events.abort();
      canvas.remove();
      hold.remove();
      pause.remove();
    }

    sync();
    return {
      setActive, dispose,
      getState: () => ({
        speed, targetSpeed, baseSpeed, pressed: targetSpeed > 1, paused, reduced: reduced.matches,
        travel: view.travel, time: view.time, active, disposed, running: Boolean(frame), ready: ready && !failed,
        instances: resources?.surface.instances ?? 0, drawCalls: resources ? resources.surface.drawCalls + 1 : 0,
        width: canvas.width, height: canvas.height
      })
    };
  }

  window.mountVenusSingularity = mount;
})();
