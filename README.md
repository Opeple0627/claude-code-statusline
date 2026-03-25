# Claude Code Statusline

將 Claude Code 狀態列變成即時資訊儀表板。

純 Node.js 實作，不需要額外安裝任何套件 — 因為 Claude Code 本身就需要 Node.js。

![示意](https://i.imgur.com/placeholder.png)

## 顯示內容

| 項目 | 說明 |
|------|------|
| `◆` | Anthropic 品牌標誌（紫色）|
| 模型名稱 | 目前使用的 Claude 模型 |
| `██░░░░ 22%` | Context window 使用量（綠→黃→紅）|
| `↑15k ↓5k` | 本次對話 input/output token 數 |
| `$0.03` | 累計費用（超過 $1 變黃，$10 變紅）|
| `RL-5h:85%` | Rate limit 警示（超過 80% 才顯示）|
| `⎇ main*` | Git 分支（有未提交變更顯示 `*`）|
| `[agent-name]` | 作用中的 Agent 名稱 |
| `wt:name` | Worktree 名稱 |

## 需求

- [Claude Code](https://claude.ai/code) 已安裝
- Node.js（Claude Code 本身的相依套件，通常已存在）

## 安裝

### 一行安裝（推薦）

**macOS / Linux / Git Bash：**
```bash
curl -fsSL https://raw.githubusercontent.com/Opeple0627/claude-code-statusline/main/install.js | node
```

**Windows PowerShell：**
```powershell
node -e "$(irm https://raw.githubusercontent.com/Opeple0627/claude-code-statusline/main/install.js)"
```

### 手動安裝

```bash
git clone https://github.com/Opeple0627/claude-code-statusline.git
cd REPO
node install.js
```

安裝完成後**重啟 Claude Code** 即可看到狀態列。

## 已知問題

### `/compact` 後 statusline 不立即更新

執行 `/compact` 壓縮對話後，statusline 仍會顯示壓縮前的 token 使用量。

**原因：** statusline 腳本由 Claude Code 主動呼叫並透過 stdin 傳入資料。`/compact` 是客戶端指令，不會觸發 Claude Code 重新呼叫 statusline，因此畫面不會即時刷新。

**解法：** 送出下一條訊息後，statusline 會自動更新為正確數值。

## 移除

從 `~/.claude/settings.json` 刪除 `statusLine` 區塊，再重啟 Claude Code。

## 授權

MIT
