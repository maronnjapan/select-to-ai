// 既存のClaudeタブを検索して再利用するbackground script

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openClaude') {
    handleOpenClaude(message.prompt).then(sendResponse);
    return true; // 非同期レスポンスを示す
  }
});

async function handleOpenClaude(prompt) {
  try {
    // プロンプトをstorageに保存
    await browser.storage.local.set({
      pendingPrompt: prompt,
      promptTimestamp: Date.now()
    });

    // 既存のClaudeタブを検索
    const tabs = await browser.tabs.query({ url: 'https://claude.ai/*' });

    if (tabs.length > 0) {
      // 既存タブを再利用
      const claudeTab = tabs[0];

      // タブをアクティブにしてウィンドウをフォーカス
      await browser.tabs.update(claudeTab.id, { active: true });
      await browser.windows.update(claudeTab.windowId, { focused: true });

      // 新しい会話ページに移動
      await browser.tabs.update(claudeTab.id, { url: 'https://claude.ai/new' });

      return { success: true, reused: true };
    } else {
      // 新しいタブで開く（モバイルではポップアップウィンドウがサポートされないため）
      await browser.tabs.create({ url: 'https://claude.ai/new' });

      return { success: true, reused: false };
    }
  } catch (error) {
    console.error('Reading Support: エラーが発生しました', error);
    return { success: false, error: error.message };
  }
}
