/**
 * popup-modules/prompt-card.js
 * プロンプトカードUIの生成・管理
 *
 * 依存:
 *   shared/constants.js (RS名前空間)
 *   shared/utils.js (RS.escapeHtml, RS.shortcutToString)
 *
 * 公開API:
 *   RSPopup.PromptCard.create(prompt, index) - プロンプトカードを作成
 *   RSPopup.PromptCard.render(prompts, container) - カード一覧を描画
 */

(function() {
  'use strict';

  // ポップアップ用の名前空間
  window.RSPopup = window.RSPopup || {};

  RSPopup.PromptCard = {
    /**
     * プロンプトカードを作成
     *
     * @param {Object} prompt - プロンプト設定
     * @param {string} prompt.name - プロンプト名
     * @param {Object} prompt.shortcut - ショートカット設定
     * @param {string} prompt.template - テンプレート
     * @param {number} index - インデックス（0がデフォルト）
     * @returns {HTMLElement} カード要素
     */
    create: function(prompt, index) {
      var card = document.createElement('div');
      card.className = 'prompt-card' + (index === 0 ? ' active' : '');
      card.dataset.index = index;

      var deleteButton = index > 0
        ? '<button class="prompt-delete-btn" title="削除">&times;</button>'
        : '';

      var defaultBadge = index === 0
        ? '<span class="prompt-badge">デフォルト</span>'
        : '';

      card.innerHTML = '\
        <div class="prompt-header">\
          <input type="text" class="prompt-name-input" value="' + RS.escapeHtml(prompt.name) + '" placeholder="プロンプト名">\
          ' + defaultBadge + '\
          ' + deleteButton + '\
        </div>\
        <div class="prompt-shortcut-row">\
          <span class="prompt-shortcut-label">ショートカット</span>\
          <div class="shortcut-display" tabindex="0">' + RS.shortcutToString(prompt.shortcut) + '</div>\
        </div>\
        <textarea class="prompt-template" placeholder="プロンプトテンプレート">' + RS.escapeHtml(prompt.template) + '</textarea>\
        <div class="prompt-hint">\
          変数: <code>{{selectedText}}</code> <code>{{pageTitle}}</code> <code>{{pageUrl}}</code> <code>{{context}}</code>\
        </div>\
      ';

      return card;
    },

    /**
     * プロンプトカード一覧を描画
     *
     * @param {Array} prompts - プロンプト配列
     * @param {HTMLElement} container - 描画先コンテナ
     * @param {Function} onShortcutClick - ショートカットクリック時のコールバック
     * @param {Function} onDelete - 削除ボタンクリック時のコールバック
     */
    render: function(prompts, container, onShortcutClick, onDelete) {
      var self = this;
      container.innerHTML = '';

      prompts.forEach(function(prompt, index) {
        var card = self.create(prompt, index);

        // ショートカット入力イベント
        var shortcutDisplay = card.querySelector('.shortcut-display');
        shortcutDisplay.addEventListener('click', function() {
          onShortcutClick(index, shortcutDisplay);
        });
        shortcutDisplay.addEventListener('focus', function() {
          onShortcutClick(index, shortcutDisplay);
        });

        // 削除ボタンイベント
        var deleteBtn = card.querySelector('.prompt-delete-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', function() {
            onDelete(index);
          });
        }

        container.appendChild(card);
      });
    },

    /**
     * UIからプロンプトデータを収集
     *
     * @param {HTMLElement} container - カードのコンテナ
     * @param {Array} prompts - 更新対象のプロンプト配列
     */
    collectFromUI: function(container, prompts) {
      var cards = container.querySelectorAll('.prompt-card');
      cards.forEach(function(card, index) {
        prompts[index].name = card.querySelector('.prompt-name-input').value;
        prompts[index].template = card.querySelector('.prompt-template').value;
      });
    }
  };
})();
