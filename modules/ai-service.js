/**
 * modules/ai-service.js
 * AIサービス（Claude/ChatGPT）との連携
 *
 * 依存:
 *   modules/settings.js (RS.settings)
 *   modules/prompt-generator.js (RS.generatePrompt)
 *   modules/ui-notification.js (RS.showNotification)
 *   modules/ui-floating-button.js (RS.FloatingButton)
 *
 * 公開API:
 *   RS.openGenAi(prompt, launchGenAi) - AIサービスを開く
 *   RS.openClaude(prompt) - Claudeを開く
 *   RS.openChatGPT(prompt) - ChatGPTを開く
 *   RS.executeGenAiWithSelection(promptIndex) - 選択テキストでAIを実行
 */

(function() {
  'use strict';

  /**
   * AIサービスを開く（ルーティング）
   *
   * @param {string} prompt - 送信するプロンプト
   * @param {string} launchGenAi - 'claude' または 'chatgpt'
   */
  RS.openGenAi = function(prompt, launchGenAi) {
    if (launchGenAi === 'claude') {
      RS.openClaude(prompt);
    } else if (launchGenAi === 'chatgpt') {
      RS.openChatGPT(prompt);
    }
  };

  /**
   * Claudeを開く
   * background scriptにメッセージを送信し、既存タブがあれば再利用
   *
   * @param {string} prompt - 送信するプロンプト
   */
  RS.openClaude = function(prompt) {
    chrome.runtime.sendMessage(
      { action: 'openGenAi', prompt: prompt, launchGenAi: 'claude' },
      function(response) {
        if (response && response.success) {
          if (response.reused) {
            RS.showNotification('既存のClaudeタブを使用します');
          } else {
            RS.showNotification('Claudeを開いています...');
          }
        } else {
          // フォールバック: 直接開く
          chrome.storage.local.set({
            pendingPrompt: prompt,
            promptTimestamp: Date.now()
          }, function() {
            window.open(RS.AI_URLS.claude, '_blank');
            RS.showNotification('Claudeを開いています...');
          });
        }
      }
    );
  };

  /**
   * ChatGPTを開く
   * background scriptにメッセージを送信し、既存タブがあれば再利用
   *
   * @param {string} prompt - 送信するプロンプト
   */
  RS.openChatGPT = function(prompt) {
    chrome.runtime.sendMessage(
      { action: 'openGenAi', prompt: prompt, launchGenAi: 'chatgpt' },
      function(response) {
        if (response && response.success) {
          if (response.reused) {
            RS.showNotification('既存のChatGPTタブを使用します');
          } else {
            RS.showNotification('ChatGPTを開いています...');
          }
        } else {
          // フォールバック: 直接開く
          chrome.storage.local.set({
            pendingPrompt: prompt,
            promptTimestamp: Date.now()
          }, function() {
            window.open(RS.AI_URLS.chatgpt, '_blank');
            RS.showNotification('ChatGPTを開いています...');
          });
        }
      }
    );
  };

  /**
   * 選択テキストでAIを実行
   * 指定されたプロンプトテンプレートを使用
   *
   * @param {number} promptIndex - 使用するプロンプトのインデックス（デフォルト: 0）
   */
  RS.executeGenAiWithSelection = function(promptIndex) {
    promptIndex = promptIndex || 0;

    var selection = window.getSelection();
    var selectedText = selection.toString().trim();

    if (selectedText) {
      var promptConfig = RS.settings.prompts[promptIndex] || RS.settings.prompts[0];
      var prompt = RS.generatePrompt(selectedText, promptConfig.template);
      RS.openGenAi(prompt, RS.settings.launchGenAi);
      RS.FloatingButton.hide();
      RS.showNotification('「' + promptConfig.name + '」を実行');
    } else {
      RS.showNotification('テキストを選択してください');
    }
  };
})();
