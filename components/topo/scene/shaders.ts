// GLSL for the topographic map. Colours are sRGB hex written straight to the sRGB canvas
// (no tone mapping, no colour-space conversion), so the map matches the paper page exactly.

/** sRGB hex → normalised [r, g, b] (no linearisation: the shaders work in display space). */
export function srgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export const COLORS = {
  paper: '#F7F2E8',
  ink: '#0E1D15',
  ice: '#006191', // glacier-700: contours above the snow line
  shadow: '#004973', // glacier-800: cool shade
  warm: '#FFE6C4', // sun-side highlight
  core: '#F86A00', // sunrise-500: the walked route
  tip: '#FFDB94', // the route's leading tip
  glow: '#FFB782', // sunrise-300: light pooled at reached camps
} as const

/** Elevation ramp, t → hex (SPEC_V2 §4 Beat 03). */
export const RAMP: readonly [number, string][] = [
  [0, '#2C6E45'],
  [0.14, '#3F8A52'],
  [0.28, '#6FA862'],
  [0.42, '#A9C27C'],
  [0.54, '#D3CB98'],
  [0.64, '#D9C3A0'],
  [0.74, '#B4A797'],
  [0.83, '#9EA4A3'],
  [0.9, '#CBD9E0'],
  [0.95, '#E6F0F3'],
  [1, '#FBFAF6'],
]

const f = (v: number) => v.toFixed(4)
const vec3 = (hex: string) => `vec3(${srgb(hex).map(f).join(', ')})`

/** Piecewise-linear ramp as chained mixes (stops ascend, so later mixes stay 0 below their range). */
const rampGlsl = () => {
  let body = `  vec3 c = ${vec3(RAMP[0][1])};\n`
  for (let i = 1; i < RAMP.length; i++) {
    const [t0] = RAMP[i - 1]
    const [t1, hex] = RAMP[i]
    body += `  c = mix(c, ${vec3(hex)}, clamp((t - ${f(t0)}) / ${f(t1 - t0)}, 0.0, 1.0));\n`
  }
  return `vec3 ramp(float t) {\n${body}  return c;\n}`
}

// Everything that varies smoothly (elevation colour, camp glow, edge noise, fog) is computed
// per vertex and interpolated; per pixel only the facet normal, the contours and the active
// camp's ring remain. That keeps the fill cost low on integrated GPUs.
export const terrainVertex = /* glsl */ `
uniform float uH;
uniform vec2 uFog;
uniform vec4 uCamps[5]; // x, z, glow 0–1, unused
varying vec3 vPos;
varying float vT;
varying vec3 vRamp;
varying float vGlow;
varying float vPaper;

${rampGlsl()}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 q = fract(p);
  vec2 u = q * q * (3.0 - 2.0 * q);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPos = wp.xyz;
  float t = clamp(position.y / uH, 0.0, 1.0);
  vT = t;
  vRamp = ramp(t);

  // Reached camps: warm light pooled on the ground around each.
  float g = 0.0;
  for (int i = 0; i < 5; i++) {
    vec4 c = uCamps[i];
    vec2 d = wp.xz - c.xy;
    g = max(g, c.z * exp(-dot(d, d) / 0.09));
  }
  vGlow = g;

  // The land dissolves into paper at its edges, then with distance (fog).
  float r = max(abs(wp.x), abs(wp.z)) / 5.0;
  float edge = smoothstep(0.72, 0.98, r + (vnoise(wp.xz * 1.6) - 0.5) * 0.1);
  vec4 mv = viewMatrix * wp;
  float fog = smoothstep(uFog.x, uFog.y, -mv.z);
  vPaper = 1.0 - (1.0 - edge) * (1.0 - fog);
  gl_Position = projectionMatrix * mv;
}
`

export const terrainFragment = /* glsl */ `
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uIce;
uniform vec3 uShadow;
uniform vec3 uWarm;
uniform vec3 uGlow;
uniform vec3 uCore;
uniform vec3 uSun;
uniform vec3 uRing; // active camp: x, z, intensity 0–1
varying vec3 vPos;
varying float vT;
varying vec3 vRamp;
varying float vGlow;
varying float vPaper;

void main() {
  // Flat facet normal from screen-space derivatives (no normals attribute); face it up.
  vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
  if (n.y < 0.0) n = -n;
  float shade = max(dot(n, uSun), 0.0);
  vec3 col = vRamp * (0.62 + 0.48 * shade);
  col = mix(col, uShadow, (1.0 - shade) * 0.18);
  float s2 = shade * shade;
  col = mix(col, uWarm, s2 * s2 * 0.15);

  // Contours every 1/40 of the relief, every 5th major. Distances in px via fwidth; minor
  // lines fade out before they crowd into moiré.
  float x = vT * 40.0;
  float fw = max(fwidth(x), 1e-5);
  float d = abs(fract(x - 0.5) - 0.5) / fw;
  float lvl = floor(x + 0.5);
  float major = 1.0 - step(0.5, mod(lvl, 5.0));
  float wpx = mix(1.0, 1.6, major);
  float line = 1.0 - smoothstep(wpx * 0.5 - 0.5, wpx * 0.5 + 0.5, d);
  float minorA = 0.16 * (1.0 - smoothstep(0.25, 0.35, fw));
  float majorA = 0.38 * (1.0 - smoothstep(1.2, 1.8, fw));
  line *= mix(minorA, majorA, major) * step(0.5, lvl) * step(lvl, 39.5);
  col = mix(col, vT > 0.88 ? uIce : uInk, line);

  col = mix(col, uGlow, vGlow * 0.6);
  if (uRing.z > 0.002) { // uniform branch: only while a camp is active
    float dc = length(vPos.xz - uRing.xy);
    float ring = 1.0 - smoothstep(0.0, fwidth(dc) * 1.5, abs(dc - 0.32));
    col = mix(col, uCore, uRing.z * ring * 0.9);
  }

  gl_FragColor = vec4(mix(col, uPaper, vPaper), 1.0);
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

  float inCore = 1.0 - smoothstep(0.45 - aa, 0.45 + aa, s);
  float inCasing = 1.0 - smoothstep(0.8 - aa, 0.8 + aa, s);
  float inEdge = 1.0 - smoothstep(1.0 - 2.0 * aa, 1.0, s);

  // Walked: sunrise core, paper casing, a faint ink outline; the leading tip burns brighter.
  vec3 core = mix(uCore, uTip, smoothstep(uProgress - 0.015, uProgress, vT));
  vec3 walked = mix(mix(uInk, uPaper, inCasing), core, inCore);
  float walkedA = mix(mix(0.25 * inEdge, 0.9, inCasing), 1.0, inCore);

  // Ahead: the planned trail, dashed, inside the core width only (paper dash, ink rim).
  float dash = step(0.5, fract(vT * 140.0));
  float inDash = 1.0 - smoothstep(0.28 - aa, 0.28 + aa, s);
  vec3 ahead = mix(uInk, uPaper, inDash);
  float aheadA = dash * inCore * mix(0.45, 0.85, inDash);

  gl_FragColor = vec4(mix(ahead, walked, drawn), mix(aheadA, walkedA, drawn));
}
`
