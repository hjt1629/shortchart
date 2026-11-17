// ===== 숏차트 (해시 라우팅 SPA, 의존성 없음) =====

const $app = document.getElementById("app");

// 데이터 소스: collector 가 만든 data/live-data.js 가 있으면 실제 YouTube 데이터, 없으면 샘플
const LIVE = window.LIVE_DATA && window.LIVE_DATA.series && window.LIVE_DATA.series.length ? window.LIVE_DATA : null;
const DATA = LIVE ? LIVE.series : CONTENTS;
const byId = Object.fromEntries(DATA.map((c) => [c.id, c]));
const LATEST = LIVE ? new Date(LIVE.latestDate + "T00:00:00") : new Date();

const PERIODS = { daily: "일간", weekly: "주간", monthly: "월간" };
const TYPES = { drama: "숏드라마", movie: "숏필름" };
const PLATFORM_LETTER = { youtube: "Y", instagram: "I", tiktok: "T", app: "A" };
const GENRE_COLORS = {
  로맨스: ["#ff7aa2", "#7a1f4b"], 복수: ["#7b1e2b", "#1a0b10"], 회귀: ["#7c6cff", "#1d1846"], 재벌: ["#c9a35c", "#2b2114"],
  학원: ["#4fc3f7", "#173a63"], 스릴러: ["#3a4a5c", "#0b0f15"], 코미디: ["#ffb547", "#a2420f"], 판타지: ["#a974ff", "#2a1257"],
  오피스: ["#5c7cfa", "#1b2556"], 가족: ["#ff9a6b", "#6b2a17"], 액션: ["#ff5a4e", "#4a0f0b"], 호러: ["#6f0f1f", "#08080a"],
};

// ---------- 아이콘 ----------
const ICONS = {
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.3-9.4A5 5 0 0 1 12 6.3a5 5 0 0 1 9.3 4.3C19.5 15.4 12 20 12 20z"/>',
  share: '<path d="M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6M12 3v12M7 8l5-5 5 5"/>',
  flame: '<path d="M12 22c4 0 7-2.7 7-6.6 0-3.7-2.6-6-4.4-8.3-.3 2-1.4 3.5-2.6 4 .4-3-1-6.4-4-8.6.2 3.2-1.5 5.3-2.9 7.2C3.9 11.3 5 13 5 15.4 5 19.3 8 22 12 22z"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 3v18M16 3v18M3 8h5M3 16h5M16 8h5M16 16h5"/>',
  msg: '<path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L3 21l1.4-5.4A8.5 8.5 0 1 1 21 12z"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  chevR: '<path d="M9 6l6 6-6 6"/>',
  chevL: '<path d="M15 6l-6 6 6 6"/>',
  star: '<path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  layers: '<path d="M12 3 2 8l10 5 10-5z"/><path d="M2 12.5l10 5 10-5M2 17l10 5 10-5"/>',
  chart: '<path d="M5 20v-8M12 20V4M19 20v-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  up: '<path d="M12 6l7 10H5z"/>',
  down: '<path d="M12 18 5 8h14z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',
};
const FILLED = new Set(["play", "star", "up", "down"]);
const icon = (n, cls = "") => `<svg class="ic ${FILLED.has(n) ? "fill" : ""} ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

// ---------- 저장소 (보고싶어요 / 내 별점) ----------
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 저장 불가 환경 */ } },
};
let wishes = new Set(store.get("sc.wish", []));
let myRatings = store.get("sc.ratings", {});

// ---------- 유틸 ----------
function fmt(n) {
  if (n == null) return "–";
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억";
  if (n >= 1e4) return (n / 1e4 >= 100 ? Math.round(n / 1e4) : (n / 1e4).toFixed(1).replace(/\.0$/, "")) + "만";
  return Math.round(n).toLocaleString("ko-KR");
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const pct = (x) => Math.round(x * 100) + "%";
const colorVars = (c) => `--c1:${c.colors[0]};--c2:${c.colors[1]}`;
const mmdd = (d) => `${d.getMonth() + 1}/${d.getDate()}`;

let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}

function pmark(p) {
  const pf = PLATFORMS[p];
  return `<span class="pmark"><b style="background:${pf.color};${p === "tiktok" ? "color:#111" : ""}">${PLATFORM_LETTER[p]}</b>${pf.short}</span>`;
}

// ---------- 랭킹 계산 (조회수 기반) ----------
// 기간 조회수 = 해당 기간 동안 "늘어난" 조회수. 비교할 과거 기록이 없으면 누적 조회수로 대신한다.
function periodViews(c, period) {
  const v = c.views[period];
  return v == null ? { value: c.views.total, label: "누적 (집계 중)", partial: true } : { value: v, label: `${PERIODS[period]} 조회수` };
}
// 숏차트 지수 = 기간 조회수 × 참여도(좋아요율) × 완주율 가중치
function weight(c) {
  const engagement = c.views.total ? 1 + Math.min(c.likes / c.views.total, 0.2) * 3 : 1;
  const completionW = c.completion == null ? 1 : 0.8 + c.completion * 0.4;
  return engagement * completionW;
}
const score = (c, period) => periodViews(c, period).value * weight(c);

function ranking({ type = "drama", period = "weekly", platform = "all", genre = "all" } = {}) {
  const pool = DATA.filter((c) =>
    (type === "all" || c.type === type) && (platform === "all" || c.platform === platform) && (genre === "all" || c.genres.includes(genre)));
  const prevScore = (c) => {
    if (c.prevViews) return c.prevViews[period] == null ? null : c.prevViews[period] * weight(c);
    return score(c, period) / (1 + (c.growth || 0) / 100);
  };
  const prev = pool.filter((c) => prevScore(c) != null).sort((a, b) => prevScore(b) - prevScore(a)).map((c) => c.id);
  const sorted = [...pool].sort((a, b) => score(b, period) - score(a, period));
  const max = sorted.length ? score(sorted[0], period) || 1 : 1;
  return sorted.map((c, i) => {
    const p = prev.indexOf(c.id);
    return { c, rank: i + 1, delta: p < 0 ? null : p - i, isNew: c.releasedDaysAgo <= 7, idx: Math.round((score(c, period) / max) * 100) };
  });
}

function rankChange({ delta, isNew }) {
  if (isNew) return `<small class="new">NEW</small>`;
  if (delta == null || delta === 0) return `<small class="same">–</small>`;
  return delta > 0 ? `<small class="up">${icon("up", "sm")}${delta}</small>` : `<small class="down">${icon("down", "sm")}${-delta}</small>`;
}

function quality(c) {
  if (c.rating != null) return `<span class="q">${icon("star", "sm")}${c.rating.toFixed(1)}</span>`;
  if (c.completion != null) return `<span class="q">완주 ${pct(c.completion)}</span>`;
  return "";
}

// ---------- 컴포넌트 ----------
function posterStyle(c) {
  const g = c.genres[0];
  if (["스릴러", "호러"].includes(g)) return "s-noir";
  if (["복수", "재벌", "오피스", "액션"].includes(g)) return "s-luxe";
  if (["학원", "코미디"].includes(g)) return "s-pop";
  if (["판타지", "회귀"].includes(g)) return "s-dream";
  return "s-soft";
}

function poster(c, { xs = false } = {}) {
  const style = c.thumb ? `${colorVars(c)};--thumb:url('${esc(c.thumb)}')` : colorVars(c);
  return `
    <div class="poster ${posterStyle(c)} ${xs ? "xs" : ""} ${c.thumb ? "has-thumb" : ""}" style="${style}">
      <div class="p-art"></div><div class="p-shade"></div><div class="p-grain"></div>
      ${xs ? "" : `
      <div class="p-head">
        <span class="p-plat" style="background:${PLATFORMS[c.platform].color};${c.platform === "tiktok" ? "color:#111" : ""}">${PLATFORM_LETTER[c.platform]}</span>
        <span class="p-ep">${c.type === "drama" ? `${c.episodes}부작` : c.epLength}</span>
      </div>
      <div class="p-body">
        <div class="p-kicker">${c.type === "drama" ? "SHORT DRAMA" : "SHORT FILM"}</div>
        <div class="p-title">${esc(c.title)}</div>
      </div>`}
    </div>`;
}

function card(c) {
  return `
    <a class="card" href="#/title/${c.id}">
      ${poster(c)}
      <div class="card-title">${esc(c.title)}</div>
      <div class="card-sub">${quality(c)}<span class="num">조회 ${fmt(c.views.total)}</span></div>
    </a>`;
}

function sparkline(values, w = 84, h = 30) {
  if (!values || values.length < 2) return `<span class="muted" style="font-size:12px">–</span>`;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  const dir = values.at(-1) >= values[0] ? "u" : "d";
  return `<svg class="spark ${dir}" viewBox="0 0 ${w} ${h}" style="width:${w}px;height:${h}px" aria-hidden="true"><path class="a" d="${line}L${w} ${h}L0 ${h}Z"/><path class="l" d="${line}"/></svg>`;
}

function growthPill(g) {
  if (g == null) return "";
  return g >= 0 ? `<span class="pill up">${icon("up", "sm")}${g}%</span>` : `<span class="pill down">${icon("down", "sm")}${-g}%</span>`;
}

function wishBtn(id, { withLabel = false } = {}) {
  const on = wishes.has(id);
  return `<button class="btn btn-ghost ${withLabel ? "" : "btn-icon"} ${on ? "on" : ""}" data-wish="${id}" aria-pressed="${on}" aria-label="보고싶어요">${icon("heart")}${withLabel ? `<span>보고싶어요</span>` : ""}</button>`;
}

// =========================================================
// 홈
// =========================================================
let heroTimer = null;

function renderHome() {
  const dramaTop = ranking({ type: "drama", period: "daily" });
  const movieTop = ranking({ type: "movie", period: "weekly" });
  const all = ranking({ type: "all", period: "daily" });
  const heroList = (dramaTop.length ? dramaTop : all).slice(0, 5);
  const rising = DATA.filter((c) => c.growth != null).sort((a, b) => b.growth - a.growth).slice(0, 5);
  const qv = (c) => (c.rating != null ? c.rating / 5 : c.completion ?? 0);
  const finished = DATA.filter((c) => c.type === "drama" && c.status === "완결").sort((a, b) => qv(b) - qv(a));
  const fresh = [...DATA].sort((a, b) => a.releasedDaysAgo - b.releasedDaysAgo).slice(0, 6);

  // KPI
  const dailySum = DATA.reduce((a, c) => a + (c.views.daily ?? 0), 0);
  const genreViews = {};
  DATA.forEach((c) => c.genres.forEach((g) => (genreViews[g] = (genreViews[g] || 0) + periodViews(c, "weekly").value)));
  const topGenre = Object.entries(genreViews).sort((a, b) => b[1] - a[1])[0];
  const bestComp = DATA.filter((c) => c.completion != null).sort((a, b) => b.completion - a.completion)[0];
  const genreCounts = Object.fromEntries(GENRES.map((g) => [g, DATA.filter((c) => c.genres.includes(g)).length]));

  $app.innerHTML = `
    <section class="hero" id="hero">
      <div class="hero-bg"></div>
      <div class="hero-inner"><div class="hero-copy"></div><div class="phone-slot"></div></div>
      <div class="hero-pager">
        ${heroList.map((r, i) => `
          <button data-hero="${i}" aria-label="${r.rank}위 ${esc(r.c.title)}">
            ${poster(r.c, { xs: true })}
            <span style="min-width:0"><b>${r.rank}. ${esc(r.c.title)}</b><small>오늘 ${fmt(periodViews(r.c, "daily").value)}회</small></span>
            <span class="bar"></span>
          </button>`).join("")}
      </div>
    </section>

    <section class="kpis">
      <div class="kpi"><small>${icon("layers", "sm")}추적 중인 작품</small><b>${DATA.length}편</b><span>${LIVE ? "YouTube" : "유튜브 · 인스타 · 틱톡 · 전용앱"}</span></div>
      <div class="kpi"><small>${icon("eye", "sm")}오늘 늘어난 조회수</small><b class="num">${dailySum ? fmt(dailySum) : "집계 중"}</b><span>전체 작품 합계</span></div>
      <div class="kpi"><small>${icon("flame", "sm")}이번 주 가장 뜨거운 장르</small><b>${topGenre ? "#" + topGenre[0] : "–"}</b><span>${topGenre ? `주간 ${fmt(topGenre[1])}회` : "장르를 등록해주세요"}</span></div>
      <div class="kpi"><small>${icon("trophy", "sm")}최고 완주율</small><b>${bestComp ? pct(bestComp.completion) : "–"}</b><span>${bestComp ? esc(bestComp.title) : "회차 3개 이상 필요"}</span></div>
    </section>

    ${dramaTop.length || movieTop.length ? `
    <section class="section">
      <div class="section-head">
        <div><span class="eyebrow accent">${icon("chart", "sm")}Daily Top 10</span><h2>오늘의 TOP 10</h2></div>
        <div class="seg" id="topSeg"><button class="on" data-type="drama">숏드라마</button><button data-type="movie">숏필름</button></div>
      </div>
      <div class="rail-wrap">
        <button class="rail-btn prev" aria-label="이전" disabled>${icon("chevL")}</button>
        <div class="rail" id="topRail"></div>
        <button class="rail-btn next" aria-label="다음">${icon("chevR")}</button>
      </div>
    </section>` : ""}

    <section class="section two-col">
      <div class="panel">
        <div class="panel-head"><h3><span class="badge hot">${icon("flame")}</span>지금 급상승</h3><span class="muted" style="font-size:12.5px">전주 대비 조회수</span></div>
        ${rising.length ? rising.map((c, i) => `
          <a class="mini-row" href="#/title/${c.id}">
            <span class="rk">${i + 1}</span>${poster(c, { xs: true })}
            <span style="min-width:0"><div class="t">${esc(c.title)}</div><div class="s">${pmark(c.platform)}<span>${c.genres.slice(0, 2).join(" · ")}</span></div></span>
            <span class="right">${sparkline(c.trend, 72, 28)}${growthPill(c.growth)}</span>
          </a>`).join("")
          : `<p class="empty-note">조회수 기록이 2주 이상 쌓이면 전주 대비 급상승 작품이 표시돼요.</p>`}
      </div>
      <div class="panel">
        <div class="panel-head"><h3><span class="badge film">${icon("film")}</span>이번 주 숏필름</h3><a class="link-more" href="#/ranking?type=movie">전체${icon("chevR", "sm")}</a></div>
        ${movieTop.length ? movieTop.slice(0, 5).map((r) => `
          <a class="mini-row" href="#/title/${r.c.id}">
            <span class="rk">${r.rank}</span>${poster(r.c, { xs: true })}
            <span style="min-width:0"><div class="t">${esc(r.c.title)}</div><div class="s">${pmark(r.c.platform)}<span>${r.c.epLength}</span></div></span>
            <span class="right"><span class="v">${fmt(periodViews(r.c, "weekly").value)}<small>${periodViews(r.c, "weekly").partial ? "누적" : "주간 조회"}</small></span></span>
          </a>`).join("")
          : `<p class="empty-note">등록된 숏필름이 아직 없어요.</p>`}
      </div>
    </section>

    ${LIVE ? "" : `
    <section class="section">
      <div class="section-head"><div><span class="eyebrow">By Platform</span><h2>플랫폼별 인기작</h2></div></div>
      <div class="chips scroll" id="platformChips" style="margin-bottom:22px">
        ${Object.entries(PLATFORMS).map(([k, p], i) => `<button class="chip ${i === 0 ? "on" : ""}" data-platform="${k}"><span class="dot" style="background:${p.color}"></span>${p.name}</button>`).join("")}
      </div>
      <div class="grid" id="platformGrid"></div>
    </section>`}

    ${finished.length ? `
    <section class="section">
      <div class="section-head">
        <div><span class="eyebrow">Binge-worthy</span><h2>완결작 정주행 추천</h2><p>${LIVE ? "끝까지 보는 사람이 많은 순서" : "평점 높은 순서"} · 한 번에 몰아보기 좋은 작품</p></div>
      </div>
      <div class="grid">${finished.slice(0, 6).map(card).join("")}</div>
    </section>` : ""}

    <section class="section">
      <div class="section-head"><div><span class="eyebrow">New Arrivals</span><h2>새로 올라온 작품</h2></div></div>
      <div class="grid">${fresh.map(card).join("")}</div>
    </section>

    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Genres</span><h2>장르로 찾기</h2></div><a class="link-more" href="#/ranking?type=all">전체 랭킹${icon("chevR", "sm")}</a></div>
      <div class="genre-grid">
        ${GENRES.filter((g) => !LIVE || genreCounts[g]).map((g) => `
          <a class="genre-tile" href="#/ranking?type=all&genre=${encodeURIComponent(g)}" style="--c1:${GENRE_COLORS[g][0]};--c2:${GENRE_COLORS[g][1]}">
            <b>${g}</b><small>${genreCounts[g]}편</small><em>${g}</em>
          </a>`).join("")}
      </div>
    </section>

    ${LIVE ? "" : `<div class="notice">${icon("info")}<span>지금 보이는 작품과 수치는 화면 구성을 보여주기 위한 <b>가상 샘플 데이터</b>예요. YouTube 수집기(<code>collector/collect.mjs</code>)가 돌기 시작하면 실제 조회수 랭킹으로 자동 전환됩니다.</span></div>`}
  `;

  setupHero(heroList);
  setupTopRail(dramaTop.length ? "drama" : "movie");

  if (!LIVE) {
    const renderPlatform = (p) => {
      document.getElementById("platformGrid").innerHTML = ranking({ type: "all", period: "weekly", platform: p }).slice(0, 6).map((r) => card(r.c)).join("");
    };
    renderPlatform("youtube");
    document.getElementById("platformChips").addEventListener("click", (e) => {
      const b = e.target.closest("[data-platform]");
      if (!b) return;
      document.querySelectorAll("#platformChips .chip").forEach((x) => x.classList.toggle("on", x === b));
      renderPlatform(b.dataset.platform);
    });
  }
}

function setupHero(list) {
  const hero = document.getElementById("hero");
  if (!hero || !list.length) return;
  let cur = 0;
  const show = (i) => {
    cur = (i + list.length) % list.length;
    const r = list[cur], c = r.c;
    const pv = periodViews(c, "daily");
    hero.querySelector(".hero-bg").setAttribute("style", colorVars(c));
    hero.querySelector(".hero-copy").innerHTML = `
      <div class="hero-rank"><span class="big">${String(r.rank).padStart(2, "0")}</span>
        <span><span class="eyebrow">${icon("trophy", "sm")}오늘의 ${TYPES[c.type]} ${r.rank}위</span><br>${pmark(c.platform)}</span></div>
      <h1>${esc(c.title)}</h1>
      <p class="hero-syn">${esc(c.synopsis)}</p>
      <div class="hero-tags">${c.genres.map((g) => `<a class="tag" href="#/ranking?type=all&genre=${encodeURIComponent(g)}">#${g}</a>`).join("")}<span class="tag">${c.type === "drama" ? `${c.episodes}부작 · 회당 ${c.epLength}` : c.epLength}</span><span class="tag">${c.status}</span></div>
      <div class="hero-stats">
        <div><small>${pv.partial ? "누적 조회수" : "오늘 늘어난 조회수"}</small><b>${fmt(pv.value)}</b></div>
        ${pv.partial ? "" : `<div><small>누적 조회수</small><b>${fmt(c.views.total)}</b></div>`}
        ${c.completion != null ? `<div><small>완주율</small><b>${pct(c.completion)}</b></div>` : ""}
        ${c.rating != null ? `<div><small>평점</small><b style="color:var(--gold)">${c.rating.toFixed(1)}</b></div>` : ""}
      </div>
      <div class="btn-row">
        <a class="btn btn-primary" href="#/title/${c.id}">${icon("play")}작품 보기</a>
        ${wishBtn(c.id, { withLabel: true })}
      </div>`;
    hero.querySelector(".phone-slot").outerHTML = `
      <div class="phone phone-slot">
        ${poster(c)}
        <div class="phone-ui">
          <div class="phone-bars">${list.map((_, k) => `<i class="${k < cur ? "done" : k === cur ? "cur" : ""}"></i>`).join("")}</div>
          <div class="phone-rail">
            <span>${icon("heart")}${fmt(c.likes)}</span>
            <span>${icon("msg")}${fmt(c.comments)}</span>
            <span>${icon("share")}공유</span>
          </div>
          <div class="phone-cap"><div class="ch"><i></i>${esc(c.channel)}</div><p>${esc(c.synopsis)}</p></div>
        </div>
      </div>`;
    hero.querySelectorAll("[data-hero]").forEach((b) => b.classList.toggle("on", Number(b.dataset.hero) === cur));
  };
  const start = () => { clearInterval(heroTimer); if (list.length > 1) heroTimer = setInterval(() => show(cur + 1), 7000); };
  hero.querySelector(".hero-pager").addEventListener("click", (e) => {
    const b = e.target.closest("[data-hero]");
    if (b) { show(Number(b.dataset.hero)); start(); }
  });
  hero.addEventListener("mouseenter", () => { clearInterval(heroTimer); hero.classList.add("paused"); });
  hero.addEventListener("mouseleave", () => { hero.classList.remove("paused"); show(cur); start(); });
  show(0);
  start();
}

function setupTopRail(initialType) {
  const rail = document.getElementById("topRail");
  if (!rail) return;
  const prev = document.querySelector(".rail-btn.prev"), next = document.querySelector(".rail-btn.next");
  const sync = () => {
    prev.disabled = rail.scrollLeft < 8;
    next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8;
  };
  const fill = (type) => {
    const list = ranking({ type, period: "daily" }).slice(0, 10);
    rail.innerHTML = list.map((r) => `
      <a class="t-item ${r.rank === 10 ? "n10" : ""}" href="#/title/${r.c.id}" aria-label="${r.rank}위 ${esc(r.c.title)}">
        <span class="t-num">${r.rank}</span>${poster(r.c)}
      </a>`).join("") || `<p class="empty-note">등록된 작품이 없어요.</p>`;
    rail.scrollLeft = 0;
    sync();
  };
  document.querySelectorAll("#topSeg button").forEach((b) => b.classList.toggle("on", b.dataset.type === initialType));
  fill(initialType);
  rail.addEventListener("scroll", sync, { passive: true });
  prev.addEventListener("click", () => rail.scrollBy({ left: -rail.clientWidth * 0.8, behavior: "smooth" }));
  next.addEventListener("click", () => rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: "smooth" }));
  document.getElementById("topSeg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-type]");
    if (!b) return;
    document.querySelectorAll("#topSeg button").forEach((x) => x.classList.toggle("on", x === b));
    fill(b.dataset.type);
  });
}

// =========================================================
// 랭킹
// =========================================================
function renderRanking(params) {
  const state = {
    type: params.get("type") || "drama",
    period: params.get("period") || "weekly",
    platform: params.get("platform") || "all",
    genre: params.get("genre") || "all",
  };
  const link = (patch) => "#/ranking?" + new URLSearchParams({ ...state, ...patch }).toString();
  const list = ranking(state);
  const top = list.slice(0, 3), rest = list.slice(3);
  const updated = LIVE ? `${LIVE.latestDate} 업데이트` : "샘플 데이터";

  $app.innerHTML = `
    <div class="page-head">
      <div>
        <span class="eyebrow accent">${icon("chart", "sm")}Shortchart Ranking</span>
        <h1>숏차트 랭킹</h1>
        <p>${PERIODS[state.period]} 동안 <b style="color:var(--text-2)">새로 늘어난 조회수</b>에 좋아요율과 완주율을 더해 매긴 순위예요. 오래된 인기작이 아니라 <b style="color:var(--text-2)">지금 뜨는 작품</b>이 위로 올라와요.</p>
      </div>
      <span class="update-chip"><i></i>${updated}</span>
    </div>

    <div class="toolbar">
      <div class="toolbar-row">
        <div class="seg">${[["drama", "숏드라마"], ["movie", "숏필름"], ["all", "전체"]].map(([k, l]) => `<a class="${state.type === k ? "on" : ""}" href="${link({ type: k })}">${l}</a>`).join("")}</div>
        <div class="seg">${Object.entries(PERIODS).map(([k, l]) => `<a class="${state.period === k ? "on" : ""}" href="${link({ period: k })}">${l}</a>`).join("")}</div>
        ${LIVE ? "" : `<span class="spacer"></span>
        <div class="chips scroll plat-chips">
          <a class="chip ${state.platform === "all" ? "on" : ""}" href="${link({ platform: "all" })}">모든 플랫폼</a>
          ${Object.entries(PLATFORMS).map(([k, p]) => `<a class="chip ${state.platform === k ? "on" : ""}" href="${link({ platform: k })}"><span class="dot" style="background:${p.color}"></span>${p.short}</a>`).join("")}
        </div>`}
      </div>
      <div class="chips scroll">
        <a class="chip ${state.genre === "all" ? "on" : ""}" href="${link({ genre: "all" })}">모든 장르</a>
        ${GENRES.map((g) => `<a class="chip ${state.genre === g ? "on" : ""}" href="${link({ genre: g })}">#${g}</a>`).join("")}
      </div>
    </div>

    ${list.length ? `
    <div class="podium">
      ${top.map((r) => {
        const pv = periodViews(r.c, state.period);
        return `
        <a class="pod" href="#/title/${r.c.id}" style="${colorVars(r.c)}">
          ${poster(r.c)}
          <div class="pod-info">
            <div style="display:flex;align-items:center;gap:10px"><span class="rkbig">${r.rank}</span>${rankChange(r)}</div>
            <div class="t">${esc(r.c.title)}</div>
            <div class="meta">${pmark(r.c.platform)}<span>${r.c.genres.slice(0, 2).join(" · ")}</span></div>
            <div class="stat"><div><b>${fmt(pv.value)}</b><small>${pv.label}</small></div>${sparkline(r.c.trend, 70, 28)}</div>
          </div>
        </a>`;
      }).join("")}
    </div>

    ${rest.length ? `
    <div class="rank-table">
      <div class="rank-head"><span style="text-align:center">순위</span><span></span><span>작품</span><span class="trend" style="text-align:center">14일 추이</span><span class="r">조회수</span><span class="r c-score">숏차트 지수</span></div>
      ${rest.map((r) => {
        const pv = periodViews(r.c, state.period);
        return `
        <a class="rank-row" href="#/title/${r.c.id}">
          <div class="rk"><b>${r.rank}</b>${rankChange(r)}</div>
          ${poster(r.c, { xs: true })}
          <div style="min-width:0">
            <div class="t">${esc(r.c.title)}</div>
            <div class="s">${pmark(r.c.platform)}<span>${r.c.genres.slice(0, 2).join(" · ")}</span><span>${r.c.type === "drama" ? `${r.c.episodes}화 · ${r.c.status}` : r.c.epLength}</span>${quality(r.c)}</div>
          </div>
          <div class="trend">${sparkline(r.c.trend)}</div>
          <div class="views"><b>${fmt(pv.value)}</b><small>${pv.label}</small></div>
          <div class="score"><b>${r.idx}</b><div class="meter"><i style="width:${r.idx}%"></i></div></div>
        </a>`;
      }).join("")}
    </div>` : ""}`
    : `<div class="empty"><div class="ill">${icon("search", "lg")}</div><b>조건에 맞는 작품이 없어요</b>다른 장르나 기간을 골라보세요.<br><a class="btn btn-ghost" href="#/ranking">필터 초기화</a></div>`}
  `;
}

// =========================================================
// 상세
// =========================================================
function renderDetail(id) {
  const c = byId[id];
  if (!c) return renderNotFound();
  const r = ranking({ type: c.type, period: "weekly" }).find((x) => x.c.id === id);
  const mine = myRatings[id] || 0;
  const similar = DATA.filter((x) => x.id !== id && (c.genres.length ? x.genres.some((g) => c.genres.includes(g)) : x.type === c.type)).slice(0, 6);
  const pf = PLATFORMS[c.platform];
  const watch = (url) => (url ? `href="${esc(url)}" target="_blank" rel="noopener"` : `href="#" data-watch`);
  const wv = periodViews(c, "weekly");
  const eps = c.episodeList || [];
  const ep1 = eps.length ? eps[0].views || 1 : 1;

  // 회차 이탈이 가장 큰 구간
  let worst = null;
  for (let i = 1; i < eps.length; i++) {
    const drop = 1 - eps[i].views / (eps[i - 1].views || 1);
    if (!worst || drop > worst.drop) worst = { from: i, to: i + 1, drop };
  }
  const step = Math.ceil(eps.length / 60); // 회차가 많으면 막대 수 제한
  const epBars = eps.filter((_, i) => i % step === 0 || i === eps.length - 1);
  const trend = c.trend || [];
  const tMax = Math.max(...trend, 1);
  const showEps = 12;
  const firstDay = new Date(LATEST); firstDay.setDate(firstDay.getDate() - trend.length + 1);

  const watchCard = `
    <a class="watch-item" ${watch(c.url)}><span class="watch-logo" style="background:${pf.color};${c.platform === "tiktok" ? "color:#111" : ""}">${PLATFORM_LETTER[c.platform]}</span><span><div class="w-name">${pf.name}</div><div class="w-sub">${esc(c.channel)} · ${c.type === "drama" ? "전 회차 무료" : "무료"}</div></span><span class="go">${icon("ext")}</span></a>
    ${c.channelUrl ? `<a class="watch-item" ${watch(c.channelUrl)}><span class="watch-logo" style="background:var(--bg-3)">${icon("layers")}</span><span><div class="w-name">채널 바로가기</div><div class="w-sub">${esc(c.channel)}</div></span><span class="go">${icon("ext")}</span></a>` : ""}`;

  $app.innerHTML = `
    <section class="detail-hero">
      <div class="hero-bg" style="${colorVars(c)}"></div>
      <div class="detail-grid">
        <div class="phone">${poster(c)}</div>
        <div class="detail-info">
          <div class="crumbs">
            <span class="pill gold">${icon("trophy", "sm")}${TYPES[c.type]} 주간 ${r.rank}위</span>
            ${r.delta ? (r.delta > 0 ? `<span class="pill up">${icon("up", "sm")}${r.delta}</span>` : `<span class="pill down">${icon("down", "sm")}${-r.delta}</span>`) : ""}
            ${r.isNew ? `<span class="pill new">NEW</span>` : ""}
          </div>
          <h1>${esc(c.title)}</h1>
          <div class="detail-meta">
            <span>${pmark(c.platform)}</span>
            <span>${esc(c.channel)}</span>
            <span>${c.type === "drama" ? `${c.episodes}부작 · 회당 ${c.epLength}` : `러닝타임 ${c.epLength}`}</span>
            <span>${c.status}</span>
          </div>
          <p class="detail-syn">${esc(c.synopsis)}</p>
          <div class="hero-tags">${c.genres.map((g) => `<a class="tag" href="#/ranking?type=all&genre=${encodeURIComponent(g)}">#${g}</a>`).join("")}</div>
          <div class="btn-row">
            <a class="btn btn-accent" ${watch(c.url)}>${icon("play")}${pf.short}에서 보기</a>
            ${wishBtn(id, { withLabel: true })}
            <button class="btn btn-ghost btn-icon" data-share aria-label="링크 복사">${icon("link")}</button>
          </div>
        </div>
      </div>
    </section>

    <div class="stat-cards">
      <div class="stat-card"><small>누적 조회수</small><b>${fmt(c.views.total)}</b><div class="foot"><span>${c.type === "drama" ? `전체 ${c.episodes}개 회차 합계` : "단편"}</span></div></div>
      <div class="stat-card"><small>이번 주 늘어난 조회수</small><b>${wv.partial ? "집계 중" : fmt(wv.value)}</b><div class="foot">${c.growth != null ? growthPill(c.growth) + "<span>전주 대비</span>" : `<span>${wv.partial ? "기록 7일 이상 필요" : ""}</span>`}</div></div>
      <div class="stat-card"><small>좋아요</small><b>${fmt(c.likes)}</b><div class="foot"><span>댓글 ${fmt(c.comments)} · 좋아요율 ${c.views.total ? ((c.likes / c.views.total) * 100).toFixed(1) : 0}%</span></div></div>
      ${c.completion != null
        ? `<div class="stat-card"><small>완주율</small><b style="color:var(--gold)">${pct(c.completion)}</b><div class="foot"><span>마지막 화 ÷ 1화 조회수</span></div></div>`
        : `<div class="stat-card"><small>숏차트 평점</small><b style="color:var(--gold)">${c.rating != null ? c.rating.toFixed(1) : "–"}</b><div class="foot"><span>${c.ratingCount ? c.ratingCount.toLocaleString() + "명 참여" : "평가 대기 중"}</span></div></div>`}
    </div>

    <section class="section two-col" style="margin-top:20px">
      <div class="chart-card">
        <h3>일간 조회수 추이</h3>
        <p class="desc">최근 ${trend.length || 14}일 동안 하루에 늘어난 조회수</p>
        ${trend.length >= 2 ? `
        <div class="bars">${trend.map((v, i) => {
          const d = new Date(LATEST); d.setDate(d.getDate() - (trend.length - 1 - i));
          return `<i class="b ${i === trend.length - 1 ? "hi" : ""}" style="height:${Math.max(3, (v / tMax) * 100)}%" data-tip="${mmdd(d)} · ${fmt(v)}회"></i>`;
        }).join("")}</div>
        <div class="bars-axis"><span>${mmdd(firstDay)}</span><span>오늘</span></div>`
        : `<p class="empty-note">매일 수집한 기록이 2일 이상 쌓이면 그래프가 그려져요.</p>`}
      </div>
      ${eps.length >= 3 ? `
      <div class="chart-card">
        <h3>회차별 시청 유지</h3>
        <p class="desc">1화를 본 사람 중 몇 %가 각 회차까지 따라왔는지</p>
        <div class="bars retention">${epBars.map((e) => `<i class="b" style="height:${Math.max(3, Math.min(100, (e.views / ep1) * 100))}%" data-tip="${e.n}화 · ${pct(e.views / ep1)}"></i>`).join("")}</div>
        <div class="bars-axis"><span>1화</span><span>${eps.length}화</span></div>
        <div class="chart-legend">
          <div><small>1화 조회수</small><b>${fmt(ep1)}</b></div>
          <div><small>마지막 화</small><b>${fmt(eps.at(-1).views)}</b></div>
          ${worst ? `<div><small>가장 많이 빠진 구간</small><b>${worst.from}→${worst.to}화 <span class="down" style="font-size:14px">-${pct(worst.drop)}</span></b></div>` : ""}
        </div>
      </div>` : `
      <div class="chart-card">
        <h3>어디서 볼 수 있나요?</h3>
        <p class="desc">공식 채널에서 무료로 볼 수 있어요</p>
        <div class="watch-list">${watchCard}</div>
      </div>`}
    </section>

    ${eps.length >= 3 ? `
    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Where to watch</span><h2>어디서 볼 수 있나요?</h2></div></div>
      <div class="watch-list">${watchCard}</div>
    </section>

    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Episodes</span><h2>에피소드 <span class="muted" style="font-size:18px;font-weight:600">${eps.length}</span></h2></div></div>
      <div class="episodes" id="epGrid">
        ${eps.map((e, i) => `
          <a class="ep" ${watch(e.url)} title="${esc(e.title)}" ${i >= showEps ? "hidden" : ""}>
            <b>${e.n}화 ${icon("play", "sm")}</b><small>${e.len} · 조회 ${fmt(e.views)}</small>
            <div class="meter"><i style="width:${Math.min(100, Math.round((e.views / ep1) * 100))}%"></i></div>
          </a>`).join("")}
        ${eps.length > showEps ? `<button class="ep more" id="epMore">+${eps.length - showEps}화 더 보기</button>` : ""}
      </div>
    </section>` : ""}

    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Reviews</span><h2>평가</h2></div></div>
      <div class="rate-wrap">
        <div class="rate-box">
          <div><small class="muted" style="font-weight:600">평균 평점</small>
            <div class="rate-big" style="margin-top:6px">${c.rating != null ? c.rating.toFixed(1) : "–"}<small> / 5</small></div>
            <small class="muted">${c.ratingCount ? c.ratingCount.toLocaleString() + "명 참여" : "아직 평가가 모이지 않았어요"}</small>
          </div>
          <div style="border-top:1px solid var(--line);padding-top:16px">
            <small class="muted" style="font-weight:600">내 별점 · <span id="myRateLabel">${mine ? mine + "점" : "눌러서 평가"}</span></small>
            <div class="stars-input" id="starsInput" style="margin-top:8px">
              ${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" class="${n <= mine ? "on" : ""}" aria-label="${n}점">${icon("star")}</button>`).join("")}
            </div>
          </div>
        </div>
        <div class="reviews">
          ${(LIVE ? [] : SAMPLE_REVIEWS).map((rv) => `
            <div class="review">
              <div class="r-head"><span class="avatar">${rv.user[0]}</span><b>${rv.user}</b>
                <span class="r-stars">${[1, 2, 3, 4, 5].map((n) => `<span class="${n <= rv.stars ? "" : "off"}">${icon("star")}</span>`).join("")}</span></div>
              <p>${rv.text}</p>
            </div>`).join("") || `<p class="empty-note">첫 번째 리뷰를 남겨주세요. 리뷰 기능은 곧 열려요.</p>`}
        </div>
      </div>
    </section>

    ${similar.length ? `
    <section class="section">
      <div class="section-head"><div><span class="eyebrow">More like this</span><h2>비슷한 작품</h2></div></div>
      <div class="grid">${similar.map(card).join("")}</div>
    </section>` : ""}
  `;

  $app.querySelectorAll("[data-watch]").forEach((b) =>
    b.addEventListener("click", (e) => { e.preventDefault(); toast(`샘플 작품이라 실제 링크는 없어요 · 실서비스에선 ${pf.name}로 이동해요`); }));
  $app.querySelector("[data-share]").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); toast("링크를 복사했어요"); } catch { toast("링크 복사에 실패했어요"); }
  });
  document.getElementById("epMore")?.addEventListener("click", (e) => {
    document.querySelectorAll("#epGrid .ep[hidden]").forEach((x) => x.removeAttribute("hidden"));
    e.currentTarget.remove();
  });
  document.getElementById("starsInput").addEventListener("click", (e) => {
    const b = e.target.closest("[data-star]");
    if (!b) return;
    const n = Number(b.dataset.star);
    myRatings[id] = myRatings[id] === n ? 0 : n;
    store.set("sc.ratings", myRatings);
    const v = myRatings[id];
    document.querySelectorAll("#starsInput button").forEach((x) => x.classList.toggle("on", Number(x.dataset.star) <= v));
    document.getElementById("myRateLabel").textContent = v ? v + "점" : "눌러서 평가";
    if (v) toast(`${v}점으로 평가했어요`);
  });
}

// =========================================================
// 검색 / 보관함 / 404
// =========================================================
function renderSearch(params) {
  const q = (params.get("q") || "").trim();
  const ql = q.toLowerCase();
  const results = q ? DATA.filter((c) =>
    c.title.toLowerCase().includes(ql) || (c.channel || "").toLowerCase().includes(ql) ||
    c.genres.some((g) => g.includes(q)) || PLATFORMS[c.platform].name.toLowerCase().includes(ql)) : [];
  const popular = ranking({ type: "all", period: "daily" }).slice(0, 6).map((r) => r.c);
  $app.innerHTML = `
    <div class="search-hero">
      <span class="eyebrow accent">${icon("search", "sm")}Search</span>
      <form id="pageSearch" class="search-big">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4"/></svg>
        <input name="q" value="${esc(q)}" placeholder="작품, 채널, 장르를 검색해보세요" autocomplete="off" aria-label="검색어" />
      </form>
    </div>
    ${!q ? `
      <section class="section" style="margin-top:32px">
        <div class="section-head"><div><span class="eyebrow">Trending keywords</span><h2>많이 찾는 키워드</h2></div></div>
        <div class="chips">${["회귀", "재벌", "복수", "로맨스", "스릴러", "계약 결혼"].map((k) => `<a class="chip" href="#/search?q=${encodeURIComponent(k)}">${k}</a>`).join("")}</div>
      </section>
      <section class="section">
        <div class="section-head"><div><span class="eyebrow">Popular now</span><h2>지금 인기 있는 작품</h2></div></div>
        <div class="grid">${popular.map(card).join("")}</div>
      </section>`
    : results.length
      ? `<section class="section" style="margin-top:32px"><div class="section-head"><div><h2>‘${esc(q)}’ 검색 결과 <span class="muted" style="font-weight:600">${results.length}</span></h2></div></div><div class="grid">${results.map(card).join("")}</div></section>`
      : `<div class="empty"><div class="ill">${icon("search", "lg")}</div><b>‘${esc(q)}’에 대한 결과가 없어요</b>철자를 확인하거나 다른 키워드로 검색해보세요.</div>`}
  `;
  document.getElementById("pageSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    location.hash = "#/search?q=" + encodeURIComponent(e.target.q.value.trim());
  });
  if (!q) $app.querySelector(".search-big input").focus({ preventScroll: true });
}

function renderWish() {
  const list = [...wishes].map((id) => byId[id]).filter(Boolean);
  $app.innerHTML = `
    <div class="page-head"><div><span class="eyebrow accent">${icon("heart", "sm")}My list</span><h1>보고싶어요</h1><p>찜한 작품은 이 브라우저에 저장돼요.</p></div></div>
    ${list.length ? `<div class="grid" style="margin-top:28px">${list.map(card).join("")}</div>`
      : `<div class="empty"><div class="ill">${icon("heart", "lg")}</div><b>아직 찜한 작품이 없어요</b>마음에 드는 작품에서 하트를 눌러 모아보세요.<br><a class="btn btn-primary" href="#/ranking">랭킹 둘러보기</a></div>`}
  `;
}

function renderNotFound() {
  $app.innerHTML = `<div class="empty"><div class="ill">${icon("info", "lg")}</div><b>페이지를 찾을 수 없어요</b>주소가 바뀌었거나 삭제된 작품이에요.<br><a class="btn btn-ghost" href="#/">홈으로</a></div>`;
}

// =========================================================
// 라우터 & 전역 이벤트
// =========================================================
function router() {
  clearInterval(heroTimer);
  const hash = location.hash.slice(1) || "/";
  const [path, query] = hash.split("?");
  const params = new URLSearchParams(query || "");
  const parts = path.split("/").filter(Boolean);
  const section = parts[0] || "home";

  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === section));

  if (section === "home") renderHome();
  else if (section === "ranking") renderRanking(params);
  else if (section === "title") renderDetail(parts[1]);
  else if (section === "search") renderSearch(params);
  else if (section === "wish") renderWish();
  else renderNotFound();

  $app.classList.remove("page-enter");
  void $app.offsetWidth;
  $app.classList.add("page-enter");
  window.scrollTo(0, 0);
}

// 보고싶어요 (모든 페이지 공통)
$app.addEventListener("click", (e) => {
  const b = e.target.closest("[data-wish]");
  if (!b) return;
  e.preventDefault();
  const id = b.dataset.wish;
  wishes.has(id) ? wishes.delete(id) : wishes.add(id);
  store.set("sc.wish", [...wishes]);
  const on = wishes.has(id);
  b.classList.toggle("on", on);
  b.setAttribute("aria-pressed", on);
  toast(on ? "보고싶어요에 담았어요" : "보고싶어요에서 뺐어요");
});

document.getElementById("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.getElementById("searchInput").value.trim();
  if (q) location.hash = "#/search?q=" + encodeURIComponent(q);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)) {
    e.preventDefault();
    const visible = getComputedStyle(document.getElementById("searchForm")).display !== "none";
    visible ? document.getElementById("searchInput").focus() : (location.hash = "#/search");
  }
});

document.getElementById("footerNote").textContent = LIVE
  ? `YouTube Data API로 매일 수집한 공개 조회수 기준 · 마지막 수집 ${LIVE.latestDate} · 기록 ${LIVE.snapshotCount}일치. 작품의 권리는 각 제작사와 채널에 있습니다.`
  : `현재 화면은 가상 샘플 데이터로 구성된 미리보기입니다. 실제 서비스는 각 플랫폼의 공개 조회수를 매일 수집해 순위를 매깁니다.`;

window.addEventListener("hashchange", router);
router();
