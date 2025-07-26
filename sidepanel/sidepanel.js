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
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
}

// 处理源代码的逻辑（保持原有逻辑不变）
function processSourceCode(sourceCode) {
    // 创建临时DOM元素解析HTML
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
    // 移除CSS片段
    sourceCode = sourceCode.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    sourceCode = sourceCode.replace(/<link[^>]*rel="stylesheet"[^>]*>/gi, '');
    // 删除HTML注释
    sourceCode = sourceCode.replace(/<!--[\s\S]*?-->/g, '');
    // 删除script标签及其内容
    sourceCode = sourceCode.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    sourceCode = sourceCode.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // 简化标签格式
    sourceCode = sourceCode.replace(/\s*<(\/?)([^ >]+)[^>]*>\s*/g, '<$1$2>');
    // 移除多余空格和换行
    sourceCode = sourceCode.replace(/\s+/g, ' ').trim();
    // 合并嵌套相同标签
    sourceCode = mergeNestedTags(sourceCode);
    // 递归删除空标签
    sourceCode = removeEmptyTags(sourceCode);

    return sourceCode;
}

// 发送处理后的HTML到后端并获取元数据
async function sendHtmlToBackend(processedHtml) {
    try {
        updateStatus('正在向服务器发送数据...', '');
        
        // 替换为你的后端API地址
        const response = await fetch('http://127.0.0.1:9000/info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                html: processedHtml,  // 发送处理后的HTML
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }

        const metadata = await response.json();
        updateStatus('元数据获取成功', 'success');
        return metadata;
    } catch (error) {
        updateStatus(`获取元数据失败: ${error.message}`, 'error');
        console.error('请求错误:', error);
        return null;
    }
}

// 更新页面元数据显示
function updateMetadataDisplay(metadata) {
    if (!metadata) return;

    // 遍历元数据并更新对应的DOM元素
    Object.keys(metadata).forEach(key => {
        const element = document.getElementById(key);
        if (element && element.classList.contains('value-display')) {
            element.textContent = metadata[key].value || metadata[key];
            
            // 更新状态图标
            const parentDiv = element.parentElement;
            const statusIcon = parentDiv.querySelector('.status-icon');
            if (statusIcon && metadata[key].status) {
                statusIcon.className = '';
                statusIcon.className = `status-icon status-${metadata[key].status}`;
            }
        }
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化状态显示
    const status = document.getElementById('status');
    status.textContent = '正在加载...';
    status.className = 'status loading';

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: ()  => document.documentElement.outerHTML,
        }).then((results) => { 
            if (results && results[0] && results[0].result) {
                pageSource = results[0].result;
                sourceCode = processSourceCode(pageSource);
                document.getElementById('sourceCode').textContent = sourceCode;
                updateStatus(`Loaded ${sourceCode.length} characters`, 'success');
                sendHtmlToBackend(sourceCode);
            }
        }); 
    });
});

// 元数据切换逻辑
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // 移除所有按钮的active类
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        // 给当前点击的按钮添加active类
        this.classList.add('active');
        
        // 隐藏所有元数据区域
        document.querySelectorAll('.metadata-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // 显示对应的元数据区域
        const format = this.getAttribute('data-format');
        document.getElementById(`${format}Metadata`).style.display = 'block';
    });
});