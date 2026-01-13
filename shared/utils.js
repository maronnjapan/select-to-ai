/**
 * shared/utils.js
 * 共通ユーティリティ関数
 *
 * 依存: shared/constants.js (RS名前空間)
 */

(function() {
  'use strict';

  /**
   * HTMLエスケープ
   * XSS対策として、HTMLタグをエスケープする
   *
   * @param {string} text - エスケープする文字列
   * @returns {string} エスケープされた文字列
   */
  RS.escapeHtml = function(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  /**
   * ショートカットキーが一致するかチェック
   *
   * @param {KeyboardEvent} event - キーボードイベント
   * @param {Object} shortcut - ショートカット設定オブジェクト
   * @param {boolean} shortcut.ctrlKey - Ctrlキーが必要か
   * @param {boolean} shortcut.shiftKey - Shiftキーが必要か
   * @param {boolean} shortcut.altKey - Altキーが必要か
   * @param {string} shortcut.key - キー文字（小文字）
   * @returns {boolean} 一致する場合はtrue
   */
  RS.matchesShortcut = function(event, shortcut) {
    if (!shortcut || !shortcut.key) return false;
    return (
      event.ctrlKey === shortcut.ctrlKey &&
      event.shiftKey === shortcut.shiftKey &&
      event.altKey === shortcut.altKey &&
      event.key.toLowerCase() === shortcut.key
    );
  };

  /**
   * ショートカットを表示用文字列に変換
   *
   * @param {Object} shortcut - ショートカット設定オブジェクト
   * @returns {string} 表示用文字列 (例: "Ctrl+Shift+Q")
   */
  RS.shortcutToString = function(shortcut) {
    if (!shortcut || !shortcut.key) return 'クリックして設定';
    var parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.key) parts.push(shortcut.key.toUpperCase());
    return parts.join('+');
  };

  /**
   * クリップボードにテキストをコピー
   * Clipboard API を優先し、失敗時はフォールバック
   *
   * @param {string} text - コピーするテキスト
   * @returns {Promise<void>}
   */
  RS.copyToClipboard = async function(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // フォールバック: execCommand使用
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };
})();
