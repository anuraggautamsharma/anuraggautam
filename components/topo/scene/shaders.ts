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

/**
 * The sky, and the haze the land fades into with distance (so far ridges melt into the horizon
 * the way air makes them), warmed by a sunrise glow behind the summit at the end of the climb.
 */
const BACKDROP = /* glsl */ `
uniform vec4 uBg; // glow centre x, y (device px from bottom-left), radius px, intensity 0–1
uniform vec2 uRes; // drawing buffer, device px
uniform mat4 uInvViewProj;
uniform vec3 uSun;
uniform float uNight; // 0 day (studio paper), 1 night (lamp-lit ink)
// The model stands in a studio: a paper sweep, brightest where the key light falls, the edges
// sinking into soft shade. At night the same sweep in ink, warmed by the lamp.
vec3 skyColor(vec3 dir) {
  float e = dir.y;
  vec3 lo = mix(${vec3('#EEE7DB')}, ${vec3('#16201B')}, uNight);
  vec3 hi = mix(${vec3('#E2D8C8')}, ${vec3('#0C1310')}, uNight);
  vec3 c = mix(lo, hi, smoothstep(-0.05, 0.45, e));
  vec2 h = normalize(dir.xz + 1e-5);
  float s = max(dot(h, normalize(uSun.xz)), 0.0);
  vec3 warm = mix(${vec3('#F4E3CB')}, ${vec3('#3A2C1E')}, uNight);
  return mix(c, warm, s * s * (1.0 - smoothstep(-0.05, 0.35, e)) * 0.55);
}
vec3 withGlow(vec3 c) {
  vec2 d = (gl_FragCoord.xy - uBg.xy) / uBg.z;
  float r2 = dot(d * vec2(0.8, 1.15), d * vec2(0.8, 1.15));
  c = mix(c, mix(${vec3('#F6DCC6')}, ${vec3('#5A3A22')}, uNight), exp(-r2 * 0.55) * uBg.w * 0.7);
  return mix(c, mix(${vec3('#FAD0A2')}, ${vec3('#C7743A')}, uNight), exp(-r2 * 2.2) * uBg.w * 0.5);
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
${BACKDROP}
void main() { gl_FragColor = vec4(withGlow(skyColor(viewRay())), 1.0); }
`

// Smooth things (camp glow, distance fog) are per vertex; per pixel: the sheets, their light and
// the glow that follows the climber.
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

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vMottle = aMottle;
  vPos = wp.xyz;
  vN = normal;
  vSun = aSun;
  vAo = aAo;
  vT = clamp(position.y / uH, 0.0, 1.0);

  float g = 0.0;
  for (int i = 0; i < 5; i++) {
    vec4 c = uCamps[i];
    vec2 d = wp.xz - c.xy;
    g = max(g, c.z * exp(-dot(d, d) / 0.12));
  }
  vGlow = g;

  // Aerial perspective: haze thickens with distance, thinner over high ground.
  vec4 mv = viewMatrix * wp;
  float dist = length(wp.xyz - cameraPosition);
  vFog = (1.0 - exp(-max(dist - uFog.x, 0.0) * uFog.y)) * (1.0 - 0.25 * smoothstep(2.0, 8.0, wp.y));
  gl_Position = projectionMatrix * mv;
}
`

/**
 * The land as a physical relief model: stacked sheets, one per contour interval, in a matte
 * paper that shifts from sage in the valleys to ivory on the summits. Each sheet reads as a
 * near-flat terrace whose cut edge catches the key light (or falls into shade), under a low
 * warm key, a cool fill, baked cast shadows and deep occlusion. Far sheets melt into the studio.
 */
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

const float LAYERS = 34.0;

void main() {
  vec3 haze = withGlow(skyColor(normalize(vPos - cameraPosition)));
  if (vFog > 0.96) { gl_FragColor = vec4(haze, 1.0); return; }
  vec3 n = normalize(vN);
  vec2 p = vPos.xz;
  // Paper tooth: a fine, even grain (the model is cut from one stock).
  float tooth = texture2D(uNoise, p * 2.7).r * 0.55 + texture2D(uNoise, p * 6.1 + 0.37).r * 0.45;

  // Sheets: which layer this point belongs to, and how close it is to the layer's cut edge.
  float x = vT * LAYERS;
  float fw = max(fwidth(x), 1e-4);
  float f = fract(x);
  float layer = floor(x);
  // The terrace top is near flat: light it with a normal pulled toward up.
  vec3 nt = normalize(mix(n, vec3(0.0, 1.0, 0.0), 0.5));
  // The cut edge faces outward (downhill): toward the key light it glints, away it shades.
  vec2 out2 = normalize(-n.xz + 1e-5);
  float facing = dot(out2, normalize(uSun.xz));
  float edgeW = clamp(fw * 2.2, 0.0, 0.5);
  float edge = (1.0 - smoothstep(0.0, edgeW, 1.0 - f)) * step(0.5, x) * (1.0 - smoothstep(0.35, 0.9, fw));

  // Stock colour by height: sage valleys, sand mid-slopes, ivory peaks; night: slate to pewter.
  float h = clamp((layer + 0.5) / LAYERS, 0.0, 1.0);
  vec3 dayLo = ${vec3('#BFC7B0')};
  vec3 dayMid = ${vec3('#DCD2BE')};
  vec3 dayHi = ${vec3('#F4EFE6')};
  vec3 ngtLo = ${vec3('#26332C')};
  vec3 ngtMid = ${vec3('#3A463F')};
  vec3 ngtHi = ${vec3('#6E7A72')};
  vec3 lo = mix(dayLo, ngtLo, uNight);
  vec3 mid = mix(dayMid, ngtMid, uNight);
  vec3 hi = mix(dayHi, ngtHi, uNight);
  vec3 col = mix(lo, mid, smoothstep(0.08, 0.42, h));
  col = mix(col, hi, smoothstep(0.5, 0.82, h));
  // Alternate sheets differ by a hair, the way stacked stock does.
  col *= 1.0 + (mod(layer, 2.0) - 0.5) * 0.025;
  col *= 0.97 + tooth * 0.06;

  // Light: a low warm key with baked cast shadows, a cool fill, deep occlusion in the folds.
  float key = clamp(dot(nt, uSun) * 1.35 + 0.02, 0.0, 1.0) * mix(0.22, 1.0, vSun);
  float fill = vAo * (0.55 + 0.45 * nt.y);
  vec3 keyC = mix(vec3(1.0, 0.93, 0.82), vec3(1.0, 0.72, 0.42), uNight);
  vec3 fillC = mix(vec3(0.66, 0.72, 0.8), vec3(0.32, 0.4, 0.5), uNight);
  vec3 lit = col * (keyC * key * 1.08 + fillC * fill * 0.42);
  lit *= mix(0.6, 1.0, vAo);
  // Studio bounce: no fold of a white model ever goes muddy.
  lit = max(lit, col * mix(0.5, 0.3, uNight));
  // The cut edges.
  vec3 glint = mix(${vec3('#FFF8EC')}, ${vec3('#F0B57A')}, uNight);
  vec3 shade = col * mix(0.42, 0.3, uNight);
  vec3 edgeC = mix(shade, glint, smoothstep(-0.1, 0.55, facing) * vSun);
  lit = mix(lit, edgeC, edge * 0.9);
  // Each sheet sits a hair above the next: a soft contact shadow just inside its foot.
  lit *= 1.0 - (1.0 - smoothstep(0.0, edgeW * 3.0, f)) * step(0.5, x) * 0.1 * (1.0 - smoothstep(0.35, 0.9, fw));

  // Reached camps pool warm light; the active one wears a ring; the climber carries a lantern.
  lit = mix(lit, uGlow, vGlow * mix(0.22, 0.45, uNight));
  if (uRing.z > 0.002) {
    float dc = length(p - uRing.xy);
    float ring = 1.0 - smoothstep(0.0, fwidth(dc) * 1.5, abs(dc - 0.2));
    lit = mix(lit, uCore, uRing.z * ring * 0.75);
  }
  if (uHead.z > 0.002) {
    vec2 dh = p - uHead.xy;
    float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
    lit += uGlow * exp(-dot(dh, dh) / 0.05) * mix(0.45, 0.8, uNight) * uHead.z * pulse;
  }

  // The far model melts into the studio.
  gl_FragColor = vec4(mix(lit, haze, smoothstep(0.0, 1.0, vFog)), 1.0);
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
