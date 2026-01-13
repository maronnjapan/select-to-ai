/**
 * popup.js
 * ポップアップのメインエントリポイント
 *
 * 依存（popup.htmlで先に読み込まれる）:
 *   shared/constants.js
 *   shared/utils.js
 *   popup-modules/prompt-card.js
 *   popup-modules/shortcut-recorder.js
 *   popup-modules/popup-settings.js
 *
 * このファイルの責務:
 *   - DOM要素の参照
 *   - イベントハンドラの登録
 *   - 各モジュールの連携
 *   - 初期化処理
 */

(function() {
  'use strict';

  // ==========================================
  // DOM要素の参照
  // ==========================================

  var showPopupCheckbox = document.getElementById('showPopup');
  var promptList = document.getElementById('promptList');
  var launchGenAiSelect = document.getElementById('launchGenAi');
  var addPromptBtn = document.getElementById('addPromptBtn');
  var saveSettingsBtn = document.getElementById('saveSettings');
  var saveNotice = document.getElementById('saveNotice');
  var floatingTextAreaEnabledCheckbox = document.getElementById('floatingTextAreaEnabled');
  var floatingTextAreaShortcutDisplay = document.getElementById('floatingTextAreaShortcut');

  // フローティングテキストエリアのショートカット記録状態
  var recordingFloatingTextAreaShortcut = false;

  // ==========================================
  // UI更新関数
  // ==========================================

  /**
   * プロンプトカード一覧を再描画
   */
  function renderPrompts() {
    var prompts = RSPopup.Settings.getPrompts();
    RSPopup.PromptCard.render(
      prompts,
      promptList,
      handleShortcutClick,
      handleDeletePrompt
    );

    // 各カードにショートカットのblur/keydownイベントを追加
    var cards = promptList.querySelectorAll('.prompt-card');
    cards.forEach(function(card, index) {
      var shortcutDisplay = card.querySelector('.shortcut-display');

      shortcutDisplay.addEventListener('blur', function() {
        RSPopup.ShortcutRecorder.handleBlur(shortcutDisplay, prompts[index].shortcut);
      });

      shortcutDisplay.addEventListener('keydown', function(e) {
        var result = RSPopup.ShortcutRecorder.handleKeydown(e, index);
        if (result) {
          if (result.cancelled) {
            RSPopup.ShortcutRecorder.stop(prompts[index].shortcut);
          } else {
            prompts[index].shortcut = result;
            RSPopup.ShortcutRecorder.stop(result);
          }
        }
      });
    });
  }

  /**
   * 保存完了通知を表示
   */
  function showSaveNotice() {
    saveNotice.classList.add('show');
    setTimeout(function() {
      saveNotice.classList.remove('show');
    }, 2000);
  }

  // ==========================================
  // イベントハンドラ
  // ==========================================

  /**
   * ショートカット表示クリック時の処理
   */
  function handleShortcutClick(index, element) {
    RSPopup.ShortcutRecorder.start(index, element);
  }

  /**
   * プロンプト削除処理
   */
  function handleDeletePrompt(index) {
    if (RSPopup.Settings.deletePrompt(index)) {
      renderPrompts();
    }
  }

  /**
   * プロンプト追加処理
   */
  function handleAddPrompt() {
    RSPopup.Settings.addPrompt();
    renderPrompts();
  }

  /**
   * 設定保存処理
   */
  async function handleSaveSettings() {
    // UIからプロンプトデータを収集
    var prompts = RSPopup.Settings.getPrompts();
    RSPopup.PromptCard.collectFromUI(promptList, prompts);

    await RSPopup.Settings.save({
      showPopup: showPopupCheckbox.checked,
      launchGenAi: launchGenAiSelect.value,
      prompts: prompts,
      floatingTextAreaEnabled: floatingTextAreaEnabledCheckbox.checked,
      floatingTextAreaShortcut: RSPopup.Settings.getFloatingTextAreaShortcut()
    });

    showSaveNotice();
  }

  /**
   * フローティングテキストエリアのショートカット記録開始
   */
  function startRecordingFloatingTextAreaShortcut() {
    recordingFloatingTextAreaShortcut = true;
    floatingTextAreaShortcutDisplay.classList.add('recording');
    floatingTextAreaShortcutDisplay.textContent = 'キーを入力...';
  }

  /**
   * フローティングテキストエリアのショートカット記録終了
   */
  function stopRecordingFloatingTextAreaShortcut() {
    recordingFloatingTextAreaShortcut = false;
    floatingTextAreaShortcutDisplay.classList.remove('recording');
    floatingTextAreaShortcutDisplay.textContent = RS.shortcutToString(
      RSPopup.Settings.getFloatingTextAreaShortcut()
    );
  }

  /**
   * フローティングテキストエリアのショートカットキー入力処理
   */
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

    var shortcut = {
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      key: e.key.toLowerCase()
    };

    RSPopup.Settings.setFloatingTextAreaShortcut(shortcut);
    stopRecordingFloatingTextAreaShortcut();
    handleSaveSettings();
  }

  // ==========================================
  // 初期化
  // ==========================================

  async function init() {
    var settings = await RSPopup.Settings.load();

    // UI初期化
    showPopupCheckbox.checked = settings.showPopup;
    launchGenAiSelect.value = settings.launchGenAi;
    floatingTextAreaEnabledCheckbox.checked = settings.floatingTextAreaEnabled;
    floatingTextAreaShortcutDisplay.textContent = RS.shortcutToString(
      settings.floatingTextAreaShortcut
    );

    // プロンプトカード描画
    renderPrompts();

    // イベントリスナー登録
    addPromptBtn.addEventListener('click', handleAddPrompt);
    saveSettingsBtn.addEventListener('click', handleSaveSettings);
    showPopupCheckbox.addEventListener('change', handleSaveSettings);
    floatingTextAreaEnabledCheckbox.addEventListener('change', handleSaveSettings);

    // フローティングテキストエリアのショートカット記録イベント
    floatingTextAreaShortcutDisplay.addEventListener('click', startRecordingFloatingTextAreaShortcut);
    floatingTextAreaShortcutDisplay.addEventListener('focus', startRecordingFloatingTextAreaShortcut);
    floatingTextAreaShortcutDisplay.addEventListener('blur', stopRecordingFloatingTextAreaShortcut);
    floatingTextAreaShortcutDisplay.addEventListener('keydown', handleFloatingTextAreaShortcutKeydown);
  }

  // DOM読み込み完了後に初期化
  document.addEventListener('DOMContentLoaded', init);
})();
