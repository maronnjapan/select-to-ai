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
  var conversationHistory = []; // 会話履歴を保存

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
          <span class="rs-textarea-title">AI Chat</span>\
          <button class="rs-textarea-close" title="閉じる">&times;</button>\
        </div>\
        <div class="rs-chat-container">\
          <div class="rs-chat-messages"></div>\
        </div>\
        <div class="rs-chat-input-container">\
          <textarea class="rs-textarea-input" placeholder="メッセージを入力...">' + RS.escapeHtml(selectedText) + '</textarea>\
          <div class="rs-textarea-footer">\
            <span class="rs-textarea-hint">Ctrl+Enterで送信</span>\
            <div class="rs-textarea-actions">\
              <button class="rs-btn rs-btn-secondary rs-textarea-cancel">キャンセル</button>\
              <button class="rs-btn rs-btn-genai rs-textarea-submit">送信</button>\
            </div>\
          </div>\
        </div>\
      ';

      document.body.appendChild(container);

      // 位置調整（左端に表示）
      this._position(container, x, y);

      // テキストエリアにフォーカス
      var textarea = container.querySelector('.rs-textarea-input');
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);

      // イベントリスナーを設定
      this._setupEventListeners(container);

      // ドラッグ機能を設定
      this._setupDragging(container);

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
     * テキストエリアの位置を調整（左端に表示）
     * @private
     */
    _position: function(container, x, y) {
      var padding = 20;
      var height = container.offsetHeight || 300;

      // 左端に固定表示
      var posX = padding;
      var posY = y + 10; // デフォルトは選択範囲の少し下

      // 画面の高さに収まるように調整
      var maxHeight = window.innerHeight - padding * 2;
      if (height > maxHeight) {
        container.style.maxHeight = maxHeight + 'px';
      }

      // Y座標の調整
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
      if (!text.trim()) return;

      // ユーザーのメッセージを表示
      this._addMessage(text, 'user');

      // テキストエリアをクリア
      if (floatingTextArea) {
        var textarea = floatingTextArea.querySelector('.rs-textarea-input');
        if (textarea) {
          textarea.value = '';
        }
      }

      // ローディング表示
      this._addLoadingMessage();

      // AIに送信
      RS.openGenAi(text, RS.settings.launchGenAi);
      RS.showNotification('AIに送信しています...');
    },

    /**
     * メッセージを追加（ユーザーまたはAI）
     * @private
     */
    _addMessage: function(text, sender) {
      if (!floatingTextArea) return;

      var messagesContainer = floatingTextArea.querySelector('.rs-chat-messages');
      if (!messagesContainer) return;

      var messageDiv = document.createElement('div');
      messageDiv.className = 'rs-chat-message rs-chat-message-' + sender;

      var avatar = document.createElement('div');
      avatar.className = 'rs-chat-avatar';
      avatar.textContent = sender === 'user' ? 'U' : 'AI';

      var content = document.createElement('div');
      content.className = 'rs-chat-content';

      // AIのメッセージの場合はMarkdownとして表示
      if (sender === 'ai') {
        content.innerHTML = this._renderMarkdown(text);
      } else {
        content.textContent = text;
      }

      messageDiv.appendChild(avatar);
      messageDiv.appendChild(content);
      messagesContainer.appendChild(messageDiv);

      // 最新メッセージまでスクロール
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // 会話履歴に追加
      conversationHistory.push({ sender: sender, text: text });
    },

    /**
     * ローディングメッセージを追加
     * @private
     */
    _addLoadingMessage: function() {
      if (!floatingTextArea) return;

      var messagesContainer = floatingTextArea.querySelector('.rs-chat-messages');
      if (!messagesContainer) return;

      var loadingDiv = document.createElement('div');
      loadingDiv.className = 'rs-chat-message rs-chat-message-ai rs-chat-loading';
      loadingDiv.id = 'rs-chat-loading';

      var avatar = document.createElement('div');
      avatar.className = 'rs-chat-avatar';
      avatar.textContent = 'AI';

      var content = document.createElement('div');
      content.className = 'rs-chat-content';
      content.innerHTML = '<span class="rs-loading-dots">•••</span>';

      loadingDiv.appendChild(avatar);
      loadingDiv.appendChild(content);
      messagesContainer.appendChild(loadingDiv);

      // 最新メッセージまでスクロール
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    /**
     * AIの回答を表示
     * @public
     */
    displayResponse: function(response, isComplete) {
      if (!floatingTextArea) return;

      var messagesContainer = floatingTextArea.querySelector('.rs-chat-messages');
      if (!messagesContainer) return;

      // ローディングメッセージを削除
      var loadingMsg = document.getElementById('rs-chat-loading');
      if (loadingMsg) {
        loadingMsg.remove();
      }

      // 既存のAI回答を更新または新規作成
      var lastMessage = messagesContainer.querySelector('.rs-chat-message-ai:last-child');

      if (lastMessage && !lastMessage.classList.contains('rs-chat-loading')) {
        // 既存のメッセージを更新（ストリーミング）
        var content = lastMessage.querySelector('.rs-chat-content');
        if (content) {
          content.innerHTML = this._renderMarkdown(response);
        }
      } else {
        // 新しいメッセージを追加
        this._addMessage(response, 'ai');
      }

      // 最新メッセージまでスクロール
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      if (isComplete) {
        RS.showNotification('AIからの回答を受信しました');
      }
    },

    /**
     * 会話履歴をクリア
     * @public
     */
    clearHistory: function() {
      conversationHistory = [];
      if (floatingTextArea) {
        var messagesContainer = floatingTextArea.querySelector('.rs-chat-messages');
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
        }
      }
    },

    /**
     * Markdownをレンダリング
     * @private
     */
    _renderMarkdown: function(text) {
      if (!text) return '';

      // HTMLエスケープ
      var escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // コードブロック (```code```)
      escaped = escaped.replace(/```([\s\S]*?)```/g, function(match, code) {
        return '<pre><code>' + code.trim() + '</code></pre>';
      });

      // インラインコード (`code`)
      escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

      // 太字 (**text** or __text__)
      escaped = escaped.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
      escaped = escaped.replace(/__([^_]+)__/g, '<strong>$1</strong>');

      // イタリック (*text* or _text_)
      escaped = escaped.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
      escaped = escaped.replace(/_([^_]+)_/g, '<em>$1</em>');

      // リンク ([text](url))
      escaped = escaped.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

      // 見出し (# Heading)
      escaped = escaped.replace(/^### (.+)$/gm, '<h3>$1</h3>');
      escaped = escaped.replace(/^## (.+)$/gm, '<h2>$1</h2>');
      escaped = escaped.replace(/^# (.+)$/gm, '<h1>$1</h1>');

      // テーブルとリストを処理
      var lines = escaped.split('\n');
      var inList = false;
      var inTable = false;
      var result = [];

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmedLine = line.trim();

        // テーブルの開始を検出（| で始まり | で終わる行）
        if (!inTable && trimmedLine.match(/^\|(.+)\|$/)) {
          // 次の行がセパレーター行かチェック
          if (i + 1 < lines.length) {
            var nextLine = lines[i + 1].trim();
            if (nextLine.match(/^\|[\s\-:]+\|$/)) {
              // テーブル開始
              inTable = true;
              if (inList) {
                result.push('</ul>');
                inList = false;
              }
              result.push('<table>');
              result.push('<thead>');
              result.push('<tr>');

              // ヘッダー行を処理
              var headers = trimmedLine.split('|').slice(1, -1);
              for (var h = 0; h < headers.length; h++) {
                result.push('<th>' + headers[h].trim() + '</th>');
              }
              result.push('</tr>');
              result.push('</thead>');
              result.push('<tbody>');

              // セパレーター行をスキップ
              i++;
              continue;
            }
          }
        }

        // テーブル内の行を処理
        if (inTable && trimmedLine.match(/^\|(.+)\|$/)) {
          result.push('<tr>');
          var cells = trimmedLine.split('|').slice(1, -1);
          for (var c = 0; c < cells.length; c++) {
            result.push('<td>' + cells[c].trim() + '</td>');
          }
          result.push('</tr>');
          continue;
        }

        // テーブルの終了
        if (inTable && !trimmedLine.match(/^\|(.+)\|$/)) {
          result.push('</tbody>');
          result.push('</table>');
          inTable = false;
        }

        // リスト処理 (- item or * item)
        if (/^[\-\*] (.+)$/.test(line)) {
          if (inTable) {
            result.push('</tbody>');
            result.push('</table>');
            inTable = false;
          }
          if (!inList) {
            result.push('<ul>');
            inList = true;
          }
          result.push('<li>' + line.replace(/^[\-\*] /, '') + '</li>');
        } else if (!inTable) {
          if (inList) {
            result.push('</ul>');
            inList = false;
          }
          result.push(line);
        }
      }

      // 未閉のタグを閉じる
      if (inList) {
        result.push('</ul>');
      }
      if (inTable) {
        result.push('</tbody>');
        result.push('</table>');
      }

      // 改行を<br>に変換
      var html = result.join('\n').replace(/\n/g, '<br>');

      return html;
    },

    /**
     * ドラッグ機能を設定
     * @private
     */
    _setupDragging: function(container) {
      var header = container.querySelector('.rs-textarea-header');
      var isDragging = false;
      var currentX;
      var currentY;
      var initialX;
      var initialY;
      var xOffset = 0;
      var yOffset = 0;

      header.style.cursor = 'move';

      header.addEventListener('mousedown', function(e) {
        // クローズボタンをクリックした場合はドラッグを開始しない
        if (e.target.classList.contains('rs-textarea-close')) {
          return;
        }

        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === header || e.target.classList.contains('rs-textarea-title')) {
          isDragging = true;
        }
      });

      document.addEventListener('mousemove', function(e) {
        if (isDragging) {
          e.preventDefault();

          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;

          xOffset = currentX;
          yOffset = currentY;

          // 境界チェック
          var padding = 20;
          var rect = container.getBoundingClientRect();
          var maxX = window.innerWidth - rect.width - padding;
          var maxY = window.innerHeight - rect.height - padding;

          var newX = parseInt(container.style.left) + currentX;
          var newY = parseInt(container.style.top) + currentY;

          newX = Math.max(padding, Math.min(newX, maxX));
          newY = Math.max(padding, Math.min(newY, maxY));

          container.style.left = newX + 'px';
          container.style.top = newY + 'px';

          // オフセットをリセット
          initialX = e.clientX;
          initialY = e.clientY;
          xOffset = 0;
          yOffset = 0;
        }
      });

      document.addEventListener('mouseup', function() {
        isDragging = false;
      });
    }
  };
})();
