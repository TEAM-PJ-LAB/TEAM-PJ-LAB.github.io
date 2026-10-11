/* =========================================================
   PJ — particle field
   One point cloud that morphs between four shapes:
   0: "PJ" wordmark  1: sphere  2: wave field  3: spiral galaxy
   ========================================================= */
import * as THREE from 'three';

// Simplex 3D noise — Ian McEwan, Ashima Arts (MIT)
const NOISE = /* glsl */`
vec4 permute(vec4 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const VERT = /* glsl */`
uniform float uTime;
uniform float uIntro;
uniform float uState;
uniform float uAlpha;
uniform float uSize;
uniform float uPixelRatio;
uniform float uTextScale;
uniform float uFit;
uniform vec2 uOffset;
uniform vec3 uMouse;
uniform float uMouseForce;

attribute vec3 aText;
attribute vec3 aSphere;
attribute vec3 aWave;
attribute vec3 aGalaxy;
attribute vec3 aScatter;
attribute vec4 aRand;
attribute float aDust;

varying vec3 vColor;
varying float vAlpha;

${NOISE}

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

vec3 shapeText(){
  vec3 p = aText * uTextScale;
  p.z += snoise(vec3(aText.xy * 3.0, uTime * 0.22)) * 0.14;
  p.xy += vec2(
    snoise(vec3(aText.xy * 6.0, uTime * 0.18 + 10.0)),
    snoise(vec3(aText.xy * 6.0, uTime * 0.18 + 20.0))
  ) * 0.007 * uTextScale;
  return p;
}
vec3 shapeSphere(){
  vec3 n = normalize(aSphere + 1e-5);
  float d = snoise(n * 1.3 + uTime * 0.16);
  vec3 p = aSphere * (1.0 + d * 0.2) * uFit;
  p.xz *= rot(uTime * 0.12);
  p.yz *= rot(0.38);
  return p;
}
vec3 shapeWave(){
  vec3 p = aWave;
  float t = uTime * 0.35;
  p.y = snoise(vec3(p.x * 0.17, p.z * 0.2 - t * 0.6, t * 0.25)) * 0.95
      + sin(p.x * 0.42 + t * 1.5) * 0.2;
  p.y -= 1.7;
  return p;
}
vec3 shapeGalaxy(){
  vec3 p = aGalaxy * uFit;
  float r = length(p.xz);
  p.xz *= rot(uTime * (0.35 / (0.6 + r * 0.5)));
  p.yz *= rot(0.55);
  p.xy *= rot(-0.22);
  return p;
}
vec3 getShape(float idx){
  if (idx < 0.5) return shapeText();
  if (idx < 1.5) return shapeSphere();
  if (idx < 2.5) return shapeWave();
  return shapeGalaxy();
}

void main(){
  float s = clamp(uState, 0.0, 3.0);
  float seg = min(floor(s), 2.0);
  float f = s - seg;
  float delay = aRand.x * 0.4;
  float k = smoothstep(delay, delay + 0.6, f);

  vec3 p = mix(getShape(seg), getShape(seg + 1.0), k);

  // swirl while travelling between shapes
  float transit = sin(3.14159265 * k);
  vec3 tn = vec3(
    snoise(p * 0.32 + vec3(uTime * 0.2, 0.0, 0.0)),
    snoise(p * 0.32 + vec3(0.0, uTime * 0.2, 13.1)),
    snoise(p * 0.32 + vec3(7.7, 0.0, uTime * 0.2))
  );
  p += tn * transit * 1.2;

  // ambient dust that never joins a shape
  vec3 dust = aScatter;
  dust.xz *= rot(uTime * 0.012);
  dust.xy += vec2(snoise(aScatter * 0.12 + uTime * 0.05), snoise(aScatter * 0.12 + uTime * 0.05 + 31.0)) * 0.7;
  p = mix(p, dust, aDust);

  // intro: particles converge from a wide cloud
  float ik = smoothstep(aRand.x * 0.45, aRand.x * 0.45 + 0.55, uIntro);
  vec3 itn = vec3(
    snoise(p * 0.25 + uTime * 0.3),
    snoise(p * 0.25 + uTime * 0.3 + 5.0),
    snoise(p * 0.25 + uTime * 0.3 + 9.0)
  );
  p = mix(aScatter * 1.7, p, ik) + itn * sin(3.14159265 * ik) * 1.6 * (1.0 - aDust);

  p.xy += uOffset * (1.0 - aDust * 0.85);

  vec4 world = modelMatrix * vec4(p, 1.0);

  // pointer repulsion
  vec2 dm = world.xy - uMouse.xy;
  float dist = length(dm);
  float force = smoothstep(1.7, 0.0, dist) * uMouseForce * (1.0 - aDust * 0.6);
  world.xy += normalize(dm + 1e-4) * force * 0.7;
  world.z += force * 0.9;

  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;

  float size = uSize * (0.35 + aRand.y * 1.1) * (1.0 + aDust * 0.6);
  gl_PointSize = min(size * uPixelRatio * (1.0 / -mv.z), 48.0);

  bool accent = aRand.z > 0.94;
  vec3 cream = vec3(0.96, 0.93, 0.88);
  vec3 orange = vec3(1.0, 0.33, 0.12);
  vColor = accent ? orange : cream * (0.55 + 0.45 * aRand.w);
  vColor = mix(vColor, orange, force * 0.6);

  float twinkle = 0.72 + 0.28 * sin(uTime * (1.0 + aRand.w * 2.2) + aRand.w * 60.0);
  float depth = smoothstep(-36.0, -8.0, mv.z);
  vAlpha = uAlpha * (0.45 + 0.55 * aRand.w) * twinkle * depth * (accent ? 1.3 : 1.0) * (0.2 + 0.8 * ik);
}
`;

const FRAG = /* glsl */`
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = pow(1.0 - d * 2.0, 1.7);
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`;

/* Sample points from a rendered wordmark, weighting outlines for crisp edges. */
function sampleText(text, count, font) {
  const W = 1600, H = 900, fs = 660;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${fs}px ${font}`;

  const chars = [...text];
  const gap = -fs * 0.035;
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = (W - total) / 2;
  const baseline = H / 2 + fs * 0.36;
  chars.forEach((ch, i) => { ctx.fillText(ch, x, baseline); x += widths[i] + gap; });

  const data = ctx.getImageData(0, 0, W, H).data;
  const filled = (px, py) => px >= 0 && py >= 0 && px < W && py < H && data[(py * W + px) * 4 + 3] > 140;

  const fill = [], edge = [];
  const step = 2;
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let py = 0; py < H; py += step) {
    for (let px = 0; px < W; px += step) {
      if (!filled(px, py)) continue;
      fill.push(px, py);
      if (!filled(px - 5, py) || !filled(px + 5, py) || !filled(px, py - 5) || !filled(px, py + 5)) edge.push(px, py);
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  }

  const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const src = edge.length && Math.random() < 0.32 ? edge : fill;
    const n = src.length / 2;
    const j = n ? (Math.random() * n | 0) * 2 : 0;
    const sx = n ? src[j] : cx, sy = n ? src[j + 1] : cy;
    out[i * 3] = (sx - cx + (Math.random() - 0.5) * step) / bw;
    out[i * 3 + 1] = -(sy - cy + (Math.random() - 0.5) * step) / bw;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
  }
  return { positions: out, ratio: bh / bw };
}

function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function createParticles(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);

  const lowPower = Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
  const COUNT = lowPower ? 11000 : 26000;

  const text = sampleText('PJ', COUNT, '"Inter Tight", "Helvetica Neue", Arial, sans-serif');
  const aSphere = new Float32Array(COUNT * 3);
  const aWave = new Float32Array(COUNT * 3);
  const aGalaxy = new Float32Array(COUNT * 3);
  const aScatter = new Float32Array(COUNT * 3);
  const aRand = new Float32Array(COUNT * 4);
  const aDust = new Float32Array(COUNT);

  const cols = Math.ceil(Math.sqrt(COUNT * 2.2));
  const rows = Math.ceil(COUNT / cols);
  const golden = Math.PI * (1 + Math.sqrt(5));

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;

    // sphere — fibonacci shell with a soft inner volume
    const t = (i + 0.5) / COUNT;
    const phi = Math.acos(1 - 2 * t);
    const theta = golden * i;
    const r = 1.6 * (Math.random() < 0.86 ? 1 : 0.55 + Math.random() * 0.4);
    aSphere[i3] = r * Math.sin(phi) * Math.cos(theta);
    aSphere[i3 + 1] = r * Math.cos(phi);
    aSphere[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    // wave — receding grid, height comes from the shader
    const gx = i % cols, gz = (i / cols) | 0;
    aWave[i3] = (gx / (cols - 1) - 0.5) * 28 + (Math.random() - 0.5) * 0.05;
    aWave[i3 + 1] = 0;
    aWave[i3 + 2] = 3.5 - (gz / Math.max(1, rows - 1)) * 24;

    // galaxy — three logarithmic arms
    const arm = i % 3;
    const gr = Math.pow(Math.random(), 1.4) * 3.1 + 0.15;
    const spread = 0.32 / (0.5 + gr * 0.55);
    const ang = (arm / 3) * Math.PI * 2 + gr * 1.35 + gaussian() * spread;
    aGalaxy[i3] = Math.cos(ang) * gr + gaussian() * 0.07;
    aGalaxy[i3 + 1] = gaussian() * 0.09 * (1.3 - gr / 3.5);
    aGalaxy[i3 + 2] = Math.sin(ang) * gr + gaussian() * 0.07;

    // wide cloud used for the intro and ambient dust
    aScatter[i3] = (Math.random() - 0.5) * 24;
    aScatter[i3 + 1] = (Math.random() - 0.5) * 15;
    aScatter[i3 + 2] = -Math.random() * 16 + 4;

    aRand[i * 4] = Math.random();
    aRand[i * 4 + 1] = Math.random();
    aRand[i * 4 + 2] = Math.random();
    aRand[i * 4 + 3] = Math.random();
    aDust[i] = Math.random() < 0.09 ? 1 : 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(text.positions, 3));
  geometry.setAttribute('aText', new THREE.BufferAttribute(text.positions, 3));
  geometry.setAttribute('aSphere', new THREE.BufferAttribute(aSphere, 3));
  geometry.setAttribute('aWave', new THREE.BufferAttribute(aWave, 3));
  geometry.setAttribute('aGalaxy', new THREE.BufferAttribute(aGalaxy, 3));
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(aScatter, 3));
  geometry.setAttribute('aRand', new THREE.BufferAttribute(aRand, 4));
  geometry.setAttribute('aDust', new THREE.BufferAttribute(aDust, 1));

  const uniforms = {
    uTime: { value: 0 },
    uIntro: { value: reduced ? 1 : 0 },
    uState: { value: 0 },
    uAlpha: { value: 1 },
    uSize: { value: 30 },
    uPixelRatio: { value: dpr },
    uTextScale: { value: 5 },
    uFit: { value: 1 },
    uOffset: { value: new THREE.Vector2() },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uMouseForce: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  /* ---------- view metrics ---------- */
  const view = { W: 10, H: 6, heroY: 0, mobile: false };
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    view.H = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    view.W = view.H * camera.aspect;
    view.mobile = w <= 900;
    const scale = view.mobile
      ? Math.min(view.W * 0.84, (view.H * 0.36) / text.ratio)
      : Math.min(view.W * 0.6, (view.H * 0.5) / text.ratio);
    uniforms.uTextScale.value = scale;
    uniforms.uFit.value = THREE.MathUtils.clamp(view.W / 9.5, 0.55, 1.15);
    uniforms.uSize.value = (view.mobile ? 30 : 36) * Math.min(1.2, Math.max(0.8, h / 900));
    view.heroY = view.mobile ? view.H * 0.06 : view.H * 0.075;
  }
  resize();

  /* ---------- state ---------- */
  const target = { state: 0, alpha: 1, ox: 0, oy: view.heroY };
  const current = { ...target };
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, active: 0, force: 0 };

  addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    mouse.active = e.pointerType === 'mouse' ? 1 : 0.6;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.active = 0; });
  addEventListener('touchend', () => { mouse.active = 0; }, { passive: true });

  let resizeRaf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(resize);
  });

  const clock = new THREE.Clock();
  const speed = reduced ? 0.25 : 1;

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt * speed;
    const k = 1 - Math.exp(-dt * 3.4);
    for (const key in target) current[key] += (target[key] - current[key]) * k;

    const km = 1 - Math.exp(-dt * 6);
    mouse.sx += (mouse.x - mouse.sx) * km;
    mouse.sy += (mouse.y - mouse.sy) * km;
    mouse.force += (mouse.active - mouse.force) * km;

    uniforms.uState.value = current.state;
    uniforms.uAlpha.value = current.alpha;
    uniforms.uOffset.value.set(current.ox, current.oy);
    uniforms.uMouse.value.set(mouse.sx * view.W / 2, mouse.sy * view.H / 2, 0);
    uniforms.uMouseForce.value = reduced ? 0 : mouse.force;

    points.rotation.y += (mouse.sx * 0.16 - points.rotation.y) * k;
    points.rotation.x += (-mouse.sy * 0.09 - points.rotation.x) * k;

    if (current.alpha > 0.005) renderer.render(scene, camera);
  }

  return {
    view,
    tick,
    setTarget(next) { Object.assign(target, next); },
    intro(duration = 2.8) {
      if (reduced) return;
      window.gsap.to(uniforms.uIntro, { value: 1, duration, ease: 'power3.inOut' });
    },
  };
}
