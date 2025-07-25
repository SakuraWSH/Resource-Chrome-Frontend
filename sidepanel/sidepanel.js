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

    // 元数据格式切换功能
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const metadataSections = document.querySelectorAll('.metadata-section');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按钮的active类
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            // 给当前点击的按钮添加active类
            this.classList.add('active');
            
            // 获取要显示的格式
            const format = this.getAttribute('data-format');
            
            // 隐藏所有元数据区块
            metadataSections.forEach(section => {
                section.style.display = 'none';
            });
            
            // 显示对应的元数据区块
            document.getElementById(`${format}Metadata`).style.display = 'block';
        });
    });

    // 下载按钮点击事件 - 严格遵循standard.json的结构
    document.getElementById('downloadButton').addEventListener('click', function() {
        // 获取当前激活的格式
        const activeFormat = document.querySelector('.toggle-btn.active').getAttribute('data-format');
        let jsonData = {};
        
        // 根据当前激活的格式构建对应JSON结构
        if (activeFormat === 'core') {
            // 核心元数据结构
            jsonData = {
                "核心元数据": {
                    "标识符": document.getElementById('identifier').value || null,
                    "资源名称": document.getElementById('name').value || null,
                    "描述": document.getElementById('description').value || null,
                    "关键词": document.getElementById('keyword').value || null,
                    "生成日期": document.getElementById('dataofcreate').value || null,
                    "注册日期": document.getElementById('dateregister').value || null,
                    "最新发布日期": document.getElementById('dataoflast').value || null,
                    "学科分类": document.getElementById('discipline').value || null,
                    "主题分类": document.getElementById('theme').value || null,
                    "知识产权类别": document.getElementById('ipcategory').value || null,
                    "资源使用许可": document.getElementById('permission').value || null,
                    "资源访问地址": document.getElementById('resourceurl').value || null,
                    "共享方式": {
                        "共享途径": document.getElementById('sharemethod').value || null,
                        "共享范围": document.getElementById('sharerange').value || null,
                        "申请流程": document.getElementById('applyprocess').value || null
                    },
                    "提供方信息": {
                        "提供方名称": document.getElementById('provider').value || null,
                        "提供方详细地址": document.getElementById('provideraddr').value || null,
                        "提供方邮政编码": document.getElementById('providerzip').value || null,
                        "提供方联系人": document.getElementById('providercontact').value || null,
                        "提供方联系电话": document.getElementById('providertel').value || null,
                        "提供方电子邮箱": document.getElementById('provideremail').value || null,
                        "提供方网站": document.getElementById('providerwebsite').value || null
                    },
                    "服务方信息": {
                        "服务方名称": document.getElementById('server').value || null,
                        "服务方详细地址": document.getElementById('serveraddr').value || null,
                        "服务方邮政编码": document.getElementById('serverzip').value || null,
                        "服务方联系人": document.getElementById('servercontact').value || null,
                        "服务方联系电话": document.getElementById('servertel').value || null,
                        "服务方电子邮箱": document.getElementById('serveremail').value || null,
                        "服务方网站": document.getElementById('serverwebsite').value || null
                    }
                }
            };
        } else if (activeFormat === 'dataset') {
            // 数据集元数据结构（包含核心元数据概念）
            jsonData = {
                "数据集元数据": {
                    "数据集基本信息": {
                        "标识符": document.getElementById('dataset_identifier').value || null,
                        "标题": document.getElementById('dataset_title').value || null,
                        "摘要": document.getElementById('dataset_abstract').value || null,
                        "关键词": document.getElementById('dataset_keyword').value || null,
                        "范围": {
                            "时间范围": document.getElementById('time_range').value || null,
                            "空间范围": document.getElementById('space_range').value || null
                        },
                        "语种": document.getElementById('language').value || null,
                        "文件内容": document.getElementById('file_content').value || null,
                        "基金项目": document.getElementById('fund_project').value || null,
                        "数据量": document.getElementById('data_volume').value || null,
                        "数据格式": document.getElementById('data_format').value || null,
                        "数据集作者": {
                            "作者姓名": document.getElementById('author_name').value || null,
                            "工作单位": document.getElementById('work_unit').value || null,
                            "电子邮箱": document.getElementById('author_email').value || null,
                            "工作贡献": document.getElementById('work_contribution').value || null,
                            "作者简介": document.getElementById('author_bio').value || null
                        }
                    },
                    "数据集出版信息": {
                        "发布日期": document.getElementById('publish_date').value || null,
                        "出版期刊": document.getElementById('publish_journal').value || null,
                        "版本信息": document.getElementById('version_info').value || null
                    },
                    "数据集服务信息": {
                        "数据集引用格式": document.getElementById('citation_format').value || null,
                        "数据集共享许可协议": document.getElementById('license_agreement').value || null,
                        "数据集使用声明": document.getElementById('usage_statement').value || null,
                        "数据集下载地址": document.getElementById('download_url').value || null,
                        "数据论文访问地址": document.getElementById('paper_url').value || null
                    }
                }
            };
        } else if (activeFormat === 'paper') {
            // 数据论文元数据结构（包含数据集信息）
            jsonData = {
                "数据论文元数据": {
                    "数据论文内容信息": {
                        "标识符": document.getElementById('paper_identifier').value || null,
                        "标题": document.getElementById('paper_title').value || null,
                        "摘要": document.getElementById('paper_abstract').value || null,
                        "关键词": document.getElementById('paper_keyword').value || null,
                        "数据集基本信息": {
                            "标识符": document.getElementById('related_dataset_id').value || null,
                            "标题": document.getElementById('related_dataset_title').value || null
                        },
                        "引言": document.getElementById('introduction').value || null,
                        "数据采集和处理方法": document.getElementById('methodology').value || null,
                        "数据样本描述": document.getElementById('sample_desc').value || null,
                        "数据质量控制和评估": document.getElementById('quality_control').value || null,
                        "数据使用方法和建议": document.getElementById('usage_suggestion').value || null,
                        "参考文献": document.getElementById('references').value || null,
                        "致谢": document.getElementById('acknowledgements').value || null,
                        "数据论文作者": {
                            "作者姓名": document.getElementById('paper_author_name').value || null,
                            "工作单位": document.getElementById('paper_author_unit').value || null,
                            "电子邮箱": document.getElementById('paper_author_email').value || null
                        }
                    },
                    "数据论文出版信息": {
                        "收稿日期": document.getElementById('receive_date').value || null,
                        "同评日期": document.getElementById('review_date').value || null,
                        "录用日期": document.getElementById('accept_date').value || null,
                        "出版日期": document.getElementById('paper_publish_date').value || null,
                        "出版期刊": document.getElementById('paper_journal').value || null
                    },
                    "数据论文服务信息": {
                        "数据论文引用格式": document.getElementById('paper_citation').value || null,
                        "数据论文下载地址": document.getElementById('paper_download_url').value || null,
                        "数据论文共享许可协议": document.getElementById('paper_license').value || null
                    }
                }
            };
        }
        
        // 添加源代码信息
        jsonData.sourceCode = sourceCodeElement.textContent;
        
        // 下载JSON文件
        const jsonString = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeFormat}_metadata_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();

        URL.revokeObjectURL(url);
    });
});