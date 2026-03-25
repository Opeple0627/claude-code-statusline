# Claude Code Statusline

[English](./README.md)

將 Claude Code 狀態列變成即時資訊儀表板。

純 Node.js 實作，不需要額外安裝任何套件 — 因為 Claude Code 本身就需要 Node.js。

![示意](https://i.imgur.com/placeholder.png)

## 顯示內容

| 項目 | 說明 |
|------|------|
| `◆` | Anthropic 品牌標誌（紫色）|
| 模型名稱 | 目前使用的 Claude 模型 |
| `██░░░░ 22% (200k)` | Context window 使用量（綠→黃→紅），`(200k)` 可獨立隱藏 |
| `↑15k ↓5k` | 本次對話 input/output token 數 |
| `$0.03` | 累計費用（超過 $1 變黃，$10 變紅）|
| `5h:45% rst23m` | 5 小時 rate limit 使用量與重置倒數（Pro/Max）|
| `7d:12% rst2d3h` | 7 天 rate limit 使用量與重置倒數（Pro/Max）|
| `⎇ main*` | Git 分支（有未提交變更顯示 `*`）|
| `[agent-name]` | 作用中的 Agent 名稱 |
| `wt:name` | Worktree 名稱 |

每個項目皆可透過 `--configure` 獨立開關。

## 需求

- 已安裝 [Claude Code](https://claude.ai/code)
- Node.js（Claude Code 本身的相依套件，通常已存在）

## 安裝

### 一行安裝（推薦）

**macOS / Linux / Git Bash：**
```bash
curl -fsSL https://raw.githubusercontent.com/Opeple0627/claude-code-statusline/main/install.js | node
```

**Windows PowerShell：**
```powershell
irm https://raw.githubusercontent.com/Opeple0627/claude-code-statusline/main/install.js -OutFile "$env:TEMP\cc-install.js"; node "$env:TEMP\cc-install.js"
```

### 手動安裝

```bash
git clone https://github.com/Opeple0627/claude-code-statusline.git
cd claude-code-statusline
node install.js
```

安裝完成後**重啟 Claude Code** 即可看到狀態列。

## 自訂顯示項目

安裝時會自動詢問要顯示哪些項目。之後可隨時重新設定：

```bash
node ~/.claude/statusline.js --configure
```

設定儲存於 `~/.claude/statusline.config.json`，重啟 Claude Code 後生效。

## 移除

從 `~/.claude/settings.json` 刪除 `statusLine` 區塊，再重啟 Claude Code。

## 已知問題

### `/compact` 後 statusline 不立即更新

執行 `/compact` 壓縮對話後，statusline 仍會顯示壓縮前的 token 使用量。

**原因：** statusline 腳本由 Claude Code 主動呼叫並透過 stdin 傳入資料。`/compact` 是客戶端指令，不會觸發 Claude Code 重新呼叫 statusline，因此畫面不會即時刷新。

**解法：** 送出下一條訊息後，statusline 會自動更新為正確數值。

## 授權

MIT
