// GLSL for the 3D route map. Colours are sRGB hex written straight to the sRGB canvas (no tone
// mapping, no colour-space conversion), so the land's haze and edges match the paper page exactly.

/** sRGB hex → normalised [r, g, b] (no linearisation: the shaders work in display space). */
export function srgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export const COLORS = {
  paper: '#F7F2E8',
  ink: '#0E1D15',
  ice: '#006191', // glacier-700: contours above the snow line
  core: '#F86A00', // sunrise-500: the walked route
  tip: '#FFDB94', // the route's leading tip
  glow: '#FFB782', // sunrise-300: light pooled at reached camps
} as const

const f = (v: number) => v.toFixed(4)
const vec3 = (hex: string) => `vec3(${srgb(hex).map(f).join(', ')})`

/** Land cover, low to high. */
const BIOME = {
  forestDeep: '#1D4430',
  forest: '#2E6842',
  meadow: '#5B9450',
  meadowLight: '#90B464',
  alpine: '#A7AC70',
  dry: '#C6B88A',
  rockDeep: '#5F574F',
  rock: '#8F8478',
  rockLight: '#B8AD9D',
  snow: '#F6F9FA',
  snowShade: '#B4C8D6',
} as const

/**
 * The sky, and the haze the land fades into with distance (so far ridges melt into the horizon
 * the way air makes them), warmed by a sunrise glow behind the summit at the end of the climb.
 */
const BACKDROP = /* glsl */ `
uniform vec4 uBg; // glow centre x, y (device px from bottom-left), radius px, intensity 0–1
uniform vec2 uRes; // drawing buffer, device px
uniform mat4 uInvViewProj;
uniform vec3 uSun;
uniform float uNight; // 0 day, 1 night (the page's dark theme)
vec3 skyColor(vec3 dir) {
  float e = dir.y;
  vec3 c = mix(${vec3('#E8DFCF')}, ${vec3('#CCD9E1')}, smoothstep(-0.02, 0.2, e));
  c = mix(c, ${vec3('#9EB9CD')}, smoothstep(0.2, 0.65, e));
  // The sky warms on the sun's side, low down.
  vec2 h = normalize(dir.xz + 1e-5);
  float s = max(dot(h, normalize(uSun.xz)), 0.0);
  c = mix(c, ${vec3('#F2D6B4')}, s * s * s * (1.0 - smoothstep(0.0, 0.3, e)) * 0.5);
  // Night: a deep navy dome, the last of the light low on the horizon.
  vec3 n = mix(${vec3('#16223A')}, ${vec3('#0A1120')}, smoothstep(-0.02, 0.25, e));
  n = mix(n, ${vec3('#05080F')}, smoothstep(0.25, 0.7, e));
  n = mix(n, ${vec3('#2A2A33')}, s * s * (1.0 - smoothstep(0.0, 0.2, e)) * 0.35);
  return mix(c, n, uNight);
}
vec3 withGlow(vec3 c) {
  vec2 d = (gl_FragCoord.xy - uBg.xy) / uBg.z;
  float r2 = dot(d * vec2(0.8, 1.15), d * vec2(0.8, 1.15));
  c = mix(c, ${vec3('#F6DCC6')}, exp(-r2 * 0.55) * uBg.w * 0.7);
  return mix(c, ${vec3('#FAD0A2')}, exp(-r2 * 2.2) * uBg.w * 0.5);
}
vec3 viewRay() {
  vec2 ndc = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  vec4 w = uInvViewProj * vec4(ndc, 1.0, 1.0);
  return normalize(w.xyz / w.w - cameraPosition);
}
`

export const skyVertex = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`

export const skyFragment = /* glsl */ `
uniform float uTime;
${BACKDROP}
float shash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
// One layer of stars on a grid in direction space: sparse, sized and tinted per star, twinkling.
float starLayer(vec2 g, float density, out vec3 tint) {
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = shash(id);
  vec2 off = vec2(shash(id + 3.1), shash(id + 7.7)) - 0.5;
  float d = length(f - off * 0.7);
  float size = mix(0.035, 0.11, pow(shash(id + 1.3), 3.0));
  float aa = fwidth(d) * 1.2 + 1e-4;
  float b = step(1.0 - density, h) * (1.0 - smoothstep(size - aa, size + aa, d));
  b *= 0.65 + 0.35 * sin(uTime * (0.8 + h * 2.5) + h * 40.0);
  tint = mix(vec3(0.78, 0.86, 1.0), vec3(1.0, 0.9, 0.78), shash(id + 5.5));
  return b * mix(0.55, 1.0, shash(id + 9.1));
}
void main() {
  vec3 d = viewRay();
  vec3 c = skyColor(d);
  if (uNight > 0.001) {
    float up = smoothstep(-0.01, 0.12, d.y);
    vec2 sph = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0)));
    vec3 t1; vec3 t2;
    float s1 = starLayer(sph * 95.0, 0.05, t1);
    float s2 = starLayer(sph * 210.0 + 13.7, 0.035, t2);
    // The Milky Way: a soft, uneven band across the dome.
    vec3 bandN = normalize(vec3(0.55, 0.62, 0.56));
    float band = exp(-pow(dot(d, bandN) * 5.2, 2.0));
    float dust = shash(floor(sph * 340.0)) * 0.5 + shash(floor(sph * 60.0)) * 0.5;
    vec3 milky = vec3(0.55, 0.6, 0.75) * band * (0.05 + 0.08 * dust);
    // The moon, high on the left, with a halo.
    vec3 moonD = normalize(vec3(-0.5, 0.2, -0.84));
    float md = acos(clamp(dot(d, moonD), -1.0, 1.0));
    float disc = 1.0 - smoothstep(0.0105, 0.0125, md);
    float halo = exp(-md * 18.0) * 0.22 + exp(-md * 5.0) * 0.06;
    vec3 night = t1 * s1 * 0.9 + t2 * s2 * 0.6 + milky + vec3(0.72, 0.8, 0.95) * halo;
    night = night * up * (1.0 - disc) + vec3(0.93, 0.95, 1.0) * disc * up;
    c += night * uNight;
  }
  gl_FragColor = vec4(withGlow(c), 1.0);
}
`

const NOISE = /* glsl */ `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 q = fract(p);
  vec2 u = q * q * (3.0 - 2.0 * q);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm2(vec2 p) { return (vnoise(p) * 0.667 + vnoise(p * 2.03 + 11.7) * 0.333); }
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return s / 0.9375;
}
`

// Smooth things (camp glow, the island edge, distance fog) are per vertex; per pixel: land
// cover, light, contours, mist, cloud shadows and the glow that follows the climber.
export const terrainVertex = /* glsl */ `
uniform float uH;
uniform float uTime;
uniform vec2 uFog;
uniform vec4 uCamps[5]; // x, z, glow 0–1, unused
attribute float aSun;
attribute float aAo;
attribute float aMottle;
varying vec3 vPos;
varying vec3 vN;
varying float vSun;
varying float vAo;
varying float vT;
varying float vGlow;
varying float vFog;
varying float vMottle;
varying float vCloud;
varying float vMist;
varying float vTent;

${NOISE}

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  // Broad noise lives on the vertices (256² of them): land-cover patches, cloud shadows, mist.
  vMottle = aMottle;
  vCloud = smoothstep(0.5, 0.74, fbm2(wp.xz * 0.26 + uTime * vec2(0.03, 0.016)));
  vMist = 0.25 + 0.6 * fbm2(wp.xz * 0.55 + uTime * vec2(0.022, -0.012));
  vPos = wp.xyz;
  vN = normal;
  vSun = aSun;
  vAo = aAo;
  vT = clamp(position.y / uH, 0.0, 1.0);

  float g = 0.0;
  float tent = 0.0;
  for (int i = 0; i < 5; i++) {
    vec4 c = uCamps[i];
    vec2 d = wp.xz - c.xy;
    g = max(g, c.z * exp(-dot(d, d) / 0.12));
    tent = max(tent, exp(-dot(d, d) / 0.02));
  }
  vGlow = g;
  vTent = tent;

  // Aerial perspective: haze thickens with distance, thinner over high ground.
  vec4 mv = viewMatrix * wp;
  float dist = length(wp.xyz - cameraPosition);
  vFog = (1.0 - exp(-max(dist - uFog.x, 0.0) * uFog.y)) * (1.0 - 0.25 * smoothstep(2.0, 8.0, wp.y));
  gl_Position = projectionMatrix * mv;
}
`

export const terrainFragment = /* glsl */ `
uniform float uTime;
${BACKDROP}
uniform vec3 uInk;
uniform vec3 uIce;
uniform vec3 uGlow;
uniform vec3 uCore;
uniform vec3 uRing; // active camp: x, z, intensity 0–1
uniform vec4 uHead; // the climber: x, z, intensity, unused
uniform sampler2D uNoise; // tiling noise: r grain, g clumps
varying vec3 vPos;
varying vec3 vN;
varying float vSun;
varying float vAo;
varying float vT;
varying float vGlow;
varying float vFog;
varying float vMottle;
varying float vCloud;
varying float vMist;
varying float vTent;

void main() {
  vec3 haze = withGlow(skyColor(normalize(vPos - cameraPosition)));
  // Far land that the haze has all but swallowed: skip the detail work.
  if (vFog > 0.94) {
    gl_FragColor = vec4(mix(haze, mix(${vec3('#A9BCC9')}, ${vec3('#141E30')}, uNight), 0.5 * smoothstep(0.35, 0.8, vFog)), 1.0);
    return;
  }
  vec3 n = normalize(vN);
  float slope = 1.0 - n.y;
  vec2 p = vPos.xz;
  float grain = texture2D(uNoise, p * 0.71).r * 0.6 + texture2D(uNoise, p * 1.83 + 0.37).r * 0.4;
  float mottle = vMottle;

  // Land cover by height, slope and a little noise.
  float t = vT + (mottle - 0.5) * 0.07;
  vec3 col = mix(${vec3(BIOME.forestDeep)}, ${vec3(BIOME.forest)}, smoothstep(0.25, 0.75, grain * 0.5 + mottle * 0.5));
  // Tree clumps: dark speckle that thins out with height.
  float trees = smoothstep(0.45, 0.8, texture2D(uNoise, p * 0.93 + 0.61).g) * (1.0 - smoothstep(0.2, 0.42, vT));
  col *= 1.0 - trees * 0.16;
  vec3 meadow = mix(${vec3(BIOME.meadow)}, ${vec3(BIOME.meadowLight)}, grain);
  col = mix(col, meadow, smoothstep(0.16, 0.3, t + (mottle - 0.5) * 0.12));
  vec3 alpine = mix(${vec3(BIOME.alpine)}, ${vec3(BIOME.dry)}, grain);
  col = mix(col, alpine, smoothstep(0.42, 0.56, t));
  // The map's marks (rock strata, contours) belong to the climb's mountain, not the far world.
  float home = 1.0 - smoothstep(5.0, 7.0, length(p - vec2(-0.2, 0.3)));
  float strata = mix(0.5, 0.5 + 0.5 * sin(vPos.y * 22.0 + mottle * 5.0), home);
  vec3 rock = mix(${vec3(BIOME.rockDeep)}, ${vec3(BIOME.rock)}, grain * 0.75 + strata * 0.15 + 0.05);
  rock = mix(rock, ${vec3(BIOME.rockLight)}, smoothstep(0.6, 0.9, t) * 0.5);
  float rockAmt = smoothstep(0.3, 0.52, slope * 1.25 + t * 0.22 + (grain - 0.5) * 0.12);
  col = mix(col, rock, rockAmt);
  // Snow settles on the flatter ground above the line; steep faces stay bare.
  float line = 0.66 + (mottle - 0.5) * 0.1;
  float snow = smoothstep(line, line + 0.04, t + (0.35 - slope) * 0.22);
  vec3 snowCol = mix(${vec3(BIOME.snowShade)}, ${vec3(BIOME.snow)}, clamp(dot(n, uSun) * 1.6 + 0.2, 0.0, 1.0));
  col = mix(col, snowCol, snow);

  // Light: low golden sun with baked shadows, cool sky in the shade, drifting cloud shadows.
  float cloud = vCloud * (1.0 - uNight);
  float sunLit = clamp(dot(n, uSun) * 1.25 + 0.08, 0.0, 1.0) * vSun * (1.0 - cloud * 0.5);
  float sky = vAo * (0.6 + 0.4 * n.y);
  vec3 lit = col * (vec3(1.0, 0.88, 0.72) * sunLit * 1.05 + vec3(0.6, 0.7, 0.84) * sky * 0.62);
  lit = mix(lit, lit * vec3(0.82, 0.9, 1.08), (1.0 - sunLit) * 0.45);
  // Snow and ice catch the sun.
  vec3 v = normalize(cameraPosition - vPos);
  float spec = pow(max(dot(reflect(-uSun, n), v), 0.0), 24.0) * vSun;
  lit += vec3(1.0, 0.95, 0.85) * spec * snow * 0.35;

  // Night: the same land under a full moon (the moon stands where the sun was, so every baked
  // shadow still falls true). Colour drains toward blue the way eyes see in the dark; snow
  // glows silver; the cloud shadows go.
  if (uNight > 0.001) {
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 alb = mix(vec3(lum), col, 0.28);
    float moon = clamp(dot(n, uSun) * 1.35 + 0.02, 0.0, 1.0) * vSun;
    // A strong cold key, a dim navy ambient: moonlit ridges stand out of deep valleys.
    vec3 litN = alb * (vec3(0.6, 0.74, 1.0) * moon * 1.0 + vec3(0.05, 0.08, 0.16) * sky * 0.7) * vec3(0.82, 0.9, 1.1);
    litN += vec3(0.7, 0.78, 0.9) * snow * moon * 0.3;
    litN += vec3(0.08, 0.1, 0.15) * snow * sky * 0.5;
    litN += vec3(0.9, 0.95, 1.0) * spec * snow * 0.6;
    lit = mix(lit, litN, uNight);
  }

  // Contours: the map this landscape came from, faint, every 1/40 of the relief.
  float x = vT * 40.0;
  float fw = max(fwidth(x), 1e-5);
  float d = abs(fract(x - 0.5) - 0.5) / fw;
  float lvl = floor(x + 0.5);
  float major = 1.0 - step(0.5, mod(lvl, 5.0));
  float lineA = 1.0 - smoothstep(mix(0.5, 0.8, major) - 0.5, mix(0.5, 0.8, major) + 0.5, d);
  lineA *= mix(0.07 * (1.0 - smoothstep(0.2, 0.32, fw)), 0.17 * (1.0 - smoothstep(1.0, 1.6, fw)), major) * step(0.5, lvl) * home;
  vec3 lineC = mix(vT > 0.7 ? uIce : uInk, ${vec3('#9DB2CC')}, uNight);
  lit = mix(lit, lineC, lineA * mix(1.0, 0.55, uNight));

  // Reached camps pool warm light; the active one wears a ring; the climber carries a lantern.
  lit = mix(lit, uGlow, vGlow * 0.3 * (1.0 - uNight));
  // At night every camp is a lit tent; the ones reached burn as beacons.
  lit += uGlow * vec3(1.0, 0.72, 0.42) * (vGlow * 0.42 + vTent * 0.3) * uNight;
  if (uRing.z > 0.002) {
    float dc = length(p - uRing.xy);
    float ring = 1.0 - smoothstep(0.0, fwidth(dc) * 1.5, abs(dc - 0.2));
    lit = mix(lit, uCore, uRing.z * ring * 0.75);
  }
  if (uHead.z > 0.002) {
    vec2 dh = p - uHead.xy;
    float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
    lit += uGlow * mix(vec3(1.0), vec3(1.0, 0.75, 0.45), uNight) * exp(-dot(dh, dh) / 0.05) * mix(0.55, 0.8, uNight) * uHead.z * pulse;
  }

  // Mist pools in the valleys and drifts.
  float mist = (1.0 - smoothstep(0.0, 0.14, vT)) * vMist;
  lit = mix(lit, mix(haze, haze * 1.25 + vec3(0.02, 0.03, 0.06), uNight), mist * mix(0.32, 0.3, uNight));

  // Distance haze, then the shore into paper.
  // Far land turns blue-grey before it vanishes, like real distance.
  vec3 far = mix(haze, mix(${vec3('#A9BCC9')}, ${vec3('#141E30')}, uNight), 0.5);
  gl_FragColor = vec4(mix(lit, mix(haze, far, smoothstep(0.35, 0.8, vFog)), vFog), 1.0);
}
`

export const ribbonVertex = /* glsl */ `
attribute float aT;
attribute float aSide;
varying float vT;
varying float vSide;
void main() {
  vT = aT;
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const ribbonFragment = /* glsl */ `
uniform float uProgress;
uniform float uTime;
uniform vec3 uCore;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uTip;
varying float vT;
varying float vSide;
void main() {
  float s = abs(vSide);
  float aa = max(fwidth(s), 1e-4) * 1.2;
  float ft = max(fwidth(vT), 1e-6);
  float drawn = 1.0 - smoothstep(uProgress - ft, uProgress + ft, vT);

  // Walked: a hot core with a soft halo, light flowing up the trail, the tip burning brightest.
  float inCore = 1.0 - smoothstep(0.26 - aa, 0.26 + aa, s);
  float halo = exp(-s * s * 7.0);
  float flow = smoothstep(0.75, 1.0, fract(vT * 7.0 - uTime * 0.35)) * 0.45;
  float tip = smoothstep(uProgress - 0.02, uProgress, vT);
  vec3 core = mix(uCore, uTip, max(tip, flow));
  vec3 walked = mix(mix(uCore, uTip, 0.35), core, inCore);
  float walkedA = max(inCore, halo * 0.42);

  // Ahead: the planned trail, dashed, paper with an ink rim.
  float dash = step(0.45, fract(vT * 150.0));
  float inDash = 1.0 - smoothstep(0.16 - aa, 0.16 + aa, s);
  float inRim = 1.0 - smoothstep(0.24 - aa, 0.24 + aa, s);
  vec3 ahead = mix(uInk, uPaper, inDash);
  float aheadA = dash * inRim * mix(0.5, 0.95, inDash);

  gl_FragColor = vec4(mix(ahead, walked, drawn), mix(aheadA, walkedA, drawn));
}
`
