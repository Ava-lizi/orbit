(() => {
  'use strict';

  window.venusSingularityHoleFragment = `
    precision highp float;

    varying vec2 vUv;
    uniform vec2 uResolution;
    uniform vec2 uCenter;
    uniform float uRadius;
    uniform float uTime;
    uniform float uBoost;
    uniform float uCompact;

    float grainHash(vec2 point) {
      vec3 p = fract(vec3(point.xyx) * .1031);
      p += dot(p, p.yzx + 33.33);
      return fract((p.x + p.y) * p.z);
    }

    float grain(vec2 point) {
      vec2 cell = floor(point);
      vec2 f = fract(point);
      vec2 blend = f * f * (3. - 2. * f);
      return mix(mix(grainHash(cell), grainHash(cell + vec2(1., 0.)), blend.x),
        mix(grainHash(cell + vec2(0., 1.)), grainHash(cell + 1.), blend.x), blend.y);
    }

    float bell(float x) {
      return exp(-x * x);
    }

    // Differential rotation winds the turbulent structure into radial filaments.
    float diskTexture(float radius, float azimuth, float compression) {
      float orbit = azimuth - uTime * .145 / max(radius * sqrt(radius), .62);
      vec2 direction = vec2(cos(orbit), sin(orbit));
      float eddy = grain(direction * 5.4 + vec2(radius * 5.9, radius * 9.1));
      float fine = grain(direction * 18. + vec2(radius * 39., radius * 46.));
      float shear = radius + .027 * sin(orbit * 5. + radius * 8.) + .046 * eddy;
      float streams = .50 + .50 * sin(shear * 93. + sin(orbit * 11.) * .6);
      float wisps = .5 + .5 * sin(shear * 212. - orbit * 8. + fine * 2.7);
      float eddies = .25 + .62 * eddy + .29 * fine + .22 * bell((eddy - .84) / .15);
      return eddies * (.33 + .73 * mix(.54, streams, compression) +
        .24 * mix(.48, wisps, compression));
    }

    float directDisk(vec2 p, float shadow, float pixel) {
      // The near side crosses the shadow. The far side terminates at its silhouette.
      float warp = .045 * sin(1.65 * p.x) - .044 * p.x * p.x / (1. + p.x * p.x);
      float diskY = p.y - warp - .17 * smoothstep(1.08, 3.3, p.x);
      float inclination = .275 - .038 * smoothstep(1.05, 3.25, p.x);
      vec2 disk = vec2(p.x, diskY / inclination);
      float radius = length(disk);
      if (radius > 3.95 || radius < .87) return 0.;

      float occlusion = mix(1., 1. - smoothstep(-.11, .065, diskY), shadow);
      if (occlusion < .003) return 0.;
      float azimuth = atan(disk.y, disk.x);
      float texture = diskTexture(radius, azimuth, 1. - smoothstep(.0024, .008, pixel));
      float heat = smoothstep(.88, 1.10, radius) *
        (1.58 * bell((radius - 1.22) / .125) + .71 * bell((radius - 1.46) / .30) +
          .31 * bell((radius - 1.78) / .61));
      float wake = (.095 + .085 * smoothstep(-1.1, 1.8, p.x)) *
        bell((radius - 2.33) / .92) * (1. - smoothstep(2.8, 3.95, radius));
      float dustLane = 1. - .59 * bell((radius - 1.54 + .039 * sin(3. * azimuth)) / .032);
      float beaming = .67 + .57 * smoothstep(-1.7, 1.35, p.x);
      float receding = .65 + .35 * (1. - smoothstep(-.13, .30, diskY));
      return (heat * dustLane + wake) * texture * occlusion * beaming * receding;
    }

    float lensedDisk(vec2 p, float r, float shadow, float pixel) {
      if (r < .985 || r > 1.72) return 0.;
      float theta = atan(p.y, p.x);
      float above = smoothstep(-.07, .09, p.y);
      float height = abs(p.y) / r;
      float width = mix(.085, mix(.20, .36, above), smoothstep(.06, .90, height));
      width *= .96 + .12 * sin(theta * 3. - .35) + .074 * cos(theta * 7. + .3);

      // A compressed secondary image hugs the photon ring. The broad primary
      // image maps the obscured disk above and below the event horizon.
      float imageRadius = 1.01 + (r - 1.004) * 1.18 / width;
      float texture = diskTexture(imageRadius, -theta + .28,
        (1. - smoothstep(.0013, .0046, pixel)) * (1. - .60 * uCompact));
      float primary = smoothstep(1.035, 1.19, imageRadius) *
        (1.15 * bell((imageRadius - 1.24) / .112) + .73 * bell((imageRadius - 1.43) / .245) +
          .32 * bell((imageRadius - 1.68) / .47));
      float darkLane = 1. - .55 * bell((imageRadius - 1.37 + .035 * sin(theta * 3.)) / .034);
      float angleGain = .49 + .63 * smoothstep(-.69, .91, p.x / r) +
        .19 * bell((theta - 2.47) / .28);
      float shoulder = mix(.59, 1.14, above) * (.56 + .44 * smoothstep(0., .63, height));
      float secondary = .24 * bell((r - 1.009) / max(.006, pixel * 1.15)) *
        (.65 + .35 * sin(theta * 5. + .48)) * (.64 + .36 * above);
      return (primary * darkLane * texture * angleGain * shoulder + secondary) * (1. - shadow);
    }

    float diskHaze(vec2 p, float r, float shadow) {
      float reach = max(.4, 1. - .21 * uCompact);
      float wake = bell((p.y - .075 * sin(p.x * 1.9)) / (.49 + .08 * abs(p.x))) *
        (1. - smoothstep(2.25 * reach, 4.05 * reach, abs(p.x))) * smoothstep(.7, 1.64, r);
      float corona = bell((r - 1.33) / .36) * (.38 + .62 * smoothstep(-.37, .66, p.y));
      float envelope = (.13 * wake + .09 * corona) *
        (1. - smoothstep(1.14, 1.91, abs(p.y))) * (1. - shadow);
      if (envelope < .001) return 0.;
      float density = .55 * grain(p * vec2(7.2, 21.) + vec2(-.17, .09) * uTime) +
        .45 * grain(p * vec2(19.4, 32.) + vec2(.14, -.09) * uTime);
      return envelope * density * density;
    }

    void main() {
      vec2 p = (vUv - uCenter) * vec2(uResolution.x / uResolution.y, 1.) / uRadius;
      const float tilt = .258;
      p = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * p;
      if (abs(p.x) > 4.05 || abs(p.y) > 1.92) discard;

      float r = length(p);
      float pixel = 1. / (uResolution.y * uRadius);
      float shadow = 1. - smoothstep(1. - pixel, 1. + pixel, r);
      float disk = directDisk(p, shadow, pixel);
      float front = (1. - smoothstep(-.17, .07, p.y)) * smoothstep(.13, 1.22, disk);
      float lens = lensedDisk(p, r, shadow, pixel) * (1. - .89 * front);
      float haze = diskHaze(p, r, shadow);
      float energy = (disk + lens + haze) * (1. + uBoost * .075);
      float intensity = 1. - exp(-energy * 1.42);
      if (intensity + shadow < .0014) discard;
      vec3 color = mix(vec3(.85, .41, .22), vec3(1., .91, .77), smoothstep(.04, .95, intensity));
      gl_FragColor = vec4(color * intensity, max(shadow, intensity));
    }
  `;
})();
