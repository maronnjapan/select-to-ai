/**
 * modules/settings.js
 * 設定の読み込み・保存・監視
 *
 * 依存: shared/constants.js
 *
 * 公開API:
 *   RS.settings - 現在の設定オブジェクト
 *   RS.loadSettings() - 設定を読み込む
 */

(function() {
  'use strict';

  // 現在の設定（デフォルト値で初期化）
  RS.settings = {
    launchGenAi: 'claude',
    showPopup: true,
    prompts: [RS.DEFAULT_PROMPT],
    floatingTextAreaEnabled: true,
    floatingTextAreaShortcut: RS.DEFAULT_FLOATING_TEXTAREA_SHORTCUT
  };

  /**
   * chrome.storage.sync から設定を読み込む
   *
   * @returns {Promise<void>}
   */
  RS.loadSettings = async function() {
    try {
      var result = await chrome.storage.sync.get(RS.SYNC_STORAGE_KEYS);

      if (result.showPopup !== undefined) {
        RS.settings.showPopup = result.showPopup;
      }
      if (result.launchGenAi !== undefined) {
        RS.settings.launchGenAi = result.launchGenAi;
      }
      if (result.prompts && result.prompts.length > 0) {
        RS.settings.prompts = result.prompts;
      }
      if (result.floatingTextAreaEnabled !== undefined) {
        RS.settings.floatingTextAreaEnabled = result.floatingTextAreaEnabled;
      }
      if (result.floatingTextAreaShortcut) {
        RS.settings.floatingTextAreaShortcut = result.floatingTextAreaShortcut;
      }
    } catch (error) {
      console.error('Reading Support: 設定の読み込みに失敗しました', error);
    }
  };

  /**
   * ストレージの変更を監視し、設定をリアルタイム同期
   */
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync') {
      if (changes.showPopup) {
        RS.settings.showPopup = changes.showPopup.newValue;
      }
      if (changes.launchGenAi) {
        RS.settings.launchGenAi = changes.launchGenAi.newValue;
      }
      if (changes.prompts) {
        RS.settings.prompts = changes.prompts.newValue;
      }
      if (changes.floatingTextAreaEnabled) {
        RS.settings.floatingTextAreaEnabled = changes.floatingTextAreaEnabled.newValue;
      }
      if (changes.floatingTextAreaShortcut) {
        RS.settings.floatingTextAreaShortcut = changes.floatingTextAreaShortcut.newValue;
      }
    }
  });
})();
