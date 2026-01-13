/**
 * modules/prompt-generator.js
 * プロンプト生成
 *
 * 依存: modules/text-selection.js (RS.getContextAroundSelection)
 *
 * 公開API:
 *   RS.generatePrompt(selectedText, template) - テンプレートからプロンプトを生成
 *
 * テンプレート変数:
 *   {{selectedText}} - 選択されたテキスト
 *   {{pageTitle}} - ページタイトル
 *   {{pageUrl}} - ページURL
 *   {{context}} - 周辺コンテキスト
 */

(function() {
  'use strict';

  /**
   * テンプレートからプロンプトを生成
   *
   * @param {string} selectedText - 選択されたテキスト
   * @param {string} template - プロンプトテンプレート
   * @returns {string} 生成されたプロンプト
   */
  RS.generatePrompt = function(selectedText, template) {
    var pageTitle = document.title;
    var pageUrl = window.location.href;
    var context = RS.getContextAroundSelection();

    // テンプレートの変数を置換
    return template
      .replace(/\{\{selectedText\}\}/g, selectedText)
      .replace(/\{\{pageTitle\}\}/g, pageTitle)
      .replace(/\{\{pageUrl\}\}/g, pageUrl)
      .replace(/\{\{context\}\}/g, context);
  };
})();
