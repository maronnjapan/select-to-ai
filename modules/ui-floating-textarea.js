/**
 * modules/ui-floating-textarea.js
 * フローティングテキストエリアUI
 *
 * 依存:
 *   shared/utils.js (RS.escapeHtml)
 *   modules/ai-service.js (RS.openGenAi) ※循環参照に注意
 *   modules/ui-notification.js (RS.showNotification)
 *   modules/settings.js (RS.settings)
 *
 * 公開API:
 *   RS.FloatingTextArea.create(selectedText, x, y) - テキストエリアを作成・表示
 *   RS.FloatingTextArea.hide() - テキストエリアを非表示
 */

(function() {
  'use strict';

  var floatingTextArea = null;

  RS.FloatingTextArea = {
    /**
     * フローティングテキストエリアを作成・表示
     *
     * @param {string} selectedText - 初期テキスト
     * @param {number} x - X座標（viewport基準）
     * @param {number} y - Y座標（viewport基準）
     * @returns {HTMLElement} テキストエリア要素
     */
    create: function(selectedText, x, y) {
      // 既存のテキストエリアがあれば削除
      this.hide();

      var container = document.createElement('div');
      container.id = 'reading-support-floating-textarea';

      container.innerHTML = '\
        <div class="rs-textarea-header">\
          <span class="rs-textarea-title">テキストを編集</span>\
          <button class="rs-textarea-close" title="閉じる">&times;</button>\
        </div>\
        <textarea class="rs-textarea-input">' + RS.escapeHtml(selectedText) + '</textarea>\
        <div class="rs-textarea-footer">\
          <span class="rs-textarea-hint">Ctrl+Enterで送信</span>\
          <div class="rs-textarea-actions">\
            <button class="rs-btn rs-btn-secondary rs-textarea-cancel">キャンセル</button>\
            <button class="rs-btn rs-btn-genai rs-textarea-submit">送信</button>\
          </div>\
        </div>\
      ';

      document.body.appendChild(container);

      // 位置調整
      this._position(container, x, y);

      // テキストエリアにフォーカス
      var textarea = container.querySelector('.rs-textarea-input');
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);

      // イベントリスナーを設定
      this._setupEventListeners(container);

      floatingTextArea = container;
      return container;
    },

    /**
     * フローティングテキストエリアを非表示・削除
     */
    hide: function() {
      if (floatingTextArea) {
        floatingTextArea.remove();
        floatingTextArea = null;
      }
    },

    /**
     * テキストエリアの位置を調整
     * @private
     */
    _position: function(container, x, y) {
      var padding = 20;
      var width = container.offsetWidth || 400;
      var height = container.offsetHeight || 300;

      var posX = x;
      var posY = y + 10; // デフォルトは選択範囲の少し下

      var maxX = window.innerWidth - padding - width;
      if (maxX < padding) {
        maxX = padding;
      }
      if (posX > maxX) {
        posX = maxX;
      }
      if (posX < padding) {
        posX = padding;
      }

      if (posY + height > window.innerHeight - padding) {
        posY = y - height - 10; // 下に入らなければ上に配置
      }

      var maxY = window.innerHeight - padding - height;
      if (maxY < padding) {
        maxY = padding;
      }
      if (posY > maxY) {
        posY = maxY;
      }
      if (posY < padding) {
        posY = padding;
      }

      container.style.left = posX + 'px';
      container.style.top = posY + 'px';
    },

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners: function(container) {
      var self = this;
      var textarea = container.querySelector('.rs-textarea-input');
      var closeBtn = container.querySelector('.rs-textarea-close');
      var cancelBtn = container.querySelector('.rs-textarea-cancel');
      var submitBtn = container.querySelector('.rs-textarea-submit');

      // 閉じるボタン
      closeBtn.addEventListener('click', function() {
        self.hide();
      });
      cancelBtn.addEventListener('click', function() {
        self.hide();
      });

      // 送信ボタン
      submitBtn.addEventListener('click', function() {
        self._submit(textarea.value);
      });

      // Ctrl+Enterで送信 / Escapeで閉じる
      textarea.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
          e.preventDefault();
          self._submit(textarea.value);
        }
        if (e.key === 'Escape') {
          self.hide();
        }
      });

      // イベントの伝播を止める（選択操作と干渉しないように）
      container.addEventListener('mousedown', function(e) {
        e.stopPropagation();
      });
    },

    /**
     * テキストを送信
     * @private
     */
    _submit: function(text) {
      if (text.trim()) {
        RS.openGenAi(text, RS.settings.launchGenAi);
        RS.showNotification('AIに送信しています...');
      }
      this.hide();
    }
  };
})();
