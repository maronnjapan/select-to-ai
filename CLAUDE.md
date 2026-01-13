# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser extension ("英文読解サポート" / English Reading Support) that helps users translate and understand English text by sending selected text to AI services (Claude or ChatGPT). It supports both Chrome (Manifest V3) and Firefox (Manifest V2).

## Directory Structure

```
select-to-ai/
├── shared/                      # 共通モジュール（content/popup両方で使用）
│   ├── constants.js             # 定数定義、RS名前空間の初期化
│   └── utils.js                 # ユーティリティ関数
│
├── modules/                     # content.js用モジュール
│   ├── settings.js              # 設定の読み込み・監視
│   ├── text-selection.js        # テキスト選択・コンテキスト取得
│   ├── prompt-generator.js      # プロンプト生成
│   ├── ui-notification.js       # 通知表示
│   ├── ui-floating-button.js    # フローティングボタン
│   ├── ui-floating-textarea.js  # フローティングテキストエリア
│   └── ai-service.js            # AI連携（Claude/ChatGPT）
│
├── popup-modules/               # popup.js用モジュール
│   ├── prompt-card.js           # プロンプトカードUI
│   ├── shortcut-recorder.js     # ショートカット記録
│   └── popup-settings.js        # ポップアップ設定管理
│
├── content.js                   # コンテンツスクリプトのエントリポイント
├── popup.js                     # ポップアップのエントリポイント
├── background.js                # Service Worker（タブ管理）
├── claude-inject.js             # AI自動入力スクリプト
│
├── firefox/                     # Firefox版（Manifest V2、未分割）
└── docs/
    └── architecture.md          # 詳細なアーキテクチャドキュメント
```

## Global Namespaces

- `RS` - コンテンツスクリプト用（shared/ + modules/）
- `RSPopup` - ポップアップ用（popup-modules/）

## Key Components

### Content Scripts (modules/)

| ファイル | 責務 | 主要API |
|----------|------|---------|
| settings.js | 設定読み込み・監視 | `RS.settings`, `RS.loadSettings()` |
| text-selection.js | 周辺コンテキスト取得 | `RS.getContextAroundSelection()` |
| prompt-generator.js | プロンプト生成 | `RS.generatePrompt()` |
| ui-notification.js | 通知表示 | `RS.showNotification()` |
| ui-floating-button.js | フローティングボタン | `RS.FloatingButton.*` |
| ui-floating-textarea.js | テキストエリア | `RS.FloatingTextArea.*` |
| ai-service.js | AI連携 | `RS.openGenAi()`, `RS.openClaude()` |

### Popup Modules (popup-modules/)

| ファイル | 責務 | 主要API |
|----------|------|---------|
| prompt-card.js | プロンプトカードUI | `RSPopup.PromptCard.*` |
| shortcut-recorder.js | ショートカット記録 | `RSPopup.ShortcutRecorder.*` |
| popup-settings.js | 設定管理 | `RSPopup.Settings.*` |

### Data Flow

1. User selects text on any webpage
2. content.js shows floating button or responds to keyboard shortcut
3. Prompt is generated using template variables: `{{selectedText}}`, `{{pageTitle}}`, `{{pageUrl}}`, `{{context}}`
4. Message sent to background.js which stores prompt and opens/focuses AI tab
5. claude-inject.js on AI page reads prompt from storage and auto-fills/submits

### Storage

- `chrome.storage.sync`: User settings (prompts, shortcuts, preferences)
- `chrome.storage.local`: Pending prompts with timestamps (5-minute expiry)

## Development

### Loading the Extension

**Chrome:**
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the root directory

**Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the `/firefox/` directory

### Key Differences Between Chrome and Firefox Versions

- Chrome uses `chrome.*` API, Firefox uses `browser.*` API
- Chrome (MV3) uses service workers; Firefox (MV2) uses persistent background scripts
- Chrome creates popup windows for AI tabs; Firefox creates regular tabs
- Chrome version is modularized; Firefox version is single-file (not yet refactored)

## Documentation

詳細なアーキテクチャドキュメントは `docs/architecture.md` を参照してください。
