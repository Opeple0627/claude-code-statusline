# Claude Code Statusline

[繁體中文](./README.zh-TW.md)

Turn your Claude Code status bar into a real-time information dashboard.

Pure Node.js — no extra packages needed, since Claude Code already ships with Node.js.

![preview](https://i.imgur.com/placeholder.png)

## Display Items

| Item | Description |
|------|-------------|
| `◆` | Anthropic brand logo (purple) |
| Model name | Current Claude model in use |
| `██░░░░ 22% (200k)` | Context window usage (green→yellow→red); `(200k)` can be hidden independently |
| `↑15k ↓5k` | Session input / output token count |
| `$0.03` | Cumulative cost (yellow ≥ $1, red ≥ $10) |
| `5h:45% rst23m` | 5-hour rate limit usage + reset countdown (Pro/Max) |
| `7d:12% rst2d3h` | 7-day rate limit usage + reset countdown (Pro/Max) |
| `⎇ main*` | Git branch (`*` = uncommitted changes) |
| `[agent-name]` | Active agent name |
| `wt:name` | Worktree name |

Every item can be toggled independently via `--configure`.

## Requirements

- [Claude Code](https://claude.ai/code) installed
- Node.js (already bundled with Claude Code)

## Install

### One-line install (recommended)

**macOS / Linux / Git Bash:**
```bash
curl -fsSL https://raw.githubusercontent.com/Opeple0627/claude-code-statusline/main/install.js | node
```

**Windows PowerShell:**
```powershell
irm https://raw.githubusercontent.com/Opeple0627/claude-code-statusline/main/install.js -OutFile "$env:TEMP\cc-install.js"; node "$env:TEMP\cc-install.js"
```

### Manual install

```bash
git clone https://github.com/Opeple0627/claude-code-statusline.git
cd claude-code-statusline
node install.js
```

Restart Claude Code after installation.

## Customize

The installer asks which items to display. To reconfigure at any time:

```bash
node ~/.claude/statusline.js --configure
```

Settings are saved to `~/.claude/statusline.config.json` and take effect after restarting Claude Code.

## Uninstall

Remove the `statusLine` block from `~/.claude/settings.json` and restart Claude Code.

## Known Issues

### Statusline does not refresh immediately after `/compact`

After running `/compact`, the statusline still shows pre-compaction token usage.

**Reason:** The statusline script is invoked by Claude Code and receives data via stdin. `/compact` is a client-side command that does not trigger a statusline refresh.

**Workaround:** Send your next message — the statusline will update automatically.

## License

MIT
