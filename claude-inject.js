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
    // 現在のURLでどちらのサービスか判定
    const isChatGPT = window.location.hostname.includes('chatgpt.com');
    const isClaude = window.location.hostname.includes('claude.ai');

    let selectors = [];

    if (isChatGPT) {
      // ChatGPT用のセレクタ（優先順位順）
      selectors = [
        'textarea[id="prompt-textarea"]',
        'div[contenteditable="true"][data-id]',
        'textarea[placeholder*="Message"]',
        'textarea[data-id]',
        'div[contenteditable="true"]',
        'textarea[placeholder]',
        'div[role="textbox"]'
      ];
    } else if (isClaude) {
      // Claude用のセレクタ
      selectors = [
        'div[contenteditable="true"]',
        'textarea[placeholder]',
        'div.ProseMirror',
        '[data-placeholder]',
        'fieldset textarea',
        'div[role="textbox"]'
      ];
    }

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
    // 現在のURLでどちらのサービスか判定
    const isChatGPT = window.location.hostname.includes('chatgpt.com');
    const isClaude = window.location.hostname.includes('claude.ai');

    let selectors = [];

    if (isChatGPT) {
      // ChatGPT用のセレクタ（優先順位順）
      selectors = [
        'button[data-testid="send-button"]',
        'button[data-testid="fruitjuice-send-button"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="送信"]',
        'button[type="submit"]',
        'form button:last-of-type'
      ];
    } else if (isClaude) {
      // Claude用のセレクタ
      selectors = [
        'button[aria-label*="Send"]',
        'button[aria-label*="送信"]',
        'button[type="submit"]',
        'button:has(svg[data-icon="arrow-up"])',
        'button:has(svg[data-icon="send"])',
        'form button:last-of-type'
      ];
    }

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

  // AIの回答エリアを探す
  function findResponseElement() {
    // 現在のURLでどちらのサービスか判定
    const isChatGPT = window.location.hostname.includes('chatgpt.com');
    const isClaude = window.location.hostname.includes('claude.ai');

    let selectors = [];

    if (isChatGPT) {
      // ChatGPT用のセレクタ
      selectors = [
        'div[data-message-author-role="assistant"]',
        'div[data-message-role="assistant"]',
        'article[data-testid*="conversation"]',
        'div[class*="agent-turn"]'
      ];
    } else if (isClaude) {
      // Claude用のセレクタ
      selectors = [
        'div[data-testid="conversation-turn"]',
        'div[data-test="conversation-turn"]',
        'div.font-claude-message',
        'div[class*="message"]'
      ];
    }

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // 最後の要素（最新の回答）を返す
        return elements[elements.length - 1];
      }
    }

    // フォールバック: 特定の構造を探す
    const allDivs = document.querySelectorAll('div');
    for (let i = allDivs.length - 1; i >= 0; i--) {
      const div = allDivs[i];
      if (div.textContent && div.textContent.length > 50) {
        // ある程度の長さがあるテキストを含むdivを探す
        return div;
      }
    }

    return null;
  }

  // 回答を監視して送信元タブに送る
  function monitorResponse(originTabId) {
    let lastSentText = '';
    let observer = null;
    let initialMessageCount = 0;
    let detectedPatternIndex = -1;

    // 現在のURLでどちらのサービスか判定
    const isChatGPT = window.location.hostname.includes('chatgpt.com');
    const isClaude = window.location.hostname.includes('claude.ai');

    // 監視開始時に現在のメッセージ数を記録
    // この関数は送信後3秒後に呼ばれるが、その時点では既にAI回答が始まっている可能性がある
    // なので、1回だけ初回のメッセージをキャプチャするために、遅延初期化する
    let isFirstCheck = true;

    const patterns = isClaude ? [
      'div.font-claude-message',
      'div[data-testid*="message"]',
      'div[class*="font-"][class*="message"]'
    ] : [];

    const checkAndSendResponse = () => {
      let responseText = '';

      if (isChatGPT) {
        // ChatGPT用のセレクタ
        const responseElements = document.querySelectorAll('div[data-message-author-role="assistant"]');

        // 初回チェック時に現在のメッセージ数を記録
        if (isFirstCheck) {
          initialMessageCount = responseElements.length;
          isFirstCheck = false;
          return; // 初回は記録のみ
        }

        // 新しいメッセージが追加されているかチェック
        if (responseElements.length > initialMessageCount) {
          const newMessageElement = responseElements[responseElements.length - 1];
          responseText = newMessageElement.textContent.trim();
        }
      } else if (isClaude) {
        // Claude用のセレクタ - 複数のパターンを試す
        for (let patternIdx = 0; patternIdx < patterns.length; patternIdx++) {
          const pattern = patterns[patternIdx];
          const elements = document.querySelectorAll(pattern);

          // パターンが見つかった場合、そのパターンを記憶
          if (elements.length > 0 && detectedPatternIndex === -1) {
            detectedPatternIndex = patternIdx;
          }

          // 検出済みのパターン以外はスキップ（一貫性のため）
          if (detectedPatternIndex !== -1 && patternIdx !== detectedPatternIndex) {
            continue;
          }

          // 初回チェック時に現在のメッセージ数を記録
          if (isFirstCheck) {
            initialMessageCount = elements.length;
            isFirstCheck = false;
            return; // 初回は記録のみ
          }

          // 新しいメッセージが追加されているかチェック
          if (elements.length > initialMessageCount) {
            // 新しく追加されたメッセージを順番にチェック
            for (let i = initialMessageCount; i < elements.length; i++) {
              const element = elements[i];

              // 入力欄を含む要素はユーザーメッセージなので除外
              if (element.querySelector('textarea') || element.querySelector('input')) {
                continue;
              }

              // メッセージは通常交互に表示される（ユーザー、AI、ユーザー、AI...）
              // 初回のユーザーメッセージはインデックス0、AIはインデックス1...
              // ただし、iが奇数の場合がAI回答の可能性が高い
              // しかし、これは仮定なので、入力欄がないことで判定する
              const text = element.textContent.trim();
              if (text) {
                responseText = text;
                break;
              }
            }

            if (responseText) {
              break;
            }
          }
        }
      }

      // 前回送信したテキストと異なる場合のみ送信（ストリーミング対応）
      if (responseText && responseText !== lastSentText && responseText.length > 0) {
        lastSentText = responseText;

        // background.jsに回答を送信
        chrome.runtime.sendMessage({
          action: 'aiResponse',
          response: responseText,
          originTabId: originTabId,
          isComplete: false // ストリーミング中
        });
      }
    };

    // DOMの変更を監視
    const targetNode = document.body;
    observer = new MutationObserver((mutations) => {
      // 回答エリアに変更があったかチェック
      checkAndSendResponse();
    });

    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // 定期的にもチェック（念のため）
    const intervalId = setInterval(checkAndSendResponse, 1000);

    // 30秒後に監視を停止（タイムアウト）
    setTimeout(() => {
      if (observer) {
        observer.disconnect();
      }
      clearInterval(intervalId);

      // 最終的な回答を送信（完了フラグを立てる）
      if (lastSentText) {
        chrome.runtime.sendMessage({
          action: 'aiResponse',
          response: lastSentText,
          originTabId: originTabId,
          isComplete: true
        });
      }
    }, 30000);
  }

  // メイン処理
  async function processPrompt() {
    try {
      const result = await chrome.storage.local.get(['pendingPrompt', 'promptTimestamp', 'originTabId']);

      if (!result.pendingPrompt || !result.promptTimestamp) {
        return;
      }

      if (!isPromptValid(result.promptTimestamp)) {
        // 期限切れのプロンプトを削除
        await chrome.storage.local.remove(['pendingPrompt', 'promptTimestamp', 'originTabId']);
        return;
      }

      const prompt = result.pendingPrompt;
      const originTabId = result.originTabId;

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
          await chrome.storage.local.remove(['pendingPrompt', 'promptTimestamp', 'originTabId']);

          // 送信ボタンが有効になるまで少し待つ
          setTimeout(() => {
            const submitButton = findSubmitButton();
            if (submitButton) {
              submitMessage(submitButton);

              // 回答の監視を開始
              if (originTabId) {
                setTimeout(() => {
                  monitorResponse(originTabId);
                }, 3000); // 送信後3秒待ってから監視開始（バックグラウンドタブでも動作するように）
              }
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

  // background.jsからのメッセージを受信
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'insertPrompt') {
      // 既存のチャットにプロンプトを入力・送信
      insertAndSubmitPrompt(message.prompt, message.originTabId);
      sendResponse({ success: true });
    }
  });

  /**
   * プロンプトを入力して送信（既存チャットの続き用）
   */
  async function insertAndSubmitPrompt(prompt, originTabId) {
    try {
      const inputElement = findInputElement();

      if (!inputElement) {
        console.log('Reading Support: 入力欄が見つかりません。待機します...');
        // 入力欄が見つかるまで待機
        let waitTime = 0;
        const waitForInput = setInterval(() => {
          waitTime += CHECK_INTERVAL;

          const input = findInputElement();
          if (input) {
            clearInterval(waitForInput);
            performInputAndSubmit(input, prompt, originTabId);
          }

          if (waitTime >= MAX_WAIT_TIME) {
            clearInterval(waitForInput);
            console.log('Reading Support: 入力欄が見つかりませんでした（タイムアウト）');
          }
        }, CHECK_INTERVAL);
        return;
      }

      // 入力欄が見つかった場合はすぐに実行
      performInputAndSubmit(inputElement, prompt, originTabId);

    } catch (error) {
      console.error('Reading Support: プロンプト入力エラー', error);
    }
  }

  /**
   * 実際の入力と送信を実行
   */
  function performInputAndSubmit(inputElement, prompt, originTabId) {
    // テキストを入力
    inputText(inputElement, prompt);

    // 送信ボタンが有効になるまで少し待つ
    setTimeout(() => {
      const submitButton = findSubmitButton();
      if (submitButton) {
        submitMessage(submitButton);

        // 回答の監視を開始
        if (originTabId) {
          setTimeout(() => {
            monitorResponse(originTabId);
          }, 3000); // 送信後3秒待ってから監視開始（バックグラウンドタブでも動作するように）
        }
      } else {
        console.log('Reading Support: 送信ボタンが見つかりません');
      }
    }, 500);
  }

  // ページ読み込み完了後に実行
  if (document.readyState === 'complete') {
    processPrompt();
  } else {
    window.addEventListener('load', processPrompt);
  }
})();
