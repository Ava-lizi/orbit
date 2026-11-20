/* The ORBIT entry uses the full sky. Earlier previews can still load their terrain separately. */
window.createUranusLandscape = function(THREE, canvas, onContextLost) {
  const elevation = window.orbitUranusElevation;
  const showTerrain = Boolean(elevation);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, powerPreference: 'low-power'});
  } catch {
    return null;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, .06, 2400);
  const start = new THREE.Vector3(0, 1.20, 0);
  const look = new THREE.Vector3();
  const northWest = THREE.MathUtils.degToRad(-42);
  const pitch = THREE.MathUtils.degToRad(23);
  const direction = (yaw, altitude) => new THREE.Vector3(
    Math.sin(yaw) * Math.cos(altitude), Math.sin(altitude), -Math.cos(yaw) * Math.cos(altitude)
  );
  const forward = direction(northWest, pitch);
  const right = direction(northWest + Math.PI / 2, 0);
  const up = new THREE.Vector3().crossVectors(right, forward);
  const along = forward.clone().addScaledVector(right, -.06).addScaledVector(up, -.13).normalize();
  const slope = up.clone().addScaledVector(right, .81).normalize();
  const normal = new THREE.Vector3().crossVectors(slope, along).normalize();
  const tangent = new THREE.Vector3().crossVectors(along, normal).normalize();

  const noise = `
    float hash3(vec3 p) {
      p = fract(p * .3183099 + vec3(.11, .29, .67));
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float field(vec3 p) {
      vec3 a = floor(p), f = fract(p);
      f = f*f*(3.0 - 2.0*f);
      return mix(mix(mix(hash3(a),hash3(a+vec3(1,0,0)),f.x),
                     mix(hash3(a+vec3(0,1,0)),hash3(a+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash3(a+vec3(0,0,1)),hash3(a+vec3(1,0,1)),f.x),
                     mix(hash3(a+vec3(0,1,1)),hash3(a+vec3(1,1,1)),f.x),f.y),f.z);
    }
  `;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    uniforms: {
      viewBasis: {value: new THREE.Matrix3()},
      viewScale: {value: new THREE.Vector2()},
      galacticPlane: {value: normal},
      galacticCore: {value: along},
      outerGalaxy: {value: showTerrain ? 0 : 1},
      lowSkyTransmission: {value: showTerrain ? 0 : .84}
    },
    vertexShader: `
      varying vec2 screen;
      void main() {
        screen = position.xy;
        gl_Position = vec4(position.xy, .9999, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 screen;
      uniform mat3 viewBasis;
      uniform vec2 viewScale;
      uniform vec3 galacticPlane, galacticCore;
      uniform float lowSkyTransmission, outerGalaxy;
      ${noise}
      float bell(float x) { return exp(-x*x); }
      void main() {
        vec3 ray = normalize(viewBasis * vec3(screen * viewScale, -1.0));
        float latitude = dot(ray, galacticPlane);
        float altitude = ray.y + .025;
        float horizon = exp(-mix(max(altitude, 0.0), abs(altitude), lowSkyTransmission) * 6.0);
        vec3 horizonLight = mix(vec3(.045, .068, .109), vec3(.036, .053, .086), outerGalaxy);
        vec3 color = mix(vec3(.016, .026, .048), horizonLight, horizon);
        float galacticDistance = dot(ray, galacticCore);
        float core = pow(max(galacticDistance, 0.0), 13.0);
        float wing = .22 + .78 * core;
        float structure = field(ray * 8.0);
        float width = .082 + .052 * core + .043 * structure;
        float broad = bell(latitude / width);
        float warped = latitude + .056 * (field(ray * 15.0) - .5);
        float lanes = .53 * bell((warped - .012) / .025);
        float dustBend = field(ray * 32.0);
        lanes += .23 * bell((warped + .058 + .018 * dustBend) / .018);
        float coarseLight = field(ray * 27.0);
        float knots = field(ray * 76.0);
        float grain = field(ray * 184.0);
        float blended = .58 * coarseLight + .28 * knots + .14 * grain;
        float localLight = (.08 + 1.33 * blended * blended) * (1.0 - lanes);
        vec3 starlight = mix(vec3(.13, .18, .27), vec3(.40, .33, .26), core * .77);
        float transmission = mix(lowSkyTransmission, 1.0, smoothstep(-.035, .12, ray.y));
        if (outerGalaxy > 0.0) {
          // Warp fine grain locally so it breaks up across the belt.
          float fineGrain = field(ray * 91.0 + (dustBend - .5) * vec3(2.4, -1.7, 2.3)
            + (coarseLight - .5) * vec3(1.5, 2.4, -.8));
          float rift = bell((warped - .008 + .036 * (dustBend - .5)) / .021);
          float fork = bell((warped + .052 + .026 * (knots - .5) + .018 * (coarseLight - .5)) / .012);
          float pockets = (1.0 - smoothstep(.23, .54, .66 * dustBend + .34 * knots)) * core * broad;
          float extinction = clamp((.55 + .24 * dustBend) * rift
            + (.19 + .31 * coarseLight) * fork + .30 * pockets, 0.0, .90);
          float grainLight = smoothstep(.26, .78, .38 * knots + .41 * fineGrain + .21 * grain);
          float specks = smoothstep(.49, .82, .53 * grain + .47 * fineGrain);
          localLight = (.042 + .103 * blended + .31 * grainLight * grainLight + .096 * specks) * (1.0 - extinction);

          // Thin filaments carry the belt outward and leave openings into darker sky.
          float drift = field(ray * 4.8 + vec3(2.3, 4.1, 1.7));
          float outerLatitude = latitude + .28 * (drift - .50);
          float skirt = bell(outerLatitude / (.29 + .17 * drift));
          float distanceFade = .26 + .74 * smoothstep(.22, .94, galacticDistance);
          float clearings = smoothstep(.27, .74, .62 * structure + .38 * drift);
          float filaments = smoothstep(.24, .77, .42 * structure + .58 * field(ray * 23.0));
          float dust = (.048 + filaments * .54) * skirt * distanceFade * (.29 + .71 * clearings);
          dust *= (1.0 - .43 * broad) * (1.0 - .28 * extinction);
          vec3 scattered = mix(vec3(.045, .065, .101), vec3(.107, .094, .088), drift);
          color += scattered * dust * transmission;
        }
        color += starlight * broad * wing * localLight * transmission;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -2;
  scene.add(sky);

  function makeStars() {
    let seed = 7102341;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const count = 27000;
    const positions = new Float32Array(count * 3);
    const magnitudes = new Float32Array(count * 3);
    const point = new THREE.Vector3();
    for (let i = 0; i < count; ++i) {
      const longitude = random() * Math.PI * 2;
      let intensity = 1;
      if (i < 7100) {
        const height = 2 * random() - 1;
        const ring = Math.sqrt(1 - height * height);
        point.set(Math.cos(longitude) * ring, height, Math.sin(longitude) * ring);
      } else {
        const crowded = i > 11500;
        const outlying = !showTerrain && !crowded;
        let theta = crowded ? (random() + random() + random() - 1.5) * 1.35 :
          outlying ? (random() + random() - 1) * 1.55 : longitude;
        const crossPlane = random() + random() + random() - 1.5;
        let latitude = crossPlane * (outlying ? .96 : crowded ? .15 : .27);
        if (outlying) {
          latitude += .11 * Math.sin(theta * 4.7 + .5);
          intensity = .73 - .33 * Math.min(1, Math.abs(latitude));
        } else if (!showTerrain && crowded && i % 3 === 0) {
          theta += .015 * Math.sin(theta * 29.0 + .8) + .012 * Math.sin(longitude + theta * 17.0);
          const cluster = .5 + .5 * Math.sin(theta * 21.3 - .9);
          latitude = latitude * (.71 + .15 * cluster) + .017 * Math.sin(theta * 13.0 - .3) + .015 * Math.sin(longitude);
          intensity = 1 + .13 * cluster;
        }
        point.copy(along).multiplyScalar(Math.cos(theta)).addScaledVector(tangent, Math.sin(theta))
          .addScaledVector(normal, latitude).normalize();
      }
      const radius = 650 + random() * 1500;
      point.multiplyScalar(radius).toArray(positions, i * 3);
      magnitudes[i * 3] = Math.pow(random(), i < 7100 ? 7 : 13);
      magnitudes[i * 3 + 1] = random();
      magnitudes[i * 3 + 2] = intensity;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('magnitude', new THREE.BufferAttribute(magnitudes, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        pixelScale: {value: 1},
        lowStarLight: {value: showTerrain ? .42 : .82},
        starContrast: {value: showTerrain ? .60 : .51}
      },
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float pixelScale, lowStarLight, starContrast;
        attribute vec3 magnitude;
        varying vec3 tint;
        varying float intensity;
        void main() {
          vec4 p = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * p;
          gl_PointSize = pixelScale * (1.53 + 2.15 * magnitude.x * magnitude.x);
          tint = mix(vec3(.57, .71, 1.0), vec3(1.0, .83, .65), magnitude.y);
          intensity = magnitude.z * (.26 + starContrast * magnitude.x)
            * mix(lowStarLight, 1.0, smoothstep(0.0, .24, normalize(position).y));
        }
      `,
      fragmentShader: `
        varying vec3 tint;
        varying float intensity;
        void main() {
          vec2 p = 2.0 * gl_PointCoord - 1.0;
          float power = dot(p,p);
          float light = exp(-5.5 * power) * (1.0 - smoothstep(.45, 1.0, power));
          gl_FragColor = vec4(tint, light * intensity);
        }
      `
    });
    return new THREE.Points(geometry, material);
  }

  function makeTerrain() {
    const {samples, bounds: [west, north, east, south], encoded} = elevation;
    const geometry = new THREE.PlaneGeometry((east - west) * 29, (south - north) * 29, samples - 1, samples - 1);
    geometry.rotateX(-Math.PI / 2);
    // Map the selected overlook to the origin.
    geometry.translate(((west + east) / 2 - 1006.16) * 29, 0, ((north + south) / 2 - 644.22) * 29);
    const data = atob(encoded);
    const positions = geometry.attributes.position;
    let index = 0;
    for (let row = 0; row < samples; ++row) {
      let height = 0;
      for (let column = 0; column < samples; ++column) {
        let value = 0, shift = 0, byte;
        do {
          byte = data.charCodeAt(index++);
          value |= (byte & 127) << shift;
          shift += 7;
        } while (byte & 128);
        height += (value >>> 1) ^ -(value & 1);
        positions.setY(row * samples + column, height / 1000);
      }
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const material = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      vertexShader: `
        varying vec3 land, worldNormal;
        void main() {
          land = position;
          worldNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 land, worldNormal;
        ${noise}
        void main() {
          vec3 n = normalize(worldNormal);
          float range = distance(land, cameraPosition);
          float phase = max(dot(n, normalize(vec3(.61, .41, .66))), 0.0);
          float detail = field(land * 13.0) * .65 + field(land * 46.0) * .35;
          float exposed = smoothstep(1.44, 2.27, land.y + .50 * (detail - .5)) * smoothstep(.31,.77,n.y);
          vec3 rock = vec3(.018, .026, .040) + phase * vec3(.088, .105, .143);
          vec3 snow = vec3(.080, .103, .137) + phase * vec3(.235, .260, .293);
          vec3 mountain = mix(rock, snow, exposed) * (.76 + .46 * detail);
          float water = 1.0 - smoothstep(.002, .026, land.y);
          mountain = mix(mountain, vec3(.020, .030, .048), water * .86);
          float air = 1.0 - exp(-range * .031);
          gl_FragColor = vec4(mix(mountain, vec3(.064, .089, .129), air * .84), 1.0);
        }
      `
    });
    return new THREE.Mesh(geometry, material);
  }

  // Only the earlier comparison preview loads elevation data.
  const stars = makeStars();
  scene.add(stars);
  const sceneObjects = [sky, stars];
  if (showTerrain) {
    const terrain = makeTerrain();
    scene.add(terrain);
    sceneObjects.push(terrain);
  }
  let lastWidth = 0, lastHeight = 0, lastRatio = 0, lastX, lastY, lastZoom, lost = false;
  function contextLost(event) {
    event.preventDefault();
    lost = true;
    onContextLost();
  }
  canvas.addEventListener('webglcontextlost', contextLost);

  return {
    render(width, height, view) {
      if (lost || renderer.getContext().isContextLost()) return false;
      const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2800000 / (width * height)));
      const resized = width !== lastWidth || height !== lastHeight || ratio !== lastRatio;
      if (!resized && view.x === lastX && view.y === lastY && view.zoom === lastZoom) return true;
      if (resized) {
        renderer.setPixelRatio(ratio);
        renderer.setSize(width, height, false);
        stars.material.uniforms.pixelScale.value = ratio;
      }
      lastWidth = width;
      lastHeight = height;
      lastRatio = ratio;
      lastX = view.x;
      lastY = view.y;
      lastZoom = view.zoom;
      const x = Math.tanh(view.x * 1.25);
      const y = Math.tanh(view.y * 1.15);
      camera.position.copy(start).addScaledVector(right, x * .93);
      camera.position.y += y * .12;
      const ray = direction(northWest + x * .35, pitch - y * .125);
      camera.lookAt(look.copy(camera.position).add(ray));
      camera.aspect = width / height;
      camera.fov = THREE.MathUtils.clamp((camera.aspect < .78 ? 57 : 52) - 11 * Math.log(view.zoom), 34, 67);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      sky.material.uniforms.viewBasis.value.setFromMatrix4(camera.matrixWorld);
      const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      sky.material.uniforms.viewScale.value.set(halfHeight * camera.aspect, halfHeight);
      renderer.render(scene, camera);
      return !renderer.getContext().isContextLost();
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', contextLost);
      for (const object of sceneObjects) {
        object.geometry.dispose();
        object.material.dispose();
      }
      renderer.dispose();
      if (!lost) renderer.forceContextLoss();
    }
  };
};
