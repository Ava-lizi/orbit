(() => {
  'use strict';

  const projection = `
    uniform vec2 uViewport;
    uniform vec2 uCenter;
    uniform float uRadius;
    uniform float uCompact;
    uniform float uTravel;

    // u runs outwards from the throat. v runs across the expanding cross section.
    // The longitudinal coordinate stays monotone as the depth changes.
    vec3 surface(vec2 uv, float layer) {
      float u = uv.x, v = uv.y;
      float envelope = smoothstep(.0, .42, u);
      float relief = .64 * sin(v * 2.25 + u * .58) + .24 * sin(7.1 * u + 2.4 * v) * envelope;
      float depth = .24 + relief - .49 * u + .20 * layer;
      float perspective = 1. / (1. + .16 * depth);
      float wave = (.105 * sin(7.3 * u + 2.3 * v) + .032 * sin(12.3 * u - 3.3 * v)) * envelope;
      vec2 p;
      if (layer > .5) {
        float desktopSweep = .27 * (1. - u) * (1. - u) + .07 * u - .03 * sin(5. * u);
        float portraitSweep = .32 * (1. - u) * (1. - u) - .13 * u + .026 * sin(u * 6.3 - .3);
        float sweep = mix(desktopSweep, portraitSweep, uCompact);
        float x = uViewport.x * (-.19 + mix(1.27, .90, uCompact) * u);
        float y = uCenter.y + uRadius * (1.40 - .33 * u) + uViewport.y * sweep;
        float spread = uViewport.y * (.088 + .115 * u) * perspective;
        p = vec2(x, y + (v + wave) * spread);
      } else if (uCompact > .5) {
        // A portrait view follows the opening cross section down from the horizon.
        float x = uCenter.x + uRadius * .68 + uViewport.x * (.08 * sin(3.8 * u) - .07 * u);
        float y = mix(uCenter.y - uRadius * .27, uViewport.y * 1.14, u);
        float spread = mix(uRadius * .34, uViewport.x * .78, u) * perspective;
        p = vec2(x + (v + wave) * spread, y + uViewport.y * .045 * envelope * sin(v * 2.2 + u));
      } else {
        float root = uCenter.x + uRadius * (.63 + .21 * v * v);
        float x = mix(root, uViewport.x * 1.19, u) + uRadius * .23 * sin(5.1 * u + v * 1.8) * envelope;
        float y = uCenter.y + uRadius * (-.29 + .68 * smoothstep(.12, .78, u))
          + uViewport.y * (-.02 * u + .026 * sin(6.3 * u));
        float spread = (uRadius * .43 + uViewport.y * .72 * u) * perspective;
        p = vec2(x, y + (v + wave) * spread);
      }
      return vec3(p, depth);
    }

    vec4 clipPosition(vec2 position) {
      return vec4(position / uViewport * vec2(2., -2.) + vec2(-1., 1.), 0., 1.);
    }

    float presence(vec2 uv, float layer) {
      float edges = 1. - smoothstep(.72, 1., abs(uv.y));
      float sides = smoothstep(.0, .14, uv.x) * (1. - smoothstep(.92, 1., uv.x));
      if (layer > .5) sides *= 1. - smoothstep(.73, 1., uv.x);
      return edges * sides;
    }
  `;

  const meshVertex = `
    precision highp float;
    attribute vec3 aSurface;
    varying mediump vec3 vSurface;
    varying mediump float vLight;
    ${projection}
    void main() {
      vec3 point = surface(aSurface.xy, aSurface.z);
      float depthAcross = surface(aSurface.xy + vec2(0., .002), aSurface.z).z - point.z;
      vLight = .5 + .5 * clamp(depthAcross * 370., -1., 1.);
      vSurface = aSurface;
      gl_Position = clipPosition(point.xy);
    }
  `;

  const meshFragment = (derivatives) => `
    ${derivatives ? '#extension GL_OES_standard_derivatives : enable' : ''}
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform float uTravel;
    uniform float uCompact;
    varying mediump vec3 vSurface;
    varying mediump float vLight;

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3. - 2. * f);
      vec4 h = fract(sin(dot(i, vec2(47.17, 19.83)) + vec4(0., 47.17, 19.83, 67.)) * 17361.371);
      return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
    }

    float grid(vec2 uv) {
      vec2 p = uv * mix(vec2(42., 26.), vec2(24., 16.), uCompact);
      vec2 d = abs(fract(p - .5) - .5);
      vec2 width = ${derivatives ? 'clamp(fwidth(p) * .76, vec2(.015), vec2(.23))' : 'vec2(.041, .048)'};
      vec2 ink = 1. - smoothstep(width * .35, width * 1.5, d);
      return max(ink.x, ink.y);
    }

    void main() {
      float u = vSurface.x, v = vSurface.y, layer = vSurface.z;
      float crossFade = 1. - smoothstep(.63, 1., abs(v));
      float lengthFade = smoothstep(.015, .19, u) * (1. - smoothstep(.88, 1., u));
      float layerFade = mix(1., 1. - smoothstep(.72, 1., u), layer);
      float visibility = crossFade * lengthFade * layerFade;
      float flow = v + .037 * sin(13.7 * u + 2.7 * v) + .025 * sin(21. * u - 4.1 * v);
      float throat = exp(-u * 6.8);

      // Wide faint wisps, broken highlights and thin strands share the same flow.
      float texture1 = noise(vec2(u * 14. + uTravel * 1.4, flow * 38.));
      float texture2 = noise(vec2(u * 55. + uTravel * 4., flow * 125.));
      vec4 bands = abs(flow - vec4(-.71, -.39, .24, .70));
      vec4 bandsStrength = vec4(.76, .36, .23, .85);
      float wide = dot(exp(-bands * 20.), bandsStrength);
      float narrow = dot(exp(-bands * 105.), bandsStrength);
      float streaks = pow(.5 + .5 * sin(flow * 287. + sin(u * 29.) * 1.4), 7.);
      float pockets = .25 + .75 * noise(vec2(u * 9. + layer * 2. + uTravel * .5, flow * 11.));
      float glints = narrow * (.12 + .54 * pockets * texture1 * texture2);
      float threads = streaks * texture1 * texture2 * (.042 + .095 * throat + .065 * wide);
      float lattice = grid(vec2(u, flow)) * (.022 + .040 * vLight + .025 * wide) * (.51 + .49 * texture1);
      float veil = (.008 + .028 * vLight + .017 * texture1) + wide * (.020 + .042 * pockets);
      float contact = throat * exp(-abs(flow) * 2.8) * (.019 + .13 * texture1 + .04 * streaks);

      vec3 lit = vec3(.43, .31, .23) * veil
        + vec3(.56, .42, .31) * lattice
        + vec3(.87, .54, .30) * (threads + contact)
        + vec3(1., .74, .49) * glints;
      float density = visibility * mix(.96, .87, layer);
      gl_FragColor = vec4(lit * density, min(.85, (veil + lattice + threads + glints + contact) * density));
    }
  `;

  const formulaVertex = `
    precision highp float;
    attribute vec2 aCorner;
    attribute vec2 aAtlasUV;
    attribute vec4 aPosition;
    attribute vec4 aStyle;
    uniform vec4 uAnchors[3];
    uniform vec4 uHeroes[4];
    varying mediump vec2 vUv;
    varying mediump vec3 vInk;
    varying mediump float vAlpha;
    ${projection}
    void main() {
      float seed = aPosition.x, across = aPosition.y, layer = aPosition.z, tier = aPosition.w;
      bool hero = tier > 2.5;
      float traveling = fract((seed + .10) / 1.15 + uTravel * mix(-.28, .20, layer)) * 1.15 - .10;
      // Near formulas drift locally so the composition stays readable as distant formulas cycle.
      float drift = seed + sin(uTravel * 12. + seed * 19. + across * 1.7) * .026 * smoothstep(0., .065, uTravel);
      float t = hero ? seed + sin(uTravel * 11. + seed * 17.) * .011 : tier > 1.5 ? drift : traveling;
      vec2 uv = vec2(clamp(t, 0., 1.), across + sin(7. * t + uTravel * 8. + across) * .014);
      vec3 point = surface(uv, layer);
      vec2 delta = (uCompact > .5 && layer < .5)
        ? surface(uv + vec2(0., .002), layer).xy - point.xy
        : surface(uv + vec2(.002, 0.), layer).xy - point.xy;
      float angle = clamp(atan(delta.y, max(1e-4, delta.x)) * .72, -.25, .22);
      float scale = mix(clamp(min(uViewport.x / 1450., uViewport.y / 820.), .56, 1.5), 1., uCompact);
      float perspective = 1. / (1. + .24 * point.z);
      float size = scale * aStyle.x * mix(.75, 1.03, smoothstep(.09, .58, t)) * perspective;
      vec2 shift = aCorner * aStyle.yz * size;
      float c = cos(angle), s = sin(angle);
      vec2 px = point.xy + mat2(c, s, -s, c) * shift;
      vec2 halfCard = .5 * size * mat2(c, abs(s), abs(s), c) * aStyle.yz;
      gl_Position = clipPosition(px);
      vUv = aAtlasUV;
      float nearInk = smoothstep(.4, 2.7, tier);
      vInk = mix(vec3(.68, .53, .41), vec3(1., .92, .80), nearInk);
      float opacity = aStyle.w * presence(uv, layer) * smoothstep(.06, .31, t);
      for (int i = 0; i < 3; i++) {
        vec4 target = uAnchors[i];
        vec2 gap = abs(point.xy - target.xy) / (halfCard + target.zw);
        opacity *= mix(.05, 1., smoothstep(.78, 1.27, max(gap.x, gap.y)));
      }
      if (!hero) {
        for (int i = 0; i < 4; i++) {
          vec4 target = uHeroes[i];
          float heroT = target.x + sin(uTravel * 11. + target.x * 17.) * .011;
          float heroV = target.y + sin(7. * heroT + uTravel * 8. + target.y) * .014;
          vec2 gap = abs(point.xy - surface(vec2(heroT, heroV), 0.).xy) / (scale * target.zw + halfCard);
          opacity *= mix(.05, 1., smoothstep(.77, 1.18, max(gap.x, gap.y)));
        }
      }
      vAlpha = opacity;
    }
  `;

  const formulaFragment = `
    precision mediump float;
    uniform sampler2D uAtlas;
    varying mediump vec2 vUv;
    varying mediump vec3 vInk;
    varying mediump float vAlpha;
    void main() {
      float opacity = texture2D(uAtlas, vUv).a * vAlpha;
      gl_FragColor = vec4(vInk * opacity, opacity);
    }
  `;

  function mesh() {
    const vertices = [], indices = [];
    for (const [layer, columns, rows] of [[1, 48, 26], [0, 68, 48]]) {
      const start = vertices.length / 3;
      for (let row = 0; row <= rows; row++) {
        for (let column = 0; column <= columns; column++) {
          vertices.push(column / columns, row / rows * 2 - 1, layer);
          if (!row || !column) continue;
          const end = start + row * (columns + 1) + column;
          indices.push(end - columns - 2, end - columns - 1, end, end - columns - 2, end, end - 1);
        }
      }
    }
    return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
  }

  // t, v, typographic em in CSS pixels, with positions spaced independently of glyph widths.
  const desktop = [
    [.585, -.64, 31, 'einstein'], [.50, -.45, 29, 'integral'],
    [.413, -.235, 53, 'euler'], [.683, -.18, 29, 'faraday'],
    [.456, -.66, 21, 'wave'], [.702, -.37, 21, 'heat'],
    [.33, -.63, 17, 'double-angle'], [.64, -.37, 17, 'gamma'], [.79, -.28, 18, 'laplace'],
    [.345, -.456, 19, 'derivative'], [.232, -.26, 15, 'mass'],
    [.248, -.045, 17, 'eigenvalue'], [.671, -.018, 23, 'euler-expanded'], [.747, .10, 20, 'identity'],
    [.26, .16, 16, 'sphere'], [.428, .105, 22, 'gaussian'], [.575, .17, 23, 'metric'], [.70, .21, 21, 'electric'],
    [.335, .36, 20, 'golden'], [.459, .37, 23, 'basel'], [.75, .31, 21, 'pythagoras'],
    [.375, .58, 19, 'magnetic'], [.598, .43, 25, 'series'], [.809, .40, 22, 'sphere'],
    [.305, .57, 19, 'determinant'], [.49, .75, 21, 'laplace'], [.729, .53, 21, 'fibonacci'],
    [.23, -.53, 11], [.30, -.80, 12], [.43, -.89, 13], [.65, -.78, 13], [.80, -.54, 13],
    [.19, .38, 11], [.255, .46, 12], [.25, .80, 11], [.45, .84, 12], [.66, .85, 13], [.82, .74, 12],
    [.33, .43, 24, 'limit', 1], [.47, -.28, 17, 'electric', 1], [.56, .16, 20, 'sphere', 1],
    [.637, .53, 21, 'circle', 1], [.225, -.23, 12, '', 1], [.615, -.52, 14, '', 1],
    [.49, .57, 14, '', 1], [.805, .53, 18, 'laplace', 1], [.70, .71, 16, 'magnetic', 1],
    [.375, -.50, 12, 'gamma', 1], [.73, -.52, 12, 'eigenvalue', 1], [.43, .14, 14, 'pythagoras', 1]
  ];

  const compact = [
    [.30, -.26, 37, 'euler'], [.627, -.54, 23, 'einstein'], [.378, .38, 20, 'integral'],
    [.605, .30, 22, 'faraday'], [.84, -.38, 14, 'derivative'], [.775, .11, 15, 'wave'],
    [.49, -.52, 14, 'identity'], [.51, .26, 15, 'sphere'],
    [.26, .34, 13, 'golden'], [.815, .24, 13], [.61, .70, 13],
    [.44, .28, 22, 'limit', 1], [.71, -.36, 16, 'electric', 1]
  ];

  function formulaVertices(layout, atlas) {
    const vertices = [];
    const corners = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, -.5], [.5, .5], [-.5, .5]];
    const byKey = new Map(atlas.entries.map((entry, index) => [entry.key, index]));
    for (const [i, [t, v, size, key, layer = 0]] of layout.entries()) {
      const hero = Boolean(key && Object.hasOwn(atlas.heroes, key));
      const tier = hero ? 3 : size >= 18 ? 2 : size >= 14 ? 1 : 0;
      const alpha = [layer ? .31 : .35, .57, .92, 1][tier];
      const entry = atlas.entries[byKey.get(key) ?? (4 + i * 11 % (atlas.entries.length - 4))];
      for (const [x, y] of corners) {
        const u = (entry.x + (x + .5) * entry.width) / atlas.canvas.width;
        const vAtlas = (entry.y + (y + .5) * entry.height) / atlas.canvas.height;
        vertices.push(x, y, u, vAtlas, t, v, layer, tier, size, entry.width / atlas.em, entry.height / atlas.em, alpha);
      }
    }
    return new Float32Array(vertices);
  }

  const keys = ['linear', 'quadratic', 'sine'];
  const anchorSlots = [
    [[.56, .64, -.09], [.77, .76, .04], [.88, .88, -.08]],
    [[.28, .64, -.04], [.65, .73, -.04], [.52, .91, -.04]]
  ];
  function anchor(frame, key) {
    const [x, y, angle] = anchorSlots[Number(frame.compact)][keys.indexOf(key)];
    return { x: frame.width * x, y: frame.height * y, angle };
  }

  function createSurface(gl, { createProgram }) {
    const atlas = window.createVenusFormulaAtlas();
    const meshProgram = createProgram(meshVertex, meshFragment(gl.getExtension('OES_standard_derivatives')));
    let formulaProgram;
    const buffers = [];
    const texture = gl.createTexture();
    const anchorPositions = new Float32Array(12);

    function buffer(target, data) {
      const handle = gl.createBuffer();
      buffers.push(handle);
      gl.bindBuffer(target, handle);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return handle;
    }

    function locations(program, attributes, extraUniforms = []) {
      return {
        attributes: attributes.map((name) => gl.getAttribLocation(program, name)),
        uniforms: Object.fromEntries(['uViewport', 'uCenter', 'uRadius', 'uCompact', 'uTravel', ...extraUniforms]
          .map((name) => [name, gl.getUniformLocation(program, name)]))
      };
    }

    function use(program, uniforms, frame) {
      gl.useProgram(program);
      gl.uniform2f(uniforms.uViewport, frame.width, frame.height);
      gl.uniform2f(uniforms.uCenter, frame.centerX, frame.centerY);
      gl.uniform1f(uniforms.uRadius, frame.radius);
      gl.uniform1f(uniforms.uCompact, frame.compact ? 1 : 0);
      gl.uniform1f(uniforms.uTravel, frame.travel);
    }

    function attribute(location, size, stride, offset) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
    }

    function dispose() {
      for (const handle of buffers) gl.deleteBuffer(handle);
      gl.deleteTexture(texture);
      gl.deleteProgram(meshProgram);
      if (formulaProgram) gl.deleteProgram(formulaProgram);
    }

    try {
      formulaProgram = createProgram(formulaVertex, formulaFragment);
      const geometry = mesh();
      const sheet = buffer(gl.ARRAY_BUFFER, geometry.vertices);
      const index = buffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indices);
      const layouts = [desktop, compact];
      const cards = layouts.map((layout) => buffer(gl.ARRAY_BUFFER, formulaVertices(layout, atlas)));
      const heroPositions = layouts.map((layout) => new Float32Array(layout.slice(0, 4).flatMap(([t, v, size, key]) => {
        const entry = atlas.entries[atlas.heroes[key]];
        const halfWidth = size * entry.width / atlas.em * .5;
        const halfHeight = size * entry.height / atlas.em * .5;
        return [t, v, halfWidth + 5, halfHeight + halfWidth * .14 + 6];
      })));
      const meshLocations = locations(meshProgram, ['aSurface']);
      const formulaLocations = locations(formulaProgram, ['aCorner', 'aAtlasUV', 'aPosition', 'aStyle'],
        ['uAtlas', 'uAnchors[0]', 'uHeroes[0]']);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
      const isPowerOfTwo = (n) => (n & (n - 1)) === 0;
      const mipmap = isPowerOfTwo(atlas.canvas.width) && isPowerOfTwo(atlas.canvas.height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      if (mipmap) gl.generateMipmap(gl.TEXTURE_2D);

      let instances = desktop.length;
      function draw(frame) {
        use(meshProgram, meshLocations.uniforms, frame);
        gl.bindBuffer(gl.ARRAY_BUFFER, sheet);
        attribute(meshLocations.attributes[0], 3, 12, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
        gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.disableVertexAttribArray(meshLocations.attributes[0]);

        use(formulaProgram, formulaLocations.uniforms, frame);
        const mode = frame.compact ? 1 : 0;
        instances = mode ? compact.length : desktop.length;
        gl.bindBuffer(gl.ARRAY_BUFFER, cards[mode]);
        const [corner, uv, position, style] = formulaLocations.attributes;
        attribute(corner, 2, 48, 0);
        attribute(uv, 2, 48, 8);
        attribute(position, 4, 48, 16);
        attribute(style, 4, 48, 32);
        for (let i = 0; i < keys.length; i++) {
          const { x, y } = anchor(frame, keys[i]);
          const offset = i * 4;
          anchorPositions[offset] = x;
          anchorPositions[offset + 1] = y;
          anchorPositions[offset + 2] = (i ? 96 : 61) * (mode ? .75 : 1);
          anchorPositions[offset + 3] = mode ? 15 : 20;
        }
        gl.uniform4fv(formulaLocations.uniforms['uAnchors[0]'], anchorPositions);
        gl.uniform4fv(formulaLocations.uniforms['uHeroes[0]'], heroPositions[mode]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(formulaLocations.uniforms.uAtlas, 0);
        gl.drawArrays(gl.TRIANGLES, 0, instances * 6);
        for (const location of formulaLocations.attributes) gl.disableVertexAttribArray(location);
      }

      return { draw, dispose, anchor, drawCalls: 2, get instances() { return instances; } };
    } catch (error) {
      dispose();
      throw error;
    }
  }

  window.createVenusSingularitySurface = createSurface;
})();
