function decode(value) {
  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSignage(html) {
  const clean = String(html).replace(/<!--[\s\S]*?-->/g, "");
  const observedAt = decode((clean.match(/font-size:\s*32px;">\s*([^<]+?)\s*</i) || [])[1] || "");
  const siteName = decode((clean.match(/現場：\s*([^<]{0,40})/) || [])[1] || "");
  const values = [...clean.matchAll(/<input\b[^>]*\bvalue="([^"]*)"/gi)].map((match) => decode(match[1]));
  const terms = [...clean.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map((match) => ({
    id: decode((match[1].match(/\bvalue="([^"]*)"/i) || [])[1] || ""),
    name: decode(match[2].replace(/<[^>]+>/g, "")),
    selected: /\bselected\b/i.test(match[1])
  }));
  const compass = ((clean.match(/compass_([a-z0-9]+)\.jpe?g/i) || [])[1] || "").toLowerCase();
  if (values.length < 9 || !observedAt) {
    throw new Error("最新データの解析に失敗しました");
  }
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
