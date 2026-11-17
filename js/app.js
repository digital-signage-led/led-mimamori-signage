const DESIGN_W = 640;
const DESIGN_H = 384;
const REFRESH_MS = 60000;
const SOURCE = "https://cloud16.biz/member/latestdata_signage";
const NOTE = "時点のデータ（1分毎に自動更新）";

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
let ticking = false;

function fit() {
  const width = window.innerWidth || DESIGN_W;
  const height = window.innerHeight || DESIGN_H;
  const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
  const x = Math.round((width - DESIGN_W * scale) / 2);
  const y = Math.round((height - DESIGN_H * scale) / 2);
  stage.style.transformOrigin = "0 0";
  stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
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
  note.textContent = NOTE;
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
  if (hasData) return;
  header.classList.add("is-error");
  note.textContent = "データを取得できません";
  observedAt.textContent = "--";
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

function decodeText(value) {
  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function parseSignage(html) {
  const clean = String(html).replace(/<!--[\s\S]*?-->/g, "");
  const observedAt = decodeText((clean.match(/font-size:\s*32px;">\s*([^<]+?)\s*</i) || [])[1] || "");
  const siteName = decodeText((clean.match(/現場：\s*([^<]{0,40})/) || [])[1] || "");
  const values = [...clean.matchAll(/<input\b[^>]*\bvalue="([^"]*)"/gi)].map((match) => decodeText(match[1]));
  const terms = [...clean.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map((match) => ({
    id: decodeText((match[1].match(/\bvalue="([^"]*)"/i) || [])[1] || ""),
    name: decodeText(match[2].replace(/<[^>]+>/g, "")),
    selected: /\bselected\b/i.test(match[1])
  }));
  const compass = ((clean.match(/compass_([a-z0-9]+)\.jpe?g/i) || [])[1] || "").toLowerCase();
  if (values.length < 9 || !observedAt) throw new Error("最新データの解析に失敗しました");
  const selected = terms.find((term) => term.selected) || terms[0] || { id: "", name: "" };
  return {
    observedAt,
    siteName: siteName === "：" ? "" : siteName,
    termId: selected.id,
    termName: selected.name,
    avgWind: values[0],
    direction: values[1],
    gustWind: values[2],
    temperature: values[3],
    humidity: values[4],
    wbgt: values[5],
    rain1h: values[6],
    rain24h: values[7],
    rainSince: values[8],
    compass
  };
}

async function loadLive() {
  const page = new URL(SOURCE);
  page.searchParams.set("termId", termId);
  page.searchParams.set("showtype", "1");
  page.searchParams.set("__i", account);
  const response = await fetch(`https://r.jina.ai/${page}`, {
    cache: "no-store",
    headers: {
      Accept: "text/html",
      "X-Return-Format": "html",
      "X-No-Cache": "true"
    }
  });
  if (!response.ok) return null;
  const data = parseSignage(await response.text());
  data.termId = data.termId || termId;
  return data;
}

async function loadSnapshot() {
  const url = new URL("data/latest.json", document.baseURI);
  url.searchParams.set("t", String(Date.now()));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    if (!hasData) {
      try {
        render(await loadSnapshot());
      } catch (error) {
        // 保存データが無くても、続く取得を続ける
      }
    }
    const live = (await loadApi()) || (await loadLive());
    if (live) render(live);
    else if (!hasData) showError();
  } catch (error) {
    showError();
  } finally {
    ticking = false;
  }
}

fit();
window.addEventListener("resize", fit);
tick();
setInterval(tick, REFRESH_MS);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") tick();
});
