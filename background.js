// 既存のClaudeタブを検索して再利用するbackground service worker

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openGenAi') {
    handleOpenGenAi(message.prompt, message.launchGenAi).then(sendResponse);
    return true; // 非同期レスポンスを示す
  }
});

async function handleOpenGenAi(prompt, launchGenAi) {
  try {
    // プロンプトをstorageに保存
    await chrome.storage.local.set({
      launchGenAi,
      pendingPrompt: prompt,
      promptTimestamp: Date.now()
    });

    const url = launchGenAi === 'chatgpt' ? 'https://chatgpt.com/new' : 'https://claude.ai/new';

    // 既存のGenAIタブを検索
    const tabs = await chrome.tabs.query({ url });

    if (tabs.length > 0) {
      // 既存タブを再利用
      const genAiTab = tabs[0];

      // タブをアクティブにしてウィンドウをフォーカス
      await chrome.tabs.update(genAiTab.id, { active: true });
      await chrome.windows.update(genAiTab.windowId, { focused: true });
      // 新しい会話ページに移動（既存の会話を維持しつつ新規会話を開始）
      await chrome.tabs.update(genAiTab.id, { url });

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
