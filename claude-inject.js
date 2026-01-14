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

  // 回答を監視して送信元タブに送る（APIインターセプト方式）
  function monitorResponse(originTabId) {
    let fullResponse = '';
    let timeoutId = null;

    // 現在のURLでどちらのサービスか判定
    const isChatGPT = window.location.hostname.includes('chatgpt.com');
    const isClaude = window.location.hostname.includes('claude.ai');

    // fetchのインターセプト
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const response = await originalFetch.apply(this, args);

      // ClaudeのAPIレスポンスをキャッチ
      if (isClaude && url.includes('/completion')) {
        const clonedResponse = response.clone();

        try {
          const reader = clonedResponse.body.getReader();
          const decoder = new TextDecoder();

          const processStream = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.substring(6);
                    if (jsonStr.trim() === '[DONE]') continue;

                    const data = JSON.parse(jsonStr);

                    // Claudeのレスポンス形式に応じて処理
                    if (data.completion) {
                      fullResponse = data.completion;
                    } else if (data.delta) {
                      fullResponse += data.delta;
                    } else if (data.message && data.message.content) {
                      // 新しいAPI形式
                      if (Array.isArray(data.message.content)) {
                        for (const content of data.message.content) {
                          if (content.type === 'text' && content.text) {
                            fullResponse = content.text;
                          }
                        }
                      }
                    }

                    // 回答を送信
                    if (fullResponse && originTabId) {
                      chrome.runtime.sendMessage({
                        action: 'aiResponse',
                        response: fullResponse,
                        originTabId: originTabId,
                        isComplete: false
                      });

                      // タイムアウトをリセット
                      if (timeoutId) clearTimeout(timeoutId);
                      timeoutId = setTimeout(() => {
                        // 完了フラグを送信
                        chrome.runtime.sendMessage({
                          action: 'aiResponse',
                          response: fullResponse,
                          originTabId: originTabId,
                          isComplete: true
                        });
                      }, 2000);
                    }
                  } catch (e) {
                    // JSONパースエラーは無視
                  }
                }
              }
            }
          };

          processStream().catch(console.error);
        } catch (e) {
          console.error('Reading Support: ストリーム処理エラー', e);
        }
      }

      // ChatGPTのAPIレスポンスをキャッチ
      if (isChatGPT && (url.includes('/conversation') || url.includes('/backend-api/conversation'))) {
        const clonedResponse = response.clone();

        try {
          const reader = clonedResponse.body.getReader();
          const decoder = new TextDecoder();

          const processStream = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.substring(6).trim();
                    if (jsonStr === '[DONE]') continue;

                    const data = JSON.parse(jsonStr);

                    // ChatGPTのレスポンス形式に応じて処理
                    if (data.message && data.message.content) {
                      if (data.message.content.parts) {
                        fullResponse = data.message.content.parts.join('');
                      } else if (typeof data.message.content === 'string') {
                        fullResponse = data.message.content;
                      }
                    } else if (data.choices && data.choices[0]) {
                      const choice = data.choices[0];
                      if (choice.delta && choice.delta.content) {
                        fullResponse += choice.delta.content;
                      } else if (choice.message && choice.message.content) {
                        fullResponse = choice.message.content;
                      }
                    }

                    // 回答を送信
                    if (fullResponse && originTabId) {
                      chrome.runtime.sendMessage({
                        action: 'aiResponse',
                        response: fullResponse,
                        originTabId: originTabId,
                        isComplete: false
                      });

                      // タイムアウトをリセット
                      if (timeoutId) clearTimeout(timeoutId);
                      timeoutId = setTimeout(() => {
                        // 完了フラグを送信
                        chrome.runtime.sendMessage({
                          action: 'aiResponse',
                          response: fullResponse,
                          originTabId: originTabId,
                          isComplete: true
                        });
                      }, 2000);
                    }
                  } catch (e) {
                    // JSONパースエラーは無視
                  }
                }
              }
            }
          };

          processStream().catch(console.error);
        } catch (e) {
          console.error('Reading Support: ストリーム処理エラー', e);
        }
      }

      return response;
    };

    // 30秒後にfetchのインターセプトを解除
    setTimeout(() => {
      window.fetch = originalFetch;

      // 最終的な回答を送信（完了フラグを立てる）
      if (fullResponse && originTabId) {
        chrome.runtime.sendMessage({
          action: 'aiResponse',
          response: fullResponse,
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
