# PJ Group — Software & Ventures

PJ Group 공식 웹사이트 · https://team-pj-lab.github.io (한국어 / English)

PJ Group은 소프트웨어를 중심으로 다양한 사업을 설계하고 운영하는 회사입니다.

- **Co-CEO** 정우진 (Jung Woojin) · 박부건 (Park Bugeon)
- **Team PJ** — 회사의 첫 번째 팀이자 메인 개발팀 (CTO 박부건)
- **Contact** — pj.southkorea@gmail.com (대외 연락: 박부건)

## Stack

빌드 단계 없는 정적 사이트입니다. GitHub Pages가 `main` 브랜치 루트를 그대로 배포합니다. 외부 라이브러리 없이 HTML · CSS · 순수 JS만 씁니다.

| | |
|---|---|
| `index.html` | 마크업 · 한/영 콘텐츠 (`.ko` / `.en`) · SEO 메타 · JSON-LD |
| `assets/css/style.css` | 스타일 (밝은 배경, 브랜드 오렌지 `#ff4d1c`) |
| `assets/js/main.js` | 언어 전환 · 모바일 메뉴 · 스크롤 등장 효과 · 이메일 복사 · 창업자 아바타의 ㅈ/ㅂ 강조 |

## Language

우측 상단 `KO / EN` 토글로 전환합니다. 선택은 브라우저에 저장되고, `?lang=en` · `?lang=ko` 로 바로 열 수도 있습니다. 첫 방문 시에는 브라우저 언어를 따릅니다.

## Local preview

```bash
python3 -m http.server 5173
```

브라우저에서 http://localhost:5173 을 엽니다.
