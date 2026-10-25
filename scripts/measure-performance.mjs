#!/usr/bin/env node

const previewBase = process.env.PREVIEW_URL ?? "http://127.0.0.1:8081";
const apiBase = process.env.API_URL ?? "http://127.0.0.1:3000";
const samples = Number.parseInt(process.env.PERF_SAMPLES ?? "7", 10);
const exportDir = process.env.EXPORT_DIR;

async function measure(url) {
  const started = performance.now();
  const response = await fetch(url, { redirect: "manual" });
  const body = await response.arrayBuffer();
  return { url, status: response.status, bytes: body.byteLength, ms: performance.now() - started };
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1)];
}

async function run() {
  const targets = [
    `${previewBase}/`,
    `${previewBase}/manifest.webmanifest`,
    `${previewBase}/manus-routes.json`,
    `${apiBase}/api/trpc/auth.me`,
    `${apiBase}/api/trpc/catalog.list?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`,
  ];
  const results = [];
  for (const target of targets) {
    const runs = [];
    for (let index = 0; index < samples; index += 1) runs.push(await measure(target));
    results.push({ target, status: runs.at(-1).status, bytes: Math.max(...runs.map((run) => run.bytes)), p50Ms: percentile(runs.map((run) => run.ms), 50), p95Ms: percentile(runs.map((run) => run.ms), 95) });
  }

  console.table(results.map(({ target, status, bytes, p50Ms, p95Ms }) => ({ target, status, bytes, p50Ms: p50Ms.toFixed(1), p95Ms: p95Ms.toFixed(1) })));
  const failures = results.filter((result) => result.status < 200 || result.status >= 400 || result.p95Ms > 1000);
  const manifest = results.find((result) => result.target.endsWith("/manifest.webmanifest"));
  const routeManifest = results.find((result) => result.target.endsWith("/manus-routes.json"));
  if (!manifest || manifest.status !== 200 || manifest.bytes > 200_000) failures.push({ target: "manifest budget", reason: "manifest must be HTTP 200 and <= 200KB" });
  if (!routeManifest || routeManifest.status !== 200 || routeManifest.bytes > 100_000) failures.push({ target: "route manifest budget", reason: "route manifest must be HTTP 200 and <= 100KB" });

  if (exportDir) {
    const { readdir, stat } = await import("node:fs/promises");
    const stack = [exportDir];
    let jsBytes = 0;
    let cssBytes = 0;
    while (stack.length) {
      const current = stack.pop();
      for (const entry of await readdir(current, { withFileTypes: true })) {
        const path = `${current}/${entry.name}`;
        if (entry.isDirectory()) stack.push(path);
        else if (entry.name.endsWith(".js")) jsBytes += (await stat(path)).size;
        else if (entry.name.endsWith(".css")) cssBytes += (await stat(path)).size;
      }
    }
    console.log(`export_js_bytes=${jsBytes} export_css_bytes=${cssBytes}`);
    if (jsBytes > 3_500_000) failures.push({ target: "web bundle budget", reason: `JavaScript export is ${jsBytes} bytes; budget is 3500000` });
    if (cssBytes > 100_000) failures.push({ target: "css bundle budget", reason: `CSS export is ${cssBytes} bytes; budget is 100000` });
  }

  if (failures.length) {
    console.error("Performance budget failures:", failures);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
