// デフォルトプロンプト
const DEFAULT_PROMPT = {
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

// 要素取得
const showPopupCheckbox = document.getElementById('showPopup');
const promptList = document.getElementById('promptList');
const launchGenAi = document.getElementById('launchGenAi');
const addPromptBtn = document.getElementById('addPromptBtn');
const saveSettingsBtn = document.getElementById('saveSettings');
const saveNotice = document.getElementById('saveNotice');

// フローティングテキストエリア設定
const floatingTextAreaEnabledCheckbox = document.getElementById('floatingTextAreaEnabled');
const floatingTextAreaShortcutDisplay = document.getElementById('floatingTextAreaShortcut');

let prompts = [];
let recordingShortcutIndex = -1;
let recordingFloatingTextAreaShortcut = false;

// フローティングテキストエリアのデフォルトショートカット
const DEFAULT_FLOATING_TEXTAREA_SHORTCUT = { ctrlKey: true, shiftKey: true, altKey: false, key: 'e' };
let floatingTextAreaShortcut = { ...DEFAULT_FLOATING_TEXTAREA_SHORTCUT };

// ショートカットを文字列に変換
function shortcutToString(shortcut) {
  if (!shortcut || !shortcut.key) return 'クリックして設定';
  const parts = [];
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.key) parts.push(shortcut.key.toUpperCase());
  return parts.join('+');
}

// プロンプトカードを生成
function createPromptCard(prompt, index) {
  const card = document.createElement('div');
  card.className = 'prompt-card' + (index === 0 ? ' active' : '');
  card.dataset.index = index;

  card.innerHTML = `
    <div class="prompt-header">
      <input type="text" class="prompt-name-input" value="${escapeHtml(prompt.name)}" placeholder="プロンプト名">
      ${index === 0 ? '<span class="prompt-badge">デフォルト</span>' : ''}
      ${index > 0 ? '<button class="prompt-delete-btn" title="削除">&times;</button>' : ''}
    </div>
    <div class="prompt-shortcut-row">
      <span class="prompt-shortcut-label">ショートカット</span>
      <div class="shortcut-display" tabindex="0">${shortcutToString(prompt.shortcut)}</div>
    </div>
    <textarea class="prompt-template" placeholder="プロンプトテンプレート">${escapeHtml(prompt.template)}</textarea>
    <div class="prompt-hint">
      変数: <code>{{selectedText}}</code> <code>{{pageTitle}}</code> <code>{{pageUrl}}</code> <code>{{context}}</code>
    </div>
  `;

  // ショートカット入力イベント
  const shortcutDisplay = card.querySelector('.shortcut-display');
  shortcutDisplay.addEventListener('click', () => startRecordingShortcut(index, shortcutDisplay));
  shortcutDisplay.addEventListener('focus', () => startRecordingShortcut(index, shortcutDisplay));
  shortcutDisplay.addEventListener('blur', () => stopRecordingShortcut(shortcutDisplay));
  shortcutDisplay.addEventListener('keydown', (e) => handleShortcutKeydown(e, index, shortcutDisplay));

  // 削除ボタンイベント
  const deleteBtn = card.querySelector('.prompt-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => deletePrompt(index));
  }

  return card;
}

// HTMLエスケープ
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// プロンプト一覧を描画
function renderPrompts() {
  promptList.innerHTML = '';
  prompts.forEach((prompt, index) => {
    promptList.appendChild(createPromptCard(prompt, index));
  });
}

// プロンプトを追加
function addPrompt() {
  const newPrompt = {
    name: `プロンプト ${prompts.length + 1}`,
    shortcut: null,
    template: '{{selectedText}}\n\n上記について教えてください。'
  };
  prompts.push(newPrompt);
  renderPrompts();
}

// プロンプトを削除
function deletePrompt(index) {
  if (index === 0) return; // デフォルトは削除不可
  prompts.splice(index, 1);
  renderPrompts();
}

// ショートカット入力開始
function startRecordingShortcut(index, element) {
  recordingShortcutIndex = index;
  element.classList.add('recording');
  element.textContent = 'キーを入力...';
}

// ショートカット入力終了
function stopRecordingShortcut(element) {
  recordingShortcutIndex = -1;
  element.classList.remove('recording');
  // 現在の値を再表示
  const index = parseInt(element.closest('.prompt-card').dataset.index);
  element.textContent = shortcutToString(prompts[index].shortcut);
}

// ショートカットキー入力処理
function handleShortcutKeydown(e, index, element) {
  if (recordingShortcutIndex !== index) return;

  e.preventDefault();

  // Escapeでキャンセル
  if (e.key === 'Escape') {
    stopRecordingShortcut(element);
    return;
  }

  // 修飾キーのみの場合は無視
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    return;
  }

  // 少なくとも1つの修飾キーが必要
  // if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
  //   return;
  // }

  prompts[index].shortcut = {
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    key: e.key.toLowerCase()
  };

  stopRecordingShortcut(element);
}

// 現在のUIからプロンプトデータを収集
function collectPromptsFromUI() {
  const cards = promptList.querySelectorAll('.prompt-card');
  cards.forEach((card, index) => {
    prompts[index].name = card.querySelector('.prompt-name-input').value;
    prompts[index].template = card.querySelector('.prompt-template').value;
  });
}

// 設定を読み込み
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([
      'showPopup',
      'launchGenAi',
      'prompts',
      'floatingTextAreaEnabled',
      'floatingTextAreaShortcut'
    ]);

    // ポップアップ表示設定
    if (result.showPopup !== undefined) {
      showPopupCheckbox.checked = result.showPopup;
    }

    launchGenAi.value = result.launchGenAi || 'claude'

    // フローティングテキストエリア設定
    if (result.floatingTextAreaEnabled !== undefined) {
      floatingTextAreaEnabledCheckbox.checked = result.floatingTextAreaEnabled;
    }
    if (result.floatingTextAreaShortcut) {
      floatingTextAreaShortcut = result.floatingTextAreaShortcut;
    }
    floatingTextAreaShortcutDisplay.textContent = shortcutToString(floatingTextAreaShortcut);

    // プロンプト設定
    if (result.prompts && result.prompts.length > 0) {
      prompts = result.prompts;
    } else {
      // デフォルトプロンプトを設定
      prompts = [{ ...DEFAULT_PROMPT }];
    }

    renderPrompts();
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
    prompts = [{ ...DEFAULT_PROMPT }];
    renderPrompts();
  }
}

// 設定を保存
async function saveSettings() {
  try {
    collectPromptsFromUI();

    await chrome.storage.sync.set({
      showPopup: showPopupCheckbox.checked,
      launchGenAi: launchGenAi.value,
      prompts: prompts,
      floatingTextAreaEnabled: floatingTextAreaEnabledCheckbox.checked,
      floatingTextAreaShortcut: floatingTextAreaShortcut
    });

    // 通知を表示
    saveNotice.classList.add('show');
    setTimeout(() => {
      saveNotice.classList.remove('show');
    }, 2000);
  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
  }
}

// フローティングテキストエリアのショートカット記録開始
function startRecordingFloatingTextAreaShortcut() {
  recordingFloatingTextAreaShortcut = true;
  floatingTextAreaShortcutDisplay.classList.add('recording');
  floatingTextAreaShortcutDisplay.textContent = 'キーを入力...';
}

// フローティングテキストエリアのショートカット記録終了
function stopRecordingFloatingTextAreaShortcut() {
  recordingFloatingTextAreaShortcut = false;
  floatingTextAreaShortcutDisplay.classList.remove('recording');
  floatingTextAreaShortcutDisplay.textContent = shortcutToString(floatingTextAreaShortcut);
}

// フローティングテキストエリアのショートカットキー入力処理
function handleFloatingTextAreaShortcutKeydown(e) {
  if (!recordingFloatingTextAreaShortcut) return;

  e.preventDefault();

  // Escapeでキャンセル
  if (e.key === 'Escape') {
    stopRecordingFloatingTextAreaShortcut();
    return;
  }

  // 修飾キーのみの場合は無視
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    return;
  }

  floatingTextAreaShortcut = {
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    key: e.key.toLowerCase()
  };

  stopRecordingFloatingTextAreaShortcut();
  saveSettings();
}

// イベントリスナー
document.addEventListener('DOMContentLoaded', loadSettings);
addPromptBtn.addEventListener('click', addPrompt);
saveSettingsBtn.addEventListener('click', saveSettings);
showPopupCheckbox.addEventListener('change', saveSettings);
floatingTextAreaEnabledCheckbox.addEventListener('change', saveSettings);

// フローティングテキストエリアのショートカット記録イベント
floatingTextAreaShortcutDisplay.addEventListener('click', startRecordingFloatingTextAreaShortcut);
floatingTextAreaShortcutDisplay.addEventListener('focus', startRecordingFloatingTextAreaShortcut);
floatingTextAreaShortcutDisplay.addEventListener('blur', stopRecordingFloatingTextAreaShortcut);
floatingTextAreaShortcutDisplay.addEventListener('keydown', handleFloatingTextAreaShortcutKeydown);
