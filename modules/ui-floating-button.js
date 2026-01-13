/**
 * modules/ui-floating-button.js
 * フローティングボタンUI
 *
 * 依存: modules/settings.js (RS.settings)
 *
 * 公開API:
 *   RS.FloatingButton.create() - ボタンを作成
 *   RS.FloatingButton.show(x, y) - ボタンを表示
 *   RS.FloatingButton.hide() - ボタンを非表示
 *   RS.FloatingButton.contains(element) - 要素がボタン内かチェック
 */

(function() {
  'use strict';

  var floatingButton = null;

  RS.FloatingButton = {
    /**
     * フローティングボタンを作成
     * 既に作成済みの場合は既存のものを返す
     *
     * @returns {HTMLElement} ボタン要素
     */
    create: function() {
      if (floatingButton) return floatingButton;

      var genAiText = RS.settings.launchGenAi === 'chatgpt' ? 'ChatGPT' : 'Claude';

      var container = document.createElement('div');
      container.id = 'reading-support-floating-btn';
      container.innerHTML = '\
        <button class="rs-btn rs-btn-copy" title="プロンプトをコピー">\
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>\
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>\
          </svg>\
          コピー\
        </button>\
        <button class="rs-btn rs-btn-genai" title="' + genAiText + 'で開く">\
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>\
            <polyline points="15 3 21 3 21 9"></polyline>\
            <line x1="10" y1="14" x2="21" y2="3"></line>\
          </svg>\
          ' + genAiText + '\
        </button>\
      ';
      document.body.appendChild(container);
      floatingButton = container;
      return container;
    },

    /**
     * フローティングボタンを指定位置に表示
     * 画面端での位置調整を行う
     *
     * @param {number} x - X座標（ページ座標）
     * @param {number} y - Y座標（ページ座標）
     */
    show: function(x, y) {
      if (!floatingButton) {
        this.create();
      }

      // ボタンのサイズと余白
      var btnWidth = 200;
      var btnHeight = 40;
      var padding = 10;

      var posX = x;
      var posY = y + 10;

      // 画面端での位置調整
      if (posX + btnWidth > window.innerWidth) {
        posX = window.innerWidth - btnWidth - padding;
      }
      if (posY + btnHeight > window.innerHeight) {
        posY = y - btnHeight - 10;
      }

      floatingButton.style.left = posX + 'px';
      floatingButton.style.top = posY + 'px';
      floatingButton.style.display = 'flex';
    },

    /**
     * フローティングボタンを非表示
     */
    hide: function() {
      if (floatingButton) {
        floatingButton.style.display = 'none';
      }
    },

    /**
     * 指定要素がボタン内に含まれるかチェック
     *
     * @param {Element} element - チェックする要素
     * @returns {boolean} ボタン内ならtrue
     */
    contains: function(element) {
      return floatingButton && floatingButton.contains(element);
    },

    /**
     * ボタン要素を取得
     *
     * @returns {HTMLElement|null} ボタン要素
     */
    getElement: function() {
      return floatingButton;
    }
  };
})();
