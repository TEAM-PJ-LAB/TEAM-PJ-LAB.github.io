# Team PJ — Software & Ventures

Team PJ 공식 웹사이트 · https://team-pj-lab.github.io (한국어 / English)

Team PJ는 소프트웨어를 중심으로 다양한 사업을 설계하고 운영하는 회사입니다.

- **CEO** 정우진 (Jung Woojin) · **CTO** 박부건 (Park Bugeon)
- **Contact** — pj.southkorea@gmail.com (대외 연락: 박부건)

## Stack

GitHub Pages가 Jekyll로 빌드합니다. 공통 틀은 `_layouts/default.html` 하나이고, 페이지는 그 틀을 공유합니다.

| | |
|---|---|
| `index.html` | 홈 (회사 소개 · 창업자 · 연락처) |
| `apps/index.html` | Interlock 섹션 (소개 · 작동 방식 · 실험 · 현황 · 업데이트 기록 · 베타 신청) |
| `board/index.html` | 게시판 목록 |
| `_posts/` | 게시글 (마크다운) |
| `_layouts/` | 공통 틀(`default.html`)과 글 틀(`post.html`) |
| `assets/css/style.css` · `assets/js/main.js` | 스타일 · 언어 전환 · 메뉴 · 댓글(giscus) |

## 게시판 관리 (로그인한 사람만)

비밀번호를 사이트에 두지 않고, **GitHub 권한**으로 관리합니다. TEAM-PJ-LAB 조직 멤버만 글을 쓰고, 조직 관리자만 댓글을 관리할 수 있습니다.

### 글 쓰기 · 수정 · 삭제

**방법 1 — Pages CMS (편한 글쓰기 화면)**
1. https://app.pagescms.org 에서 GitHub 계정으로 로그인
2. `TEAM-PJ-LAB/TEAM-PJ-LAB.github.io` 선택 → **Board**
3. 새 글 작성 / 기존 글 수정·삭제 → 저장하면 1~2분 뒤 사이트에 반영

**방법 2 — GitHub에서 직접**
`_posts/` 폴더에 `YYYY-MM-DD-제목.md` 파일을 추가합니다.

```markdown
---
title: "글 제목"
description: "목록에 보일 한 줄 요약"
---

본문 (마크다운)
```

한국어/영어를 함께 쓰려면 본문을 `<div class="en" markdown="1">` … `</div>`, `<div class="ko" markdown="1">` … `</div>`로 감싸면 사이트의 KO/EN 버튼에 맞춰 바뀝니다.

### 댓글

- 방문자는 GitHub 계정으로 로그인해 댓글을 남깁니다 (giscus).
- 댓글은 이 저장소의 **Discussions → Announcements**에 글마다 하나씩 쌓입니다.
- 조직 관리자는 Discussions에서 댓글 **숨기기 · 삭제 · 잠금(댓글 막기)** 을 할 수 있습니다.

### 회사 공용 관리자 계정

`pj.southkorea@gmail.com`으로 GitHub 계정을 만들어 TEAM-PJ-LAB 조직에 추가하면, 그 계정 하나로 글과 댓글을 모두 관리할 수 있습니다. 비밀번호는 GitHub 로그인 화면에만 입력하고, 이 저장소나 코드에는 절대 넣지 않습니다.

## Language

우측 상단 `KO / EN` 토글로 전환합니다. 선택은 브라우저에 저장되고, `?lang=en` · `?lang=ko` 로 바로 열 수도 있습니다. 첫 방문 시에는 브라우저 언어를 따릅니다.

## Local preview

```bash
python3 -m http.server 5173
```

브라우저에서 http://localhost:5173 을 엽니다.
