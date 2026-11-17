# 숏차트 — 숏폼 드라마·숏필름 조회수 랭킹

유튜브 쇼츠 등에 흩어진 숏폼 드라마/숏필름을 모아 **늘어난 조회수** 기준으로 순위를 보여주는 사이트입니다.

- `data/live-data.js` 가 있으면 → 실제 YouTube 데이터로 표시
- 없으면 → `data.js` 의 가상 샘플 데이터로 표시

## 1. 사이트 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

## 2. YouTube API 키 발급 (무료, 한 번만)

1. https://console.cloud.google.com 에 로그인 → 새 프로젝트 만들기
2. **API 및 서비스 → 라이브러리** 에서 `YouTube Data API v3` 검색 → **사용**
3. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키**
4. (권장) 만든 키의 **API 제한사항**을 `YouTube Data API v3` 로만 제한
5. 프로젝트 폴더에서 `.env.example` 을 `.env` 로 복사하고 키를 붙여넣기

```
YOUTUBE_API_KEY=AIza...
```

`.env` 는 비밀번호와 같습니다. 다른 사람과 공유하거나 깃허브에 올리지 마세요 (`.gitignore` 에 포함됨).

## 3. 추적할 작품 등록 — `collector/series.json`

`collector/series.example.json` 을 참고해 작품을 추가합니다.

| 항목 | 설명 |
|---|---|
| `id` | 영문 고유 ID (주소에 쓰임, 바꾸면 기록이 끊김) |
| `title` | 사이트에 보일 작품명 |
| `type` | `drama`(시리즈) 또는 `movie`(단편) |
| `genres` | 장르 배열. 사이트 장르 필터와 같은 이름을 쓰면 필터에 잡힘 |
| `playlist` | 재생목록 주소 (회차 순서대로 정리된 재생목록 권장) |
| `videos` | 재생목록이 없으면 영상 주소를 회차 순서대로 나열 |
| `synopsis` | (선택) 줄거리. 비우면 1화 영상 설명 첫 줄 |
| `status` | (선택) `연재중`/`완결`. 비우면 최근 14일 내 업로드가 있으면 연재중 |

## 4. 조회수 수집

```bash
npm run collect
```

- 등록된 모든 영상의 조회수·좋아요·댓글 수를 가져와 `data/snapshots/날짜.json` 으로 저장하고
- 지난 기록과 비교해 `data/live-data.js` 를 만듭니다. 사이트를 새로고침하면 반영됩니다.

**하루에 한 번, 비슷한 시각에** 실행해야 일간/주간/월간 순위가 정확합니다.

| 쌓인 기록 | 가능한 것 |
|---|---|
| 1일 | 누적 조회수 순위만 (집계 중 표시) |
| 2일~ | 일간 순위 |
| 8일~ | 주간 순위 |
| 15일~ | 전주 대비 급상승, 주간 순위 변동 ▲▼ |
| 31일~ | 월간 순위 |

과거 조회수는 API로 거슬러 올라가 가져올 수 없으니 **최대한 빨리 수집을 시작**하는 게 중요합니다.

## 5. GitHub 자동화 (매일 수집 + 사이트 공개)

`.github/workflows/daily.yml` 이 매일 06:00(한국 시간)에 GitHub 서버에서

1. 조회수를 수집하고 → 2. `data/snapshots/` 기록을 저장소에 커밋하고 → 3. 사이트를 GitHub Pages에 배포합니다.

Mac이 꺼져 있어도 돌아가고, 친구에게는 `https://<아이디>.github.io/<저장소이름>/` 링크를 보내면 됩니다.

### 처음 한 번 설정

1. 저장소를 GitHub에 올리기 (public 저장소여야 무료로 Pages 사용 가능)
2. 저장소 **Settings → Pages → Build and deployment → Source** 를 `GitHub Actions` 로
3. API 키를 시크릿으로 등록 — 터미널에서 아래를 실행하고 키를 붙여넣기

```bash
gh secret set YOUTUBE_API_KEY
```

4. **Actions** 탭 → `매일 조회수 수집 & 사이트 배포` → **Run workflow** 로 첫 실행

### 운영 규칙

- 작품을 추가/수정할 땐 `collector/series.json` 을 고쳐서 push → 다음 날 06:00 수집부터 반영
  (바로 보고 싶으면 Actions 탭에서 Run workflow)
- 코드만 고쳐서 push 하면 수집 없이 기존 기록으로 다시 배포됩니다
- 수집은 GitHub에서만 하세요. 로컬에서도 `npm run collect` 를 돌리면 기록이 엇갈릴 수 있어요.
  로컬에서 실제 데이터로 화면을 보려면 `git pull` 후 `npm run build-data`
- `.env` 는 `.gitignore` 에 있어 올라가지 않습니다. 키는 GitHub 시크릿에만 둡니다.
- public 저장소라 코드와 조회수 기록(`data/snapshots`)은 누구나 볼 수 있습니다.

## 랭킹 계산 방식

- **기간 조회수** = 오늘 누적 조회수 − (1/7/30일 전 누적 조회수). 드라마는 모든 회차 합계.
- **숏차트 지수** = 기간 조회수 × 좋아요율 가중치 × 완주율 가중치
- **완주율** = 공개 3일 이상 지난 마지막 회차 조회수 ÷ 1화 조회수. 끝까지 따라본 시청자 비율의 근사치로, 조회수만 많은 작품과 "진짜 재밌는 작품"을 구분하는 지표입니다.
- 계산 코드: `collector/collect.mjs` 의 `build()`, `app.js` 의 `score()`

## API 사용량

- 하루 무료 한도 10,000 units. 영상 50개 조회 = 1 unit, 재생목록 50개 항목 = 1 unit.
- 회차 60개짜리 드라마 100편을 매일 수집해도 하루 약 300 units 정도입니다.
- 검색(search) API는 100 units로 비싸서 쓰지 않습니다. 작품은 직접 등록합니다.

## 파일 구조

```
index.html, styles.css, app.js   사이트
data.js                           샘플 데이터
collector/collect.mjs             YouTube 수집기
collector/series.json             추적할 작품 목록 (직접 편집)
data/snapshots/                   날짜별 조회수 기록 (지우지 마세요)
data/live-data.js                 사이트가 읽는 결과 파일 (자동 생성)
```
