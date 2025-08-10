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
        updateMetadataDisplay(metadata);
        updateStatus('元数据获取成功', 'success');
        return metadata;
    } catch (error) {
        updateStatus(`获取元数据失败: ${error.message}`, 'error');
        console.error('请求错误:', error);
        return null;
    }
}

// 更新页面元数据显示
// 更新页面元数据显示
function updateMetadataDisplay(metadata) {
    if (!metadata) return;

    // 映射后端字段到页面元素ID
    const fieldMappings = {
        '标识符': 'identifier',
        '资源名称': 'name',
        '描述': 'description',
        '关键词': 'keyword',
        '生成日期': 'dataofcreate',
        '学科分类': 'discipline',
        '主题分类': 'theme',
        '资源访问地址': 'resourceurl',
        '共享方式.共享途径': 'sharemethod',
        '共享方式.共享范围': 'sharerange',
        '共享方式.申请流程': 'applyprocess',
        '提供方信息.提供方名称': 'provider',
        '提供方信息.提供方联系人': 'providercontact',
        '提供方信息.提供方电子邮箱': 'provideremail'
    };

    // 处理一级字段
    Object.keys(metadata).forEach(key => {
        // 如果是嵌套对象（如共享方式、提供方信息）
        if (typeof metadata[key] === 'object' && metadata[key] !== null && !metadata[key].hasOwnProperty('value')) {
            Object.keys(metadata[key]).forEach(subKey => {
                const fullKey = `${key}.${subKey}`;
                const elementId = fieldMappings[fullKey];
                updateElement(elementId, metadata[key][subKey]);
            });
        } else {
            const elementId = fieldMappings[key];
            updateElement(elementId, metadata[key]);
        }
    });
}

// 辅助函数：更新单个元素
function updateElement(elementId, data) {
    if (!elementId || !data) return;
    
    const element = document.getElementById(elementId);
    if (element && element.classList.contains('value-display')) {
        // 设置值
        element.textContent = data.value || '';
        
        // 更新状态图标
        const parentDiv = element.parentElement;
        const statusIcon = parentDiv.querySelector('.status-icon');
        if (statusIcon && typeof data.label !== 'undefined') {
            // 清除之前的状态类
            statusIcon.className = 'status-icon';
            
            // 根据label设置状态类和内容
            switch(data.label) {
                case 0:
                    statusIcon.classList.add('status-question');
                    statusIcon.textContent = '?';
                    break;
                case 1:
                    statusIcon.classList.add('status-check');
                    statusIcon.textContent = '✓';
                    break;
                case 2:
                    statusIcon.classList.add('status-cross');
                    statusIcon.textContent = '✗';
                    break;
            }
        }
    }
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