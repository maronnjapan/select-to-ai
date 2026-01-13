(() => {
  'use strict';

  let floatingButton = null;
  let floatingTextArea = null;

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

  // 現在の設定
  let settings = {
    launchGenAi: 'claude',
    showPopup: true,
    prompts: [DEFAULT_PROMPT],
    floatingTextAreaEnabled: true,
    floatingTextAreaShortcut: { ctrlKey: true, shiftKey: true, altKey: false, key: 'e' }
  };

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
      if (result.showPopup !== undefined) settings.showPopup = result.showPopup;
      if (result.launchGenAi !== undefined) settings.launchGenAi = result.launchGenAi;
      if (result.prompts && result.prompts.length > 0) {
        settings.prompts = result.prompts;
      }
      if (result.floatingTextAreaEnabled !== undefined) {
        settings.floatingTextAreaEnabled = result.floatingTextAreaEnabled;
      }
      if (result.floatingTextAreaShortcut) {
        settings.floatingTextAreaShortcut = result.floatingTextAreaShortcut;
      }
    } catch (error) {
      console.error('Reading Support: 設定の読み込みに失敗しました', error);
    }
  }

  // 設定変更を監視
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      if (changes.showPopup) settings.showPopup = changes.showPopup.newValue;
      if (changes.launchGenAi) settings.launchGenAi = changes.launchGenAi.newValue;
      if (changes.prompts) settings.prompts = changes.prompts.newValue;
      if (changes.floatingTextAreaEnabled) settings.floatingTextAreaEnabled = changes.floatingTextAreaEnabled.newValue;
      if (changes.floatingTextAreaShortcut) settings.floatingTextAreaShortcut = changes.floatingTextAreaShortcut.newValue;
    }
  });

  // フローティングボタンを作成
  function createFloatingButton() {
    let genAiText = 'Claude';
    if (settings.launchGenAi === 'chatgpt') {
      genAiText = 'ChatGPT';
    }
    const container = document.createElement('div');
    container.id = 'reading-support-floating-btn';
    container.innerHTML = `
      <button class="rs-btn rs-btn-copy" title="プロンプトをコピー">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        コピー
      </button>
      <button class="rs-btn rs-btn-genai" title="${genAiText}で開く">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        ${genAiText}
      </button>
    `;
    document.body.appendChild(container);
    return container;
  }

  // 選択テキストの周辺コンテキストを取得
  function getContextAroundSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return '';

    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;

    // テキストノードの場合は親要素を取得
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }

    // 段落レベルまで遡る
    let contextElement = container;
    const blockElements = ['P', 'DIV', 'ARTICLE', 'SECTION', 'LI', 'TD', 'BLOCKQUOTE'];
    while (contextElement && !blockElements.includes(contextElement.tagName)) {
      contextElement = contextElement.parentElement;
    }

    if (!contextElement) {
      contextElement = container;
    }

    // 前後の兄弟要素も含める
    let contextText = '';
    const prevSibling = contextElement.previousElementSibling;
    const nextSibling = contextElement.nextElementSibling;

    if (prevSibling && prevSibling.textContent) {
      contextText += prevSibling.textContent.trim() + '\n\n';
    }
    contextText += contextElement.textContent.trim();
    if (nextSibling && nextSibling.textContent) {
      contextText += '\n\n' + nextSibling.textContent.trim();
    }

    // 長すぎる場合は切り詰める
    if (contextText.length > 2000) {
      contextText = contextText.substring(0, 2000) + '...';
    }

    return contextText;
  }

  // プロンプトを生成（テンプレートを指定）
  function generatePrompt(selectedText, template) {
    const pageTitle = document.title;
    const pageUrl = window.location.href;
    const context = getContextAroundSelection();

    // テンプレートの変数を置換
    return template
      .replace(/\{\{selectedText\}\}/g, selectedText)
      .replace(/\{\{pageTitle\}\}/g, pageTitle)
      .replace(/\{\{pageUrl\}\}/g, pageUrl)
      .replace(/\{\{context\}\}/g, context);
  }

  // クリップボードにコピー
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('プロンプトをコピーしました');
    } catch (err) {
      // フォールバック
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showNotification('プロンプトをコピーしました');
    }
  }

  // 通知を表示
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'rs-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('rs-notification-hide');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 2000);
  }

  function openGenAi(prompt, launchGenAi) {
    if (launchGenAi === 'claude') {
      openClaude(prompt);
    }
    if (launchGenAi === 'chatgpt') {
      openChatGPT(prompt);
    }
  }

  // Claudeを開く（既存タブがあれば再利用）
  function openClaude(prompt) {
    // background scriptにメッセージを送信
    chrome.runtime.sendMessage(
      { action: 'openGenAi', prompt: prompt, launchGenAi: 'claude' },
      (response) => {
        if (response && response.success) {
          if (response.reused) {
            showNotification('既存のClaudeタブを使用します');
          } else {
            showNotification('Claudeを開いています...');
          }
        } else {
          // フォールバック: 直接開く
          chrome.storage.local.set({
            pendingPrompt: prompt,
            promptTimestamp: Date.now()
          }, () => {
            window.open('https://claude.ai/new', '_blank');
            showNotification('Claudeを開いています...');
          });
        }
      }
    );
  }

  function openChatGPT(prompt) {
    // background scriptにメッセージを送信
    chrome.runtime.sendMessage(
      { action: 'openGenAi', prompt: prompt, launchGenAi: 'chatgpt' },
      (response) => {
        if (response && response.success) {
          if (response.reused) {
            showNotification('既存のChatGPTタブを使用します');
          } else {
            showNotification('ChatGPTを開いています...');
          }
        } else {
          // フォールバック: 直接開く
          chrome.storage.local.set({
            pendingPrompt: prompt,
            promptTimestamp: Date.now()
          }, () => {
            window.open('https://chatgpt.com/new', '_blank');
            showNotification('ChatGPTを開いています...');
          });
        }
      }
    );
  }

  // 選択テキストでGenAIを開く（プロンプトインデックス指定）
  function executeGenAiWithSelection(promptIndex = 0) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();


    if (selectedText) {
      const promptConfig = settings.prompts[promptIndex] || settings.prompts[0];
      const prompt = generatePrompt(selectedText, promptConfig.template);
      openGenAi(prompt, settings.launchGenAi);
      hideFloatingButton();
      showNotification(`「${promptConfig.name}」を実行`);
    } else {
      showNotification('テキストを選択してください');
    }
  }

  // フローティングボタンを表示
  function showFloatingButton(x, y) {
    if (!floatingButton) {
      floatingButton = createFloatingButton();
    }

    // 画面端での位置調整
    const btnWidth = 200;
    const btnHeight = 40;
    const padding = 10;

    let posX = x;
    let posY = y + 10;

    if (posX + btnWidth > window.innerWidth) {
      posX = window.innerWidth - btnWidth - padding;
    }
    if (posY + btnHeight > window.innerHeight) {
      posY = y - btnHeight - 10;
    }

    floatingButton.style.left = `${posX}px`;
    floatingButton.style.top = `${posY}px`;
    floatingButton.style.display = 'flex';
  }

  // フローティングボタンを非表示
  function hideFloatingButton() {
    if (floatingButton) {
      floatingButton.style.display = 'none';
    }
  }

  // HTMLエスケープ
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // フローティングテキストエリアを作成
  function createFloatingTextArea(selectedText, x, y) {
    // 既存のテキストエリアがあれば削除
    hideFloatingTextArea();

    const container = document.createElement('div');
    container.id = 'reading-support-floating-textarea';

    container.innerHTML = `
      <div class="rs-textarea-header">
        <span class="rs-textarea-title">テキストを編集</span>
        <button class="rs-textarea-close" title="閉じる">&times;</button>
      </div>
      <textarea class="rs-textarea-input">${escapeHtml(selectedText)}</textarea>
      <div class="rs-textarea-footer">
        <span class="rs-textarea-hint">Ctrl+Enterで送信</span>
        <div class="rs-textarea-actions">
          <button class="rs-btn rs-btn-secondary rs-textarea-cancel">キャンセル</button>
          <button class="rs-btn rs-btn-genai rs-textarea-submit">送信</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // 位置調整
    positionFloatingTextArea(container, x, y);

    // テキストエリアにフォーカス
    const textarea = container.querySelector('.rs-textarea-input');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    // イベントリスナーを設定
    setupTextAreaEventListeners(container);

    floatingTextArea = container;
    return container;
  }

  // フローティングテキストエリアの位置調整
  function positionFloatingTextArea(container, x, y) {
    const width = 400;
    const height = 300;
    const padding = 20;

    let posX = x;
    let posY = y + 10;

    // 画面端での調整
    if (posX + width > window.innerWidth - padding) {
      posX = window.innerWidth - width - padding;
    }
    if (posX < padding) {
      posX = padding;
    }
    if (posY + height > window.innerHeight - padding) {
      posY = y - height - 10;
    }
    if (posY < padding) {
      posY = padding;
    }

    container.style.left = `${posX}px`;
    container.style.top = `${posY}px`;
  }

  // フローティングテキストエリアのイベントリスナー設定
  function setupTextAreaEventListeners(container) {
    const textarea = container.querySelector('.rs-textarea-input');
    const closeBtn = container.querySelector('.rs-textarea-close');
    const cancelBtn = container.querySelector('.rs-textarea-cancel');
    const submitBtn = container.querySelector('.rs-textarea-submit');

    // 閉じるボタン
    closeBtn.addEventListener('click', hideFloatingTextArea);
    cancelBtn.addEventListener('click', hideFloatingTextArea);

    // 送信ボタン
    submitBtn.addEventListener('click', () => {
      submitFloatingTextArea(textarea.value);
    });

    // Ctrl+Enterで送信 / Escapeで閉じる
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        submitFloatingTextArea(textarea.value);
      }
      if (e.key === 'Escape') {
        hideFloatingTextArea();
      }
    });

    // イベントの伝播を止める
    container.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
  }

  // フローティングテキストエリアを送信
  function submitFloatingTextArea(text) {
    if (text.trim()) {
      openGenAi(text, settings.launchGenAi);
      showNotification('AIに送信しています...');
    }
    hideFloatingTextArea();
  }

  // フローティングテキストエリアを非表示
  function hideFloatingTextArea() {
    if (floatingTextArea) {
      floatingTextArea.remove();
      floatingTextArea = null;
    }
  }

  // テキスト選択後にボタンを表示する共通処理
  function handleSelectionEnd(e) {
    // ポップアップが無効の場合は何もしない
    if (!settings.showPopup) return;

    // フローティングボタン内のクリック/タッチは無視
    if (floatingButton && floatingButton.contains(e.target)) {
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      // タッチイベントの場合は座標を取得
      let x, y;
      if (e.changedTouches && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        x = touch.pageX;
        y = touch.pageY;
      } else {
        x = e.pageX;
        y = e.pageY;
      }
      showFloatingButton(x, y);
    } else {
      hideFloatingButton();
    }
  }

  // マウスイベント（PC向け）
  document.addEventListener('mouseup', handleSelectionEnd);

  // タッチイベント（スマホ向け）
  document.addEventListener('touchend', (e) => {
    // 少し遅延させて選択が確定するのを待つ
    setTimeout(() => handleSelectionEnd(e), 100);
  });

  // ボタンクリックイベント（イベント委譲）
  document.addEventListener('click', (e) => {
    if (!floatingButton) return;

    const copyBtn = e.target.closest('.rs-btn-copy');
    const genAiBtn = e.target.closest('.rs-btn-genai');

    if (copyBtn || genAiBtn) {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText) {
        // 最初のプロンプト（デフォルト）を使用
        const promptConfig = settings.prompts[0];
        const prompt = generatePrompt(selectedText, promptConfig.template);

        if (copyBtn) {
          copyToClipboard(prompt);
        } else if (genAiBtn) {
          openGenAi(prompt, settings.launchGenAi);
        }
      }

      hideFloatingButton();
    }
  });

  // 他の場所をクリックしたらボタンを非表示
  document.addEventListener('mousedown', (e) => {
    if (floatingButton && !floatingButton.contains(e.target)) {
      // 少し遅延させて、選択操作と区別
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection.toString().trim()) {
          hideFloatingButton();
        }
      }, 10);
    }
  });

  // スクロール時にボタンを非表示
  window.addEventListener('scroll', () => {
    hideFloatingButton();
  });

  // ショートカットが一致するかチェック
  function matchesShortcut(e, shortcut) {
    if (!shortcut || !shortcut.key) return false;
    return (
      e.ctrlKey === shortcut.ctrlKey &&
      e.shiftKey === shortcut.shiftKey &&
      e.altKey === shortcut.altKey &&
      e.key.toLowerCase() === shortcut.key
    );
  }

  // ショートカットキーの処理
  document.addEventListener('keydown', (e) => {
    // 入力欄にフォーカスがある場合は無視
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    )) {
      return;
    }

    // フローティングテキストエリアのショートカットをチェック
    if (settings.floatingTextAreaEnabled) {
      if (matchesShortcut(e, settings.floatingTextAreaShortcut)) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if (selectedText) {
          e.preventDefault();
          // 選択範囲の位置を取得
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          createFloatingTextArea(selectedText, rect.left + window.scrollX, rect.bottom + window.scrollY);
          hideFloatingButton();
        }
        return;
      }
    }

    // 全プロンプトのショートカットをチェック
    for (let i = 0; i < settings.prompts.length; i++) {
      const promptConfig = settings.prompts[i];
      if (matchesShortcut(e, promptConfig.shortcut)) {
        e.preventDefault();
        executeGenAiWithSelection(i);
        return;
      }
    }
  });

  // 初期化
  loadSettings();
})();
