/**
 * AI 提供商适配器
 * 支持多种 AI 服务的统一接口
 */

// 支持的 AI 提供商列表
const AI_PROVIDERS = {
  // 国外服务
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-3.5-turbo',
    needsApiKey: true,
    needsBaseUrl: false
  },
  anthropic: {
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-haiku-20240307',
    needsApiKey: true,
    needsBaseUrl: false
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-1.5-flash',
    needsApiKey: true,
    needsBaseUrl: false
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai',
    defaultModel: 'llama-3.1-8b-instant',
    needsApiKey: true,
    needsBaseUrl: false
  },
  // 国内服务
deepseek: {
name: 'DeepSeek',
baseUrl: 'https://api.deepseek.com',
defaultModel: 'deepseek-chat',
needsApiKey: true,
needsBaseUrl: false
},
zhipu: {
name: '智谱 GLM',
baseUrl: 'https://open.bigmodel.cn/api/paas',
defaultModel: 'glm-4-flash',
needsApiKey: true,
needsBaseUrl: false
},
qwen: {
name: '通义千问',
baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
defaultModel: 'qwen-turbo',
needsApiKey: true,
needsBaseUrl: false
},
doubao: {
name: '豆包',
baseUrl: 'https://ark.cn-beijing.volces.com/api',
defaultModel: 'doubao-lite-4k',
needsApiKey: true,
needsBaseUrl: false
},
moonshot: {
name: 'Moonshot (Kimi)',
baseUrl: 'https://api.moonshot.cn',
defaultModel: 'moonshot-v1-8k',
needsApiKey: true,
needsBaseUrl: false
},
minimax: {
name: 'MiniMax (海螺)',
baseUrl: 'https://api.minimax.chat/v1',
defaultModel: 'abab6.5s-chat',
needsApiKey: true,
needsBaseUrl: false
},
stepfun: {
name: '阶跃星辰',
baseUrl: 'https://api.stepfun.com',
defaultModel: 'step-1-flash',
needsApiKey: true,
needsBaseUrl: false
},
  yi: {
    name: '零一万物 (Yi)',
    baseUrl: 'https://api.lingyiwanwu.com',
    defaultModel: 'yi-lightning',
    needsApiKey: true,
    needsBaseUrl: false
  },
  baidu: {
    name: '百度千帆 (OpenAI 兼容)',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    defaultModel: 'ernie-4.0-8k-latest',
    needsApiKey: true,
    needsBaseUrl: false
  },
  siliconflow: {
    name: 'SiliconFlow (硅基流动)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    needsApiKey: true,
    needsBaseUrl: false
  },
  spark: {
    name: '讯飞星火',
    baseUrl: 'https://spark-api-open.xfyun.cn/v1',
    defaultModel: 'generalv3.5',
    needsApiKey: true,
    needsBaseUrl: false
  },
  perplexity: {
    name: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    defaultModel: 'llama-3.1-sonar-small-128k-online',
    needsApiKey: true,
    needsBaseUrl: false
  },
  // 本地/自定义
  ollama: {

name: 'Ollama (本地)',
baseUrl: 'http://localhost:11434',
defaultModel: 'llama3.2',
needsApiKey: false,
needsBaseUrl: true
},
  custom: {
    name: '自定义 OpenAI 兼容',
    baseUrl: '',
    defaultModel: '',
    needsApiKey: true,
    needsBaseUrl: true
  }
};

/**
 * 调用 AI 服务
 */
async function callAI(config, messages) {
  const { provider, apiKey, baseUrl, model } = config;
  const providerConfig = AI_PROVIDERS[provider];
  
  if (!providerConfig) {
    throw new Error(`不支持的 AI 提供商: ${provider}`);
  }

  // 根据不同提供商调用对应的 API
  switch (provider) {
    case 'gemini':
      return callGemini(config, messages);
    case 'anthropic':
      return callAnthropic(config, messages);
    case 'ollama':
      return callOllama(config, messages);
    default:
      // OpenAI 兼容接口（大多数国内服务都兼容）
      return callOpenAICompatible(config, messages);
  }
}

/**
 * OpenAI 兼容接口（适用于大多数服务）
 */
async function callOpenAICompatible(config, messages) {
  const { provider, apiKey, baseUrl, model } = config;
  const providerConfig = AI_PROVIDERS[provider] || AI_PROVIDERS.custom;
  
  let actualBaseUrl = baseUrl || providerConfig.baseUrl;
  const actualModel = model || providerConfig.defaultModel;
  
  if (!actualBaseUrl) {
    throw new Error('请配置 Base URL');
  }
  
  if (!actualModel) {
    throw new Error('请配置模型名称');
  }

  // 智能 URL 处理：如果用户提供了完整路径则直接使用，否则拼接标准路径
  let url = actualBaseUrl.trim();
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  
  // 如果 baseUrl 不包含典型的 API 路径，则自动补充
  const pathKeywords = ['/v1', '/chat', '/completions', '/generate', '/api'];
  const hasPath = pathKeywords.some(keyword => url.toLowerCase().includes(keyword));
  
  if (!hasPath) {
    url = `${url.replace(/\/+$/, '')}/v1/chat/completions`;
  } else if (url.endsWith('/v1') || url.endsWith('/v1/')) {
    url = `${url.replace(/\/+$/, '')}/chat/completions`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 增加到 60s，针对慢速模型

  try {
    const body = {
      model: actualModel,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000 // 增加输出长度限制
    };

    // 针对某些模型（如 o1, deepseek-reasoner）禁用不支持的参数
    if (actualModel.startsWith('o1') || actualModel.includes('thinking') || actualModel.includes('reasoner')) {
      delete body.temperature;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // 支持不同的认证方式
    if (apiKey) {
      // 绝大多数使用 Bearer
      headers['Authorization'] = `Bearer ${apiKey}`;
      // 某些提供商（如 Azure, Perplexity, 或特定代理）可能需要这个
      headers['Api-Key'] = apiKey;
      headers['X-API-Key'] = apiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let errorMessage = `API 请求失败 (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        // 兼容各种错误格式
        const apiError = errJson.error?.message || errJson.error?.code || errJson.message || errText;
        errorMessage += `: ${apiError}`;
      } catch {
        errorMessage += `: ${errText.substring(0, 200)}`;
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    
    // 兼容多种返回格式 (OpenAI 标准 vs 某些代理转发)
    let content = '';
    const choice = data.choices?.[0];
    
    if (choice?.message?.content) {
      content = choice.message.content;
    } else if (choice?.message?.reasoning_content) {
      // DeepSeek R1 风格的思维内容，如果没有 content 则回退到它
      content = choice.message.reasoning_content;
    } else if (choice?.text) {
      content = choice.text;
    } else if (data.content) {
      content = data.content;
    } else if (data.result) {
      // 百度文心一言非兼容模式
      content = data.result;
    } else if (typeof data === 'string') {
      content = data;
    }

    if (content === undefined || content === null || content === '') {
      // 检查是否有拒绝原因 (Refusal)
      if (choice?.message?.refusal) {
        throw new Error(`AI 拒绝回答: ${choice.message.refusal}`);
      }
      throw new Error('API 返回内容为空，请检查模型名称或 API 状态');
    }

    return content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('请求超时 (60s)，请检查网络或提供商状态');
    }
    throw error;
  }
}

/**
 * Google Gemini API
 */
async function callGemini(config, messages) {
  const { apiKey, model, baseUrl } = config;
  const actualModel = model || AI_PROVIDERS.gemini.defaultModel;
  const actualBaseUrl = baseUrl || AI_PROVIDERS.gemini.baseUrl;
  
  // 支持自定义 Base URL (代理)
  const url = `${actualBaseUrl.replace(/\/+$/, '')}/v1beta/models/${actualModel}:generateContent?key=${apiKey}`;
  
  // 转换消息格式
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
  
  const systemMsg = messages.find(m => m.role === 'system');
  const payload = {
    contents: contents,
    generationConfig: { 
      temperature: 0.7, 
      maxOutputTokens: 2048 // 增加输出限制
    }
  };
  
  if (systemMsg) {
    payload.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let errorMessage = `Gemini API 错误 (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        // Gemini 的错误可能在数组中
        const apiError = errJson.error?.message || errJson[0]?.error?.message || errText;
        errorMessage += `: ${apiError}`;
      } catch {
        errorMessage += `: ${errText.substring(0, 200)}`;
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    
    // 检查安全过滤
    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
      throw new Error('Gemini 拒绝回答：触发安全过滤');
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (content === undefined || content === null || content === '') {
      throw new Error('Gemini 返回内容为空，请检查模型名称或 API 状态');
    }
    return content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Gemini 请求超时 (60s)');
    }
    throw error;
  }
}

/**
 * Anthropic Claude API
 */
async function callAnthropic(config, messages) {
  const { apiKey, model, baseUrl } = config;
  const actualModel = model || AI_PROVIDERS.anthropic.defaultModel;
  const actualBaseUrl = baseUrl || AI_PROVIDERS.anthropic.baseUrl;
  
  const url = `${actualBaseUrl.replace(/\/+$/, '')}/v1/messages`;
  
  // 提取 system 消息
  const systemMsg = messages.find(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');
  
  const payload = {
    model: actualModel,
    max_tokens: 2048, // 增加输出限制
    messages: otherMessages
  };
  
  if (systemMsg) {
    payload.system = systemMsg.content;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let errorMessage = `Claude API 错误 (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        errorMessage += `: ${errJson.error?.message || errJson.message || errText}`;
      } catch {
        errorMessage += `: ${errText.substring(0, 200)}`;
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (content === undefined || content === null || content === '') {
      throw new Error('Claude 返回内容为空，请检查模型名称或 API 状态');
    }
    return content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Claude 请求超时 (60s)');
    }
    throw error;
  }
}

/**
 * Ollama 本地 API
 */
async function callOllama(config, messages) {
  const { baseUrl, model } = config;
  const actualBaseUrl = baseUrl || AI_PROVIDERS.ollama.baseUrl;
  const actualModel = model || AI_PROVIDERS.ollama.defaultModel;
  
  const url = `${actualBaseUrl.replace(/\/+$/, '')}/api/chat`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: actualModel,
        messages: messages,
        stream: false,
        options: { temperature: 0.7 }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      const error = new Error(`Ollama API 错误 (${response.status}): ${errText}`);
      error.status = response.status;
      throw error;
    }

      const data = await response.json();
      const content = data.message?.content;
      if (content === undefined || content === null) {
        throw new Error('Ollama 返回格式异常：未找到 message.content');
      }
      return content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Ollama 请求超时 (30s)');
    }
    throw error;
  }
}

module.exports = {
  AI_PROVIDERS,
  callAI
};
