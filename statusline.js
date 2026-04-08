#!/usr/bin/env node
/**
 * Claude Code Statusline
 * Cross-platform (Windows / macOS / Linux) — requires only Node.js,
 * which ships with Claude Code, so no extra dependencies needed.
 *
 * Reconfigure display items:
 *   node ~/.claude/statusline.js --configure
 */

const path = require("path");
const fs   = require("fs");
const os   = require("os");

// ── Config file ────────────────────────────────────────────
const CONFIG_FILE = path.join(os.homedir(), ".claude", "statusline.config.json");

const COMPONENTS = [
  { key: "model",            label: "Model name",            example: "claude-sonnet-4-6" },
  { key: "contextBar",       label: "Context bar",           example: "██░░░░ 22%" },
  { key: "contextSize",      label: "Context window size",   example: "(200k)" },
  { key: "tokens",           label: "Token stats",           example: "↑15k ↓5k" },
  { key: "cost",             label: "Cost",                  example: "$0.03" },
  { key: "rateLimit5h",      label: "Rate limit 5h usage",   example: "5h:45%" },
  { key: "rateLimitReset5h", label: "Rate limit 5h reset",   example: "rst23m" },
  { key: "rateLimit7d",      label: "Rate limit 7d usage",   example: "7d:12%" },
  { key: "rateLimitReset7d", label: "Rate limit 7d reset",   example: "rst2d3h" },
  { key: "extraUsageWarn",   label: "Extra usage warning",   example: "5h:EXTRA" },
  { key: "git",              label: "Git branch",            example: "⎇ main*" },
  { key: "agent",            label: "Agent name",            example: "[code-reviewer]" },
  { key: "worktree",         label: "Worktree name",         example: "wt:feature-x" },
  { key: "parseErrorWarn",   label: "JSON parse error warn", example: "⚠ JSON parse error" },
];

function loadConfig() {
  const defaults = Object.fromEntries(COMPONENTS.map(c => [c.key, true]));
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      return Object.assign({}, defaults, parsed.show || {});
    }
  } catch { /* fall through to defaults */ }
  return defaults;
}

// ── --configure mode ───────────────────────────────────────
if (process.argv.includes("--configure")) {
  const readline = require("readline");
  const existing = loadConfig();
  const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(r => rl.question(q, r));

  (async () => {
    console.log("\x1b[1m\n◆ Claude Code Statusline — Display Settings\x1b[0m");
    console.log("\x1b[90m  Press Enter to keep current setting, type y/n to change\n\x1b[0m");

    const show = {};
    for (const comp of COMPONENTS) {
      const cur  = existing[comp.key] !== false;
      const hint = cur ? "Y/n" : "y/N";
      const ans  = (await ask(
        `  ${comp.label.padEnd(26)} \x1b[90m${comp.example.padEnd(22)}\x1b[0m [${hint}] `
      )).trim().toLowerCase();
      show[comp.key] = ans === "" ? cur : ans === "y";
    }
    rl.close();

    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ show }, null, 2), "utf8");
    console.log(`\n\x1b[32m✓ Saved → ${CONFIG_FILE}\x1b[0m`);
    console.log("\x1b[90m  Restart Claude Code to apply\x1b[0m\n");
  })();

} else {
  // ── Normal statusline mode ─────────────────────────────
  const show = loadConfig();

  // ── ANSI colors ────────────────────────────────────────
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

  // ── Git branch ─────────────────────────────────────────
  function getGitBranch() {
    try {
      const { execSync } = require("child_process");
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        stdio: ["pipe", "pipe", "pipe"], timeout: 2000
      }).toString().trim();
      let dirty = false;
      try {
        // Check unstaged changes in tracked files
        execSync("git diff --quiet", { stdio: "pipe", timeout: 2000 });
      } catch { dirty = true; }
      if (!dirty) {
        try {
          // Check staged but uncommitted changes
          execSync("git diff --cached --quiet", { stdio: "pipe", timeout: 2000 });
        } catch { dirty = true; }
      }
      if (!dirty) {
        try {
          // Check untracked files
          const untracked = execSync("git ls-files --others --exclude-standard", {
            stdio: ["pipe", "pipe", "pipe"], timeout: 2000
          }).toString().trim();
          if (untracked.length > 0) dirty = true;
        } catch { /* ignore */ }
      }
      return branch + (dirty ? "*" : "");
    } catch { return null; }
  }

  // ── Progress bar ───────────────────────────────────────
  function progressBar(ratio, width = 10) {
    const filled = Math.round(ratio * width);
    const color  = ratio > 0.85 ? RED : ratio > 0.6 ? YELLOW : GREEN;
    return color + "█".repeat(filled) + GRAY + "░".repeat(width - filled) + R;
  }

  // ── Number formatters ──────────────────────────────────
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

  function fmtCountdown(resets_at) {
    const secsLeft = Math.max(0, Math.round(resets_at - Date.now() / 1000));
    const d = Math.floor(secsLeft / 86400);
    const h = Math.floor((secsLeft % 86400) / 3600);
    const m = Math.floor((secsLeft % 3600) / 60);
    if (d > 0) return `${d}d${h}h`;
    if (h > 0) return `${h}h${m}m`;
    return `${m}m`;
  }

  // ── Main logic ─────────────────────────────────────────
  let raw = "";
  process.stdin.on("data", chunk => raw += chunk);
  process.stdin.on("end", () => {
    let data = {};
    let parseError = false;
    try { data = JSON.parse(raw); } catch { parseError = raw.trim().length > 0; }

    const parts = [];

    // 1. Brand logo (always shown)
    parts.push(PURPLE + B + "◆" + R);

    // Show warning if stdin contained data but JSON parsing failed
    if (parseError && show.parseErrorWarn !== false) {
      parts.push(RED + "⚠ JSON parse error" + R);
    }

    // 2. Model name
    if (show.model) {
      const modelObj = data.model || {};
      const model = typeof modelObj === "string"
        ? modelObj
        : (modelObj.display_name || modelObj.id || "");
      if (model) parts.push(CYAN + model + R);
    }

    // 3. Context window progress bar + context size
    const ctx     = data.context_window || {};
    const ctxSize = ctx.context_window_size || 0;

    if (show.contextBar) {
      let ctxPct = ctx.used_percentage ?? null;

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
    } else if (show.contextSize && ctxSize) {
      // Show context size independently even when contextBar is off
      parts.push(`${GRAY}ctx:${fmtTokens(ctxSize)}${R}`);
    }

    // 4. Token stats
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

    // 5. Cost
    if (show.cost) {
      const costStr = fmtCost((data.cost || {}).total_cost_usd || 0);
      if (costStr) parts.push(costStr);
    }

    // 6. Rate limit usage + reset countdown (Pro/Max only)
    const rl = data.rate_limits || {};
    for (const [key, shortLabel, showKey, resetKey] of [
      ["five_hour", "5h", "rateLimit5h",  "rateLimitReset5h"],
      ["seven_day", "7d", "rateLimit7d",  "rateLimitReset7d"],
    ]) {
      const entry = rl[key] || {};
      const pct   = entry.used_percentage;
      if (pct == null) continue;

      if (show[showKey]) {
        const isExtra = pct >= 100 && show.extraUsageWarn !== false;
        const color = pct >= 100 ? RED : pct >= 85 ? RED : pct >= 60 ? YELLOW : GREEN;
        const label = isExtra
          ? RED + B + `${shortLabel}:EXTRA` + R
          : GRAY + `${shortLabel}:` + R + color + `${Math.round(pct)}%` + R;
        let item = label;
        if (show[resetKey] && entry.resets_at) {
          item += GRAY + ` rst${fmtCountdown(entry.resets_at)}` + R;
        }
        parts.push(item);
      } else if (show[resetKey] && entry.resets_at) {
        parts.push(GRAY + `${shortLabel} rst${fmtCountdown(entry.resets_at)}` + R);
      }
    }

    // 7. Git branch
    if (show.git) {
      const git = getGitBranch();
      if (git) {
        const color = git.includes("*") ? YELLOW : GREEN;
        parts.push(GRAY + "⎇ " + R + color + git + R);
      }
    }

    // 8. Agent name
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
