# アーキテクチャドキュメント

このドキュメントは「英文読解サポート」拡張機能のコードリーディング用ガイドです。

## 目次

1. [全体構成](#全体構成)
2. [ディレクトリ構造](#ディレクトリ構造)
3. [グローバル名前空間](#グローバル名前空間)
4. [共通モジュール (shared/)](#共通モジュール-shared)
5. [コンテンツスクリプトモジュール (modules/)](#コンテンツスクリプトモジュール-modules)
6. [ポップアップモジュール (popup-modules/)](#ポップアップモジュール-popup-modules)
7. [データフロー](#データフロー)
8. [ストレージ設計](#ストレージ設計)
9. [イベントフロー](#イベントフロー)

---

## 全体構成

```
┌─────────────────────────────────────────────────────────────────┐
│                        ブラウザ拡張機能                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   popup     │    │ background  │    │   content script    │ │
│  │  (設定UI)   │    │  (タブ管理)  │    │   (テキスト選択)     │ │
│  └──────┬──────┘    └──────┬──────┘    └──────────┬──────────┘ │
│         │                  │                      │             │
│         │    chrome.storage.sync                  │             │
│         └──────────────────┼──────────────────────┘             │
│                            │                                    │
│                            ▼                                    │
│                  ┌─────────────────┐                           │
│                  │ claude-inject   │                           │
│                  │ (AI自動入力)     │                           │
│                  └─────────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### コンポーネント間の通信

| 送信元 | 送信先 | 方法 | 用途 |
|--------|--------|------|------|
| content.js | background.js | `chrome.runtime.sendMessage` | AIタブを開く |
| popup.js | storage | `chrome.storage.sync` | 設定の保存 |
| content.js | storage | `chrome.storage.sync.get` | 設定の読み込み |
| background.js | storage | `chrome.storage.local` | プロンプトの一時保存 |
| claude-inject.js | storage | `chrome.storage.local.get` | プロンプトの取得 |

---

## ディレクトリ構造

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
├── popup.html                   # ポップアップUI
├── background.js                # Service Worker
├── claude-inject.js             # AI自動入力スクリプト
├── styles.css                   # フローティングUIのスタイル
├── manifest.json                # 拡張機能マニフェスト
│
├── firefox/                     # Firefox版（Manifest V2）
│   └── ...                      # Chrome版と同様の構成
│
└── docs/
    └── architecture.md          # このファイル
```

---

## グローバル名前空間

名前空間を使用してグローバル汚染を防止しています。

### RS（コンテンツスクリプト用）

```javascript
window.RS = {
  // 定数 (shared/constants.js)
  DEFAULT_PROMPT: {...},
  SYNC_STORAGE_KEYS: [...],
  DEFAULT_FLOATING_TEXTAREA_SHORTCUT: {...},
  AI_URLS: {...},

  // ユーティリティ (shared/utils.js)
  escapeHtml: function(text) {...},
  matchesShortcut: function(event, shortcut) {...},
  shortcutToString: function(shortcut) {...},
  copyToClipboard: async function(text) {...},

  // 設定 (modules/settings.js)
  settings: {...},
  loadSettings: async function() {...},

  // テキスト選択 (modules/text-selection.js)
  getContextAroundSelection: function() {...},

  // プロンプト (modules/prompt-generator.js)
  generatePrompt: function(selectedText, template) {...},

  // 通知 (modules/ui-notification.js)
  showNotification: function(message) {...},

  // フローティングボタン (modules/ui-floating-button.js)
  FloatingButton: {
    create: function() {...},
    show: function(x, y) {...},
    hide: function() {...},
    contains: function(element) {...},
    getElement: function() {...}
  },

  // フローティングテキストエリア (modules/ui-floating-textarea.js)
  FloatingTextArea: {
    create: function(selectedText, x, y) {...},
    hide: function() {...}
  },

  // AI連携 (modules/ai-service.js)
  openGenAi: function(prompt, launchGenAi) {...},
  openClaude: function(prompt) {...},
  openChatGPT: function(prompt) {...},
  executeGenAiWithSelection: function(promptIndex) {...}
};
```

### RSPopup（ポップアップ用）

```javascript
window.RSPopup = {
  // プロンプトカード (popup-modules/prompt-card.js)
  PromptCard: {
    create: function(prompt, index) {...},
    render: function(prompts, container, onShortcutClick, onDelete) {...},
    collectFromUI: function(container, prompts) {...}
  },

  // ショートカット記録 (popup-modules/shortcut-recorder.js)
  ShortcutRecorder: {
    start: function(index, element) {...},
    stop: function(shortcut) {...},
    handleBlur: function(element, shortcut) {...},
    handleKeydown: function(e, expectedIndex) {...},
    isRecording: function() {...},
    getRecordingIndex: function() {...}
  },

  // 設定管理 (popup-modules/popup-settings.js)
  Settings: {
    load: async function() {...},
    save: async function(data) {...},
    getPrompts: function() {...},
    setPrompts: function(prompts) {...},
    addPrompt: function() {...},
    deletePrompt: function(index) {...},
    getFloatingTextAreaShortcut: function() {...},
    setFloatingTextAreaShortcut: function(shortcut) {...}
  }
};
```

---

## 共通モジュール (shared/)

### shared/constants.js

**役割**: グローバル名前空間の初期化と定数の定義

**定義される定数**:
- `RS.DEFAULT_PROMPT` - デフォルトの和訳プロンプト
- `RS.SYNC_STORAGE_KEYS` - storage.syncで使用するキー一覧
- `RS.DEFAULT_FLOATING_TEXTAREA_SHORTCUT` - テキストエリアのデフォルトショートカット
- `RS.AI_URLS` - Claude/ChatGPTのURL

**依存関係**: なし（最初に読み込まれる）

### shared/utils.js

**役割**: 汎用ユーティリティ関数

**公開API**:
| 関数 | 説明 |
|------|------|
| `RS.escapeHtml(text)` | XSS対策のHTMLエスケープ |
| `RS.matchesShortcut(event, shortcut)` | ショートカット一致判定 |
| `RS.shortcutToString(shortcut)` | ショートカットを表示用文字列に変換 |
| `RS.copyToClipboard(text)` | クリップボードにコピー |

**依存関係**: shared/constants.js

---

## コンテンツスクリプトモジュール (modules/)

### modules/settings.js

**役割**: 設定の読み込み、保存、リアルタイム監視

**公開API**:
| 名前 | 種類 | 説明 |
|------|------|------|
| `RS.settings` | Object | 現在の設定オブジェクト |
| `RS.loadSettings()` | Function | storage.syncから設定を読み込む |

**設定項目**:
```javascript
RS.settings = {
  launchGenAi: 'claude',           // 使用するAI ('claude' | 'chatgpt')
  showPopup: true,                 // フローティングボタンの表示
  prompts: [...],                  // プロンプト配列
  floatingTextAreaEnabled: true,   // テキストエリア機能の有効化
  floatingTextAreaShortcut: {...}  // テキストエリアのショートカット
};
```

**依存関係**: shared/constants.js

### modules/text-selection.js

**役割**: 選択テキストの周辺コンテキストを取得

**公開API**:
| 関数 | 説明 |
|------|------|
| `RS.getContextAroundSelection()` | 選択範囲の前後の段落を含むテキストを返す（最大2000文字） |

**アルゴリズム**:
1. 選択範囲のcommonAncestorContainerを取得
2. 段落レベル（P, DIV, ARTICLE等）まで親を遡る
3. 前後の兄弟要素のテキストも含める
4. 2000文字を超える場合は切り詰め

**依存関係**: なし

### modules/prompt-generator.js

**役割**: テンプレートからプロンプトを生成

**公開API**:
| 関数 | 説明 |
|------|------|
| `RS.generatePrompt(selectedText, template)` | テンプレート変数を置換してプロンプトを生成 |

**テンプレート変数**:
| 変数 | 置換内容 |
|------|----------|
| `{{selectedText}}` | 選択されたテキスト |
| `{{pageTitle}}` | ページタイトル |
| `{{pageUrl}}` | ページURL |
| `{{context}}` | 周辺コンテキスト |

**依存関係**: modules/text-selection.js

### modules/ui-notification.js

**役割**: トースト形式の通知表示

**公開API**:
| 関数 | 説明 |
|------|------|
| `RS.showNotification(message)` | 画面右下に通知を2秒間表示 |

**依存関係**: なし（CSSはstyles.cssで定義）

### modules/ui-floating-button.js

**役割**: テキスト選択時に表示されるフローティングボタン

**公開API**:
| 関数 | 説明 |
|------|------|
| `RS.FloatingButton.create()` | ボタン要素を作成 |
| `RS.FloatingButton.show(x, y)` | 指定位置にボタンを表示 |
| `RS.FloatingButton.hide()` | ボタンを非表示 |
| `RS.FloatingButton.contains(element)` | 要素がボタン内か判定 |
| `RS.FloatingButton.getElement()` | ボタン要素を取得 |

**依存関係**: modules/settings.js

### modules/ui-floating-textarea.js

**役割**: テキスト編集用のフローティングテキストエリア

**公開API**:
| 関数 | 説明 |
|------|------|
| `RS.FloatingTextArea.create(text, x, y)` | テキストエリアを作成・表示 |
| `RS.FloatingTextArea.hide()` | テキストエリアを非表示・削除 |

**機能**:
- Ctrl+Enterで送信
- Escapeで閉じる
- ドラッグ不可（位置固定）

**依存関係**: shared/utils.js, modules/ai-service.js, modules/ui-notification.js, modules/settings.js

### modules/ai-service.js

**役割**: Claude/ChatGPTとの連携

**公開API**:
| 関数 | 説明 |
|------|------|
| `RS.openGenAi(prompt, launchGenAi)` | AIサービスを開く（ルーティング） |
| `RS.openClaude(prompt)` | Claudeを開く |
| `RS.openChatGPT(prompt)` | ChatGPTを開く |
| `RS.executeGenAiWithSelection(promptIndex)` | 選択テキストでAIを実行 |

**処理フロー**:
1. background.jsにメッセージ送信
2. background.jsがプロンプトをstorage.localに保存
3. 既存タブがあれば再利用、なければ新規ウィンドウを開く
4. claude-inject.jsがプロンプトを読み取り自動入力

**依存関係**: modules/settings.js, modules/prompt-generator.js, modules/ui-notification.js, modules/ui-floating-button.js

---

## ポップアップモジュール (popup-modules/)

### popup-modules/prompt-card.js

**役割**: プロンプト設定カードUIの生成・管理

**公開API**:
| 関数 | 説明 |
|------|------|
| `RSPopup.PromptCard.create(prompt, index)` | カード要素を作成 |
| `RSPopup.PromptCard.render(prompts, container, ...)` | カード一覧を描画 |
| `RSPopup.PromptCard.collectFromUI(container, prompts)` | UIから入力値を収集 |

**依存関係**: shared/constants.js, shared/utils.js

### popup-modules/shortcut-recorder.js

**役割**: キーボードショートカットの記録

**公開API**:
| 関数 | 説明 |
|------|------|
| `RSPopup.ShortcutRecorder.start(index, element)` | 記録開始 |
| `RSPopup.ShortcutRecorder.stop(shortcut)` | 記録終了 |
| `RSPopup.ShortcutRecorder.handleKeydown(e, index)` | キー入力処理 |
| `RSPopup.ShortcutRecorder.isRecording()` | 記録中かどうか |

**依存関係**: shared/utils.js

### popup-modules/popup-settings.js

**役割**: ポップアップの設定読み込み・保存

**公開API**:
| 関数 | 説明 |
|------|------|
| `RSPopup.Settings.load()` | 設定を読み込む |
| `RSPopup.Settings.save(data)` | 設定を保存 |
| `RSPopup.Settings.getPrompts()` | プロンプト配列を取得 |
| `RSPopup.Settings.addPrompt()` | プロンプトを追加 |
| `RSPopup.Settings.deletePrompt(index)` | プロンプトを削除 |

**依存関係**: shared/constants.js

---

## データフロー

### テキスト選択からAI送信まで

```
┌──────────────┐
│ ユーザーが    │
│ テキスト選択  │
└──────┬───────┘
       │ mouseup/touchend
       ▼
┌──────────────┐
│ content.js   │
│ handleSelection│
└──────┬───────┘
       │ RS.FloatingButton.show()
       ▼
┌──────────────┐
│ フローティング │  ユーザーがボタンをクリック
│ ボタン表示    │◄────────────────────────┐
└──────┬───────┘                         │
       │ クリック                         │
       ▼                                  │
┌──────────────┐                          │
│ RS.generatePrompt() │                   │
│ テンプレート変数置換│                   │
└──────┬───────┘                          │
       │                                  │
       ▼                                  │
┌──────────────┐                          │
│ RS.openGenAi() │                        │
│ → background.js │                       │
└──────┬───────┘                          │
       │ chrome.runtime.sendMessage       │
       ▼                                  │
┌──────────────┐                          │
│ background.js │                         │
│ storage.local │                         │
│ にプロンプト保存│                        │
└──────┬───────┘                          │
       │ タブを開く/フォーカス             │
       ▼                                  │
┌──────────────┐                          │
│ claude.ai    │                          │
│ または       │                          │
│ chatgpt.com  │                          │
└──────┬───────┘                          │
       │ ページ読み込み                    │
       ▼                                  │
┌──────────────┐                          │
│ claude-inject│                          │
│ storage読み取り│                         │
│ 自動入力・送信 │                         │
└──────────────┘                          │
```

---

## ストレージ設計

### chrome.storage.sync（永続設定）

同期ストレージ。ブラウザ間で同期される。

| キー | 型 | 説明 |
|------|-----|------|
| `showPopup` | boolean | フローティングボタンの表示 |
| `launchGenAi` | string | 使用するAI ('claude' \| 'chatgpt') |
| `prompts` | Array | プロンプト設定の配列 |
| `floatingTextAreaEnabled` | boolean | テキストエリア機能の有効化 |
| `floatingTextAreaShortcut` | Object | テキストエリアのショートカット |

### chrome.storage.local（一時データ）

ローカルストレージ。一時的なデータの受け渡しに使用。

| キー | 型 | 説明 |
|------|-----|------|
| `pendingPrompt` | string | AIに送信するプロンプト |
| `promptTimestamp` | number | プロンプトのタイムスタンプ |
| `launchGenAi` | string | 送信先AI |

**有効期限**: 5分間（claude-inject.jsで判定）

---

## イベントフロー

### マウス操作

```
mouseup (document)
  └─► handleSelectionEnd()
        ├─► settings.showPopup が false → 終了
        ├─► 選択テキストなし → FloatingButton.hide()
        └─► 選択テキストあり → FloatingButton.show(x, y)

click (document) ※イベント委譲
  ├─► .rs-btn-copy クリック
  │     └─► RS.copyToClipboard() → showNotification()
  └─► .rs-btn-genai クリック
        └─► RS.openGenAi() → showNotification()

mousedown (document)
  └─► ボタン外クリック → FloatingButton.hide()

scroll (window)
  └─► FloatingButton.hide()
```

### キーボード操作

```
keydown (document)
  ├─► 入力欄にフォーカス → 無視
  ├─► floatingTextAreaShortcut と一致
  │     └─► FloatingTextArea.create()
  └─► prompts[i].shortcut と一致
        └─► executeGenAiWithSelection(i)
```

### ポップアップ操作

```
DOMContentLoaded
  └─► init()
        ├─► RSPopup.Settings.load()
        ├─► UI初期化
        └─► イベントリスナー登録

change (showPopupCheckbox, floatingTextAreaEnabledCheckbox)
  └─► handleSaveSettings()

click (addPromptBtn)
  └─► RSPopup.Settings.addPrompt() → renderPrompts()

click (saveSettingsBtn)
  └─► RSPopup.PromptCard.collectFromUI()
      └─► RSPopup.Settings.save()
            └─► showSaveNotice()
```

---

## 読み込み順序

### content_scripts（manifest.json）

```
1. shared/constants.js       # RS名前空間の初期化
2. shared/utils.js           # ユーティリティ関数
3. modules/settings.js       # 設定管理
4. modules/text-selection.js # テキスト選択
5. modules/prompt-generator.js # プロンプト生成
6. modules/ui-notification.js  # 通知UI
7. modules/ui-floating-button.js # ボタンUI
8. modules/ui-floating-textarea.js # テキストエリアUI
9. modules/ai-service.js     # AI連携
10. content.js               # イベントハンドラ・初期化
```

### popup.html

```html
1. shared/constants.js
2. shared/utils.js
3. popup-modules/prompt-card.js
4. popup-modules/shortcut-recorder.js
5. popup-modules/popup-settings.js
6. popup.js
```

---

## 拡張のポイント

### 新しいAIサービスを追加する場合

1. `shared/constants.js` の `RS.AI_URLS` に新URLを追加
2. `modules/ai-service.js` に `RS.openNewService()` を追加
3. `RS.openGenAi()` のルーティングを更新
4. `claude-inject.js` をコピーして新サービス用に調整
5. `manifest.json` の `content_scripts` に新スクリプトを追加

### 新しいUI要素を追加する場合

1. `modules/` に新しいUIモジュールを作成
2. `RS.NewUI` オブジェクトとして公開
3. `manifest.json` の `content_scripts.js` に追加
4. `content.js` でイベントハンドラを登録
5. `styles.css` にスタイルを追加

### 新しい設定項目を追加する場合

1. `shared/constants.js` の `RS.SYNC_STORAGE_KEYS` に追加
2. `modules/settings.js` の `RS.settings` にデフォルト値を追加
3. `modules/settings.js` の読み込み・監視処理を更新
4. `popup-modules/popup-settings.js` の保存処理を更新
5. `popup.html` にUI要素を追加
