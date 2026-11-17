const DESIGN_W = 640;
const DESIGN_H = 384;
const REFRESH_MS = 60000;

const DIRS = {
  北: 0,
  北北東: 22.5,
  北東: 45,
  東北東: 67.5,
  東: 90,
  東南東: 112.5,
  南東: 135,
  南南東: 157.5,
  南: 180,
  南南西: 202.5,
  南西: 225,
  西南西: 247.5,
  西: 270,
  西北西: 292.5,
  北西: 315,
  北北西: 337.5
};

const CODES = {
  n: 0,
  nne: 22.5,
  ne: 45,
  ene: 67.5,
  e: 90,
  ese: 112.5,
  se: 135,
  sse: 157.5,
  s: 180,
  ssw: 202.5,
  sw: 225,
  wsw: 247.5,
  w: 270,
  wnw: 292.5,
  nw: 315,
  nnw: 337.5
};

const params = new URLSearchParams(location.search);
const termId = params.get("termId") || "1";
const account = params.get("i") || params.get("__i") || "plustest";

const stage = document.getElementById("stage");
const header = document.querySelector("header");
const siteName = document.getElementById("site-name");
const observedAt = document.getElementById("observed-at");
const note = document.getElementById("note");
const termName = document.getElementById("term-name");
const needle = document.getElementById("needle");

const fields = {
  avgWind: document.getElementById("avg-wind"),
  gustWind: document.getElementById("gust-wind"),
  direction: document.getElementById("direction"),
  temperature: document.getElementById("temperature"),
  humidity: document.getElementById("humidity"),
  wbgt: document.getElementById("wbgt"),
  rain1h: document.getElementById("rain1h"),
  rain24h: document.getElementById("rain24h"),
  rainSince: document.getElementById("rain-since")
};

let hasData = false;

function fit() {
  stage.style.left = "";
  stage.style.top = "";
  stage.style.transform = "";
}

function directionDeg(name, compass) {
  if (name && Object.prototype.hasOwnProperty.call(DIRS, name)) return DIRS[name];
  const code = String(compass || "").toLowerCase();
  if (Object.prototype.hasOwnProperty.call(CODES, code)) return CODES[code];
  return null;
}

function text(id, value) {
  fields[id].textContent = value || "--";
}

function render(data) {
  hasData = true;
  header.classList.remove("is-error");
  siteName.textContent = data.siteName || "";
  observedAt.textContent = data.observedAt || "--";
  note.textContent = "時点のデータ（1分毎に自動更新）";
  termName.textContent = data.termName || `端末${termId}`;
  text("avgWind", data.avgWind);
  text("gustWind", data.gustWind);
  text("direction", data.direction);
  text("temperature", data.temperature);
  text("humidity", data.humidity);
  text("wbgt", data.wbgt);
  text("rain1h", data.rain1h);
  text("rain24h", data.rain24h);
  text("rainSince", data.rainSince);

  const deg = directionDeg(data.direction, data.compass);
  if (deg == null) {
    needle.classList.add("is-hidden");
    return;
  }
  needle.classList.remove("is-hidden");
  needle.setAttribute("transform", `rotate(${deg} 60 64)`);
}

function showError() {
  header.classList.add("is-error");
  note.textContent = hasData ? "直前のデータを表示中" : "データを取得できません";
  if (!hasData) observedAt.textContent = "--";
}

async function loadApi() {
  const url = new URL("api/latest", document.baseURI);
  url.searchParams.set("termId", termId);
  url.searchParams.set("i", account);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const body = await response.json();
  if (!body.ok || !body.data) return null;
  return body.data;
}

async function loadSnapshot() {
  const url = new URL("data/latest.json", document.baseURI);
  url.searchParams.set("t", String(Date.now()));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

async function tick() {
  try {
    const live = await loadApi();
    render(live || await loadSnapshot());
  } catch (error) {
    showError();
  }
}

fit();
tick();
setInterval(tick, REFRESH_MS);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") tick();
});
