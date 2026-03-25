#!/usr/bin/env node
/**
 * Claude Code Statusline
 * 跨平台（Windows / macOS / Linux），任何裝了 Claude Code 的電腦都能執行
 * 因為 Claude Code 本身需要 Node.js，所以不需要額外安裝任何東西
 */

// ── ANSI 顏色 ──────────────────────────────────────────────
const R = "\x1b[0m";
const B = "\x1b[1m";
const fg = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;

const PURPLE = fg(114, 102, 234);
const GREEN  = fg(80, 200, 120);
const YELLOW = fg(255, 200, 60);
const RED    = fg(255, 80, 80);
const CYAN   = fg(80, 200, 220);
const GRAY   = fg(150, 150, 150);
const WHITE  = fg(220, 220, 220);

// ── Git 分支 ───────────────────────────────────────────────
function getGitBranch() {
  try {
    const { execSync } = require("child_process");
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      stdio: ["pipe", "pipe", "pipe"], timeout: 2000
    }).toString().trim();
    let dirty = false;
    try {
      execSync("git diff --quiet", { stdio: "pipe", timeout: 2000 });
    } catch { dirty = true; }
    return branch + (dirty ? "*" : "");
  } catch { return null; }
}

// ── 進度條 ────────────────────────────────────────────────
function progressBar(ratio, width = 10) {
  const filled = Math.round(ratio * width);
  const color  = ratio > 0.85 ? RED : ratio > 0.6 ? YELLOW : GREEN;
  return color + "█".repeat(filled) + GRAY + "░".repeat(width - filled) + R;
}

// ── 數字格式化 ────────────────────────────────────────────
function fmtTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return Math.round(n / 1_000) + "k";
  return String(n);
}

function fmtCost(cost) {
  if (!cost || cost <= 0) return "";
  const color = cost >= 10 ? RED : YELLOW;
  const str   = cost >= 0.01 ? `$${cost.toFixed(2)}` : `$${cost.toFixed(4)}`;
  return color + str + R;
}

// ── 主邏輯 ────────────────────────────────────────────────
let raw = "";
process.stdin.on("data", chunk => raw += chunk);
process.stdin.on("end", () => {
  let data = {};
  try { data = JSON.parse(raw); } catch { /* 空輸入或無效 JSON */ }

  const parts = [];

  // 1. 品牌標誌
  parts.push(PURPLE + B + "◆" + R);

  // 2. 模型名稱
  const modelObj = data.model || {};
  const model = typeof modelObj === "string"
    ? modelObj
    : (modelObj.display_name || modelObj.id || "");
  if (model) parts.push(CYAN + model + R);

  // 3. Context window 進度條
  const ctx     = data.context_window || {};
  const ctxSize = ctx.context_window_size || 0;
  let ctxPct    = ctx.used_percentage ?? null;

  if (ctxPct === null && ctxSize) {
    const cur  = ctx.current_usage || {};
    const used = (cur.input_tokens || 0)
               + (cur.cache_creation_input_tokens || 0)
               + (cur.cache_read_input_tokens || 0);
    ctxPct = (used / ctxSize) * 100;
  }

  if (ctxPct !== null) {
    const ratio    = ctxPct / 100;
    const bar      = progressBar(ratio);
    const pctColor = ratio > 0.85 ? RED : ratio > 0.6 ? YELLOW : GREEN;
    const sizeStr  = ctxSize ? ` ${GRAY}(${fmtTokens(ctxSize)})${R}` : "";
    parts.push(`${bar} ${pctColor}${Math.round(ctxPct)}%${R}${sizeStr}`);
  }

  // 4. Token 統計
  const totalIn  = ctx.total_input_tokens  || 0;
  const totalOut = ctx.total_output_tokens || 0;
  if (totalIn || totalOut) {
    parts.push(
      GRAY + "↑" + R + WHITE + fmtTokens(totalIn)  + R +
      GRAY + " ↓" + R + WHITE + fmtTokens(totalOut) + R
    );
  }

  // 5. 費用
  const costStr = fmtCost((data.cost || {}).total_cost_usd || 0);
  if (costStr) parts.push(costStr);

  // 6. Rate limit 警示（超過 80% 才顯示）
  const rl = data.rate_limits || {};
  for (const [key, label] of [["five_hour", "5h"], ["seven_day", "7d"]]) {
    const pct = (rl[key] || {}).used_percentage || 0;
    if (pct >= 80) {
      const color = pct >= 95 ? RED : YELLOW;
      parts.push(color + `RL-${label}:${Math.round(pct)}%` + R);
    }
  }

  // 7. Git 分支
  const git = getGitBranch();
  if (git) {
    const color = git.includes("*") ? YELLOW : GREEN;
    parts.push(GRAY + "⎇ " + R + color + git + R);
  }

  // 8. Agent 名稱
  const agent = data.agent || {};
  if (agent.name) parts.push(PURPLE + `[${agent.name}]` + R);

  // 9. Worktree
  const wt = data.worktree || {};
  if (wt.name) parts.push(CYAN + `wt:${wt.name}` + R);

  process.stdout.write(parts.join("  ") + "\n");
});
