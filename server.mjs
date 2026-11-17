import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSignage } from "./js/parse.mjs";

const PORT = Number(process.env.PORT) || 4186;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = "https://cloud16.biz/member/latestdata_signage";
const CACHE_MS = 15000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

const cache = new Map();

function cacheKey(termId, account) {
  return `${termId}\n${account}`;
}

async function loadLatest(termId, account) {
  const key = cacheKey(termId, account);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const url = `${SOURCE}?termId=${encodeURIComponent(termId)}&showtype=1&__i=${encodeURIComponent(account)}`;
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: { "User-Agent": "mimamori-signage/1.0", Accept: "text/html" }
  });
  if (!response.ok) throw new Error(`元ページの取得に失敗しました (${response.status})`);
  const data = parseSignage(await response.text());
  data.termId = data.termId || termId;
  cache.set(key, { at: Date.now(), data });
  return data;
}

function send(res, status, body, type) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function fileFor(urlPath) {
  const pathname = decodeURIComponent(urlPath.split("?")[0]);
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = path.normalize(path.join(ROOT, requested));
  const relative = path.relative(ROOT, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return file;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/api/latest") {
      const termId = url.searchParams.get("termId") || "1";
      const account = url.searchParams.get("i") || "plustest";
      if (!/^\d{1,6}$/.test(termId) || !/^[A-Za-z0-9_-]{1,64}$/.test(account)) {
        send(res, 400, JSON.stringify({ ok: false, error: "パラメータが不正です" }), MIME[".json"]);
        return;
      }
      const data = await loadLatest(termId, account);
      send(res, 200, JSON.stringify({ ok: true, data }), MIME[".json"]);
      return;
    }

    const file = fileFor(url.pathname);
    if (!file) {
      send(res, 403, "Forbidden", "text/plain; charset=utf-8");
      return;
    }
    const stat = fs.existsSync(file) ? fs.statSync(file) : null;
    if (!stat || !stat.isFile()) {
      send(res, 404, "Not Found", "text/plain; charset=utf-8");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    send(res, 200, fs.readFileSync(file), MIME[ext] || "application/octet-stream");
  } catch (error) {
    send(res, 502, JSON.stringify({ ok: false, error: error.message || "取得に失敗しました" }), MIME[".json"]);
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`みまもり伝書鳩 640×384  http://127.0.0.1:${PORT}/`);
  });
}
