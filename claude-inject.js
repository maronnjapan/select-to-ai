(() => {
  'use strict';

  // claude.ai専用のスクリプト
  // storageからプロンプトを読み取り、自動入力・送信を行う

  const MAX_WAIT_TIME = 15000; // 最大15秒待機
  const CHECK_INTERVAL = 500;  // 500msごとにチェック

  // プロンプトが有効かチェック（5分以内）
  function isPromptValid(timestamp) {
    const FIVE_MINUTES = 5 * 60 * 1000;
    return Date.now() - timestamp < FIVE_MINUTES;
  }

  // 入力欄を探す
  function findInputElement() {
    // Claude.aiの入力欄セレクタ（複数パターンを試す）
    const selectors = [
      'div[contenteditable="true"]',
      'textarea[placeholder]',
      'div.ProseMirror',
      '[data-placeholder]',
      'fieldset textarea',
      'div[role="textbox"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }
    return null;
  }

  // 送信ボタンを探す
  function findSubmitButton() {
    // Claude.aiの送信ボタンセレクタ（複数パターンを試す）
    const selectors = [
      'button[aria-label*="Send"]',
      'button[aria-label*="送信"]',
      'button[type="submit"]',
      'button:has(svg[data-icon="arrow-up"])',
      'button:has(svg[data-icon="send"])',
      'form button:last-of-type'
    ];

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element && !element.disabled) {
          return element;
        }
      } catch (e) {
        // :has() がサポートされていない場合などは無視
      }
    }

    // フォールバック: ボタンをすべて探して送信っぽいものを見つける
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const svg = btn.querySelector('svg');
      if (svg && !btn.disabled) {
        // SVGを含むボタンで、disabledでないもの
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return btn;
        }
      }
    }

    return null;
  }

  // テキストを入力
  function inputText(element, text) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // contenteditable要素の場合
      element.focus();
      element.innerHTML = '';

      // テキストを段落として挿入
      const lines = text.split('\n');
      lines.forEach((line, index) => {
        if (index > 0) {
          document.execCommand('insertParagraph', false);
        }
        document.execCommand('insertText', false, line);
      });

      // Reactなどのフレームワーク用にイベントを発火
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
    }
  }

  // 送信を実行
  function submitMessage(submitButton) {
    // 少し待ってから送信（入力が反映されるのを待つ）
    setTimeout(() => {
      submitButton.click();
    }, 300);
  }

  // メイン処理
  async function processPrompt() {
    try {
      const result = await chrome.storage.local.get(['pendingPrompt', 'promptTimestamp']);

      if (!result.pendingPrompt || !result.promptTimestamp) {
        return;
      }

      if (!isPromptValid(result.promptTimestamp)) {
        // 期限切れのプロンプトを削除
        await chrome.storage.local.remove(['pendingPrompt', 'promptTimestamp']);
        return;
      }

      const prompt = result.pendingPrompt;

      // 入力欄が見つかるまで待機
      let waitTime = 0;
      const waitForInput = setInterval(async () => {
        waitTime += CHECK_INTERVAL;

        const inputElement = findInputElement();

        if (inputElement) {
          clearInterval(waitForInput);

          // テキストを入力
          inputText(inputElement, prompt);

          // 使用済みプロンプトを削除
          await chrome.storage.local.remove(['pendingPrompt', 'promptTimestamp']);

          // 送信ボタンが有効になるまで少し待つ
          setTimeout(() => {
            const submitButton = findSubmitButton();
            if (submitButton) {
              submitMessage(submitButton);
            }
          }, 500);
        }

        if (waitTime >= MAX_WAIT_TIME) {
          clearInterval(waitForInput);
          console.log('Reading Support: 入力欄が見つかりませんでした');
        }
      }, CHECK_INTERVAL);

    } catch (error) {
      console.error('Reading Support: エラーが発生しました', error);
    }
  }

  // ページ読み込み完了後に実行
  if (document.readyState === 'complete') {
    processPrompt();
  } else {
    window.addEventListener('load', processPrompt);
  }
})();
