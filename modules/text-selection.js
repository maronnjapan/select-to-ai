/**
 * modules/text-selection.js
 * 選択テキストと周辺コンテキストの取得
 *
 * 依存: なし（RS名前空間のみ）
 *
 * 公開API:
 *   RS.getContextAroundSelection() - 選択テキストの周辺コンテキストを取得
 */

(function() {
  'use strict';

  // コンテキストの最大文字数
  var MAX_CONTEXT_LENGTH = 2000;

  // ブロックレベル要素のタグ名
  var BLOCK_ELEMENTS = ['P', 'DIV', 'ARTICLE', 'SECTION', 'LI', 'TD', 'BLOCKQUOTE'];

  /**
   * 選択テキストの周辺コンテキストを取得
   * 選択範囲を含む段落と、その前後の兄弟要素のテキストを返す
   *
   * @returns {string} 周辺コンテキスト（最大2000文字）
   */
  RS.getContextAroundSelection = function() {
    var selection = window.getSelection();
    if (!selection.rangeCount) return '';

    var range = selection.getRangeAt(0);
    var container = range.commonAncestorContainer;

    // テキストノードの場合は親要素を取得
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }

    // 段落レベルまで遡る
    var contextElement = container;
    while (contextElement && BLOCK_ELEMENTS.indexOf(contextElement.tagName) === -1) {
      contextElement = contextElement.parentElement;
    }

    if (!contextElement) {
      contextElement = container;
    }

    // 前後の兄弟要素も含める
    var contextText = '';
    var prevSibling = contextElement.previousElementSibling;
    var nextSibling = contextElement.nextElementSibling;

    if (prevSibling && prevSibling.textContent) {
      contextText += prevSibling.textContent.trim() + '\n\n';
    }
    contextText += contextElement.textContent.trim();
    if (nextSibling && nextSibling.textContent) {
      contextText += '\n\n' + nextSibling.textContent.trim();
    }

    // 長すぎる場合は切り詰める
    if (contextText.length > MAX_CONTEXT_LENGTH) {
      contextText = contextText.substring(0, MAX_CONTEXT_LENGTH) + '...';
    }

    return contextText;
  };
})();
