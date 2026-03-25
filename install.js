#!/usr/bin/env node
/**
 * Claude Code Statusline - 安裝腳本
 *
 * 使用方式（一行安裝）：
 *   curl -fsSL https://raw.githubusercontent.com/USER/REPO/main/install.js | node
 *
 * 或直接執行：
 *   node install.js
 */

const fs      = require("fs");
const path    = require("path");
const os      = require("os");
const https   = require("https");
const readline = require("readline");

const REPO_RAW   = "https://raw.githubusercontent.com/Opeple0627/claude-code-statusline/main";
const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const DEST_FILE  = path.join(CLAUDE_DIR, "statusline.js");
const SETTINGS   = path.join(CLAUDE_DIR, "settings.json");
const CONFIG_FILE = path.join(CLAUDE_DIR, "statusline.config.json");

// ── 顏色輸出 ──────────────────────────────────────────────
const green  = s => `\x1b[32m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const red    = s => `\x1b[31m${s}\x1b[0m`;
const bold   = s => `\x1b[1m${s}\x1b[0m`;
const gray   = s => `\x1b[90m${s}\x1b[0m`;

// ── 工具函式 ──────────────────────────────────────────────
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function findNodePath() {
  return process.execPath;
}

// ── settings.json 更新 ────────────────────────────────────
function updateSettings(nodePath) {
  let settings = {};

  if (fs.existsSync(SETTINGS)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS, "utf8"));
    } catch {
      console.error(red("✗ 無法解析 settings.json，請手動更新"));
      return false;
    }
  }

  const nodePathFwd = nodePath.replace(/\\/g, "/");
  const destFwd     = DEST_FILE.replace(/\\/g, "/");
  const nodeCmd     = nodePathFwd.includes(" ") ? `"${nodePathFwd}"` : nodePathFwd;

  settings.statusLine = {
    type: "command",
    command: `${nodeCmd} ${destFwd}`
  };

  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2), "utf8");
  return true;
}

// ── 互動式設定 ────────────────────────────────────────────
const COMPONENTS = [
  { key: "model",       label: "模型名稱",          example: "claude-sonnet-4-6" },
  { key: "contextBar",  label: "Context 進度條",   example: "██░░░░ 22%" },
  { key: "contextSize", label: "Context 視窗大小", example: "(200k)" },
  { key: "tokens",      label: "Token 統計",       example: "↑15k ↓5k" },
  { key: "cost",       label: "累計費用",              example: "$0.03" },
  { key: "rateLimit",  label: "Rate limit 警示",       example: "RL-5h:85%" },
  { key: "git",        label: "Git 分支",              example: "⎇ main*" },
  { key: "agent",      label: "Agent 名稱",            example: "[code-reviewer]" },
  { key: "worktree",   label: "Worktree 名稱",         example: "wt:feature-x" },
];

async function interactiveConfigure() {
  // 若非 TTY（例如 curl | node），無法互動，略過並使用預設值
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return null;
  }

  console.log(bold("\n─── 自訂顯示項目 ───────────────────────────────"));
  console.log(gray("  直接按 Enter 保留預設（Y），輸入 n 關閉\n"));

  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
  });

  const ask = q => new Promise(resolve => rl.question(q, resolve));

  const show = {};

  for (const comp of COMPONENTS) {
    const ans = await ask(`  ${comp.label.padEnd(18)} ${gray(comp.example.padEnd(20))}  [Y/n] `);
    show[comp.key] = ans.trim().toLowerCase() !== "n";
  }

  rl.close();
  return show;
}

// ── 主流程 ────────────────────────────────────────────────
async function main() {
  console.log(bold("\n◆ Claude Code Statusline 安裝程式\n"));

  // 1. 確認 ~/.claude 存在
  if (!fs.existsSync(CLAUDE_DIR)) {
    console.error(red(`✗ 找不到 ${CLAUDE_DIR}，請先安裝 Claude Code`));
    process.exit(1);
  }

  // 2. 下載或複製 statusline.js
  const localScript = path.join(__dirname, "statusline.js");

  if (fs.existsSync(localScript)) {
    fs.copyFileSync(localScript, DEST_FILE);
    console.log(green(`✓ 已複製 statusline.js → ${DEST_FILE}`));
  } else {
    console.log(`  下載 statusline.js ...`);
    try {
      const content = await fetch(`${REPO_RAW}/statusline.js`);
      fs.writeFileSync(DEST_FILE, content, "utf8");
      console.log(green(`✓ 已下載 statusline.js → ${DEST_FILE}`));
    } catch (e) {
      console.error(red(`✗ 下載失敗：${e.message}`));
      process.exit(1);
    }
  }

  // 3. 偵測 Node.js 路徑
  const nodePath = findNodePath();
  console.log(green(`✓ 偵測到 Node.js：${nodePath}`));

  // 4. 更新 settings.json
  if (updateSettings(nodePath)) {
    console.log(green(`✓ 已更新 ${SETTINGS}`));
  } else {
    process.exit(1);
  }

  // 5. 互動式設定顯示項目
  const show = await interactiveConfigure();

  if (show) {
    // 使用者完成互動設定
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ show }, null, 2), "utf8");
    console.log(green(`\n✓ 已儲存顯示設定 → ${CONFIG_FILE}`));
  } else {
    // 非 TTY（curl | node）或無輸入，使用預設（全部顯示）
    if (!fs.existsSync(CONFIG_FILE)) {
      const defaultShow = Object.fromEntries(COMPONENTS.map(c => [c.key, true]));
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ show: defaultShow }, null, 2), "utf8");
    }
    console.log(gray(`  （非互動模式，使用預設設定）`));
    console.log(gray(`  之後可執行以下指令重新設定：`));
    console.log(yellow(`  node ${DEST_FILE} --configure`));
  }

  // 6. 完成
  console.log(bold(green("\n✓ 安裝完成！重啟 Claude Code 即可看到狀態列。\n")));
  console.log(`  腳本位置：${yellow(DEST_FILE)}`);
  console.log(`  設定位置：${yellow(SETTINGS)}`);
  console.log(`  顯示設定：${yellow(CONFIG_FILE)}\n`);
}

main().catch(e => {
  console.error(red(`✗ 安裝失敗：${e.message}`));
  process.exit(1);
});
