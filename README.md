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
| `admin/index.html` · `assets/js/admin.js` | 게시판 관리자 로그인·편집기 (서버·DB 없음) |
| `_layouts/` | 공통 틀(`default.html`)과 글 틀(`post.html`) |
| `assets/css/style.css` · `assets/js/main.js` | 스타일 · 언어 전환 · 메뉴 · 댓글(giscus) |

## 게시판 관리 (로그인한 사람만)

DB·서버 없이 **이 저장소 자체가 게시판**입니다. 글은 `_posts/`의 마크다운 파일이고, 저장할 때마다 커밋이 하나 생깁니다.

### 사이트에서 로그인 — `/admin/`

1. **처음 한 번 설정** (`/admin/` → *로그인 설정*)
   - GitHub에서 세분화된 토큰(fine-grained PAT)을 만듭니다: Resource owner `TEAM-PJ-LAB`, *Only select repositories* → `TEAM-PJ-LAB.github.io`, *Contents: Read and write*. 조직 승인 요청이 뜨면 조직 소유자가 승인합니다.
   - 토큰을 붙여 넣고 아이디·비밀번호를 정합니다.
   - 토큰은 브라우저에서 비밀번호로 암호화(PBKDF2-SHA256 600,000회 → AES-256-GCM, 아이디는 인증 데이터로 묶음)되어 `assets/admin/vault.json`에 **암호문만** 커밋됩니다.
2. **이후** 어느 기기에서든 `/admin/`에서 아이디·비밀번호로 로그인 → 새 글 · 수정 · 삭제 · 사진 넣기.
3. 로그인한 탭에서는 게시판에 *새 글*, 글 페이지에 *수정* 버튼이 보입니다. 탭을 닫으면 로그아웃됩니다.

> `vault.json`은 공개 파일이라 **짧은 비밀번호는 오프라인에서 맞춰질 수 있습니다** (12자 이상 권장). 비밀번호 변경·토큰 교체는 *로그인 설정*을 다시 하면 되고, 유출이 의심되면 GitHub에서 토큰을 폐기하면 즉시 무효가 됩니다.

### 다른 방법

- **Pages CMS** — https://app.pagescms.org 에서 GitHub 계정으로 로그인 → `TEAM-PJ-LAB/TEAM-PJ-LAB.github.io` → **Board**
- **GitHub에서 직접** — `_posts/`에 `YYYY-MM-DD-주소.md` 파일을 추가합니다.

```markdown
---
title: "글 제목"
description: "목록에 보일 한 줄 요약"
---

본문 (마크다운)
```

한국어/영어를 함께 쓰려면 본문을 `<div class="en" markdown="1">` … `</div>`, `<div class="ko" markdown="1">` … `</div>`로 감싸면 사이트의 KO/EN 버튼에 맞춰 바뀝니다 (`/admin/` 편집기는 이 형식을 자동으로 만듭니다).

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
