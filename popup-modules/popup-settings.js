/**
 * popup-modules/popup-settings.js
 * ポップアップの設定読み込み・保存
 *
 * 依存:
 *   shared/constants.js (RS.DEFAULT_PROMPT, RS.SYNC_STORAGE_KEYS, RS.DEFAULT_FLOATING_TEXTAREA_SHORTCUT)
 *
 * 公開API:
 *   RSPopup.Settings.load() - 設定を読み込む
 *   RSPopup.Settings.save(data) - 設定を保存
 *   RSPopup.Settings.getPrompts() - プロンプト配列を取得
 *   RSPopup.Settings.setPrompts(prompts) - プロンプト配列を設定
 *   RSPopup.Settings.addPrompt() - 新規プロンプトを追加
 *   RSPopup.Settings.deletePrompt(index) - プロンプトを削除
 */

(function() {
  'use strict';

  window.RSPopup = window.RSPopup || {};

  // 内部状態
  var prompts = [];
  var floatingTextAreaShortcut = null;

  RSPopup.Settings = {
    /**
     * 設定を読み込む
     *
     * @returns {Promise<Object>} 読み込んだ設定
     */
    load: async function() {
      try {
        var result = await chrome.storage.sync.get(RS.SYNC_STORAGE_KEYS);

        // プロンプト設定
        if (result.prompts && result.prompts.length > 0) {
          prompts = result.prompts;
        } else {
          // デフォルトプロンプトを設定
          prompts = [Object.assign({}, RS.DEFAULT_PROMPT)];
        }

        // フローティングテキストエリアショートカット
        if (result.floatingTextAreaShortcut) {
          floatingTextAreaShortcut = result.floatingTextAreaShortcut;
        } else {
          floatingTextAreaShortcut = Object.assign({}, RS.DEFAULT_FLOATING_TEXTAREA_SHORTCUT);
        }

        return {
          showPopup: result.showPopup !== undefined ? result.showPopup : true,
          launchGenAi: result.launchGenAi || 'claude',
          prompts: prompts,
          floatingTextAreaEnabled: result.floatingTextAreaEnabled !== undefined
            ? result.floatingTextAreaEnabled
            : true,
          floatingTextAreaShortcut: floatingTextAreaShortcut
        };
      } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
        prompts = [Object.assign({}, RS.DEFAULT_PROMPT)];
        floatingTextAreaShortcut = Object.assign({}, RS.DEFAULT_FLOATING_TEXTAREA_SHORTCUT);
        return {
          showPopup: true,
          launchGenAi: 'claude',
          prompts: prompts,
          floatingTextAreaEnabled: true,
          floatingTextAreaShortcut: floatingTextAreaShortcut
        };
      }
    },

    /**
     * 設定を保存
     *
     * @param {Object} data - 保存するデータ
     * @returns {Promise<void>}
     */
    save: async function(data) {
      try {
        await chrome.storage.sync.set(data);
      } catch (error) {
        console.error('設定の保存に失敗しました:', error);
        throw error;
      }
    },

    /**
     * プロンプト配列を取得
     *
     * @returns {Array}
     */
    getPrompts: function() {
      return prompts;
    },

    /**
     * プロンプト配列を設定
     *
     * @param {Array} newPrompts
     */
    setPrompts: function(newPrompts) {
      prompts = newPrompts;
    },

    /**
     * 新規プロンプトを追加
     *
     * @returns {Object} 追加されたプロンプト
     */
    addPrompt: function() {
      var newPrompt = {
        name: 'プロンプト ' + (prompts.length + 1),
        shortcut: null,
        template: '{{selectedText}}\n\n上記について教えてください。'
      };
      prompts.push(newPrompt);
      return newPrompt;
    },

    /**
     * プロンプトを削除
     *
     * @param {number} index - 削除するインデックス
     * @returns {boolean} 成功時はtrue
     */
    deletePrompt: function(index) {
      if (index === 0) return false; // デフォルトは削除不可
      prompts.splice(index, 1);
      return true;
    },

    /**
     * フローティングテキストエリアのショートカットを取得
     *
     * @returns {Object}
     */
    getFloatingTextAreaShortcut: function() {
      return floatingTextAreaShortcut;
    },

    /**
     * フローティングテキストエリアのショートカットを設定
     *
     * @param {Object} shortcut
     */
    setFloatingTextAreaShortcut: function(shortcut) {
      floatingTextAreaShortcut = shortcut;
    }
  };
})();
