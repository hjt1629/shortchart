// 샘플 데이터 (모두 가상의 작품입니다)
// 나중에 실제 서비스에서는 YouTube Data API / 크롤러 / 관리자 등록 데이터로 교체합니다.

const PLATFORMS = {
  youtube:   { name: "YouTube Shorts", short: "YouTube",   color: "#ff3b3b" },
  instagram: { name: "Instagram Reels", short: "Instagram", color: "#e1306c" },
  tiktok:    { name: "TikTok",          short: "TikTok",    color: "#25f4ee" },
  app:       { name: "숏드라마 앱",      short: "전용앱",    color: "#8b7bff" },
};

const GENRES = ["로맨스", "복수", "회귀", "재벌", "학원", "스릴러", "코미디", "판타지", "오피스", "가족", "액션", "호러"];

const TITLES = [
  // type, title, genres, platform, channel, episodes, epMin, status, colors, synopsis
  ["drama", "계약 결혼, 오늘부로 파기합니다", ["로맨스","재벌"], "youtube", "@shortcut_studio", 62, "1~2분", "완결", ["#ff6a88","#3a1c71"], "집안을 살리기 위해 재벌 3세와 1년 계약 결혼을 한 서이. 계약 만료 하루 전, 남편이 조건을 바꾸자고 한다."],
  ["drama", "회귀한 막내 사원은 사장님", ["회귀","오피스","복수"], "app", "릴타임", 80, "1~2분", "연재중", ["#f7971e","#5a189a"], "회사에서 억울하게 잘린 날, 10년 전 신입 시절로 돌아왔다. 이번엔 이 회사를 통째로 산다."],
  ["drama", "우리 반 전학생은 전생의 왕비", ["판타지","학원","로맨스"], "tiktok", "@moment.drama", 45, "1분", "연재중", ["#43cea2","#185a9d"], "전학 온 첫날, 나를 보고 ‘전하’라고 부르는 아이가 나타났다."],
  ["drama", "엘리베이터 7층에서 멈췄다", ["스릴러","호러"], "youtube", "@nightshift_films", 24, "2~3분", "완결", ["#232526","#7f1d1d"], "야근 후 탄 엘리베이터가 매일 밤 같은 층에서 멈춘다. 문이 열리면 어제의 내가 서 있다."],
  ["drama", "이혼 후 전남편 회사에 입사했다", ["복수","오피스","로맨스"], "instagram", "@reel.theater", 38, "1분", "연재중", ["#ee9ca7","#4a1942"], "이혼 서류에 도장 찍은 다음 날, 새 직장 대표실 문을 열자 그가 앉아 있었다."],
  ["drama", "편의점 알바생이 알고 보니 회장 손자", ["재벌","코미디","로맨스"], "youtube", "@shortcut_studio", 55, "1~2분", "연재중", ["#56ab2f","#1e3c72"], "야간 편의점 알바생 도윤. 진상 손님 응대가 일상인데, 오늘 온 손님이 그룹 본부장이다."],
  ["drama", "시어머니가 돌아왔다", ["가족","코미디","복수"], "app", "드라마픽", 70, "1~2분", "완결", ["#ffb347","#8e2de2"], "10년 전 나를 쫓아낸 시어머니가 기억을 잃은 채 우리 집 초인종을 눌렀다."],
  ["drama", "마지막 연애는 30초", ["로맨스"], "instagram", "@30sec.love", 30, "30초", "완결", ["#fbc2eb","#a6c1ee"], "하루 30초씩만 만날 수 있는 두 사람. 30일 뒤에도 사랑할 수 있을까."],
  ["drama", "검은 정장의 보디가드", ["액션","로맨스","재벌"], "tiktok", "@moment.drama", 50, "1~2분", "연재중", ["#141e30","#b91d73"], "상속녀 경호를 맡은 전직 요원. 위협은 밖이 아니라 집 안에 있었다."],
  ["drama", "2학년 3반 단톡방", ["학원","스릴러"], "youtube", "@nightshift_films", 20, "2~3분", "완결", ["#0f2027","#2c5364"], "단톡방에 매일 밤 12시, 다음 날 일어날 일이 올라온다."],
  ["drama", "인턴의 복수는 차갑게", ["복수","오피스"], "app", "릴타임", 90, "1~2분", "연재중", ["#4b6cb7","#182848"], "공채 비리로 떨어진 언니 대신, 동생이 같은 회사 인턴으로 들어간다."],
  ["drama", "용사 은퇴 후 카페 차렸습니다", ["판타지","코미디"], "instagram", "@reel.theater", 26, "1분", "연재중", ["#f6d365","#fda085"], "마왕을 쓰러뜨린 용사, 이제는 라떼아트로 세상을 구한다."],
  ["drama", "열여덟, 다시 고백", ["회귀","학원","로맨스"], "youtube", "@shortcut_studio", 40, "1~2분", "완결", ["#a18cd1","#fbc2eb"], "결혼식 날 회귀한 그녀. 이번엔 첫사랑에게 먼저 고백하기로 했다."],
  ["drama", "아파트 관리비의 비밀", ["스릴러","가족"], "tiktok", "@cliff.hanger", 18, "1~2분", "연재중", ["#2b5876","#4e4376"], "관리비 명세서에 존재하지 않는 1203호 항목이 찍혀 있었다."],

  ["movie", "택시, 새벽 4시", ["스릴러"], "youtube", "@nightshift_films", 1, "14분", "공개", ["#000428","#004e92"], "새벽 4시에 탄 손님은 목적지를 말하지 않는다. 미터기는 거꾸로 올라간다."],
  ["movie", "엄마의 김치찌개", ["가족"], "instagram", "@short.cinema", 1, "8분", "공개", ["#e65c00","#f9d423"], "엄마가 떠난 뒤 처음으로 끓여본 찌개. 레시피 메모의 마지막 줄."],
  ["movie", "고백 리허설", ["로맨스","코미디"], "tiktok", "@moment.drama", 1, "6분", "공개", ["#ff9a9e","#fecfef"], "고백 연습 상대가 되어준 친구가 리허설마다 대사를 바꾼다."],
  ["movie", "마지막 버스", ["판타지","가족"], "youtube", "@one.take.films", 1, "12분", "공개", ["#355c7d","#c06c84"], "막차에서 만난 할머니가 내 이름을 알고 있다."],
  ["movie", "404호 소음", ["호러","스릴러"], "youtube", "@cliff.hanger", 1, "10분", "공개", ["#200122","#6f0000"], "윗집 소음에 항의하러 올라갔더니, 404호는 빈집이었다."],
  ["movie", "첫 출근", ["오피스","코미디"], "instagram", "@short.cinema", 1, "5분", "공개", ["#11998e","#38ef7d"], "모든 게 꼬이는 신입의 첫 출근 하루를 원테이크로."],
  ["movie", "편지는 7년 뒤에", ["로맨스"], "youtube", "@one.take.films", 1, "15분", "공개", ["#ffecd2","#fcb69f"], "타임캡슐에서 나온 편지의 수신인은, 지금 내 옆자리에 앉아 있다."],
  ["movie", "로봇 강아지 뭉치", ["판타지","가족"], "tiktok", "@cliff.hanger", 1, "7분", "공개", ["#89f7fe","#66a6ff"], "고장 난 로봇 강아지를 고치러 떠난 소년의 하루."],
  ["movie", "결승선", ["액션"], "app", "드라마픽", 1, "11분", "공개", ["#cb2d3e","#ef473a"], "은퇴 직전 마라토너와 그의 페이스메이커."],
  ["movie", "새벽 배송", ["스릴러","오피스"], "instagram", "@reel.theater", 1, "9분", "공개", ["#3a6186","#89253e"], "배송 기사가 매일 같은 주소로 보내는 빈 상자. 그 안엔 무엇이 있었을까."],
];

// 결정적인 의사 난수 (매번 같은 샘플 수치가 나오도록)
function seeded(n) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const CONTENTS = TITLES.map((t, i) => {
  const [type, title, genres, platform, channel, episodes, epLength, status, colors, synopsis] = t;
  const r = (k) => seeded(i * 13 + k);
  const weekly = Math.round((0.4 + r(1) * 9.6) * 1_000_000);      // 주간 조회수
  const daily = Math.round(weekly / 7 * (0.6 + r(2) * 0.9));      // 일간 조회수
  const monthly = Math.round(weekly * (3.2 + r(3) * 1.6));        // 월간 조회수
  const total = Math.round(monthly * (1.5 + r(4) * 6));           // 누적
  const likes = Math.round(total * (0.02 + r(5) * 0.04));
  const comments = Math.round(likes * (0.03 + r(6) * 0.05));
  const rating = Math.round((3.2 + r(7) * 1.7) * 10) / 10;        // 5점 만점
  const ratingCount = Math.round(300 + r(8) * 12000);
  const wish = Math.round(800 + r(9) * 40000);
  const growth = Math.round((r(10) * 2 - 0.5) * 100);             // 전주 대비 %
  const daysAgo = Math.round(r(11) * 60);
  return {
    id: `c${i + 1}`,
    type, title, genres, platform, channel, episodes, epLength, status, colors, synopsis,
    views: { daily, weekly, monthly, total },
    likes, comments, rating, ratingCount, wish, growth,
    releasedDaysAgo: daysAgo,
  };
});

// 리뷰 샘플
const SAMPLE_REVIEWS = [
  { user: "정주행러", stars: 5, text: "출퇴근길에 한 편씩 보다가 결국 새벽까지 정주행했어요. 1분짜리인데 끊는 타이밍이 미쳤음." },
  { user: "숏폼중독", stars: 4, text: "전개 빠르고 배우 연기도 좋아요. 중반부 살짝 늘어지는 건 아쉽." },
  { user: "드라마덕후", stars: 5, text: "이게 숏폼이라고? 웬만한 미니시리즈보다 몰입감 좋습니다." },
  { user: "주말시청", stars: 3, text: "소재는 신선한데 결말이 좀 급했어요. 그래도 볼만함." },
];
