/* =========================================================
   Team PJ — interactions
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const html = document.documentElement;

  /* ---------- Language ---------- */
  const MESSAGES = {
    en: {
      copied: 'Email address copied', menu: 'Menu', close: 'Close menu',
      signedUp: "Thanks — you're on the list. We'll be in touch.",
      mailOpened: 'Your email app should open with the request ready to send.',
      signupFailed: "Couldn't send. Please email pj.southkorea@gmail.com.",
    },
    ko: {
      copied: '이메일 주소가 복사되었습니다', menu: '메뉴', close: '메뉴 닫기',
      signedUp: '신청되었습니다. 곧 연락드릴게요.',
      mailOpened: '메일 앱이 열리면 신청 메일을 보내 주세요.',
      signupFailed: '전송하지 못했습니다. pj.southkorea@gmail.com으로 메일 주세요.',
    },
  };
  const currentLang = () => (html.dataset.lang === 'ko' ? 'ko' : 'en');
  const t = (key) => MESSAGES[currentLang()][key];

  function setLang(lang) {
    html.dataset.lang = lang;
    html.lang = lang;
    try { localStorage.setItem('pj-lang', lang); } catch { /* storage unavailable */ }
    $$('[data-lang-set]').forEach((btn) => {
      const on = btn.dataset.langSet === lang;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    paintAvatars();
    setCommentsLang(lang);
  }
  $$('[data-lang-set]').forEach((btn) => btn.addEventListener('click', () => setLang(btn.dataset.langSet)));

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  const burger = $('#burger');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? t('close') : t('menu'));
  }
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('#navLinks a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Copy email ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2000);
  }
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

  /* ---------- Beta sign-up: POST to site.beta_form, else open a pre-filled email ---------- */
  $$('form[data-signup]').forEach((form) => {
    const msg = $('.signup__msg', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const action = form.getAttribute('action');
      if (action.startsWith('mailto:')) {
        location.href = `${action}&body=${encodeURIComponent(`Email: ${form.elements.email.value.trim()}`)}`;
        msg.textContent = t('mailOpened');
        return;
      }
      form.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch(action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        form.classList.add('is-sent');
        msg.textContent = t('signedUp');
      } catch {
        msg.textContent = t('signupFailed');
      } finally {
        form.removeAttribute('aria-busy');
      }
    });
  });

  /* ---------- Founder avatars: ㅈ (J) and ㅂ (P) in brand orange ---------- */
  /* Renders the syllable as CSS lays it out, splits the ink into connected
     components and keeps the top-left one — the initial consonant. */
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
      .filter((c) => c.cnt > 12 && (c.cx - minX) / bw < 0.55 && (c.cy - minY) / bh < 0.62)
      .map((c) => c.id));
    if (!keep.size) return null;

    const out = ctx.createImageData(W, H), o = out.data;
    for (let i = 0; i < N; i++) {
      const a = d[i * 4 + 3];
      if (!a) continue;
      let k = keep.has(lab[i]);
      if (!k && !lab[i]) {
        const x = i % W;
        k = (x > 0 && keep.has(lab[i - 1])) || (x < W - 1 && keep.has(lab[i + 1])) || keep.has(lab[i - W]) || keep.has(lab[i + W]);
      }
      if (k) o[i * 4 + 3] = a;
    }
    ctx.putImageData(out, 0, 0);
    return cv.toDataURL('image/png');
  }

  function paintAvatars() {
    const dpr = Math.max(2, Math.min(window.devicePixelRatio || 1, 3));
    $$('.avatar').forEach((avatar) => {
      const base = $('.avatar__base', avatar);
      const key = $('.avatar__key', avatar);
      if (!base || !key || !base.offsetWidth) return;
      const cs = getComputedStyle(base);
      const url = initialMask(base.textContent.trim(), cs.fontFamily, cs.fontWeight, parseFloat(cs.fontSize), base.offsetWidth, base.offsetHeight, dpr);
      if (!url) return;
      Object.assign(key.style, {
        left: `${base.offsetLeft}px`,
        top: `${base.offsetTop}px`,
        width: `${base.offsetWidth}px`,
        height: `${base.offsetHeight}px`,
        webkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
      });
      key.classList.add('is-ready');
    });
  }

  /* ---------- Board comments (giscus, backed by GitHub Discussions) ---------- */
  const giscusBox = $('[data-giscus]');
  function setCommentsLang(lang) {
    const frame = document.querySelector('iframe.giscus-frame');
    if (frame) frame.contentWindow.postMessage({ giscus: { setConfig: { lang } } }, 'https://giscus.app');
  }
  if (giscusBox) {
    const s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    Object.entries({
      repo: giscusBox.dataset.repo,
      repoId: giscusBox.dataset.repoId,
      category: giscusBox.dataset.category,
      categoryId: giscusBox.dataset.categoryId,
      mapping: 'pathname',
      strict: '1',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'top',
      theme: 'light',
      lang: currentLang(),
      loading: 'lazy',
    }).forEach(([k, v]) => s.setAttribute(`data-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, v));
    giscusBox.appendChild(s);
  }

  /* ---------- Init ---------- */
  $('#year').textContent = new Date().getFullYear();
  setLang(currentLang());
  if (document.fonts) {
    document.fonts.load('800 40px "Pretendard Variable"', '정박').then(paintAvatars, paintAvatars);
  }
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(paintAvatars, 200); });
})();
