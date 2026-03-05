# Next Dashboard Rebuild (BankDash Style)

`next-dashboard`는 기존 Streamlit 앱(`dashboard.py`)을 React/Next.js(App Router)로 재구현한 버전입니다.

## 포함 기능

- 트렌드 비교
- 실시간 쇼핑
- 실시간 블로그
- 실시간 카페
- 실시간 뉴스
- 쇼핑인사이트
- 종합 리포트
- 구글 트렌드 탭(추가)

## 실행

```bash
cd next-dashboard
npm install
npm run dev
```

- 기본 URL: `http://localhost:3000`
- API 키 로딩 우선순위:
  1. `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` (OS 환경변수)
  2. `NAVER_ENV_PATH` 지정 경로
  3. `next-dashboard/.env`
  4. `../naverapp/.env` 또는 `../../naverapp/.env`

## 배포 (Vercel)

- Framework: Next.js
- Root Directory: `next-dashboard`
- Build Command: `npm run build`
- Environment Variables (권장):
  - `NAVER_CLIENT_ID`
  - `NAVER_CLIENT_SECRET`

> 보안상 `Client Secret`은 브라우저로 노출되지 않고 서버 API Route에서만 사용됩니다.
