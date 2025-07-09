import React, { useState, useEffect } from 'react';
import { LLMConfig, useGameStore } from '../store/gameStore';
import { themeService } from '../services/ThemeService';

interface LLMSettingsProps {
  onClose: () => void;
}

export const LLMSettings: React.FC<LLMSettingsProps> = ({ onClose }) => {
  const { llmConfig, setLLMConfig } = useGameStore();
  const [currentTheme] = useState(themeService.getCurrentTheme());
  
  // LLM 配置表单状态
  const [baseUrl, setBaseUrl] = useState<string>(llmConfig?.baseUrl || 'https://api.deepseek.com/v1/chat/completions');
  const [modelName, setModelName] = useState<string>(llmConfig?.modelName || 'deepseek-chat');
  const [apiKey, setApiKey] = useState<string>(llmConfig?.apiKey || 'sk-81cdc255a6d24f9e9fe954c6c842ddab');
  const [temperature, setTemperature] = useState<number>(llmConfig?.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState<number>(llmConfig?.maxTokens || 100);
  const [useProxy, setUseProxy] = useState<boolean>(llmConfig?.useProxy || false);
  const [proxyUrl, setProxyUrl] = useState<string>(llmConfig?.proxyUrl || 'http://localhost:3100/api/llm-proxy');
  
  // 测试状态
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [proxyStatus, setProxyStatus] = useState<'unknown' | 'running' | 'not-running'>('unknown');
  
  // 检查代理服务器是否运行
  const checkProxyStatus = async () => {
    try {
      console.log('检测代理服务器状态:', proxyUrl);
      
      // 提取基础URL部分
      let baseProxyUrl;
      try {
        const urlObj = new URL(proxyUrl);
        baseProxyUrl = `${urlObj.protocol}//${urlObj.host}/health`;
      } catch (e) {
        console.warn('无法解析代理URL:', proxyUrl);
        baseProxyUrl = 'http://localhost:3100/health';
      }
      
      console.log('尝试访问健康检查端点:', baseProxyUrl);
      
      // 尝试访问代理服务器的健康检查端点
      const response = await fetch(baseProxyUrl, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // 增加超时设置，避免长时间等待
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        console.log('代理服务器健康检查通过');
        setProxyStatus('running');
        return true;
      } else {
        console.log('代理服务器健康检查失败:', response.status);
      }
      
      // 如果健康检查端点不可用，则尝试基本的连接测试
      const baseUrlOnly = baseProxyUrl.replace('/health', '');
      const optionsResponse = await fetch(baseUrlOnly, { 
        method: 'OPTIONS',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2000)
      });
      
      console.log('代理服务器OPTIONS响应:', optionsResponse.status);
      setProxyStatus('running');
      return true;
    } catch (error) {
      console.error('代理服务器检查失败:', error);
      
      // 最后尝试完整的代理URL
      try {
        console.log('尝试直接访问代理URL:', proxyUrl);
        const response = await fetch(proxyUrl, { 
          method: 'OPTIONS',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(2000)
        });
        
        console.log('完整URL代理服务器响应状态:', response.status);
        setProxyStatus('running');
        return true;
      } catch (retryError) {
        console.error('所有检查方法均失败:', retryError);
        setProxyStatus('not-running');
        return false;
      }
    }
  };
  
  // 组件加载时检查代理状态
  useEffect(() => {
    if (useProxy) {
      checkProxyStatus();
    }
  }, [useProxy, proxyUrl]);
  
  // 从本地存储加载配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('gobang_llm_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig) as LLMConfig;
        setBaseUrl(config.baseUrl || 'https://api.deepseek.com/v1/chat/completions');
        setModelName(config.modelName || 'deepseek-chat');
        setApiKey(config.apiKey || 'sk-81cdc255a6d24f9e9fe954c6c842ddab');
        setTemperature(config.temperature || 0.7);
        setMaxTokens(config.maxTokens || 100);
        setUseProxy(config.useProxy || false);
        setProxyUrl(config.proxyUrl || 'http://localhost:3100/api/llm-proxy');

        // 同时更新到 store
        setLLMConfig(config);
      } catch (e) {
        console.error('无法解析保存的LLM配置', e);
      }
    }
  }, [setLLMConfig]);
  
  const handleSave = () => {
    const newConfig: LLMConfig = {
      baseUrl,
      modelName,
      apiKey,
      temperature,
      maxTokens,
      useProxy,
      proxyUrl
    };
    
    // 保存到 store
    setLLMConfig(newConfig);
    
    // 保存到本地存储
    localStorage.setItem('gobang_llm_config', JSON.stringify(newConfig));
    
    onClose();
  };
  
  // 检查并提供API URL建议
  const checkAPIUrl = (url: string): string | null => {
    // 检查是否是常见的LLM服务商但缺少API路径
    if (url.includes('deepseek.com') && !url.includes('/v1/chat/completions')) {
      return 'https://api.deepseek.com/v1/chat/completions';
    }
    if (url.includes('openai.com') && !url.includes('/v1/chat/completions')) {
      return 'https://api.openai.com/v1/chat/completions';
    }
    return null;
  };
  
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    // 检查API URL是否完整
    const suggestedUrl = checkAPIUrl(baseUrl);
    if (suggestedUrl) {
      if (window.confirm(`您输入的API地址可能不完整。\n\n建议使用: ${suggestedUrl}\n\n是否自动修正？`)) {
        setBaseUrl(suggestedUrl);
      }
    }
    
    // 如果使用代理，先检查代理服务器状态
    if (useProxy) {
      const proxyRunning = await checkProxyStatus();
      if (!proxyRunning) {
        setTestResult({
          success: false,
          message: `代理服务器无法连接。请确保：
1. 已通过命令 'bun run proxy' 启动代理服务器
2. 代理地址设置正确: ${proxyUrl}
3. 端口 3100 未被其他程序占用`
        });
        setIsTesting(false);
        return;
      }
    }
    
    try {
      const testMessage = {
        model: modelName,
        messages: [
          {
            role: "system",
            content: "你是一个五子棋AI助手。"
          },
          {
            role: "user",
            content: "请回复'连接成功'测试API连接。"
          }
        ],
        temperature: temperature,
        max_tokens: 20
      };
      
      // 确定使用的URL
      const requestUrl = useProxy ? proxyUrl : baseUrl;
      
      // 准备请求头
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      // 如果使用代理，以查询参数形式传递API Key，否则使用标准Authorization头
      let url = requestUrl;
      let body = JSON.stringify(testMessage);
      
      if (useProxy) {
        // 将API Key和Base URL作为参数传递给代理服务
        const params = new URLSearchParams({
          apiKey,
          baseUrl
        });
        url = `${proxyUrl}?${params.toString()}`;
      } else {
        // 直接请求，使用标准Authorization头
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
      
      console.log('测试连接:', { url, useProxy });
      
      const response = await fetch(url, {
        method: "POST",
        headers,
        body
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          setTestResult({
            success: true,
            message: "连接成功！API 工作正常。"
          });
        } else if (data.error) {
          // API 返回了错误信息
          setTestResult({
            success: false,
            message: `API 返回错误: ${data.error}\n\n${data.details ? JSON.stringify(data.details, null, 2) : ''}`
          });
        } else {
          setTestResult({
            success: false,
            message: "API 返回格式异常，请检查模型名称是否正确。"
          });
        }
      } else {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData, null, 2);
        } catch (e) {
          errorText = await response.text();
        }
        
        let helpText = "";
        if (response.status === 404) {
          helpText = `\n\n可能的原因:
1. 如果使用代理: 确保代理服务器已启动 (运行 'bun run proxy')
2. 检查 API 基础地址是否正确 (${baseUrl})
3. 确保代理地址正确配置为: http://localhost:3100/api/llm-proxy`;
        } else if (response.status === 401) {
          helpText = "\n\n可能的原因: API 密钥无效或已过期";
        } else if (response.status === 0 || errorText.includes('Failed to fetch')) {
          helpText = `\n\n可能的原因: 网络连接问题或服务不可达
1. 检查网络连接
2. 如果直接请求 API: 浏览器可能阻止了跨域请求，请启用代理选项
3. 如果使用代理: 确保代理服务器已启动 (运行 'bun run proxy')`;
        }
        
        setTestResult({
          success: false,
          message: `API 请求失败: ${response.status} ${response.statusText}${helpText}\n\n${errorText}`
        });
      }
    } catch (error) {
      console.error('测试连接错误:', error);
      setTestResult({
        success: false,
        message: `连接错误: ${error instanceof Error ? error.message : String(error)}
        
提示: 这可能是CORS跨域问题。浏览器环境下直接访问外部API通常会被阻止。
您可以:
1. 启用"使用代理"选项并配置本地代理服务器
2. 安装CORS浏览器插件临时解决
3. 创建一个简单的Node.js代理服务器转发请求`
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${currentTheme.uiBackgroundClass} rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${currentTheme.headingColorClass}`}>大语言模型配置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${currentTheme.textColorClass} mb-1`}>
              API 地址
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg 
                        ${currentTheme.textColorClass} focus:outline-none focus:ring-2 focus:ring-amber-500`}
              placeholder="https://api.deepseek.com/v1/chat/completions"
            />
            <p className={`text-xs ${currentTheme.subTextColorClass} mt-1`}>
              OpenAI 或兼容接口地址
            </p>
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${currentTheme.textColorClass} mb-1`}>
              模型名称
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg 
                        ${currentTheme.textColorClass} focus:outline-none focus:ring-2 focus:ring-amber-500`}
              // placeholder="gpt-3.5-turbo"
              placeholder='deepseek-chat'
            />
            <p className={`text-xs ${currentTheme.subTextColorClass} mt-1`}>
              推荐使用 GPT-3.5 或更高版本
            </p>
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${currentTheme.textColorClass} mb-1`}>
              API 密钥
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg 
                        ${currentTheme.textColorClass} focus:outline-none focus:ring-2 focus:ring-amber-500`}
              placeholder="sk-..."
            />
            <p className={`text-xs ${currentTheme.subTextColorClass} mt-1`}>
              您的 API 密钥，将安全存储在本地
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${currentTheme.textColorClass} mb-1`}>
                温度 ({temperature})
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className={`text-xs ${currentTheme.subTextColorClass} mt-1`}>
                控制随机性 (0-2)
              </p>
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${currentTheme.textColorClass} mb-1`}>
                最大令牌数
              </label>
              <input
                type="number"
                min="50"
                max="1000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg 
                          ${currentTheme.textColorClass} focus:outline-none focus:ring-2 focus:ring-amber-500`}
              />
              <p className={`text-xs ${currentTheme.subTextColorClass} mt-1`}>
                响应长度限制
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={useProxy}
              onChange={(e) => setUseProxy(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className={`ml-3 block text-sm ${currentTheme.textColorClass}`}>
              使用代理
            </label>
          </div>
          
          {useProxy && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${currentTheme.textColorClass} mb-1`}>
                  代理地址
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={proxyUrl}
                    onChange={(e) => setProxyUrl(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg 
                              ${currentTheme.textColorClass} focus:outline-none focus:ring-2 focus:ring-amber-500`}
                    placeholder="http://localhost:3100/api/llm-proxy"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProxyUrl('http://localhost:3100/api/llm-proxy');
                      setTimeout(() => checkProxyStatus(), 500);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 underline"
                    title="重置为默认代理地址"
                  >
                    重置
                  </button>
                </div>
                <div className="flex items-center mt-1">
                  <span className={`text-xs ${currentTheme.subTextColorClass}`}>
                    代理服务器状态: 
                  </span>
                  <span 
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      proxyStatus === 'running' 
                        ? 'bg-green-100 text-green-800' 
                        : proxyStatus === 'not-running' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {proxyStatus === 'running' 
                      ? '运行中' 
                      : proxyStatus === 'not-running' 
                        ? '未运行' 
                        : '未检测'}
                  </span>
                  <button 
                    onClick={checkProxyStatus}
                    className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    检测
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className={`text-xs ${currentTheme.subTextColorClass}`}>
                    {proxyStatus === 'running' 
                      ? '代理服务器运行正常' 
                      : '请启动代理服务器'}
                  </p>
                  {proxyStatus === 'not-running' && (
                    <button
                      onClick={() => {
                        // 打开新窗口指导用户启动代理服务器
                        window.open('start-proxy.bat', '_blank');
                        setTimeout(() => {
                          checkProxyStatus();
                        }, 3000);
                      }}
                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      启动代理
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {testResult && (
            <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {testResult.message}
            </div>
          )}
          
          <div className="flex justify-between pt-4">
            <button
              onClick={handleTest}
              disabled={isTesting}
              className={`px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg 
                        hover:bg-blue-600 transition-colors ${isTesting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isTesting ? '测试中...' : '测试连接'}
            </button>
            
            <button
              onClick={handleSave}
              className={`px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white 
                        font-semibold rounded-lg shadow-lg hover:from-amber-600 hover:to-orange-600 
                        transform hover:scale-105 transition-all duration-200 active:scale-95`}
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
