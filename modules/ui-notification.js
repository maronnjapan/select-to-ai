/**
 * modules/ui-notification.js
 * 通知表示UI
 *
 * 依存: なし（RS名前空間のみ）
 *
 * 公開API:
 *   RS.showNotification(message) - トースト通知を表示
 */

(function() {
  'use strict';

  // 通知の表示時間（ミリ秒）
  var NOTIFICATION_DURATION = 2000;
  var FADE_OUT_DURATION = 300;

  /**
   * トースト形式の通知を表示
   * 画面右下に表示され、一定時間後にフェードアウト
   *
   * @param {string} message - 表示するメッセージ
   */
  RS.showNotification = function(message) {
    var notification = document.createElement('div');
    notification.className = 'rs-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(function() {
      notification.classList.add('rs-notification-hide');
      setTimeout(function() {
        notification.remove();
      }, FADE_OUT_DURATION);
    }, NOTIFICATION_DURATION);
  };
})();
