import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSignage } from "../js/parse.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const termId = process.env.TERM_ID || "1";
const account = process.env.ACCOUNT || "plustest";
const url = `https://cloud16.biz/member/latestdata_signage?termId=${encodeURIComponent(termId)}&showtype=1&__i=${encodeURIComponent(account)}`;

const response = await fetch(url, {
  cache: "no-store",
  signal: AbortSignal.timeout(20000),
  headers: { Accept: "text/html", "User-Agent": "mimamori-signage/1.0" }
});
if (!response.ok) throw new Error(`元ページの取得に失敗しました (${response.status})`);

const data = parseSignage(await response.text());
data.termId = data.termId || termId;
const file = path.join(root, "data", "latest.json");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(`${data.observedAt} ${data.termName} ${data.temperature}℃`);
