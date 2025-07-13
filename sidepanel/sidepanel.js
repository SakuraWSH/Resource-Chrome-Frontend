document.addEventListener('DOMContentLoaded', function() {
    const status = document.getElementById('status');
    const sourceCodeElement = document.getElementById('sourceCode');

    // 显示加载状态
    status.textContent = 'Loading page source...';
    status.className = 'status loading';

    // 获取当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length === 0) {
            updateStatus('No active tab found', 'error');
            return;
        }

        const tab = tabs[0];

        // 执行脚本获取页面源代码
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => document.documentElement.outerHTML
        }).then((results) => {
            if (chrome.runtime.lastError) {
                throw new Error(chrome.runtime.lastError.message);
            }

            if (results && results[0] && results[0].result) {
                let sourceCode = results[0].result;
                sourceCode = processSourceCode(sourceCode); // 使用原有处理逻辑
                
                sourceCodeElement.textContent = sourceCode;
                document.getElementById('resourceurl').value = tab.url;
                updateStatus(`Loaded ${sourceCode.length} characters`, 'success');
            } else {
                throw new Error('No result returned');
            }
        }).catch((error) => {
            console.error('Error:', error);
            updateStatus('Failed to load source code: ' + error.message, 'error');
        });
    });

    // 保留原有的源代码处理逻辑
    function processSourceCode(sourceCode) {
        // 创建一个临时的 DOM 元素来解析 HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sourceCode;

        // 过滤不可见元素
        const allElements = tempDiv.getElementsByTagName('*');
        for (let i = allElements.length - 1; i >= 0; i--) {
            const element = allElements[i];
            const style = window.getComputedStyle(element);
            if (
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                parseFloat(style.opacity) === 0
            ) {
                element.parentNode.removeChild(element);
            }
        }

        // 获取过滤后的源代码
        sourceCode = tempDiv.innerHTML;
        // 移除 CSS 片段
        sourceCode = sourceCode.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        sourceCode = sourceCode.replace(/<link[^>]*rel="stylesheet"[^>]*>/gi, '');
        // 删除 HTML 注释
        sourceCode = sourceCode.replace(/<!--[\s\S]*?-->/g, '');
        // 删除 script 标签及其内容
        sourceCode = sourceCode.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        sourceCode = sourceCode.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        // 删除标签前后的空格，并只保留最原始的标签名称
        sourceCode = sourceCode.replace(/\s*<(\/?)([^ >]+)[^>]*>\s*/g, '<$1$2>');
        // 移除多个空格和换行符
        sourceCode = sourceCode.replace(/\s+/g, ' ').trim();
        // 合并嵌套的相同标签
        sourceCode = mergeNestedTags(sourceCode);
        // 递归删除空标签
        sourceCode = removeEmptyTags(sourceCode);

        return sourceCode;
    }

    // 合并嵌套的相同标签的函数
    function mergeNestedTags(html) {
        const tagRegex = /<(\/?)([^>]+)>/g;
        let matches;
        const stack = [];
        let result = '';
        let lastIndex = 0;

        while ((matches = tagRegex.exec(html)) !== null) {
            const isClosing = matches[1] === '/';
            const tagName = matches[2];
            const matchIndex = matches.index;
            const matchLength = matches[0].length;

            result += html.substring(lastIndex, matchIndex);
            lastIndex = matchIndex + matchLength;

            if (isClosing) {
                if (stack.length > 0 && stack[stack.length - 1] === tagName) {
                    stack.pop();
                    if (stack.length > 0 && stack[stack.length - 1] === tagName) {
                        continue;
                    }
                }
                result += `</${tagName}>`;
            } else {
                if (stack.length > 0 && stack[stack.length - 1] === tagName) {
                    continue;
                }
                stack.push(tagName);
                result += `<${tagName}>`;
            }
        }

        result += html.substring(lastIndex);
        return result;
    }

    // 递归删除空标签的函数
    function removeEmptyTags(html) {
        let prevHtml;
        do {
            prevHtml = html;
            html = html.replace(/<([^>]+)><\/\1>/g, '');
        } while (html !== prevHtml);
        return html;
    }

    // 更新状态显示
    function updateStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
    }

    // 处理下载按钮点击事件
    document.getElementById('downloadButton').addEventListener('click', function() {
        const formData = {
            identifier: document.getElementById('identifier').value || null,
            name: document.getElementById('name').value || null,
            description: document.getElementById('description').value || null,
            keyword: document.getElementById('keyword').value || null,
            dataofcreate: document.getElementById('dataofcreate').value || null,
            dataoflast: document.getElementById('dataoflast').value || null,
            resourceurl: document.getElementById('resourceurl').value || null,
            resourceauthor: document.getElementById('resourceauthor').value || null,
            resourceorginazation: document.getElementById('resourceorginazation').value || null,
            authoremail: document.getElementById('authoremail').value || null,
            journal: document.getElementById('journal').value || null,
            sourceCode: sourceCodeElement.textContent
        };

        const jsonData = JSON.stringify(formData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'page_source_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();

        URL.revokeObjectURL(url);
    });
});