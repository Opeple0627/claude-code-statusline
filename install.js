#!/usr/bin/env node
/**
 * Claude Code Statusline — Installer
 *
 * One-line install:
 *   curl -fsSL https://raw.githubusercontent.com/USER/REPO/main/install.js | node
 *
 * Or run directly:
 *   node install.js
 */

const fs       = require("fs");
const path     = require("path");
const os       = require("os");
const https    = require("https");
const readline = require("readline");

const REPO_RAW    = "https://raw.githubusercontent.com/Opeple0627/claude-code-statusline/main";
const CLAUDE_DIR  = path.join(os.homedir(), ".claude");
const DEST_FILE   = path.join(CLAUDE_DIR, "statusline.js");
const SETTINGS    = path.join(CLAUDE_DIR, "settings.json");
const CONFIG_FILE = path.join(CLAUDE_DIR, "statusline.config.json");

// ── ANSI helpers ──────────────────────────────────────────
const green  = s => `\x1b[32m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const red    = s => `\x1b[31m${s}\x1b[0m`;
const bold   = s => `\x1b[1m${s}\x1b[0m`;
const gray   = s => `\x1b[90m${s}\x1b[0m`;

// ── Display items (must stay in sync with statusline.js) ──
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

// ── Utility: HTTP fetch with redirect + error handling ────
function fetch(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error("Too many redirects"));
    }
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume(); // drain response to free memory
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// ── Update ~/.claude/settings.json ────────────────────────
function updateSettings(nodePath) {
  let settings = {};
  if (fs.existsSync(SETTINGS)) {
    try { settings = JSON.parse(fs.readFileSync(SETTINGS, "utf8")); }
    catch {
      console.error(red("✗ Cannot parse settings.json — please update manually"));
      return false;
    }
  }

  const nodeCmd = nodePath.replace(/\\/g, "/");
  const destFwd = DEST_FILE.replace(/\\/g, "/");
  const quotedNode = nodeCmd.includes(" ") ? `"${nodeCmd}"` : nodeCmd;
  const quotedDest = destFwd.includes(" ") ? `"${destFwd}"` : destFwd;
  settings.statusLine = {
    type: "command",
    command: `${quotedNode} ${quotedDest}`,
  };

  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2), "utf8");
  return true;
}

// ── Interactive configure ─────────────────────────────────
async function interactiveConfigure() {
  // Skip if not running in an interactive terminal (e.g. curl | node)
  if (!process.stdin.isTTY || !process.stdout.isTTY) return null;

  const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(r => rl.question(q, r));

  console.log(bold("\n─── Customize display items ─────────────────────────"));
  console.log(gray("  Press Enter to keep default (Y), type n to disable\n"));

  const show = {};
  for (const comp of COMPONENTS) {
    const ans = await ask(`  ${comp.label.padEnd(26)} ${gray(comp.example.padEnd(22))}  [Y/n] `);
    show[comp.key] = ans.trim().toLowerCase() !== "n";
  }
  rl.close();
  return show;
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log(bold("\n◆ Claude Code Statusline Installer\n"));

  // 1. Verify ~/.claude exists
  if (!fs.existsSync(CLAUDE_DIR)) {
    console.error(red(`✗ ${CLAUDE_DIR} not found — please install Claude Code first`));
    process.exit(1);
  }

  // 2. Copy or download statusline.js
  const localScript = path.join(__dirname, "statusline.js");
  if (fs.existsSync(localScript)) {
    fs.copyFileSync(localScript, DEST_FILE);
    console.log(green(`✓ Copied statusline.js → ${DEST_FILE}`));
  } else {
    console.log("  Downloading statusline.js ...");
    try {
      const content = await fetch(`${REPO_RAW}/statusline.js`);
      fs.writeFileSync(DEST_FILE, content, "utf8");
      console.log(green(`✓ Downloaded statusline.js → ${DEST_FILE}`));
    } catch (e) {
      console.error(red(`✗ Download failed: ${e.message}`));
      process.exit(1);
    }
  }

  // 3. Detect Node.js path
  const nodePath = process.execPath;
  console.log(green(`✓ Detected Node.js: ${nodePath}`));

  // 4. Update settings.json
  if (updateSettings(nodePath)) {
    console.log(green(`✓ Updated ${SETTINGS}`));
  } else {
    process.exit(1);
  }

  // 5. Interactive configure
  const show = await interactiveConfigure();

  if (show) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ show }, null, 2), "utf8");
    console.log(green(`\n✓ Display settings saved → ${CONFIG_FILE}`));
  } else {
    // Non-interactive: write defaults (all enabled)
    if (!fs.existsSync(CONFIG_FILE)) {
      const defaultShow = Object.fromEntries(COMPONENTS.map(c => [c.key, true]));
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ show: defaultShow }, null, 2), "utf8");
    }
    console.log(gray("  (non-interactive mode, using defaults)"));
    console.log(gray("  To configure later, run:"));
    console.log(yellow(`  node ${DEST_FILE} --configure`));
  }

  // 6. Done
  console.log(bold(green("\n✓ Installation complete! Restart Claude Code to see the status line.\n")));
  console.log(`  Script:   ${yellow(DEST_FILE)}`);
  console.log(`  Settings: ${yellow(SETTINGS)}`);
  console.log(`  Config:   ${yellow(CONFIG_FILE)}\n`);
}

main().catch(e => {
  console.error(red(`✗ Installation failed: ${e.message}`));
  process.exit(1);
});
