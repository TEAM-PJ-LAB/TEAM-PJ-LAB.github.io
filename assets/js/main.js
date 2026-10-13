/* =========================================================
   PJ — interactions & motion
   ========================================================= */
import { createParticles } from './particles.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lerp = (a, b, t) => a + (b - a) * t;

const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const { gsap, ScrollTrigger } = window;

gsap.registerPlugin(ScrollTrigger);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new window.Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

/* ---------- Text splitting ---------- */
function splitInto(el, mode) {
  let i = 0;
  const make = (txt) => {
    const outer = document.createElement('span');
    const inner = document.createElement('span');
    outer.className = mode === 'chars' ? 'c' : 'w';
    inner.className = mode === 'chars' ? 'c__i' : 'w__i';
    inner.textContent = txt;
    inner.style.setProperty('--i', i++);
    outer.appendChild(inner);
    return outer;
  };
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          if (mode === 'chars') [...part].forEach((ch) => frag.appendChild(make(ch)));
          else frag.appendChild(make(part));
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    });
  };
  walk(el);
}

/* ---------- Scramble ---------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>*#+=';
function scramble(el, duration = 650) {
  if (reduced) return;
  const final = el.dataset.text ?? (el.dataset.text = el.textContent);
  const start = performance.now();
  cancelAnimationFrame(el._scramble);
  const frame = (now) => {
    const p = Math.min(1, (now - start) / duration);
    let out = '';
    for (let i = 0; i < final.length; i++) {
      const ch = final[i];
      out += ch === ' ' || i / final.length < p ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) el._scramble = requestAnimationFrame(frame);
  };
  el._scramble = requestAnimationFrame(frame);
}

/* ---------- Counters ---------- */
function count(el) {
  const to = parseFloat(el.dataset.count);
  const pad = parseInt(el.dataset.pad || '2', 10);
  const obj = { v: 0 };
  gsap.to(obj, {
    v: to,
    duration: reduced ? 0.01 : 1.8,
    ease: 'power3.out',
    onUpdate: () => { el.textContent = String(Math.round(obj.v)).padStart(pad, '0'); },
  });
}

/* ---------- Typed code ---------- */
const CODE = [
  ['c', '// PJ Group — Team No.01\n'],
  ['k', 'const'], ['t', ' '], ['v', 'teamPJ'], ['p', ' = {\n'],
  ['t', '  name'], ['p', ': '], ['s', '"Team PJ"'], ['p', ',\n'],
  ['t', '  role'], ['p', ': '], ['s', '"Main Development Team"'], ['p', ',\n'],
  ['t', '  cto'], ['p', ': '], ['s', '"Park Bugeon"'], ['p', ',\n'],
  ['t', '  order'], ['p', ': '], ['k', '1'], ['p', ',\n'],
  ['t', '  status'], ['p', ': '], ['s', '"active"'], ['p', ',\n'],
  ['t', '  mission'], ['p', ': '], ['s', '"Ship software that becomes business."'], ['p', ',\n'],
  ['p', '};\n\n'],
  ['k', 'export default'], ['t', ' '], ['v', 'teamPJ'], ['p', ';'],
];
async function typeCode(el) {
  if (el.dataset.typed) return;
  el.dataset.typed = '1';
  for (const [cls, str] of CODE) {
    const span = document.createElement('span');
    span.className = `tk-${cls}`;
    el.appendChild(span);
    if (reduced) { span.textContent = str; continue; }
    for (const ch of str) {
      span.textContent += ch;
      await wait(ch === '\n' ? 110 : 14 + Math.random() * 30);
    }
  }
}

/* ---------- Reveal on view ---------- */
function onReveal(el) {
  $$('[data-count]', el).forEach(count);
  if (el.matches('[data-count]')) count(el);
  if (el.matches('[data-terminal]')) setTimeout(() => typeCode($('#typeCode')), 500);
  if (el.matches('.section-head')) scramble($('.mono', el), 900);
}
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    io.unobserve(entry.target);
    onReveal(entry.target);
  });
}, { rootMargin: '0px 0px -10% 0px' });

/* Mask that keeps only a Hangul syllable's initial consonant (e.g. ㅈ in 정, ㅂ in 박).
   Renders the glyph exactly as CSS lays it out (line-height = box height), splits the ink
   into connected components and keeps those in the top-left of the ink box. */
function initialMask(ch, fontFamily, fontWeight, fontSize, boxW, boxH, dpr) {
  const W = Math.round(boxW * dpr), H = Math.round(boxH * dpr);
  if (!W || !H) return null;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.font = `${fontWeight} ${fontSize * dpr}px ${fontFamily}`;
  const m = ctx.measureText(ch);
  const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
  ctx.fillText(ch, 0, (H - (asc + desc)) / 2 + asc);

  const d = ctx.getImageData(0, 0, W, H).data;
  const N = W * H;
  const solid = (i) => d[i * 4 + 3] >= 110;
  const lab = new Int32Array(N);
  const comps = [];
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let i = 0; i < N; i++) {
    if (lab[i] || !solid(i)) continue;
    const id = comps.length + 1;
    let cnt = 0, sx = 0, sy = 0;
    const st = [i];
    lab[i] = id;
    while (st.length) {
      const p = st.pop(), x = p % W, y = (p - x) / W;
      cnt++; sx += x; sy += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && !lab[p - 1] && solid(p - 1)) { lab[p - 1] = id; st.push(p - 1); }
      if (x < W - 1 && !lab[p + 1] && solid(p + 1)) { lab[p + 1] = id; st.push(p + 1); }
      if (y > 0 && !lab[p - W] && solid(p - W)) { lab[p - W] = id; st.push(p - W); }
      if (y < H - 1 && !lab[p + W] && solid(p + W)) { lab[p + W] = id; st.push(p + W); }
    }
    comps.push({ id, cnt, cx: sx / cnt, cy: sy / cnt });
  }
  const bw = maxX - minX || 1, bh = maxY - minY || 1;
  const keep = new Set(comps
    .filter((c) => c.cnt > 40 && (c.cx - minX) / bw < 0.55 && (c.cy - minY) / bh < 0.62)
    .map((c) => c.id));
  if (!keep.size) return null;

  const out = ctx.createImageData(W, H), o = out.data;
  for (let i = 0; i < N; i++) {
    const a = d[i * 4 + 3];
    if (!a) continue;
    let k = keep.has(lab[i]);
    if (!k && !lab[i]) {
      const x = i % W;   // anti-aliased edge pixel: follow a neighbour's component
      k = (x > 0 && keep.has(lab[i - 1])) || (x < W - 1 && keep.has(lab[i + 1])) || keep.has(lab[i - W]) || keep.has(lab[i + W]);
    }
    if (k) o[i * 4 + 3] = a;
  }
  ctx.putImageData(out, 0, 0);
  return cv.toDataURL('image/png');
}

function paintInitials() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  $$('.leader__glyph').forEach((glyph) => {
    const outline = $('.leader__glyph-o', glyph);
    const layer = $('.leader__glyph-j', glyph);
    if (!outline || !layer || !outline.offsetWidth) return;
    const cs = getComputedStyle(outline);
    const url = initialMask(outline.textContent.trim(), cs.fontFamily, cs.fontWeight, parseFloat(cs.fontSize), outline.offsetWidth, outline.offsetHeight, dpr);
    if (!url) return;
    layer.style.webkitMaskImage = layer.style.maskImage = `url(${url})`;
    layer.classList.add('is-ready');
  });
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-show'), 2200);
}

/* ---------- Language ---------- */
const MESSAGES = {
  ko: { copied: '이메일 주소가 복사되었습니다' },
  en: { copied: 'Email address copied' },
};
const currentLang = () => (html.dataset.lang === 'en' ? 'en' : 'ko');
const t = (key) => MESSAGES[currentLang()][key];

function setLang(lang, animate = true) {
  html.dataset.lang = lang;
  html.lang = lang;
  try { localStorage.setItem('pj-lang', lang); } catch { /* storage unavailable */ }
  $$('[data-lang-set]').forEach((btn) => {
    const on = btn.dataset.langSet === lang;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  if (animate && !reduced) {
    const shown = $$(`.${lang}`).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
    });
    gsap.fromTo(shown, { opacity: 0, filter: 'blur(8px)' }, {
      opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out', stagger: 0.02, clearProps: 'opacity,filter',
    });
  }
  ScrollTrigger.refresh();
}
function initLang() {
  $$('[data-lang-set]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.langSet !== currentLang()) setLang(btn.dataset.langSet);
    });
  });
  setLang(currentLang(), false);
}

/* ---------- Cursor ---------- */
function initCursor() {
  if (!finePointer || reduced) return;
  html.classList.add('has-cursor');
  const cursor = $('.cursor');
  const dot = $('.cursor__dot');
  const ring = $('.cursor__ring');
  const label = $('.cursor__label');
  gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    cursor.classList.add('is-visible');
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));

  const HOVER = 'a, button, [data-cursor]';
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest(HOVER);
    if (!t) return;
    const text = t.dataset.cursor;
    label.textContent = text || '';
    cursor.classList.toggle('has-label', !!text);
    cursor.classList.toggle('is-hover', !text);
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest(HOVER);
    if (!t || t.contains(e.relatedTarget)) return;
    cursor.classList.remove('is-hover', 'has-label');
  });
}

/* ---------- Magnetic / tilt / spotlight ---------- */
function initPointerFx() {
  if (!finePointer || reduced) return;

  $$('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic) || 0.35;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.45)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.45)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });

  $$('[data-spot]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  $$('[data-tilt]').forEach((el) => {
    gsap.set(el, { transformPerspective: 1200 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.9, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.9, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * 3);
      rx(-py * 3);
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });

  $$('[data-scramble]').forEach((el) => {
    el.addEventListener('pointerenter', () => scramble(el, 450));
  });
}

/* ---------- Menu & anchors ---------- */
let menuOpen = false;
function setMenu(open) {
  menuOpen = open;
  html.classList.toggle('menu-open', open);
  $('#burger').setAttribute('aria-expanded', String(open));
  $('#burger').setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  $('#menu').setAttribute('aria-hidden', String(!open));
  if (lenis) open ? lenis.stop() : lenis.start();
}
function initNavigation() {
  $('#burger').addEventListener('click', () => setMenu(!menuOpen));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    const target = hash === '#top' ? 0 : $(hash);
    if (target === null) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else if (target === 0) scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });

  $('#toTop').addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0, { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else scrollTo({ top: 0, behavior: 'smooth' });
  });

  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        toast(t('copied'));
      } catch {
        toast(btn.dataset.copy);
      }
    });
  });
}

/* ---------- WebGL scroll choreography ---------- */
let gl = null;
let keyframes = [];

function buildKeyframes() {
  if (!gl) return;
  const vh = innerHeight;
  const { W, H, heroY, mobile } = gl.view;
  const top = (el) => el.getBoundingClientRect().top + window.scrollY;
  const about = $('#about');
  const biz = $('#business');
  const team = $('#teampj');
  const contact = $('#contact');
  const bizST = ScrollTrigger.getById('biz');
  const bizStart = bizST ? bizST.start : top(biz);
  const bizEnd = bizST ? bizST.end : top(biz) + biz.offsetHeight - vh;
  const sideX = mobile ? 0 : W * 0.24;

  keyframes = [
    { y: 0, state: 0, alpha: 1, ox: 0, oy: heroY },
    { y: top(about) - vh * 0.2, state: 1, alpha: mobile ? 0.5 : 0.95, ox: sideX, oy: 0 },
    { y: top(about) + about.offsetHeight - vh * 1.1, state: 1, alpha: mobile ? 0.5 : 0.9, ox: sideX, oy: 0 },
    { y: bizStart, state: 1, alpha: 0.6, ox: 0, oy: 0 },
    { y: bizEnd, state: 1, alpha: 0.6, ox: 0, oy: 0 },
    { y: top(team), state: 2, alpha: 0.9, ox: 0, oy: 0 },
    { y: top(contact) - vh * 0.9, state: 2, alpha: 0.85, ox: 0, oy: 0 },
    { y: top(contact), state: 3, alpha: 0.9, ox: 0, oy: mobile ? H * 0.04 : 0 },
  ];
  for (let i = 1; i < keyframes.length; i++) {
    if (keyframes[i].y <= keyframes[i - 1].y) keyframes[i].y = keyframes[i - 1].y + 1;
  }
  updateGL(window.scrollY);
}

function updateGL(y) {
  if (!gl || !keyframes.length) return;
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  let a = first, b = last;
  if (y <= first.y) { a = b = first; }
  else if (y >= last.y) { a = b = last; }
  else {
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (y >= keyframes[i].y && y < keyframes[i + 1].y) { a = keyframes[i]; b = keyframes[i + 1]; break; }
    }
  }
  const span = b.y - a.y;
  let t = span > 0 ? (y - a.y) / span : 0;
  t = t * t * (3 - 2 * t);
  gl.setTarget({
    state: lerp(a.state, b.state, t),
    alpha: lerp(a.alpha, b.alpha, t),
    ox: lerp(a.ox, b.ox, t),
    oy: lerp(a.oy, b.oy, t),
  });
}

/* ---------- Scroll-driven motion ---------- */
function initScroll() {
  const nav = $('#nav');
  const progress = $('.progress i');

  // reading progress
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => { progress.style.transform = `scaleX(${self.progress})`; },
  });

  // hero drift
  gsap.to('.hero__bottom', {
    yPercent: -35, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__meta', {
    opacity: 0, y: -40, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '40% top', scrub: true },
  });

  // manifesto — words light up as you read
  ['ko', 'en'].forEach((lang) => {
    const words = $$(`[data-manifesto] .${lang} .w__i`);
    if (reduced) { gsap.set(words, { opacity: 1 }); return; }
    gsap.fromTo(words, { opacity: 0.13 }, {
      opacity: 1, ease: 'none', stagger: 0.08,
      scrollTrigger: { trigger: '[data-manifesto]', start: 'top 78%', end: 'bottom 48%', scrub: true },
    });
  });

  // marquee — loops that react to scroll velocity
  const marqueeTweens = $$('.marquee__inner').map((inner, i) => {
    const base = inner.innerHTML;
    while (inner.scrollWidth < innerWidth * 1.4) inner.insertAdjacentHTML('beforeend', base);
    inner.insertAdjacentHTML('beforeend', inner.innerHTML);
    const duration = inner.scrollWidth / 2 / 70;
    return i % 2 === 0
      ? gsap.fromTo(inner, { xPercent: 0 }, { xPercent: -50, duration, ease: 'none', repeat: -1 })
      : gsap.fromTo(inner, { xPercent: -50 }, { xPercent: 0, duration, ease: 'none', repeat: -1 });
  });
  if (reduced) marqueeTweens.forEach((t) => t.pause());

  const mm = gsap.matchMedia();

  // business — horizontal pinned track
  mm.add('(min-width: 901px)', () => {
    const section = $('#business');
    const track = $('.business__track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        id: 'biz',
        trigger: section,
        start: 'top top',
        end: () => `+=${dist()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });
    gsap.to('.business__progress i', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${dist()}`, scrub: true, invalidateOnRefresh: true },
    });
    $$('.biz-card').forEach((card) => {
      gsap.fromTo($('.biz-card__visual', card), { rotate: -14, scale: 0.78, opacity: 0.3 }, {
        rotate: 0, scale: 1, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'center 60%', scrub: true },
      });
      gsap.fromTo(card, { yPercent: 8 }, {
        yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'left 50%', scrub: true },
      });
    });
    gsap.to('.biz-intro .title-xl', {
      xPercent: -18, ease: 'none',
      scrollTrigger: { trigger: '.biz-intro', containerAnimation: tween, start: 'left left', end: 'right left', scrub: true },
    });
  });

  // team pj sheet rises into place
  gsap.fromTo('.teampj__sheet', { scale: 0.9, y: 60 }, {
    scale: 1, y: 0, ease: 'none',
    scrollTrigger: { trigger: '#teampj', start: 'top bottom', end: 'top 10%', scrub: true },
  });
  gsap.fromTo('.teampj__title', { xPercent: 3 }, {
    xPercent: -5, ease: 'none',
    scrollTrigger: { trigger: '.teampj__title', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // roadmap line draws with scroll
  mm.add('(min-width: 901px)', () => {
    gsap.fromTo('.timeline__line i', { scaleX: 0 }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.timeline', start: 'top 88%', end: 'top 40%', scrub: true },
    });
  });
  mm.add('(max-width: 900px)', () => {
    gsap.fromTo('.timeline__line i', { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.timeline', start: 'top 80%', end: 'bottom 55%', scrub: true },
    });
  });

  // contact & footer
  gsap.fromTo('.contact__title', { scale: 0.86 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 20%', scrub: true },
  });
  gsap.fromTo('.footer__word span', { yPercent: 75 }, {
    yPercent: 0, ease: 'none', stagger: 0.12,
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });

  // active nav link
  ['about', 'business', 'teampj', 'leadership', 'status', 'contact'].forEach((id) => {
    const link = $(`.nav__links a[href="#${id}"]`);
    if (!link) return;
    ScrollTrigger.create({
      trigger: `#${id}`,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => link.classList.toggle('is-active', self.isActive),
    });
  });

  // scroll listeners: nav hide, marquee velocity, webgl
  let lastY = 0;
  const onScroll = (y, velocity) => {
    const down = y > lastY;
    nav.classList.toggle('is-hidden', down && y > innerHeight * 0.6 && !menuOpen);
    lastY = y;
    updateGL(y);
    if (reduced) return;
    const v = Math.abs(velocity);
    marqueeTweens.forEach((t) => gsap.to(t, { timeScale: 1 + Math.min(v * 0.09, 5), duration: 0.4, overwrite: true }));
    gsap.to('.marquee__inner', { skewX: gsap.utils.clamp(-12, 12, -velocity * 0.35), duration: 0.5, ease: 'power3', overwrite: 'auto' });
  };
  if (lenis) lenis.on('scroll', (e) => onScroll(e.scroll, e.velocity));
  else addEventListener('scroll', () => onScroll(window.scrollY, 0), { passive: true });

  ScrollTrigger.addEventListener('refresh', buildKeyframes);
}

/* ---------- Intro ---------- */
function heroIn() {
  const tl = gsap.timeline();
  tl.fromTo('.hero__title .line > span', { yPercent: 110, y: 0 }, { yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: 0.12 })
    .fromTo('.nav > *', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.06 }, 0.1)
    .fromTo('.hero__meta > *', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }, 0.3)
    .fromTo('.hero__desc, .scroll-badge', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.1 }, 0.5);
  return tl;
}

async function boot() {
  $('#year').textContent = new Date().getFullYear();
  $$('[data-split]').forEach((el) => splitInto(el, el.dataset.split));
  gsap.set('.nav > *', { opacity: 0, y: -16 });

  // loader in
  gsap.fromTo('.loader__word .c__i', { yPercent: 110 }, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1, delay: 0.1 });
  const countEl = $('#loaderCount');
  const bar = $('.loader__bar i');
  const counter = { v: 0 };
  const countTween = gsap.to(counter, {
    v: 100,
    duration: reduced ? 0.4 : 2.4,
    ease: 'power2.inOut',
    onUpdate: () => {
      countEl.textContent = String(Math.round(counter.v)).padStart(3, '0');
      bar.style.transform = `scaleX(${counter.v / 100})`;
    },
  });

  await Promise.race([
    Promise.all([
      document.fonts.ready,
      document.fonts.load('800 100px "Inter Tight"'),
      document.fonts.load('800 100px "Pretendard Variable"', '정박'),
    ]),
    wait(3500),
  ]).catch(() => {});

  try {
    gl = createParticles($('#webgl'), { reduced });
    gsap.ticker.add(gl.tick);
  } catch (err) {
    console.warn('[PJ] WebGL unavailable — continuing without particles.', err);
    $('#webgl')?.remove();
    gl = null;
  }

  initLang();
  paintInitials();
  let initialsTimer;
  addEventListener('resize', () => { clearTimeout(initialsTimer); initialsTimer = setTimeout(paintInitials, 200); });
  initCursor();
  initPointerFx();
  initNavigation();
  initScroll();

  await countTween;

  // loader out
  const tl = gsap.timeline();
  tl.to('.loader__word .c__i', { yPercent: -110, duration: 0.9, ease: 'expo.in', stagger: 0.06 })
    .to('.loader__meta, .loader__foot', { opacity: 0, duration: 0.5, ease: 'power2.in' }, '<')
    .to('#loader', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: 'expo.inOut' }, '-=0.15')
    .add(() => {
      document.body.classList.remove('is-loading');
      ScrollTrigger.refresh();
      gl?.intro(3);
    }, '-=1.05')
    .add(heroIn(), '-=0.6')
    .add(() => {
      $('#loader')?.remove();
      lenis?.start();
      $$('[data-reveal]').forEach((el) => io.observe(el));
    }, '-=1.2');
}

boot();
