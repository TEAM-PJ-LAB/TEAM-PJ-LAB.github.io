/* =========================================================
   Team PJ — board admin (no server, no database)
   The board is the Markdown in _posts/. Saving happens on github.com and is
   authorized by GitHub (write access to the repo). The ID/password below only
   reveals the admin UI on this site; it is not a security boundary.
   ========================================================= */
(() => {
  'use strict';
  const GATE = 'da6b50ce42efd2846b4428e8bbc36d9a553e353e54da79c17e65000062f827d9'; // sha256(`team-pj-admin:${id}:${pw}`)
  const KEY = 'pj-admin';
  const MAX_URL = 7000; // longer prefill URLs fall back to the clipboard

  const $ = (s, c = document) => c.querySelector(s);
  const html = document.documentElement;
  const GH = $('[data-gh]').dataset.gh;
  const L = (en, ko) => (html.dataset.lang === 'ko' ? ko : en);
  const views = ['login', 'list', 'editor'].map((id) => $(`#${id}`));
  const isAdmin = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };
  const setAdmin = (on) => {
    try { on ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch { /* private mode */ }
    html.classList.toggle('is-admin', on);
  };
  const msg = (view, text = '') => { $('.admin-msg', view).textContent = text; };

  const sha256 = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  const slugify = (s) => s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const today = () => new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10); // Asia/Seoul
  const line = (s) => s.replace(/[\r\n\u2028\u2029]+/g, ' ').trim();

  // JSON strings are valid YAML double-quoted scalars, so front matter needs no YAML library.
  function buildPost({ title, description, en, ko }) {
    const fm = [`title: ${JSON.stringify(title)}`, description && `description: ${JSON.stringify(description)}`].filter(Boolean).join('\n');
    const body = en && ko ? `<div class="en" markdown="1">\n\n${en}\n\n</div>\n\n<div class="ko" markdown="1">\n\n${ko}\n\n</div>` : en || ko;
    return `---\n${fm}\n---\n\n${body}\n`;
  }

  function route() {
    const view = !isAdmin() ? 'login' : location.hash === '#new' ? 'editor' : 'list';
    views.forEach((v) => { v.hidden = v.id !== view; });
    $('#who').hidden = !isAdmin();
    if (view === 'editor') {
      const f = $('#editor');
      if (!f.date.value) f.date.value = today();
      f.subject.focus();
    }
  }

  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    if (await sha256(`team-pj-admin:${f.user.value.trim().toLowerCase()}:${f.pw.value}`) !== GATE) {
      msg(f, L('Wrong ID or password.', '아이디 또는 비밀번호가 틀렸습니다.'));
      return;
    }
    f.reset();
    msg(f);
    setAdmin(true);
    route();
  });

  $('#logout').addEventListener('click', () => {
    setAdmin(false);
    history.replaceState(null, '', location.pathname);
    route();
  });
  addEventListener('hashchange', route);

  const editor = $('#editor');
  editor.subject.addEventListener('input', () => { if (!editor.slug.dataset.touched) editor.slug.value = slugify(editor.subject.value); });
  editor.slug.addEventListener('input', () => { editor.slug.dataset.touched = '1'; });

  editor.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = editor;
    const en = f.en.value.trim();
    const ko = f.ko.value.trim();
    if (!en && !ko) return msg(f, L('Write the body.', '본문을 써 주세요.'));
    const title = line(f.subject.value);
    const name = `${f.date.value}-${f.slug.value || slugify(title) || `post-${Date.now().toString(36)}`}.md`;
    const text = buildPost({ title, description: line(f.description.value), en, ko });
    const base = `${GH}/new/main/_posts?filename=${encodeURIComponent(name)}`;
    const full = `${base}&value=${encodeURIComponent(text)}`;
    const long = full.length > MAX_URL;
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    window.open(long ? base : full, '_blank', 'noopener');
    msg(f, long
      ? L('The post is long, so it was copied instead: paste it into the GitHub page, then press Commit changes.', '글이 길어서 자동 입력 대신 복사해 뒀습니다. GitHub 화면에 붙여 넣고 Commit changes를 누르세요.')
      : L('Opened on GitHub with the post filled in (also copied). Press Commit changes there; the site updates in 1–2 minutes.', 'GitHub 화면에 글이 채워져 열렸습니다(복사도 해 둠). 거기서 Commit changes를 누르면 1~2분 뒤 사이트에 반영됩니다.'));
  });

  html.classList.toggle('is-admin', isAdmin());
  route();
})();
