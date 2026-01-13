/**
 * popup-modules/shortcut-recorder.js
 * ショートカット記録機能
 *
 * 依存:
 *   shared/utils.js (RS.shortcutToString)
 *
 * 公開API:
 *   RSPopup.ShortcutRecorder.start(element, callback) - 記録開始
 *   RSPopup.ShortcutRecorder.stop(element, shortcut) - 記録終了
 *   RSPopup.ShortcutRecorder.handleKeydown(e, callback) - キー入力処理
 *   RSPopup.ShortcutRecorder.isRecording() - 記録中かどうか
 */

(function() {
  'use strict';

  window.RSPopup = window.RSPopup || {};

  // 記録中のインデックス（-1は記録していない）
  var recordingIndex = -1;
  var recordingElement = null;

  RSPopup.ShortcutRecorder = {
    /**
     * ショートカット記録を開始
     *
     * @param {number} index - プロンプトのインデックス
     * @param {HTMLElement} element - ショートカット表示要素
     */
    start: function(index, element) {
      recordingIndex = index;
      recordingElement = element;
      element.classList.add('recording');
      element.textContent = 'キーを入力...';
    },

    /**
     * ショートカット記録を終了
     *
     * @param {Object} shortcut - ショートカット設定
     */
    stop: function(shortcut) {
      if (recordingElement) {
        recordingElement.classList.remove('recording');
        recordingElement.textContent = RS.shortcutToString(shortcut);
      }
      recordingIndex = -1;
      recordingElement = null;
    },

    /**
     * blur時の処理（カード用）
     *
     * @param {HTMLElement} element - ショートカット表示要素
     * @param {Object} shortcut - 現在のショートカット設定
     */
    handleBlur: function(element, shortcut) {
      if (recordingElement === element) {
        this.stop(shortcut);
      }
    },

    /**
     * キー入力処理
     *
     * @param {KeyboardEvent} e - キーボードイベント
     * @param {number} expectedIndex - 期待するインデックス
     * @returns {Object|null} 成功時はショートカット設定、キャンセル/無視時はnull
     */
    handleKeydown: function(e, expectedIndex) {
      if (recordingIndex !== expectedIndex) return null;

      e.preventDefault();

      // Escapeでキャンセル
      if (e.key === 'Escape') {
        return { cancelled: true };
      }

      // 修飾キーのみの場合は無視
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return null;
      }

      return {
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        key: e.key.toLowerCase()
      };
    },

    /**
     * 記録中かどうか
     *
     * @returns {boolean}
     */
    isRecording: function() {
      return recordingIndex !== -1;
    },

    /**
     * 記録中のインデックスを取得
     *
     * @returns {number}
     */
    getRecordingIndex: function() {
      return recordingIndex;
    }
  };
})();
