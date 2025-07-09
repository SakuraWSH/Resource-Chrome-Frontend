document.addEventListener('DOMContentLoaded', function() {
    const status = document.getElementById('status');
    const sourceCodeElement = document.getElementById('sourceCode');

    // 显示加载状态
    status.textContent = 'Loading page source...';
    status.className = 'status loading';

    // 获取当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const tab = tabs[0];
        
        // 执行脚本获取页面源代码
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            function: () => document.documentElement.outerHTML
        }).then((results) => {
            if (results && results[0] && results[0].result) {
                const sourceCode = results[0].result;
                sourceCodeElement.textContent = sourceCode;
                
                status.textContent = `Loaded ${sourceCode.length} characters`;
                status.className = 'status success';
            } else {
                throw new Error('No result returned');
            }
        }).catch((error) => {
            console.error('Error:', error);
            status.textContent = 'Failed to load source code';
            status.className = 'status error';
        });
    });
});
    