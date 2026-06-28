import * as THREE from 'three'

/* Interactive particle object for the hero.
   A subdivided icosahedron rendered as points, displaced by simplex noise
   and pushed around by the cursor. Monochrome with an acid-accent rim. */

const SNOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`

export function initHero(canvas) {
  if (!canvas) return () => {}
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch (e) {
    return () => {} // no WebGL — CSS grid stays as the backdrop
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(dpr)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.z = 6.2

  const geo = new THREE.IcosahedronGeometry(2.1, 64)

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uMouseStrength: { value: 0 },
    uAccent: { value: new THREE.Color(0xd6ff1f) },
    uPaper: { value: new THREE.Color(0xededea) },
    uSize: { value: 2.0 * dpr },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexShader: /* glsl */`
      uniform float uTime; uniform vec3 uMouse; uniform float uMouseStrength; uniform float uSize;
      varying float vDisp; varying float vMouse;
      ${SNOISE}
      void main(){
        vec3 p = position;
        float n = snoise(p * 0.55 + vec3(0.0, 0.0, uTime * 0.12));
        float n2 = snoise(p * 1.7 + vec3(uTime * 0.18));
        float disp = n * 0.45 + n2 * 0.12;
        p += normalize(position) * disp;

        // cursor push
        float d = distance(p, uMouse);
        float push = smoothstep(2.2, 0.0, d) * uMouseStrength;
        p += normalize(p - uMouse) * push * 0.9;

        vDisp = disp; vMouse = push;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (1.0 + push * 1.6) * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      precision mediump float;
      uniform vec3 uAccent; uniform vec3 uPaper;
      varying float vDisp; varying float vMouse;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.1, length(c));
        if (a < 0.02) discard;
        vec3 col = mix(uPaper, uAccent, smoothstep(0.18, 0.5, vDisp) + vMouse);
        gl_FragColor = vec4(col, a * (0.55 + vMouse));
      }
    `,
  })

  const points = new THREE.Points(geo, material)
  scene.add(points)

  // ---- interaction ----
  const mouse = new THREE.Vector2(0, 0)
  const target = new THREE.Vector2(0, 0)
  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const hit = new THREE.Vector3()

  function onMove(e) {
    const t = e.touches ? e.touches[0] : e
    const x = (t.clientX / window.innerWidth) * 2 - 1
    const y = -(t.clientY / window.innerHeight) * 2 + 1
    target.set(x, y)
    raycaster.setFromCamera({ x, y }, camera)
    raycaster.ray.intersectPlane(plane, hit)
    uniforms.uMouse.value.copy(hit)
    uniforms.uMouseStrength.value = 1.0
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('touchmove', onMove, { passive: true })

  // ---- resize ----
  function resize() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // pull the object slightly off-center-right on wide screens
    points.position.x = w / h > 1 ? 1.3 : 0
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  // ---- loop ----
  const clock = new THREE.Clock()
  let raf
  let visible = true
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
  io.observe(canvas)

  function tick() {
    raf = requestAnimationFrame(tick)
    if (!visible) return
    const dt = clock.getDelta()
    uniforms.uTime.value += reduced ? dt * 0.15 : dt
    mouse.x += (target.x - mouse.x) * 0.05
    mouse.y += (target.y - mouse.y) * 0.05
    points.rotation.y += (reduced ? 0.0008 : 0.0022) + mouse.x * 0.0006
    points.rotation.x = mouse.y * 0.25
    uniforms.uMouseStrength.value *= 0.94
    renderer.render(scene, camera)
  }
  tick()

  // ---- cleanup ----
  return function destroy() {
    cancelAnimationFrame(raf)
    io.disconnect()
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('resize', resize)
    geo.dispose(); material.dispose(); renderer.dispose()
  }
}
