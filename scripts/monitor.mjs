import { writeFile, appendFile } from "node:fs/promises";
const url = "https://fxt-pi.vercel.app/api/health";
let report;
try {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  report = await response.json();
  if (!Array.isArray(report.checks)) throw Error(`Health endpoint returned HTTP ${response.status}`);
} catch (error) { report = { status: "degraded", checkedAt: new Date().toISOString(), error: error.message, checks: [] }; }
await writeFile("monitor-report.json", JSON.stringify(report, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Fxt source checks\n\nStatus: **${report.status}**\n\n${report.checks.map(check => `- ${check.service}: ${check.status} (${check.latencyMs} ms)`).join("\n")}\n`);
console.log(JSON.stringify(report));
if (report.status !== "operational") process.exitCode = 1;
