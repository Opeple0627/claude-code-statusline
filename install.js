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

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const https = require("https");

const REPO_RAW = "https://raw.githubusercontent.com/Opeple0627/claude-code-statusline/main";
const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const DEST_FILE  = path.join(CLAUDE_DIR, "statusline.js");
const SETTINGS   = path.join(CLAUDE_DIR, "settings.json");

// ── 顏色輸出 ──────────────────────────────────────────────
const green  = s => `\x1b[32m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const red    = s => `\x1b[31m${s}\x1b[0m`;
const bold   = s => `\x1b[1m${s}\x1b[0m`;

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
  // 當前執行的 node 就是正確路徑
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

  // 轉換路徑為正斜線（Windows 相容）
  const nodePathFwd = nodePath.replace(/\\/g, "/");
  const destFwd     = DEST_FILE.replace(/\\/g, "/");

  // 如果路徑含空格，加引號
  const nodeCmd = nodePathFwd.includes(" ")
    ? `"${nodePathFwd}"`
    : nodePathFwd;

  settings.statusLine = {
    type: "command",
    command: `${nodeCmd} ${destFwd}`
  };

  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2), "utf8");
  return true;
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
    // 從本地複製（git clone 後執行）
    fs.copyFileSync(localScript, DEST_FILE);
    console.log(green(`✓ 已複製 statusline.js → ${DEST_FILE}`));
  } else {
    // 從網路下載（curl | node 方式）
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

  // 5. 完成
  console.log(bold(green("\n✓ 安裝完成！重啟 Claude Code 即可看到狀態列。\n")));
  console.log(`  腳本位置：${yellow(DEST_FILE)}`);
  console.log(`  設定位置：${yellow(SETTINGS)}\n`);
}

main().catch(e => {
  console.error(red(`✗ 安裝失敗：${e.message}`));
  process.exit(1);
});
