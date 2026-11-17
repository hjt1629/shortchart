// ===== 숏차트 프로토타입 (해시 라우팅 SPA, 의존성 없음) =====

const $app = document.getElementById("app");

// 데이터 소스: collector 가 만든 data/live-data.js 가 있으면 실제 YouTube 데이터, 없으면 샘플
const LIVE = window.LIVE_DATA && window.LIVE_DATA.series && window.LIVE_DATA.series.length ? window.LIVE_DATA : null;
const DATA = LIVE ? LIVE.series : CONTENTS;
const byId = Object.fromEntries(DATA.map((c) => [c.id, c]));

const PERIODS = { daily: "일간", weekly: "주간", monthly: "월간" };
const TYPES = { drama: "숏드라마", movie: "숏필름" };

// ---------- 저장소 (보고싶어요 / 내 별점) ----------
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 저장 불가 환경 */ }
  },
};
let wishes = new Set(store.get("sc.wish", []));
let myRatings = store.get("sc.ratings", {});

function toggleWish(id) {
  wishes.has(id) ? wishes.delete(id) : wishes.add(id);
  store.set("sc.wish", [...wishes]);
  toast(wishes.has(id) ? "보고싶어요에 추가했어요" : "보고싶어요에서 뺐어요");
}

// ---------- 유틸 ----------
function fmt(n) {
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억";
  if (n >= 1e4) return (n / 1e4 >= 100 ? Math.round(n / 1e4) : (n / 1e4).toFixed(1).replace(/\.0$/, "")) + "만";
  return n.toLocaleString("ko-KR");
}
const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
// 포스터 배경: 썸네일이 있으면 썸네일, 없으면 그라디언트
const grad = (c) => `background: ${c.thumb ? `url('${esc(c.thumb)}') center / cover no-repeat, ` : ""}linear-gradient(160deg, ${c.colors[0]}, ${c.colors[1]});`;

let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

function pbadge(p) {
  const pf = PLATFORMS[p];
  return `<span class="pbadge"><i style="background:${pf.color}"></i>${pf.short}</span>`;
}

// ---------- 랭킹 계산 (조회수 기반) ----------
// 기간 조회수 = 해당 기간 동안 "늘어난" 조회수. 아직 비교할 과거 스냅샷이 없으면 누적 조회수로 대신한다.
function periodViews(c, period) {
  const v = c.views[period];
  return v == null ? { value: c.views.total, label: "누적 조회수 (집계 중)", partial: true } : { value: v, label: `${PERIODS[period]} 조회수` };
}

// 숏차트 지수 = 기간 조회수 × 참여도(좋아요율) × 완주율 가중치
function weight(c) {
  const engagement = c.views.total ? 1 + Math.min(c.likes / c.views.total, 0.2) * 3 : 1;
  const completionW = c.completion == null ? 1 : 0.8 + c.completion * 0.4;
  return engagement * completionW;
}
const score = (c, period) => periodViews(c, period).value * weight(c);

function ranking({ type = "drama", period = "weekly", platform = "all", genre = "all" } = {}) {
  const pool = DATA.filter(
    (c) => (type === "all" || c.type === type) &&
      (platform === "all" || c.platform === platform) &&
      (genre === "all" || c.genres.includes(genre))
  );
  // 직전 기간 순위: 실데이터는 직전 기간 증가 조회수로, 샘플은 성장률로 역산
  const prevScore = (c) => {
    if (c.prevViews) return c.prevViews[period] == null ? null : c.prevViews[period] * weight(c);
    return score(c, period) / (1 + (c.growth || 0) / 100);
  };
  const prev = pool.filter((c) => prevScore(c) != null).sort((a, b) => prevScore(b) - prevScore(a)).map((c) => c.id);
  const sorted = [...pool].sort((a, b) => score(b, period) - score(a, period));
  const max = sorted.length ? score(sorted[0], period) || 1 : 1;
  return sorted.map((c, i) => {
    const p = prev.indexOf(c.id);
    const isNew = c.releasedDaysAgo <= 7;
    return { c, rank: i + 1, delta: p < 0 ? null : p - i, isNew, pct: Math.round((score(c, period) / max) * 100) };
  });
}

// 평점(샘플) 또는 완주율(실데이터) 짧은 표시
function qualityBadge(c) {
  if (c.rating != null) return `<span class="star">★ ${c.rating.toFixed(1)}</span>`;
  if (c.completion != null) return `<span class="star">완주율 ${Math.round(c.completion * 100)}%</span>`;
  return "";
}

function rankChange({ delta, isNew }) {
  if (isNew) return `<small class="new">NEW</small>`;
  if (delta == null) return `<small class="same">–</small>`;
  if (delta > 0) return `<small class="up">▲${delta}</small>`;
  if (delta < 0) return `<small class="down">▼${-delta}</small>`;
  return `<small class="same">–</small>`;
}

// ---------- 컴포넌트 ----------
function poster(c, { showTop = true } = {}) {
  return `
    <div class="poster" style="${grad(c)}">
      ${showTop ? `<div class="p-top"><span class="p-type">${TYPES[c.type]}</span>${pbadge(c.platform)}</div>` : ""}
      <div class="p-title">${esc(c.title)}</div>
      <div class="p-meta">${c.type === "drama" ? `${c.episodes}화 · 회당 ${c.epLength}` : c.epLength}</div>
    </div>`;
}

function card(c) {
  return `
    <a class="card" href="#/title/${c.id}">
      ${poster(c)}
      <div class="c-title">${esc(c.title)}</div>
      <div class="c-sub">${qualityBadge(c)}<span>조회 ${fmt(c.views.total)}</span></div>
    </a>`;
}

function miniRow(r, rightHtml) {
  const c = r.c;
  return `
    <a class="mini-row" href="#/title/${c.id}">
      <span class="num">${r.rank}</span>
      <span class="mini-thumb poster" style="${grad(c)};padding:0;box-shadow:none"></span>
      <span><div class="t">${esc(c.title)}</div><div class="s">${PLATFORMS[c.platform].short} · ${c.genres.slice(0, 2).join(", ")}</div></span>
      ${rightHtml}
    </a>`;
}

// ---------- 페이지: 홈 ----------
function renderHome() {
  const dramaTop = ranking({ type: "drama", period: "daily" });
  const movieTop = ranking({ type: "movie", period: "weekly" });
  const all = ranking({ type: "all", period: "daily" });
  const hero = (dramaTop[0] || all[0]).c;
  const heroViews = periodViews(hero, "daily");
  const quality = (c) => c.rating ?? c.completion ?? 0;
  const rising = DATA.filter((c) => c.growth != null).sort((a, b) => b.growth - a.growth).slice(0, 5);
  const finished = DATA.filter((c) => c.type === "drama" && c.status === "완결").sort((a, b) => quality(b) - quality(a));
  const fresh = [...DATA].sort((a, b) => a.releasedDaysAgo - b.releasedDaysAgo).slice(0, 6);

  $app.innerHTML = `
    <section class="hero">
      <div class="hero-bg" style="${grad(hero)}"></div>
      <div class="hero-shade"></div>
      <div class="hero-body">
        <div class="hero-label">👑 오늘의 ${TYPES[hero.type]} 1위 ${pbadge(hero.platform)}</div>
        <h1>${esc(hero.title)}</h1>
        <p>${esc(hero.synopsis)}</p>
        <div class="hero-stats">
          <div>${heroViews.partial ? "누적 조회수" : "오늘 늘어난 조회수"}<b>${fmt(heroViews.value)}</b></div>
          ${heroViews.partial ? "" : `<div>누적 조회수<b>${fmt(hero.views.total)}</b></div>`}
          ${hero.rating != null ? `<div>평점<b class="star">★ ${hero.rating.toFixed(1)}</b></div>` : ""}
          ${hero.completion != null ? `<div>완주율<b class="star">${Math.round(hero.completion * 100)}%</b></div>` : ""}
          <div>${hero.type === "drama" ? "에피소드" : "러닝타임"}<b>${hero.type === "drama" ? hero.episodes + "화" : hero.epLength}</b></div>
        </div>
        <div class="btn-row">
          <a class="btn btn-primary" href="#/title/${hero.id}">▶ 1화부터 보기</a>
          <button class="btn btn-ghost ${wishes.has(hero.id) ? "on" : ""}" data-wish="${hero.id}">${wishes.has(hero.id) ? "♥" : "♡"} 보고싶어요</button>
        </div>
      </div>
      <div class="hero-poster">${poster(hero)}</div>
    </section>

    ${dramaTop.length ? `<section class="section">
      <div class="section-head">
        <h2>오늘의 숏드라마 TOP 10<span class="sub">${LIVE ? "YouTube 조회수 기준" : "유튜브·인스타·틱톡·전용앱 통합"}</span></h2>
        <a class="more" href="#/ranking?type=drama&period=daily">전체 랭킹 ›</a>
      </div>
      <div class="top10">
        ${dramaTop.slice(0, 10).map((r) => `
          <a class="t-item" href="#/title/${r.c.id}">
            <span class="t-num">${r.rank}</span>${poster(r.c)}
          </a>`).join("")}
      </div>
    </section>` : ""}

    <section class="section two-col">
      <div class="panel">
        <div class="section-head" style="margin-bottom:6px"><h3>🔥 지금 급상승</h3><span class="muted" style="font-size:12px">전주 대비 조회수</span></div>
        ${rising.length ? rising.map((c, i) => miniRow({ c, rank: i + 1 }, `<span class="growth ${c.growth < 0 ? "down" : ""}">${c.growth < 0 ? "▼" : "▲"} ${Math.abs(c.growth)}%</span>`)).join("")
          : `<p class="muted" style="font-size:13px;line-height:1.6">조회수 기록이 2주 이상 쌓이면 전주 대비 급상승 작품이 표시돼요.</p>`}
      </div>
      <div class="panel">
        <div class="section-head" style="margin-bottom:6px"><h3>🎬 이번 주 숏필름</h3><a class="more" href="#/ranking?type=movie">더보기 ›</a></div>
        ${movieTop.length ? movieTop.slice(0, 5).map((r) => miniRow(r, `<span class="muted" style="font-size:13px">${fmt(periodViews(r.c, "weekly").value)}회</span>`)).join("")
          : `<p class="muted" style="font-size:13px">등록된 숏필름이 아직 없어요.</p>`}
      </div>
    </section>

    ${LIVE ? "" : `<section class="section">
      <div class="section-head"><h2>플랫폼별 인기작</h2></div>
      <div class="chip-row scroll" id="platformChips">
        ${Object.entries(PLATFORMS).map(([k, p], i) => `<button class="chip ${i === 0 ? "active" : ""}" data-platform="${k}">${p.name}</button>`).join("")}
      </div>
      <div class="grid" id="platformGrid" style="margin-top:18px"></div>
    </section>`}

    ${finished.length ? `<section class="section">
      <div class="section-head"><h2>완결작 정주행 추천<span class="sub">${LIVE ? "완주율 높은 순" : "평점 높은 순"}</span></h2></div>
      <div class="grid">${finished.slice(0, 6).map(card).join("")}</div>
    </section>` : ""}

    <section class="section">
      <div class="section-head"><h2>새로 올라온 작품</h2></div>
      <div class="grid">${fresh.map(card).join("")}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>장르로 찾기</h2></div>
      <div class="chip-row">${GENRES.map((g) => `<a class="chip" href="#/ranking?type=all&genre=${encodeURIComponent(g)}">#${g}</a>`).join("")}</div>
    </section>

    <div class="notice">${LIVE
      ? `※ YouTube Data API로 수집한 실제 조회수 기준입니다. 마지막 수집: <b>${LIVE.latestDate}</b> · 기록 ${LIVE.snapshotCount}일치 (${LIVE.firstDate}부터). 일간·주간·월간 순위는 기록이 각각 1·7·30일 이상 쌓이면 정확해지고, 그 전에는 누적 조회수로 대신 표시합니다.`
      : `※ 현재 화면의 작품·수치는 모두 프로토타입용 <b>가상 샘플 데이터</b>입니다. <code>collector/collect.mjs</code>로 YouTube 데이터를 수집하면 실제 조회수로 바뀝니다.`}</div>
  `;

  const renderPlatform = (p) => {
    const list = ranking({ type: "all", period: "weekly", platform: p }).slice(0, 6);
    document.getElementById("platformGrid").innerHTML = list.map((r) => card(r.c)).join("");
  };
  if (LIVE) return;
  renderPlatform("youtube");
  document.getElementById("platformChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-platform]");
    if (!b) return;
    document.querySelectorAll("#platformChips .chip").forEach((x) => x.classList.toggle("active", x === b));
    renderPlatform(b.dataset.platform);
  });
}

// ---------- 페이지: 랭킹 ----------
function renderRanking(params) {
  const state = {
    type: params.get("type") || "drama",
    period: params.get("period") || "weekly",
    platform: params.get("platform") || "all",
    genre: params.get("genre") || "all",
  };
  const link = (patch) => {
    const s = { ...state, ...patch };
    return "#/ranking?" + new URLSearchParams(s).toString();
  };
  const list = ranking(state);

  $app.innerHTML = `
    <h1 class="page-title">숏차트 랭킹</h1>
    <p class="page-desc">${PERIODS[state.period]} 동안 <b>늘어난 조회수</b>에 좋아요율·완주율을 반영한 <b>숏차트 지수</b> 기준 · ${LIVE ? `마지막 수집 ${LIVE.latestDate}` : "샘플 데이터"}</p>

    <div class="tabs">
      ${[["drama", "숏드라마"], ["movie", "숏필름"], ["all", "전체"]].map(([k, l]) =>
        `<button class="${state.type === k ? "active" : ""}" data-href="${link({ type: k })}">${l}</button>`).join("")}
    </div>

    <div class="filters">
      <div class="chip-row scroll">
        ${Object.entries(PERIODS).map(([k, l]) => `<a class="chip ${state.period === k ? "active" : ""}" href="${link({ period: k })}">${l}</a>`).join("")}
      </div>
      ${LIVE ? "" : `<div class="chip-row scroll">
        <a class="chip ${state.platform === "all" ? "active" : ""}" href="${link({ platform: "all" })}">모든 플랫폼</a>
        ${Object.entries(PLATFORMS).map(([k, p]) => `<a class="chip ${state.platform === k ? "active" : ""}" href="${link({ platform: k })}">${p.short}</a>`).join("")}
      </div>`}
      <div class="chip-row scroll">
        <a class="chip ${state.genre === "all" ? "active" : ""}" href="${link({ genre: "all" })}">모든 장르</a>
        ${GENRES.map((g) => `<a class="chip ${state.genre === g ? "active" : ""}" href="${link({ genre: g })}">${g}</a>`).join("")}
      </div>
    </div>

    ${list.length ? `<div class="rank-list">
      ${list.map((r) => `
        <a class="rank-row" href="#/title/${r.c.id}">
          <div class="rk"><b>${r.rank}</b>${rankChange(r)}</div>
          <div class="thumb poster" style="${grad(r.c)}"></div>
          <div class="info">
            <div class="t">${esc(r.c.title)}</div>
            <div class="s">${pbadge(r.c.platform)}<span>${r.c.genres.join(" · ")}</span><span class="muted">${r.c.type === "drama" ? `${r.c.episodes}화 · ${r.c.status}` : r.c.epLength}</span></div>
          </div>
          <div class="metric score"><small>숏차트 지수</small><b>${r.pct}</b><div class="score-bar"><i style="width:${r.pct}%"></i></div></div>
          <div class="metric"><b>${fmt(periodViews(r.c, state.period).value)}</b><small>${periodViews(r.c, state.period).label}</small><br><small>${qualityBadge(r.c)}</small></div>
        </a>`).join("")}
    </div>` : `<div class="empty"><b>조건에 맞는 작품이 없어요</b>필터를 바꿔보세요.</div>`}
  `;

  $app.querySelectorAll("[data-href]").forEach((b) => b.addEventListener("click", () => (location.hash = b.dataset.href)));
}

// ---------- 페이지: 상세 ----------
function renderDetail(id) {
  const c = byId[id];
  if (!c) return renderNotFound();
  const r = ranking({ type: c.type, period: "weekly" }).find((x) => x.c.id === id);
  const mine = myRatings[id] || 0;
  const similar = DATA.filter((x) => x.id !== id && (c.genres.length ? x.genres.some((g) => c.genres.includes(g)) : x.type === c.type)).slice(0, 6);
  const pf = PLATFORMS[c.platform];
  // 실제 링크가 있으면 새 창으로, 샘플이면 안내 토스트
  const watch = (url) => (url ? `href="${esc(url)}" target="_blank" rel="noopener"` : `href="#" data-watch`);
  const wv = periodViews(c, "weekly");
  const eps = c.episodeList;
  const ep1Views = eps && eps.length ? eps[0].views || 1 : 1;

  $app.innerHTML = `
    <section class="detail-hero">
      <div class="hero-bg" style="${grad(c)}"></div>
      <div class="hero-shade"></div>
      ${poster(c)}
      <div class="detail-info">
        <div class="hero-label">${TYPES[c.type]} 주간 ${r.rank}위 ${rankChange(r)}</div>
        <h1>${esc(c.title)}</h1>
        <div class="detail-meta">
          ${pbadge(c.platform)}
          <span>${esc(c.channel)}</span>
          <span class="dot">${c.type === "drama" ? `${c.episodes}화 · 회당 ${c.epLength}` : `러닝타임 ${c.epLength}`}</span>
          <span class="dot">${c.status}</span>
        </div>
        <p style="color:var(--text-2);line-height:1.7;margin:0 0 16px;max-width:600px;word-break:keep-all">${esc(c.synopsis)}</p>
        <div class="chip-row" style="margin-bottom:20px">${c.genres.map((g) => `<a class="tag" href="#/ranking?type=all&genre=${encodeURIComponent(g)}">#${g}</a>`).join("")}</div>
        <div class="btn-row">
          <a class="btn btn-primary" ${watch(c.url)}>▶ ${pf.short}에서 보기</a>
          <button class="btn btn-ghost ${wishes.has(id) ? "on" : ""}" data-wish="${id}" data-count>${wishes.has(id) ? "♥" : "♡"} 보고싶어요 ${fmt(c.wish + (wishes.has(id) ? 1 : 0))}</button>
          <button class="btn btn-ghost" data-share>공유</button>
        </div>
      </div>
    </section>

    <div class="stat-cards">
      <div class="stat-card"><small>누적 조회수</small><b>${fmt(c.views.total)}</b></div>
      <div class="stat-card"><small>${wv.partial ? "주간 조회수" : "이번 주 늘어난 조회수"}</small><b>${wv.partial ? "집계 중" : fmt(wv.value)}</b>${c.growth != null ? `<em class="${c.growth >= 0 ? "up" : "down"}">${c.growth >= 0 ? "▲" : "▼"} ${Math.abs(c.growth)}% 전주 대비</em>` : wv.partial ? `<em class="muted">기록 7일 이상 필요</em>` : ""}</div>
      <div class="stat-card"><small>좋아요</small><b>${fmt(c.likes)}</b>${c.comments ? `<em class="muted">댓글 ${fmt(c.comments)}</em>` : ""}</div>
      ${c.rating != null
        ? `<div class="stat-card"><small>숏차트 평점</small><b class="star">★ ${c.rating.toFixed(1)}</b><em class="muted">${c.ratingCount.toLocaleString()}명 참여</em></div>`
        : `<div class="stat-card"><small>완주율</small><b class="star">${c.completion != null ? Math.round(c.completion * 100) + "%" : "–"}</b><em class="muted">마지막 화 ÷ 1화 조회수</em></div>`}
    </div>

    <section class="section">
      <div class="section-head"><h2>어디서 볼 수 있나요?</h2></div>
      <div class="watch-list">
        <a class="watch-item" ${watch(c.url)}>
          <span class="watch-logo" style="background:${pf.color}">${pf.short.slice(0, 2)}</span>
          <span><div class="w-name">${pf.name}</div><div class="w-sub">${esc(c.channel)} · 무료</div></span>
          <span class="go">›</span>
        </a>
        ${c.channelUrl ? `
        <a class="watch-item" ${watch(c.channelUrl)}>
          <span class="watch-logo" style="background:#333">CH</span>
          <span><div class="w-name">채널 바로가기</div><div class="w-sub">${esc(c.channel)}</div></span>
          <span class="go">›</span>
        </a>` : ""}
        ${c.platform !== "youtube" ? `
        <button class="watch-item" data-watch>
          <span class="watch-logo" style="background:${PLATFORMS.youtube.color}">Yo</span>
          <span><div class="w-name">YouTube 하이라이트</div><div class="w-sub">1~3화 무료 공개</div></span>
          <span class="go">›</span>
        </button>` : ""}
      </div>
    </section>

    ${c.type === "drama" ? `
    <section class="section">
      <div class="section-head"><h2>에피소드<span class="sub">총 ${c.episodes}화</span></h2></div>
      ${eps ? `<p class="muted" style="font-size:13px;margin:-6px 0 14px">막대는 1화 대비 조회수 — 어디서 시청자가 빠져나가는지 볼 수 있어요.</p>
      <div class="episodes">
        ${eps.map((e) => `
          <a class="ep" ${watch(e.url)} title="${esc(e.title)}">
            <b>${e.n}화</b><small>${e.len} · 조회 ${fmt(e.views)}</small>
            <div class="score-bar"><i style="width:${Math.min(100, Math.round((e.views / ep1Views) * 100))}%"></i></div>
          </a>`).join("")}
      </div>` : `<div class="episodes">
        ${Array.from({ length: Math.min(c.episodes, 12) }, (_, i) => `
          <button class="ep ${i < 3 ? "free" : ""}" data-watch><b>${i + 1}화</b><small>${c.epLength}${i < 3 ? " · 무료" : ""}</small></button>`).join("")}
        ${c.episodes > 12 ? `<button class="ep" data-watch><b>+${c.episodes - 12}화</b><small>전체 보기</small></button>` : ""}
      </div>`}
    </section>` : ""}

    <section class="section">
      <div class="section-head"><h2>평가</h2></div>
      <div class="panel">
        <div class="rate-box">
          <div><div class="muted" style="font-size:13px">평균 평점</div><div class="rate-big star">${c.rating != null ? c.rating.toFixed(1) : "–"}</div>${c.rating == null ? `<div class="muted" style="font-size:12px">아직 평가가 모이지 않았어요</div>` : ""}</div>
          <div>
            <div class="muted" style="font-size:13px;margin-bottom:6px">내 별점 <span id="myRateLabel">${mine ? mine + "점" : "아직 평가 안 함"}</span></div>
            <div class="stars-input" id="starsInput">
              ${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" class="${n <= mine ? "on" : ""}" aria-label="${n}점">★</button>`).join("")}
            </div>
          </div>
        </div>
        <div style="margin-top:20px">
          ${(LIVE ? [] : SAMPLE_REVIEWS).map((rv) => `
            <div class="review">
              <div class="r-head"><b>${rv.user}</b><span class="star">${"★".repeat(rv.stars)}<span style="color:var(--line)">${"★".repeat(5 - rv.stars)}</span></span></div>
              <p>${rv.text}</p>
            </div>`).join("")}
        </div>
      </div>
    </section>

    ${similar.length ? `
    <section class="section">
      <div class="section-head"><h2>비슷한 작품</h2></div>
      <div class="grid">${similar.map(card).join("")}</div>
    </section>` : ""}
  `;

  $app.querySelectorAll("[data-watch]").forEach((b) =>
    b.addEventListener("click", (e) => { e.preventDefault(); toast(`샘플 작품이라 실제 링크는 없어요 (실서비스: ${pf.name}로 이동)`); }));
  $app.querySelector("[data-share]").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); toast("링크를 복사했어요"); }
    catch { toast("링크 복사에 실패했어요"); }
  });
  document.getElementById("starsInput").addEventListener("click", (e) => {
    const b = e.target.closest("[data-star]");
    if (!b) return;
    const n = Number(b.dataset.star);
    myRatings[id] = myRatings[id] === n ? 0 : n;
    store.set("sc.ratings", myRatings);
    const v = myRatings[id];
    document.querySelectorAll("#starsInput button").forEach((x) => x.classList.toggle("on", Number(x.dataset.star) <= v));
    document.getElementById("myRateLabel").textContent = v ? v + "점" : "아직 평가 안 함";
    if (v) toast(`${v}점으로 평가했어요`);
  });
}

// ---------- 페이지: 검색 ----------
function renderSearch(params) {
  const q = (params.get("q") || "").trim();
  const ql = q.toLowerCase();
  const results = q
    ? DATA.filter((c) =>
        c.title.toLowerCase().includes(ql) || c.channel.toLowerCase().includes(ql) ||
        c.genres.some((g) => g.includes(q)) || PLATFORMS[c.platform].name.toLowerCase().includes(ql))
    : [];
  $app.innerHTML = `
    <h1 class="page-title">검색</h1>
    <form id="pageSearch" style="margin-bottom:24px">
      <input class="search-big" name="q" value="${esc(q)}" placeholder="작품, 채널, 장르 검색" autocomplete="off"
        style="width:100%;height:50px;border-radius:14px;border:1px solid var(--line);background:var(--bg-2);color:var(--text);padding:0 18px;font:inherit;font-size:16px" />
    </form>
    ${!q ? `
      <div class="section-head"><h2 style="font-size:17px">인기 검색어</h2></div>
      <div class="chip-row">${["회귀", "재벌", "복수", "로맨스", "스릴러", "@shortcut_studio"].map((k) => `<a class="chip" href="#/search?q=${encodeURIComponent(k)}">${k}</a>`).join("")}</div>`
    : results.length
      ? `<p class="muted" style="font-size:14px">‘${esc(q)}’ 검색 결과 ${results.length}개</p><div class="grid">${results.map(card).join("")}</div>`
      : `<div class="empty"><b>‘${esc(q)}’에 대한 결과가 없어요</b>다른 키워드로 검색해보세요.</div>`}
  `;
  document.getElementById("pageSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    location.hash = "#/search?q=" + encodeURIComponent(e.target.q.value.trim());
  });
  if (!q) $app.querySelector(".search-big").focus();
}

// ---------- 페이지: 보고싶어요 ----------
function renderWish() {
  const list = [...wishes].map((id) => byId[id]).filter(Boolean);
  $app.innerHTML = `
    <h1 class="page-title">보고싶어요</h1>
    <p class="page-desc">찜한 작품은 이 브라우저에 저장돼요.</p>
    ${list.length ? `<div class="grid">${list.map(card).join("")}</div>`
      : `<div class="empty"><b>아직 찜한 작품이 없어요</b>마음에 드는 작품에서 ♡ 보고싶어요를 눌러보세요.<br><br><a class="btn btn-primary" href="#/ranking">랭킹 둘러보기</a></div>`}
  `;
}

function renderNotFound() {
  $app.innerHTML = `<div class="empty"><b>페이지를 찾을 수 없어요</b><a class="more" href="#/">홈으로</a></div>`;
}

// ---------- 라우터 ----------
function router() {
  const hash = location.hash.slice(1) || "/";
  const [path, query] = hash.split("?");
  const params = new URLSearchParams(query || "");
  const parts = path.split("/").filter(Boolean);
  const section = parts[0] || "home";

  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === (section === "title" ? "" : section)));

  if (section === "home") renderHome();
  else if (section === "ranking") renderRanking(params);
  else if (section === "title") renderDetail(parts[1]);
  else if (section === "search") renderSearch(params);
  else if (section === "wish") renderWish();
  else renderNotFound();

  window.scrollTo(0, 0);
}

// 보고싶어요 버튼 (모든 페이지 공통, 이벤트 위임)
$app.addEventListener("click", (e) => {
  const b = e.target.closest("[data-wish]");
  if (!b) return;
  e.preventDefault();
  const id = b.dataset.wish;
  toggleWish(id);
  const on = wishes.has(id);
  b.classList.toggle("on", on);
  const c = byId[id];
  b.textContent = `${on ? "♥" : "♡"} 보고싶어요` + ("count" in b.dataset ? ` ${fmt(c.wish + (on ? 1 : 0))}` : "");
});

document.getElementById("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.getElementById("searchInput").value.trim();
  if (q) location.hash = "#/search?q=" + encodeURIComponent(q);
});

window.addEventListener("hashchange", router);
router();
