#!/usr/bin/env node
/**
 * Claude Code Statusline
 * 跨平台（Windows / macOS / Linux），任何裝了 Claude Code 的電腦都能執行
 * 因為 Claude Code 本身需要 Node.js，所以不需要額外安裝任何東西
 *
 * 重新設定顯示項目：
 *   node ~/.claude/statusline.js --configure
 */

const path = require("path");
const fs   = require("fs");
const os   = require("os");

// ── 設定檔 ────────────────────────────────────────────────
const CONFIG_FILE = path.join(os.homedir(), ".claude", "statusline.config.json");

const COMPONENTS = [
  { key: "model",       label: "模型名稱",          example: "claude-sonnet-4-6" },
  { key: "contextBar",  label: "Context 進度條",   example: "██░░░░ 22%" },
  { key: "contextSize", label: "Context 視窗大小", example: "(200k)" },
  { key: "tokens",      label: "Token 統計",       example: "↑15k ↓5k" },
  { key: "cost",       label: "累計費用",         example: "$0.03" },
  { key: "rateLimit5h",      label: "Rate limit 5h 使用量",  example: "5h:45%" },
  { key: "rateLimitReset5h", label: "Rate limit 5h 重置時間", example: "重置23m" },
  { key: "rateLimit7d",      label: "Rate limit 7d 使用量",  example: "7d:12%" },
  { key: "rateLimitReset7d", label: "Rate limit 7d 重置時間", example: "重置2d3h" },
  { key: "git",        label: "Git 分支",         example: "⎇ main*" },
  { key: "agent",      label: "Agent 名稱",       example: "[code-reviewer]" },
  { key: "worktree",   label: "Worktree 名稱",    example: "wt:feature-x" },
];

function loadConfig() {
  const defaults = Object.fromEntries(COMPONENTS.map(c => [c.key, true]));
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      return Object.assign({}, defaults, parsed.show || {});
    }
  } catch { /* 讀取失敗則使用預設 */ }
  return defaults;
}

// ── --configure 模式 ──────────────────────────────────────
if (process.argv.includes("--configure")) {
  const readline = require("readline");
  const existing = loadConfig();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(r => rl.question(q, r));

  (async () => {
    console.log("\x1b[1m\n◆ Claude Code Statusline — 顯示項目設定\x1b[0m");
    console.log("\x1b[90m  直接按 Enter 保留目前設定，輸入 y/n 變更\n\x1b[0m");

    const show = {};
    for (const comp of COMPONENTS) {
      const cur  = existing[comp.key] !== false;
      const hint = cur ? "Y/n" : "y/N";
      const ans  = (await ask(
        `  ${comp.label.padEnd(18)} \x1b[90m${comp.example.padEnd(22)}\x1b[0m [${hint}] `
      )).trim().toLowerCase();

      show[comp.key] = ans === "" ? cur : ans === "y";
    }
    rl.close();

    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ show }, null, 2), "utf8");
    console.log(`\n\x1b[32m✓ 已儲存 → ${CONFIG_FILE}\x1b[0m`);
    console.log("\x1b[90m  重啟 Claude Code 後生效\x1b[0m\n");
  })();

} else {
  // ── 正常 statusline 模式 ────────────────────────────────
  const show = loadConfig();

  // ── ANSI 顏色 ────────────────────────────────────────────
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

  // ── Git 分支 ──────────────────────────────────────────────
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

  // ── 進度條 ──────────────────────────────────────────────
  function progressBar(ratio, width = 10) {
    const filled = Math.round(ratio * width);
    const color  = ratio > 0.85 ? RED : ratio > 0.6 ? YELLOW : GREEN;
    return color + "█".repeat(filled) + GRAY + "░".repeat(width - filled) + R;
  }

  // ── 數字格式化 ──────────────────────────────────────────
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

  // ── 主邏輯 ──────────────────────────────────────────────
  let raw = "";
  process.stdin.on("data", chunk => raw += chunk);
  process.stdin.on("end", () => {
    let data = {};
    try { data = JSON.parse(raw); } catch { /* 空輸入或無效 JSON */ }

    const parts = [];

    // 1. 品牌標誌（永遠顯示）
    parts.push(PURPLE + B + "◆" + R);

    // 2. 模型名稱
    if (show.model) {
      const modelObj = data.model || {};
      const model = typeof modelObj === "string"
        ? modelObj
        : (modelObj.display_name || modelObj.id || "");
      if (model) parts.push(CYAN + model + R);
    }

    // 3. Context window 進度條
    if (show.contextBar) {
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
        const sizeStr  = (show.contextSize && ctxSize) ? ` ${GRAY}(${fmtTokens(ctxSize)})${R}` : "";
        parts.push(`${bar} ${pctColor}${Math.round(ctxPct)}%${R}${sizeStr}`);
      }
    }

    // 4. Token 統計
    if (show.tokens) {
      const ctx      = data.context_window || {};
      const totalIn  = ctx.total_input_tokens  || 0;
      const totalOut = ctx.total_output_tokens || 0;
      if (totalIn || totalOut) {
        parts.push(
          GRAY + "↑" + R + WHITE + fmtTokens(totalIn)  + R +
          GRAY + " ↓" + R + WHITE + fmtTokens(totalOut) + R
        );
      }
    }

    // 5. 費用
    if (show.cost) {
      const costStr = fmtCost((data.cost || {}).total_cost_usd || 0);
      if (costStr) parts.push(costStr);
    }

    // 6. Rate limit 使用量 + 重置倒數
    function fmtCountdown(resets_at) {
      const secsLeft = Math.max(0, Math.round(resets_at - Date.now() / 1000));
      const d = Math.floor(secsLeft / 86400);
      const h = Math.floor((secsLeft % 86400) / 3600);
      const m = Math.floor((secsLeft % 3600) / 60);
      if (d > 0) return `${d}d${h}h`;
      if (h > 0) return `${h}h${m}m`;
      return `${m}m`;
    }

    const rl = data.rate_limits || {};
    for (const [key, shortLabel, showKey, resetKey] of [
      ["five_hour", "5h", "rateLimit5h", "rateLimitReset5h"],
      ["seven_day", "7d", "rateLimit7d", "rateLimitReset7d"],
    ]) {
      const entry = rl[key] || {};
      const pct   = entry.used_percentage;
      if (pct == null) continue;

      if (show[showKey]) {
        const color = pct >= 85 ? RED : pct >= 60 ? YELLOW : GREEN;
        let item = GRAY + `${shortLabel}:` + R + color + `${Math.round(pct)}%` + R;
        if (show[resetKey] && entry.resets_at) {
          item += GRAY + ` 重置${fmtCountdown(entry.resets_at)}` + R;
        }
        parts.push(item);
      } else if (show[resetKey] && entry.resets_at) {
        parts.push(GRAY + `${shortLabel} 重置${fmtCountdown(entry.resets_at)}` + R);
      }
    }

    // 7. Git 分支
    if (show.git) {
      const git = getGitBranch();
      if (git) {
        const color = git.includes("*") ? YELLOW : GREEN;
        parts.push(GRAY + "⎇ " + R + color + git + R);
      }
    }

    // 8. Agent 名稱
    if (show.agent) {
      const agent = data.agent || {};
      if (agent.name) parts.push(PURPLE + `[${agent.name}]` + R);
    }

    // 9. Worktree
    if (show.worktree) {
      const wt = data.worktree || {};
      if (wt.name) parts.push(CYAN + `wt:${wt.name}` + R);
    }

    process.stdout.write(parts.join("  ") + "\n");
  });
}
