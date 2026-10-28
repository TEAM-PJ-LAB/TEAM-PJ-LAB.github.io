/* =========================================================
   Team PJ — board admin (no server, no database)
   The board lives in _posts/ of this repo. A fine-grained GitHub token
   (this repo, Contents: write) is sealed with AES-GCM under a key derived
   from the password (PBKDF2-SHA256); the ID is bound as associated data.
   Only the sealed copy (assets/admin/vault.json) is published.
   ========================================================= */
(() => {
  'use strict';
  const REPO = 'TEAM-PJ-LAB/team-pj-lab.github.io';
  const BRANCH = 'main';
  const POSTS = '_posts';
  const MEDIA = 'assets/board';
  const VAULT = 'assets/admin/vault.json';
  const KEY = 'pj-gh';
  const ITER = 600000;
  const MAX_IMG = 5 * 1024 * 1024;
  const GH = 'https://api.github.com';
  const API = `${GH}/repos/${REPO}`;

  const $ = (s, c = document) => c.querySelector(s);
  const html = document.documentElement;
  const te = new TextEncoder();
  const td = new TextDecoder();
  const L = (en, ko) => (html.dataset.lang === 'ko' ? ko : en);
  const views = ['login', 'setup', 'list', 'editor'].map((id) => $(`#${id}`));
  const store = {
    get: () => { try { return sessionStorage.getItem(KEY); } catch { return null; } },
    set: (v) => { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch { /* private mode */ } },
  };
  let token = store.get();
  let current = null; // { path, sha, meta, text }

  /* ---------- bytes ---------- */
  const b64 = (u8) => {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const unb64 = (s) => Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0));
  const normId = (id) => id.trim().toLowerCase();

  /* ---------- vault ---------- */
  async function aesKey(pw, salt, iterations) {
    const base = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(id, pw, secret) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await aesKey(pw, salt, ITER);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: te.encode(normId(id)) }, key, te.encode(secret));
    return { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) };
  }
  async function unseal(id, pw, v) {
    const key = await aesKey(pw, unb64(v.salt), v.iter);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(v.iv), additionalData: te.encode(normId(id)) }, key, unb64(v.ct));
    return td.decode(pt);
  }

  /* ---------- GitHub contents API ---------- */
  const enc = (p) => p.split('/').map(encodeURIComponent).join('/');
  async function gh(path, { method = 'GET', body, auth = token } = {}) {
    const res = await fetch(path.startsWith(GH) ? path : `${API}${path}`, {
      method,
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json', ...(auth && { Authorization: `Bearer ${auth}` }), ...(body && { 'Content-Type': 'application/json' }) },
      body: body && JSON.stringify(body),
    });
    if (res.ok) return res.status === 204 ? null : res.json();
    const err = new Error((await res.json().catch(() => ({}))).message || res.statusText);
    err.status = res.status;
    throw err;
  }
  const getFile = (p, auth) => gh(`/contents/${enc(p)}?ref=${BRANCH}`, { auth });
  const putFile = (p, b64content, message, sha, auth) =>
    gh(`/contents/${enc(p)}`, { method: 'PUT', auth, body: { message, content: b64content, branch: BRANCH, ...(sha && { sha }) } });
  const delFile = (p, sha, message) => gh(`/contents/${enc(p)}`, { method: 'DELETE', body: { message, sha, branch: BRANCH } });
  const readText = async (p) => {
    const f = await getFile(p);
    return { text: td.decode(unb64(f.content)), sha: f.sha };
  };

  function explain(e) {
    if (e.status === 401) return L('The saved GitHub token is invalid or expired. Set up the login again.', '저장된 GitHub 토큰이 만료됐거나 잘못됐습니다. 로그인 설정을 다시 해 주세요.');
    if (e.status === 403) return L('This token cannot write to the site repository (Contents: Read and write, approved for TEAM-PJ-LAB).', '이 토큰으로 사이트 저장소에 쓸 수 없습니다 (Contents: Read and write, TEAM-PJ-LAB 승인 필요).');
    if (e.status === 404) return L('Not found, or this token cannot see the site repository.', '파일이 없거나, 이 토큰으로 사이트 저장소를 볼 수 없습니다.');
    if (e.status === 409 || e.status === 422) return L('The file changed elsewhere or already exists. Reload and try again.', '파일이 다른 곳에서 바뀌었거나 이미 있습니다. 새로고침 후 다시 해 주세요.');
    return e.message || String(e);
  }

  /* ---------- post files ---------- */
  const FM = /^---\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)([\s\S]*)$/;
  const SPLIT = /^<div class="en" markdown="1">[ \t]*\r?\n([\s\S]*?)\r?\n<\/div>\s*<div class="ko" markdown="1">[ \t]*\r?\n([\s\S]*)\r?\n<\/div>$/;
  const NAME = /^(\d{4}-\d{2}-\d{2})-(.+)\.(?:md|markdown)$/;

  function parsePost(text) {
    const m = text.match(FM);
    const meta = (m && m[1] && jsyaml.load(m[1], { schema: jsyaml.CORE_SCHEMA })) || {};
    const body = (m ? m[2] : text).trim();
    const s = body.match(SPLIT);
    return { meta, en: s ? s[1].trim() : body, ko: s ? s[2].trim() : '' };
  }
  function buildPost(meta, en, ko) {
    const body = en && ko ? `<div class="en" markdown="1">\n\n${en}\n\n</div>\n\n<div class="ko" markdown="1">\n\n${ko}\n\n</div>` : en || ko;
    const fm = jsyaml.dump(meta, { schema: jsyaml.CORE_SCHEMA, lineWidth: -1, forceQuotes: true, quotingType: '"' });
    return `---\n${fm}---\n\n${body}\n`;
  }
  const fileOf = (path) => path.split('/').pop().match(NAME) || [];
  const postUrl = (path, meta) => {
    const [, d, slug] = fileOf(path);
    return `/board/${String(meta.date || d).slice(0, 10).replace(/-/g, '/')}/${slug}/`;
  };
  const slugify = (s) => s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const today = () => new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10); // Asia/Seoul

  /* ---------- UI ---------- */
  const msg = (view, text = '') => { $('.admin-msg', view).textContent = text; };
  function show(id) {
    views.forEach((v) => { v.hidden = v.id !== id; });
    $('#who').hidden = !token;
  }
  async function busy(form, fn) {
    const btn = $('[type="submit"]', form);
    if (btn) btn.disabled = true;
    form.setAttribute('aria-busy', 'true');
    try { await fn(); } catch (e) { msg(form, explain(e)); } finally {
      if (btn) btn.disabled = false;
      form.removeAttribute('aria-busy');
    }
  }
  function signIn(t) {
    token = t;
    store.set(t);
    html.classList.add('is-admin');
    gh(`${GH}/user`).then((u) => { $('#whoName').textContent = `@${u.login}`; }).catch(() => { $('#whoName').textContent = 'pj'; });
  }

  async function route() {
    if (!token) return show(location.hash === '#setup' ? 'setup' : 'login');
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === 'new' || h.startsWith('edit=')) return openEditor(h === 'new' ? null : h.slice(5));
    if (h === 'setup') return show('setup');
    return openList();
  }

  async function openList() {
    const view = $('#list');
    const ul = $('#posts');
    show('list');
    msg(view, L('Loading…', '불러오는 중…'));
    ul.replaceChildren();
    try {
      const files = (await gh(`/contents/${POSTS}?ref=${BRANCH}`).catch((e) => { if (e.status === 404) return []; throw e; }))
        .filter((f) => f.type === 'file' && NAME.test(f.name))
        .sort((a, b) => b.name.localeCompare(a.name));
      const posts = await Promise.all(files.map(async (f) => ({ f, ...parsePost((await readText(f.path)).text) })));
      ul.replaceChildren(...posts.map(({ f, meta }) => {
        const li = document.createElement('li');
        const time = document.createElement('time');
        const a = document.createElement('a');
        const view = document.createElement('a');
        time.textContent = String(meta.date || fileOf(f.path)[1]).slice(0, 10).replace(/-/g, '.');
        a.href = `#edit=${encodeURIComponent(f.path)}`;
        a.textContent = meta.title || f.name;
        view.href = postUrl(f.path, meta);
        view.className = 'link';
        view.textContent = L('View', '보기');
        li.append(time, a, view);
        return li;
      }));
      msg(view, posts.length ? '' : L('No posts yet.', '아직 글이 없습니다.'));
    } catch (e) {
      msg(view, explain(e));
    }
  }

  async function openEditor(path) {
    const form = $('#editor');
    form.reset();
    msg(form);
    current = { path, sha: null, meta: {}, text: null };
    $('#edTitle').textContent = path ? L('Edit post', '글 수정') : L('New post', '새 글');
    $('#slugField').hidden = !!path;
    delete form.slug.dataset.touched;
    $('#del').hidden = !path;
    form.date.value = today();
    show('editor');
    if (!path) return form.subject.focus();
    await busy(form, async () => {
      const { text, sha } = await readText(path);
      const { meta, en, ko } = parsePost(text);
      current = { path, sha, meta, text };
      form.subject.value = meta.title || '';
      form.description.value = meta.description || '';
      form.date.value = String(meta.date || fileOf(path)[1]).slice(0, 10);
      form.en.value = en;
      form.ko.value = ko;
    });
  }

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (!go) return;
    e.preventDefault();
    const h = go.dataset.go === 'login' ? '' : go.dataset.go;
    if (location.hash.slice(1) === h) route(); else location.hash = h;
  });
  $('#logout').addEventListener('click', () => {
    token = null;
    store.set(null);
    html.classList.remove('is-admin');
    history.replaceState(null, '', location.pathname);
    route();
  });
  addEventListener('hashchange', route);

  $('#login').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    busy(f, async () => {
      msg(f, L('Checking…', '확인 중…'));
      const res = await fetch(`/${VAULT}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) { msg(f, L('No login has been set up yet.', '아직 로그인이 설정되지 않았습니다.')); return; }
      let t;
      try { t = await unseal(f.user.value, f.pw.value, await res.json()); } catch {
        msg(f, L('Wrong ID or password.', '아이디 또는 비밀번호가 틀렸습니다.'));
        return;
      }
      await gh('', { auth: t });
      f.pw.value = '';
      msg(f);
      signIn(t);
      route();
    });
  });

  $('#setup').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const t = f.token.value.trim();
    const id = normId(f.user.value);
    if (f.pw.value !== f.pw2.value) return msg(f, L('The passwords do not match.', '비밀번호가 서로 다릅니다.'));
    if (f.pw.value.length < 12 && !confirm(L('This password is short and can be guessed from the public encrypted copy. Use it anyway?', '이 비밀번호는 짧아서 공개된 암호화 값으로부터 맞춰질 수 있습니다. 그래도 쓸까요?'))) return;
    busy(f, async () => {
      msg(f, L('Saving…', '저장 중…'));
      const prev = await getFile(VAULT, t).catch((err) => { if (err.status === 404) return null; throw err; });
      const vault = await seal(id, f.pw.value, t);
      await putFile(VAULT, b64(te.encode(`${JSON.stringify(vault, null, 2)}\n`)), 'admin: set board login', prev?.sha, t);
      f.reset();
      signIn(t);
      alert(L(`Saved. Log in with "${id}" — it works on other devices after the site rebuilds (1–2 min).`, `저장했습니다. 아이디 "${id}"로 로그인하세요 — 다른 기기에서는 사이트가 다시 빌드된 뒤(1~2분) 됩니다.`));
      location.hash = '';
      route();
    });
  });

  const editor = $('#editor');
  let lastArea = editor.en;
  editor.addEventListener('focusin', (e) => { if (e.target.tagName === 'TEXTAREA') lastArea = e.target; });
  editor.subject.addEventListener('input', () => { if (!current?.path && !editor.slug.dataset.touched) editor.slug.value = slugify(editor.subject.value); });
  editor.slug.addEventListener('input', () => { editor.slug.dataset.touched = '1'; });

  editor.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = editor;
    busy(f, async () => {
      const en = f.en.value.trim();
      const ko = f.ko.value.trim();
      if (!en && !ko) { msg(f, L('Write the body.', '본문을 써 주세요.')); return; }
      const meta = { ...current.meta, title: f.subject.value.trim() };
      const desc = f.description.value.trim();
      if (desc) meta.description = desc; else delete meta.description;
      const date = f.date.value;
      let path = current.path;
      if (path) {
        if (String(meta.date || fileOf(path)[1]).slice(0, 10) !== date) meta.date = date;
      } else {
        const slug = f.slug.value || slugify(meta.title) || `post-${Date.now().toString(36)}`;
        path = `${POSTS}/${date}-${slug}.md`;
      }
      const text = buildPost(meta, en, ko);
      if (text === current.text) { msg(f, L('No changes.', '바뀐 내용이 없습니다.')); return; }
      msg(f, L('Saving…', '저장 중…'));
      const r = await putFile(path, b64(te.encode(text)), `board: ${current.path ? 'edit' : 'add'} ${path.slice(POSTS.length + 1)}`, current.sha);
      current = { path, sha: r.content.sha, meta, text };
      history.replaceState(null, '', `#edit=${encodeURIComponent(path)}`);
      $('#edTitle').textContent = L('Edit post', '글 수정');
      $('#slugField').hidden = true;
      $('#del').hidden = false;
      msg(f, L(`Saved. Live at ${postUrl(path, meta)} in 1–2 minutes.`, `저장했습니다. 1~2분 뒤 ${postUrl(path, meta)} 에 반영됩니다.`));
    });
  });

  $('#del').addEventListener('click', () => {
    if (!current?.path || !confirm(L('Delete this post?', '이 글을 삭제할까요?'))) return;
    busy(editor, async () => {
      await delFile(current.path, current.sha, `board: delete ${current.path.slice(POSTS.length + 1)}`);
      location.hash = '';
    });
  });

  editor.img.addEventListener('change', () => {
    const files = [...editor.img.files];
    editor.img.value = '';
    busy(editor, async () => {
      for (const file of files) {
        if (file.size > MAX_IMG) { msg(editor, L(`${file.name}: over 5 MB.`, `${file.name}: 5MB를 넘습니다.`)); continue; }
        msg(editor, L(`Uploading ${file.name}…`, `${file.name} 올리는 중…`));
        const ext = (file.name.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
        const name = `${Date.now().toString(36)}-${slugify(file.name.replace(/\.[^.]+$/, '')) || 'image'}${ext}`;
        await putFile(`${MEDIA}/${name}`, b64(new Uint8Array(await file.arrayBuffer())), `board: upload ${name}`);
        const md = `![${file.name.replace(/[[\]]/g, '')}](/${MEDIA}/${name})`;
        const { selectionStart: a, selectionEnd: b, value } = lastArea;
        lastArea.value = `${value.slice(0, a)}${md}${value.slice(b)}`;
        lastArea.selectionStart = lastArea.selectionEnd = a + md.length;
      }
      msg(editor, L('Image added. It appears on the site after saving and the rebuild.', '사진을 넣었습니다. 저장 후 사이트가 다시 빌드되면 보입니다.'));
    });
  });

  if (token) signIn(token);
  route();
})();
