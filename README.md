# PJ — Software & Ventures

PJ 공식 웹사이트 · https://team-pj-lab.github.io

PJ는 소프트웨어를 중심으로 다양한 사업을 설계하고 운영하는 회사입니다.

- **Co-CEO** 정우진 · 박부건
- **Team PJ** — 회사의 첫 번째 팀이자 메인 개발팀 (CTO 박부건)
- **Contact** — bagdoeon827@gmail.com (대외 연락: 박부건)

## Stack

빌드 단계 없는 정적 사이트입니다. GitHub Pages가 `main` 브랜치 루트를 그대로 배포합니다.

| | |
|---|---|
| `index.html` | 마크업과 콘텐츠 |
| `assets/css/style.css` | 스타일 |
| `assets/js/main.js` | 스크롤 · 커서 · 텍스트 모션 (GSAP, ScrollTrigger, Lenis) |
| `assets/js/particles.js` | WebGL 파티클 (Three.js) — PJ 로고 → 구 → 웨이브 → 은하로 모핑 |

## Local preview

```bash
python3 -m http.server 5173
```

브라우저에서 http://localhost:5173 을 엽니다.
