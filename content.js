/**
 * content.js
 * メインエントリポイント - イベントハンドラと初期化
 *
 * 依存（manifest.jsonで先に読み込まれる）:
 *   shared/constants.js
 *   shared/utils.js
 *   modules/settings.js
 *   modules/text-selection.js
 *   modules/prompt-generator.js
 *   modules/ui-notification.js
 *   modules/ui-floating-button.js
 *   modules/ui-floating-textarea.js
 *   modules/ai-service.js
 *
 * このファイルの責務:
 *   - DOMイベントのハンドリング（マウス、タッチ、キーボード）
 *   - 各モジュールの連携
 *   - 初期化処理
 */

(function() {
  'use strict';

  // ==========================================
  // イベントハンドラ
  // ==========================================

  /**
   * テキスト選択後にボタンを表示する共通処理
   */
  function handleSelectionEnd(e) {
    // ポップアップが無効の場合は何もしない
    if (!RS.settings.showPopup) return;

    // フローティングボタン内のクリック/タッチは無視
    if (RS.FloatingButton.contains(e.target)) {
      return;
    }

    var selection = window.getSelection();
    var selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      // タッチイベントの場合は座標を取得
      var x, y;
      if (e.changedTouches && e.changedTouches.length > 0) {
        var touch = e.changedTouches[0];
        x = touch.pageX;
        y = touch.pageY;
      } else {
        x = e.pageX;
        y = e.pageY;
      }
      RS.FloatingButton.show(x, y);
    } else {
      RS.FloatingButton.hide();
    }
  }

  /**
   * フローティングボタンのクリックイベント処理
   */
  function handleFloatingButtonClick(e) {
    var floatingButton = RS.FloatingButton.getElement();
    if (!floatingButton) return;

    var copyBtn = e.target.closest('.rs-btn-copy');
    var genAiBtn = e.target.closest('.rs-btn-genai');

    if (copyBtn || genAiBtn) {
      var selection = window.getSelection();
      var selectedText = selection.toString().trim();

      if (selectedText) {
        // 最初のプロンプト（デフォルト）を使用
        var promptConfig = RS.settings.prompts[0];
        var prompt = RS.generatePrompt(selectedText, promptConfig.template);

        if (copyBtn) {
          RS.copyToClipboard(prompt);
          RS.showNotification('プロンプトをコピーしました');
        } else if (genAiBtn) {
          RS.openGenAi(prompt, RS.settings.launchGenAi);
        }
      }

      RS.FloatingButton.hide();
    }
  }

  /**
   * ショートカットキーの処理
   */
  function handleKeydown(e) {
    // 入力欄にフォーカスがある場合は無視
    var activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    )) {
      return;
    }

    // フローティングテキストエリアのショートカットをチェック
    if (RS.settings.floatingTextAreaEnabled) {
      if (RS.matchesShortcut(e, RS.settings.floatingTextAreaShortcut)) {
        e.preventDefault();
        var selection = window.getSelection();
        var selectedText = selection.toString().trim();
        var x, y;

        if (selectedText && selection.rangeCount > 0) {
          // 選択テキストがある場合は選択範囲の位置に表示
          var range = selection.getRangeAt(0);
          var rect = range.getBoundingClientRect();
          x = rect.left;
          y = rect.bottom;
        } else {
          // 選択テキストがない場合は画面中央に表示
          x = window.innerWidth / 2 - 200; // テキストエリアの幅の半分（400px / 2）
          y = window.innerHeight / 2 - 150; // テキストエリアの高さの半分（300px / 2）
        }

        RS.FloatingTextArea.create(
          selectedText || '', // 選択テキストがない場合は空文字列
          x,
          y
        );
        RS.FloatingButton.hide();
        return;
      }
    }

    // 全プロンプトのショートカットをチェック
    for (var i = 0; i < RS.settings.prompts.length; i++) {
      var promptConfig = RS.settings.prompts[i];
      if (RS.matchesShortcut(e, promptConfig.shortcut)) {
        e.preventDefault();
        RS.executeGenAiWithSelection(i);
        return;
      }
    }
  }

  /**
   * 他の場所をクリックしたらボタンを非表示
   */
  function handleMousedown(e) {
    if (!RS.FloatingButton.contains(e.target)) {
      // 少し遅延させて、選択操作と区別
      setTimeout(function() {
        var selection = window.getSelection();
        if (!selection.toString().trim()) {
          RS.FloatingButton.hide();
        }
      }, 10);
    }
  }

  // ==========================================
  // イベントリスナー登録
  // ==========================================

  // マウスイベント（PC向け）
  document.addEventListener('mouseup', handleSelectionEnd);

  // タッチイベント（スマホ向け）
  document.addEventListener('touchend', function(e) {
    // 少し遅延させて選択が確定するのを待つ
    setTimeout(function() {
      handleSelectionEnd(e);
    }, 100);
  });

  // ボタンクリックイベント（イベント委譲）
  document.addEventListener('click', handleFloatingButtonClick);

  // 他の場所をクリックしたらボタンを非表示
  document.addEventListener('mousedown', handleMousedown);

  // スクロール時にボタンを非表示
  window.addEventListener('scroll', function() {
    RS.FloatingButton.hide();
  });

  // ショートカットキー
  document.addEventListener('keydown', handleKeydown);

  // ==========================================
  // メッセージリスナー（background.jsからの回答を受信）
  // ==========================================

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'displayAiResponse') {
      console.log('Reading Support [content]: AI回答を受信', '回答長:', message.response.length, 'isComplete:', message.isComplete);
      // AIの回答を表示
      RS.FloatingTextArea.displayResponse(message.response, message.isComplete);
      console.log('Reading Support [content]: displayResponse呼び出し完了');
      sendResponse({ success: true });
    }
  });

  // ==========================================
  // 初期化
  // ==========================================

  RS.loadSettings();
})();
