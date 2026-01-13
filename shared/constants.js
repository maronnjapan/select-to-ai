/**
 * shared/constants.js
 * 共通定数定義
 *
 * このファイルは最初に読み込まれ、グローバル名前空間RSを初期化する
 */

// グローバル名前空間の初期化
var RS = window.RS || {};

// デフォルトプロンプト設定
RS.DEFAULT_PROMPT = {
  name: '和訳・解説プロンプト',
  shortcut: { ctrlKey: true, shiftKey: false, altKey: false, key: 'q' },
  template: `以下の英文の和訳と、このページ内での文脈を解説してください。

【選択した英文】
{{selectedText}}

【ページタイトル】
{{pageTitle}}

【ページURL】
{{pageUrl}}

【周辺テキスト（文脈）】
{{context}}

---
上記の英文について：
1. 日本語訳を提供してください
2. この文がページ内でどのような役割を果たしているか、文脈を踏まえて解説してください
3. 重要な単語や表現があれば補足説明してください`
};

// chrome.storage.sync で使用するキー
RS.SYNC_STORAGE_KEYS = [
  'showPopup',
  'launchGenAi',
  'prompts',
  'floatingTextAreaEnabled',
  'floatingTextAreaShortcut'
];

// フローティングテキストエリアのデフォルトショートカット
RS.DEFAULT_FLOATING_TEXTAREA_SHORTCUT = {
  ctrlKey: true,
  shiftKey: true,
  altKey: false,
  key: 'e'
};

// AI サービスのURL
RS.AI_URLS = {
  claude: 'https://claude.ai/new',
  chatgpt: 'https://chatgpt.com/new'
};
