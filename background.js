chrome.runtime.onInstalled.addListener(function() {
    console.log('Extension installed');
});

// 监听来自弹出页或内容脚本的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received in background script:', request);
    // 处理消息...
});
    