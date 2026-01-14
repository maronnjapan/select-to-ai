// 既存のClaudeタブを検索して再利用するbackground service worker

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openGenAi') {
    handleOpenGenAi(
      message.prompt,
      message.launchGenAi,
      sender.tab.id,
      message.reuseExistingChat,
      message.activateTab
    ).then(sendResponse);
    return true; // 非同期レスポンスを示す
  }

  // AIポップアップウィンドウを使用するため、AI回答の転送は不要になりました
  // if (message.action === 'aiResponse') {
  //   handleAiResponse(message.response, message.originTabId, message.isComplete);
  //   return false;
  // }
});

async function handleOpenGenAi(prompt, launchGenAi, originTabId, reuseExistingChat, activateTab) {
  try {
    // デフォルト値を設定
    reuseExistingChat = reuseExistingChat || false;
    activateTab = activateTab !== false; // デフォルトはtrue

    // プロンプトをstorageに保存（送信元タブIDも保存）
    await chrome.storage.local.set({
      launchGenAi,
      pendingPrompt: prompt,
      promptTimestamp: Date.now(),
      originTabId: originTabId
    });

    const url = launchGenAi === 'chatgpt' ? 'https://chatgpt.com/new' : 'https://claude.ai/new';

    // 既存のGenAIタブを検索（ワイルドカードパターンを使用してすべての会話を含める）
    const urlPattern = launchGenAi === 'chatgpt' ? 'https://chatgpt.com/*' : 'https://claude.ai/*';
    const tabs = await chrome.tabs.query({ url: urlPattern });

    if (tabs.length > 0) {
      // 既存タブを再利用
      const genAiTab = tabs[0];

      // reuseExistingChat が true の場合、既存のチャットに続けて送信（URLを変更しない）
      // false の場合、新しいチャットを開始（/new に移動）
      if (!reuseExistingChat) {
        await chrome.tabs.update(genAiTab.id, { url });
      } else {
        // 既存チャットを再利用する場合、タブに直接メッセージを送信
        // ページがリロードされないため、claude-inject.js に直接プロンプトを送る
        try {
          await chrome.tabs.sendMessage(genAiTab.id, {
            action: 'insertPrompt',
            prompt: prompt,
            originTabId: originTabId
          });
        } catch (error) {
          console.error('Reading Support: プロンプト送信に失敗しました', error);
          // エラーが発生した場合でもストレージに保存されているので、
          // タブのリロードや再訪問時に処理される
        }
      }

      // activateTab が true の場合のみ、タブをアクティブにする
      if (activateTab) {
        await chrome.tabs.update(genAiTab.id, { active: true });
        await chrome.windows.update(genAiTab.windowId, { focused: true });
      }

      // 既存ウィンドウも常に最前面に設定
      await chrome.windows.update(genAiTab.windowId, {
        focused: true,
        drawAttention: true
      });

      return { success: true, reused: true };
    } else {
      // 新しいウィンドウで開く（常に最前面に表示）
      await chrome.windows.create({
        url,
        type: 'popup',
        width: 400,
        height: 700,
        left: 20,
        top: 100,
        alwaysOnTop: true,  // 常に最前面に表示
        focused: true
      });

      return { success: true, reused: false };
    }
  } catch (error) {
    console.error('Reading Support: エラーが発生しました', error);
    return { success: false, error: error.message };
  }
}

// AIポップアップウィンドウを使用するため、AI回答の転送は不要になりました
// async function handleAiResponse(response, originTabId, isComplete) {
//   try {
//     // 元のタブに回答を送信
//     await chrome.tabs.sendMessage(originTabId, {
//       action: 'displayAiResponse',
//       response: response,
//       isComplete: isComplete
//     });
//   } catch (error) {
//     console.error('Reading Support: 回答の転送に失敗しました', error);
//   }
// }
