// 一个简单的代理服务器，用于转发 LLM API 请求，解决 CORS 问题
import { serve } from 'bun';

// 定义端口
const PORT = 3100;

// 启动服务器
serve({
    port: PORT,
    async fetch(req) {
        try {
            // 解析URL和查询参数
            const url = new URL(req.url);            // 健康检查端点
            if (url.pathname === '/health' || url.pathname === '/') {
                return new Response(
                    JSON.stringify({ status: 'ok', message: 'LLM代理服务器正在运行' }),
                    {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    }
                );
            }

            // 检查路径，允许 /api/llm-proxy
            if (!url.pathname.endsWith('/api/llm-proxy')) {
                return new Response('Not Found', { status: 404 });
            }

            // 首先处理 OPTIONS 请求 - 这样可以让前端检测服务器是否运行
            if (req.method === 'OPTIONS') {
                return new Response(null, {
                    status: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }

            // 非 OPTIONS 请求才需要检查参数
            // 解析查询参数中的apiKey和baseUrl
            const apiKey = url.searchParams.get('apiKey');
            let baseUrl = url.searchParams.get('baseUrl');

            if (!apiKey || !baseUrl) {
                return new Response(
                    JSON.stringify({ error: '缺少必要参数: apiKey 或 baseUrl' }),
                    {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'POST, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type'
                        }
                    }
                );
            }

            // 确保 baseUrl 是有效的完整 URL
            try {
                // 尝试创建 URL 对象，这会验证 URL 格式
                const urlObj = new URL(baseUrl);

                // 检查是否包含完整的API路径，特别是针对常见的LLM API
                if (baseUrl.includes('deepseek.com') && !baseUrl.includes('/v1/')) {
                    console.log('检测到 DeepSeek API URL 可能不完整，添加 v1/chat/completions 路径');
                    baseUrl = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
                }
                if (baseUrl.includes('openai.com') && !baseUrl.includes('/v1/')) {
                    console.log('检测到 OpenAI API URL 可能不完整，添加 v1/chat/completions 路径');
                    baseUrl = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
                }

                console.log('最终使用的 API URL:', baseUrl);

            } catch (error) {
                return new Response(
                    JSON.stringify({ error: `无效的 baseUrl: ${baseUrl}` }),
                    {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'POST, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type'
                        }
                    }
                );
            }

            // 只允许 POST 请求
            if (req.method !== 'POST') {
                return new Response(
                    JSON.stringify({ error: '只支持 POST 请求' }),
                    {
                        status: 405,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    }
                );
            }

            // 读取请求体
            const requestBody = await req.json();

            try {
                console.log(`正在转发请求到: ${baseUrl}`);
                console.log(`请求模型: ${requestBody.model}`);
                console.log(`请求头: Authorization: Bearer ${apiKey.substring(0, 5)}...`);

                // 转发请求到目标 API
                const response = await fetch(baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(requestBody)
                });

                console.log(`API 响应状态: ${response.status} ${response.statusText}`);

                if (!response.ok) {
                    let errorText;
                    try {
                        const errorData = await response.json();
                        console.error('API 返回错误:', errorData);
                        errorText = JSON.stringify(errorData);
                    } catch (e) {
                        errorText = await response.text();
                        console.error('API 返回错误文本:', errorText);
                    }

                    return new Response(
                        JSON.stringify({
                            error: `目标API请求失败: ${response.status} ${response.statusText}`,
                            details: {
                                statusCode: response.status,
                                statusText: response.statusText,
                                responseText: errorText,
                                requestUrl: baseUrl
                            }
                        }),
                        {
                            status: response.status,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            }
                        }
                    );
                }

                // 读取响应
                const responseData = await response.json();
                console.log('API 响应成功:',
                    responseData.choices ?
                        `收到 ${responseData.choices.length} 个选项` :
                        '响应格式异常');

                // 返回带有 CORS 头的响应
                return new Response(
                    JSON.stringify(responseData),
                    {
                        status: response.status,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    }
                );
            } catch (error) {
                console.error(`转发请求到 ${baseUrl} 失败:`, error);

                // 返回详细错误响应
                return new Response(
                    JSON.stringify({
                        error: `代理服务器转发请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
                        details: {
                            baseUrl,
                            errorType: error instanceof Error ? error.name : 'Unknown',
                            errorMessage: error instanceof Error ? error.message : String(error)
                        }
                    }),
                    {
                        status: 502, // Bad Gateway
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    }
                );
            }
        } catch (error) {
            console.error('代理请求错误:', error);

            // 返回错误响应
            return new Response(
                JSON.stringify({ error: `代理服务器错误: ${error instanceof Error ? error.message : '未知错误'}` }),
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        }
    }
});

console.log(`LLM 代理服务器运行在 http://localhost:${PORT}/api/llm-proxy`);
console.log(`健康检查端点: http://localhost:${PORT}/health`);
console.log('该服务器帮助解决浏览器跨域访问 OpenAI API 的问题');
console.log('使用方式: 在 LLM 设置中勾选"使用代理"并将代理地址设为 http://localhost:3100/api/llm-proxy');
