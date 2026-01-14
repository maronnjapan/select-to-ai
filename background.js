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

  if (message.action === 'aiResponse') {
    // AIタブからの回答を元のタブに転送
    handleAiResponse(message.response, message.originTabId, message.isComplete);
    return false;
  }
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
      }

      // activateTab が true の場合のみ、タブをアクティブにする
      if (activateTab) {
        await chrome.tabs.update(genAiTab.id, { active: true });
        await chrome.windows.update(genAiTab.windowId, { focused: true });
      }

      return { success: true, reused: true };
    } else {
      // 新しいウィンドウで開く
      await chrome.windows.create({
        url,
        type: 'popup',
        width: 600,
        height: 700
      });

      return { success: true, reused: false };
    }
  } catch (error) {
    console.error('Reading Support: エラーが発生しました', error);
    return { success: false, error: error.message };
  }
}

async function handleAiResponse(response, originTabId, isComplete) {
  try {
    // 元のタブに回答を送信
    await chrome.tabs.sendMessage(originTabId, {
      action: 'displayAiResponse',
      response: response,
      isComplete: isComplete
    });
  } catch (error) {
    console.error('Reading Support: 回答の転送に失敗しました', error);
  }
}
