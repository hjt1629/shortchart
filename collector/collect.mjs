#!/usr/bin/env node
// 숏차트 YouTube 조회수 수집기
//
// 하는 일
//   1) collector/series.json 에 등록된 작품(재생목록 또는 영상 목록)의 조회수·좋아요·댓글 수를 YouTube Data API로 가져온다
//   2) 오늘 날짜 스냅샷을 data/snapshots/YYYY-MM-DD.json 으로 저장한다
//   3) 쌓인 스냅샷끼리 비교해 일간/주간/월간 "증가 조회수"를 계산하고 data/live-data.js 를 만든다 (사이트가 이 파일을 읽음)
//
// 사용법
//   node collector/collect.mjs                 # 수집 + 빌드 (하루 한 번, 같은 시각에 실행 권장)
//   node collector/collect.mjs --build-only    # API 호출 없이 기존 스냅샷으로 live-data.js 만 다시 만들기
//   node collector/collect.mjs --date=2026-11-18   # 스냅샷 날짜 지정 (기본: 한국 시간 오늘)
//
// 필요: Node 18 이상, 프로젝트 루트 .env 파일에 YOUTUBE_API_KEY=...

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.SHORTCHART_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERIES_FILE = path.join(ROOT, "collector", "series.json");
const SNAP_DIR = path.join(ROOT, "data", "snapshots");
const OUT_FILE = path.join(ROOT, "data", "live-data.js");
const API = "https://www.googleapis.com/youtube/v3";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

let quotaUsed = 0;

// ---------------------------------------------------------------- helpers

async function loadEnv() {
  try {
    const txt = await fs.readFile(path.join(ROOT, ".env"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* .env 없음 */ }
}

const seoulToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
const dayNum = (d) => Math.round(Date.parse(d + "T00:00:00Z") / 86400000);

function extractPlaylistId(s) {
  if (!s) return null;
  const m = String(s).match(/[?&]list=([\w-]+)/);
  return m ? m[1] : String(s).trim();
}

function extractVideoId(s) {
  s = String(s).trim();
  const m =
    s.match(/youtu\.be\/([\w-]{11})/) ||
    s.match(/\/(?:shorts|live|embed)\/([\w-]{11})/) ||
    s.match(/[?&]v=([\w-]{11})/);
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(s)) return s;
  throw new Error(`영상 ID를 알아볼 수 없어요: ${s}`);
}

function isoDurationToSec(iso = "") {
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

function fmtLen(sec) {
  if (!sec) return "-";
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  if (m === 0) return `${s}초`;
  return s ? `${m}분 ${s}초` : `${m}분`;
}

function colorsFor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return [`hsl(${h} 70% 55%)`, `hsl(${(h + 60) % 360} 60% 22%)`];
}

async function api(endpoint, params) {
  const url = new URL(`${API}/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key: process.env.YOUTUBE_API_KEY })) url.searchParams.set(k, v);
  const res = await fetch(url);
  quotaUsed += 1; // playlistItems.list, videos.list 모두 1 unit
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`YouTube API ${endpoint} 실패 (${res.status}): ${json.error?.message || res.statusText}`);
  return json;
}

async function playlistVideoIds(playlistId) {
  const ids = [];
  let pageToken;
  do {
    const r = await api("playlistItems", {
      part: "contentDetails", playlistId, maxResults: 50, ...(pageToken ? { pageToken } : {}),
    });
    for (const it of r.items || []) ids.push(it.contentDetails.videoId);
    pageToken = r.nextPageToken;
  } while (pageToken);
  return ids;
}

async function videoDetails(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const r = await api("videos", { part: "snippet,statistics,contentDetails", id: ids.slice(i, i + 50).join(",") });
    for (const v of r.items || []) out[v.id] = v;
  }
  return out;
}

// ---------------------------------------------------------------- collect

async function collect(date) {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY 가 없어요. 프로젝트 루트에 .env 파일을 만들고 YOUTUBE_API_KEY=발급받은키 를 적어주세요.");
  }
  let series;
  try {
    series = JSON.parse(await fs.readFile(SERIES_FILE, "utf8"));
  } catch (e) {
    throw new Error(`collector/series.json 을 읽을 수 없어요 (${e.message}). collector/series.example.json 을 참고해 만들어주세요.`);
  }
  if (!Array.isArray(series) || series.length === 0) {
    console.warn("collector/series.json 에 작품이 하나도 없어서 수집을 건너뛰어요.");
    return false;
  }

  const snapshot = { date, collectedAt: new Date().toISOString(), series: {} };

  for (const s of series) {
    try {
      if (!s.id || !s.title) throw new Error("id 와 title 은 필수예요");
      const ids = s.playlist
        ? await playlistVideoIds(extractPlaylistId(s.playlist))
        : (s.videos || []).map(extractVideoId);
      if (!ids.length) throw new Error("playlist 또는 videos 를 적어주세요");

      const details = await videoDetails(ids);
      const eps = ids.filter((id) => details[id]).map((id) => {
        const v = details[id];
        return {
          id,
          title: v.snippet.title,
          publishedAt: v.snippet.publishedAt,
          sec: isoDurationToSec(v.contentDetails.duration),
          views: +v.statistics.viewCount || 0,
          likes: +v.statistics.likeCount || 0,
          comments: +v.statistics.commentCount || 0,
        };
      });
      if (!eps.length) throw new Error("공개된 영상을 찾지 못했어요 (비공개/삭제?)");

      const first = details[eps[0].id];
      const thumbs = first.snippet.thumbnails || {};
      snapshot.series[s.id] = {
        total: eps.reduce((a, e) => a + e.views, 0),
        likes: eps.reduce((a, e) => a + e.likes, 0),
        comments: eps.reduce((a, e) => a + e.comments, 0),
        channel: first.snippet.channelTitle,
        channelId: first.snippet.channelId,
        description: first.snippet.description || "",
        thumb: (thumbs.maxres || thumbs.high || thumbs.medium || thumbs.default || {}).url || null,
        playlistId: s.playlist ? extractPlaylistId(s.playlist) : null,
        episodes: eps,
      };
      console.log(`✓ ${s.title}: ${eps.length}개 영상, 누적 ${snapshot.series[s.id].total.toLocaleString()}회`);
    } catch (e) {
      console.error(`✗ ${s.title || s.id}: ${e.message}`);
    }
  }

  const ok = Object.keys(snapshot.series).length;
  if (ok === 0) throw new Error("모든 작품 수집에 실패했어요. API 키와 series.json 주소를 확인해주세요.");
  await fs.mkdir(SNAP_DIR, { recursive: true });
  await fs.writeFile(path.join(SNAP_DIR, `${date}.json`), JSON.stringify(snapshot));
  console.log(`스냅샷 저장: data/snapshots/${date}.json — 성공 ${ok}/${series.length}편 (API 사용량 약 ${quotaUsed} units)`);
  return true;
}

// ---------------------------------------------------------------- build

async function build() {
  let series = [];
  try { series = JSON.parse(await fs.readFile(SERIES_FILE, "utf8")); } catch { /* 없으면 스냅샷 정보만 사용 */ }
  const config = Object.fromEntries(series.map((s) => [s.id, s]));

  const files = (await fs.readdir(SNAP_DIR).catch(() => [])).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  const snaps = [];
  for (const f of files) snaps.push(JSON.parse(await fs.readFile(path.join(SNAP_DIR, f), "utf8")));
  if (!snaps.length) {
    console.warn("아직 스냅샷이 없어서 live-data.js 를 만들지 않아요 (사이트는 샘플 데이터로 표시).");
    return;
  }

  // 작품별 시계열: [{date, entry}]
  const timeline = {};
  for (const sn of snaps) {
    for (const [id, entry] of Object.entries(sn.series)) (timeline[id] ||= []).push({ day: dayNum(sn.date), date: sn.date, entry });
  }

  const latestDate = snaps.at(-1).date;
  const out = [];

  for (const [id, points] of Object.entries(timeline)) {
    const cfg = config[id];
    if (series.length && !cfg) continue; // series.json 에서 지운 작품은 제외
    const cur = points.at(-1);
    if (dayNum(latestDate) - cur.day > 7) continue; // 일주일 넘게 수집 실패한 작품은 제외
    const at = (daysBack) => [...points].reverse().find((p) => p.day <= cur.day - daysBack);
    const delta = (a, b) => (a && b ? Math.max(0, a.entry.total - b.entry.total) : null);

    const span = { daily: 1, weekly: 7, monthly: 30 };
    const views = { total: cur.entry.total };
    const prevViews = {};
    for (const [k, n] of Object.entries(span)) {
      const base = at(n);
      views[k] = delta(cur, base);
      prevViews[k] = base ? delta(base, at(n * 2)) : null;
    }
    const growth = views.weekly != null && prevViews.weekly ? Math.round((views.weekly / prevViews.weekly - 1) * 100) : null;

    const e = cur.entry;
    const eps = e.episodes;
    const type = cfg?.type || (eps.length > 1 ? "drama" : "movie");
    const firstPub = Date.parse(eps[0].publishedAt);
    const lastPub = Math.max(...eps.map((x) => Date.parse(x.publishedAt)));
    const now = Date.parse(cur.date + "T00:00:00Z");

    // 완주율: 공개 3일 이상 지난 마지막 회차 조회수 ÷ 1화 조회수
    let completion = null;
    if (type === "drama" && eps.length >= 3 && eps[0].views > 0) {
      const settled = eps.filter((x) => now - Date.parse(x.publishedAt) >= 3 * 86400000);
      const last = settled.at(-1);
      if (last && last !== eps[0]) completion = Math.min(1, last.views / eps[0].views);
    }

    const avgSec = eps.reduce((a, x) => a + x.sec, 0) / eps.length;
    const firstLine = (e.description || "").split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("#")) || "";

    out.push({
      id,
      type,
      title: cfg?.title || eps[0].title,
      genres: cfg?.genres || [],
      platform: "youtube",
      channel: e.channel,
      channelUrl: `https://www.youtube.com/channel/${e.channelId}`,
      url: e.playlistId ? `https://www.youtube.com/playlist?list=${e.playlistId}` : `https://www.youtube.com/watch?v=${eps[0].id}`,
      thumb: e.thumb,
      synopsis: cfg?.synopsis || firstLine.slice(0, 140),
      status: type === "movie" ? "공개" : cfg?.status || (now - lastPub <= 14 * 86400000 ? "연재중" : "완결"),
      episodes: eps.length,
      epLength: type === "drama" ? `약 ${fmtLen(avgSec)}` : fmtLen(avgSec),
      views, prevViews, growth, completion,
      likes: e.likes,
      comments: e.comments,
      rating: null, ratingCount: 0, wish: 0,
      releasedDaysAgo: Math.max(0, Math.round((now - firstPub) / 86400000)),
      colors: colorsFor(id),
      episodeList: eps.map((x, i) => ({
        n: i + 1, id: x.id, title: x.title, views: x.views, len: fmtLen(x.sec),
        url: x.sec <= 180 ? `https://www.youtube.com/shorts/${x.id}` : `https://www.youtube.com/watch?v=${x.id}`,
      })),
      lastCollected: cur.date,
    });
  }

  const data = {
    source: "youtube",
    latestDate,
    firstDate: snaps[0].date,
    snapshotCount: snaps.length,
    builtAt: new Date().toISOString(),
    series: out,
  };
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, `// 자동 생성 파일 (collector/collect.mjs) — 직접 수정하지 마세요\nwindow.LIVE_DATA = ${JSON.stringify(data)};\n`);
  console.log(`빌드 완료: data/live-data.js (작품 ${out.length}개, 스냅샷 ${snaps.length}일치 ${snaps[0].date} ~ ${latestDate})`);
}

// ---------------------------------------------------------------- main

try {
  await loadEnv();
  const date = typeof args.date === "string" ? args.date : seoulToday();
  if (!args["build-only"]) await collect(date);
  await build();
} catch (e) {
  console.error("오류: " + e.message);
  process.exit(1);
}
