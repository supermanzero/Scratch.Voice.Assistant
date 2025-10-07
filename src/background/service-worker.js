// Scratch 教程语音助手 - 后台服务脚本

// API服务配置
const API_BASE_URL = 'http://47.79.88.53:3000';

// API服务类
class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // 通用HTTP请求方法
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  // GET请求
  async get(endpoint) {
    return this.request(this.baseUrl + endpoint, {
      method: 'GET'
    });
  }

  // POST请求
  async post(endpoint, data = {}) {
    return this.request(this.baseUrl + endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 获取教程数据
  async getTutorials() {
    try {
      console.log('从API获取教程数据...');
      const response = await this.get('/api/tutorials');
      
      if (response.success && response.data) {
        console.log('从API获取教程数据成功:', response.data);
        return response.data;
      } else {
        throw new Error(response.error || '获取教程数据失败');
      }
    } catch (error) {
      console.error('从API获取教程数据失败:', error);
      throw error;
    }
  }

  // 获取套餐数据
  async getPackages() {
    try {
      console.log('从API获取套餐数据...');
      const response = await this.get('/api/packages');
      
      if (response.success && response.data) {
        console.log('从API获取套餐数据成功:', response.data);
        return response.data;
      } else {
        throw new Error(response.error || '获取套餐数据失败');
      }
    } catch (error) {
      console.error('从API获取套餐数据失败:', error);
      throw error;
    }
  }

  // 同步教程数据
  async syncTutorials(tutorials) {
    try {
      console.log('同步教程数据到API...');
      const response = await this.post('/api/tutorials/sync', {
        tutorials: tutorials
      });
      
      if (response.success) {
        console.log('教程数据同步成功');
        return response.data;
      } else {
        throw new Error(response.error || '同步教程数据失败');
      }
    } catch (error) {
      console.error('同步教程数据失败:', error);
      throw error;
    }
  }
}

// 创建API服务实例
const apiService = new ApiService();

// 从API获取教程数据
async function getTutorialsFromFirebase() {
  try {
    return await apiService.getTutorials();
  } catch (error) {
    console.error('从API获取教程数据失败:', error);
    throw error;
  }
}

// 从API获取套餐数据
async function getPackagesFromFirebase() {
  try {
    return await apiService.getPackages();
  } catch (error) {
    console.error('从API获取套餐数据失败:', error);
    throw error;
  }
}

// 转换Firestore文档格式
function convertFirestoreDocument(doc) {
  const fields = doc.fields || {};
  const result = {};
  
  // 递归转换字段
  function convertField(field) {
    if (field.stringValue !== undefined) return field.stringValue;
    if (field.integerValue !== undefined) return parseInt(field.integerValue);
    if (field.doubleValue !== undefined) return parseFloat(field.doubleValue);
    if (field.booleanValue !== undefined) return field.booleanValue;
    if (field.arrayValue) {
      return field.arrayValue.values.map(convertField);
    }
    if (field.mapValue) {
      const mapResult = {};
      Object.keys(field.mapValue.fields || {}).forEach(key => {
        mapResult[key] = convertField(field.mapValue.fields[key]);
      });
      return mapResult;
    }
    return null;
  }
  
  Object.keys(fields).forEach(key => {
    result[key] = convertField(fields[key]);
  });
  
  return result;
}

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Scratch 教程语音助手已安装');
  
  // 设置默认配置
  chrome.storage.sync.set({
    settings: {
      speechRate: 1.0,
      speechVolume: 0.8,
      autoPlay: false,
      language: 'zh-CN',
      voiceEngine: 'baidu',
      voiceSelect: 'baidu-4140', // 度小新 - 专业女主播
      highlight: true
    }
  });
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getTutorials':
      handleGetTutorials(sendResponse);
      return true; // 保持消息通道开放
      
    case 'getPackages':
      handleGetPackages(sendResponse);
      return true; // 保持消息通道开放
      
    case 'saveTutorialProgress':
      handleSaveTutorialProgress(request.data, sendResponse);
      return true;
      
    case 'getTutorialProgress':
      handleGetTutorialProgress(request.tutorialId, sendResponse);
      return true;

    case 'fetchTTSAudio':
      handleFetchTTSAudio(request, sendResponse);
      return true; // 异步响应
      
    case 'syncTutorialsToFirebase':
      handleSyncTutorialsToFirebase(request, sendResponse);
      return true; // 异步响应
      
    default:
      console.log('未知消息类型:', request.action);
  }
});

// 获取教程数据
async function handleGetTutorials(sendResponse) {
  try {
    // 从Firebase获取教程数据
    const tutorials = await getTutorialsFromFirebase();
    sendResponse({ success: true, data: tutorials });
  } catch (error) {
    console.error('获取教程数据失败:', error);
    // 如果Firebase失败，使用本地数据作为回退
    try {
      const tutorials = await loadLocalTutorials();
      sendResponse({ success: true, data: tutorials });
    } catch (fallbackError) {
      console.error('本地教程数据也失败:', fallbackError);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// 获取套餐数据
async function handleGetPackages(sendResponse) {
  try {
    // 从Firebase获取套餐数据
    const packages = await getPackagesFromFirebase();
    sendResponse({ success: true, data: packages });
  } catch (error) {
    console.error('获取套餐数据失败:', error);
    // 如果Firebase失败，使用本地数据作为回退
    try {
      const packages = await loadLocalPackages();
      sendResponse({ success: true, data: packages });
    } catch (fallbackError) {
      console.error('本地套餐数据也失败:', fallbackError);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// 加载本地教程数据
async function loadLocalTutorials() {
  return {
    motion: {
      id: 'motion',
      title: '运动积木教程',
      category: 'motion',
      difficulty: 'beginner',
      duration: '5分钟',
      description: '学习如何使用运动积木让角色移动',
      steps: [
        {
          id: 'motion_1',
          text: '欢迎学习 Scratch 运动积木！运动积木可以让你的角色在舞台上移动。',
          action: 'intro',
          highlight: null
        },
        {
          id: 'motion_2', 
          text: '首先，在积木面板左侧找到蓝色的"运动"分类，点击它。',
          action: 'find-motion-category',
          highlight: '.blocklyTreeRow[data-id="motion"]'
        },
        {
          id: 'motion_3',
          text: '找到"移动10步"积木，用鼠标拖拽它到右侧的脚本区域。',
          action: 'drag-move-block',
          highlight: '[data-id="motion_movesteps"]'
        },
        {
          id: 'motion_4',
          text: '点击这个积木试试看，你的角色应该会向右移动10步。',
          action: 'test-move-block',
          highlight: '.blocklyDraggable[data-id*="motion_movesteps"]'
        },
        {
          id: 'motion_5',
          text: '很好！现在双击积木中的数字"10"，把它改成"50"，看看有什么变化。',
          action: 'modify-steps',
          highlight: '.blocklyEditableText'
        }
      ]
    },
    
    looks: {
      id: 'looks',
      title: '外观积木教程',
      category: 'looks', 
      difficulty: 'beginner',
      duration: '4分钟',
      description: '学习如何使用外观积木改变角色的外观',
      steps: [
        {
          id: 'looks_1',
          text: '现在学习外观积木！外观积木可以改变角色的样子和说话。',
          action: 'intro',
          highlight: null
        },
        {
          id: 'looks_2',
          text: '在积木面板中找到紫色的"外观"分类，点击它。',
          action: 'find-looks-category', 
          highlight: '.blocklyTreeRow[data-id="looks"]'
        },
        {
          id: 'looks_3',
          text: '找到"说 Hello! 持续2秒"积木，拖拽到脚本区域。',
          action: 'drag-say-block',
          highlight: '[data-id="looks_sayforsecs"]'
        },
        {
          id: 'looks_4',
          text: '点击这个积木，你的角色会说话并显示一个对话框！',
          action: 'test-say-block',
          highlight: '.blocklyDraggable[data-id*="looks_sayforsecs"]'
        },
        {
          id: 'looks_5',
          text: '试着修改对话内容，双击"Hello!"文字，输入你想说的话。',
          action: 'modify-text',
          highlight: '.blocklyEditableText'
        }
      ]
    },
    
    events: {
      id: 'events',
      title: '事件积木教程',
      category: 'events',
      difficulty: 'beginner', 
      duration: '6分钟',
      description: '学习如何使用事件积木让程序响应用户操作',
      steps: [
        {
          id: 'events_1',
          text: '事件积木非常重要！它们告诉程序什么时候开始运行。',
          action: 'intro',
          highlight: null
        },
        {
          id: 'events_2',
          text: '找到橙色的"事件"分类，这里有各种启动程序的方式。',
          action: 'find-events-category',
          highlight: '.blocklyTreeRow[data-id="event"]'
        },
        {
          id: 'events_3', 
          text: '拖拽"当点击绿旗时"积木到脚本区域，这是最常用的启动方式。',
          action: 'drag-flag-block',
          highlight: '[data-id="event_whenflagclicked"]'
        },
        {
          id: 'events_4',
          text: '现在把之前的运动积木连接到这个事件积木下面。',
          action: 'connect-blocks',
          highlight: '.blocklyDraggable'
        },
        {
          id: 'events_5',
          text: '点击舞台上方的绿色旗子，看看程序是否运行了！',
          action: 'test-flag',
          highlight: '.green-flag'
        }
      ]
    }
  };
}

// 加载本地套餐数据
async function loadLocalPackages() {
  return {
    beginner: {
      id: 'beginner',
      name: '初学者套餐',
      price: 0,
      description: '适合初学者的基础课程套餐',
      tutorialCount: 3,
      tutorialIds: ['motion', 'looks', 'events'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    
    intermediate: {
      id: 'intermediate',
      name: '进阶套餐',
      price: 29.9,
      description: '适合有一定基础的学习者',
      tutorialCount: 5,
      tutorialIds: ['motion', 'looks', 'events', 'control', 'sensing'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    
    advanced: {
      id: 'advanced',
      name: '高级套餐',
      price: 59.9,
      description: '适合高级用户的全套课程',
      tutorialCount: 8,
      tutorialIds: ['motion', 'looks', 'events', 'control', 'sensing', 'operators', 'variables', 'myBlocks'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}

// 保存教程进度
async function handleSaveTutorialProgress(data, sendResponse) {
  try {
    const { tutorialId, stepIndex, completed } = data;
    
    // 获取现有进度
    const result = await chrome.storage.sync.get(['tutorialProgress']);
    const progress = result.tutorialProgress || {};
    
    // 更新进度
    if (!progress[tutorialId]) {
      progress[tutorialId] = {};
    }
    
    progress[tutorialId] = {
      currentStep: stepIndex,
      completed: completed || false,
      lastAccessed: Date.now()
    };
    
    // 保存到存储
    await chrome.storage.sync.set({ tutorialProgress: progress });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('保存教程进度失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 获取教程进度
async function handleGetTutorialProgress(tutorialId, sendResponse) {
  try {
    const result = await chrome.storage.sync.get(['tutorialProgress']);
    const progress = result.tutorialProgress || {};
    
    sendResponse({ 
      success: true, 
      data: progress[tutorialId] || { currentStep: 0, completed: false }
    });
  } catch (error) {
    console.error('获取教程进度失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 监听标签页更新，检查是否是 Scratch 编辑器页面
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('scratch.mit.edu/projects/editor/')) {
    
    // 可以在这里执行一些初始化操作
    console.log('检测到 Scratch 编辑器页面:', tab.url);
  }
});

// 处理TTS音频获取请求（解决CORS问题）
async function handleFetchTTSAudio(request, sendResponse) {
  try {
    const { engine, text, settings } = request;
    let response;

    switch (engine) {
      case 'google':
        const googleUrl = await buildGoogleTTSUrl(text, settings);
        response = await fetch(googleUrl);
        break;
      case 'baidu':
        const baiduRequest = await buildBaiduTTSRequest(text, settings);
        console.log('百度TTS请求数据键:', Object.keys(baiduRequest.data));
        
        // 构建form data
        const formData = new URLSearchParams();
        Object.keys(baiduRequest.data).forEach(key => {
          formData.append(key, baiduRequest.data[key]);
        });
        
        console.log('发送百度TTS请求到:', baiduRequest.url);
        response = await fetch(baiduRequest.url, {
          method: baiduRequest.method,
          headers: baiduRequest.headers,
          body: formData
        });
        console.log('百度TTS响应状态:', response.status, response.statusText);
        break;
      case 'youdao':
        console.log('=== 开始处理有道TTS请求 ===');
        console.log('输入文本:', text);
        console.log('输入设置键:', Object.keys(settings));
        
        try {
          console.log('调用 buildYoudaoTTSRequest...');
          const youdaoRequest = await buildYoudaoTTSRequest(text, settings);
          console.log('buildYoudaoTTSRequest 完成');
          console.log('有道TTS请求数据键:', Object.keys(youdaoRequest.data));
          
          // 构建form data
          console.log('构建form data...');
          const youdaoFormData = new URLSearchParams();
          Object.keys(youdaoRequest.data).forEach(key => {
            youdaoFormData.append(key, youdaoRequest.data[key]);
          });
          console.log('form data构建完成');
          
          console.log('发送有道TTS请求到:', youdaoRequest.url);
          console.log('请求方法:', youdaoRequest.method);
          console.log('请求头:', youdaoRequest.headers);
          console.log('请求体长度:', youdaoFormData.toString().length);
          
          console.log('开始fetch请求...');
          response = await fetch(youdaoRequest.url, {
            method: youdaoRequest.method,
            headers: youdaoRequest.headers,
            body: youdaoFormData
          });
          console.log('fetch请求完成');
          
          console.log('有道TTS响应状态:', response.status, response.statusText);
          console.log('响应头数量:', response.headers.size);
        } catch (youdaoError) {
          console.error('有道TTS处理过程中发生错误:', youdaoError);
          throw youdaoError;
        }
        break;
      default:
        throw new Error('不支持的TTS引擎');
    }

    if (!response.ok) {
      throw new Error(`TTS请求失败: ${response.status} ${response.statusText}`);
    }

    // 先克隆响应以避免消耗原始响应体
    const responseClone = response.clone();
    
    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    console.log('TTS响应内容类型:', contentType);
    
    if (contentType && contentType.includes('application/json')) {
      // 如果返回JSON，可能是错误信息
      try {
        const jsonResponse = await responseClone.json();
        console.log('TTS JSON响应:', jsonResponse);
        
        if (jsonResponse.error_code) {
          throw new Error(`百度TTS API错误: ${jsonResponse.error_msg || jsonResponse.error_code}`);
        }
        
        // 检查字符限制错误
        if (jsonResponse.err_msg && jsonResponse.err_msg.includes('characters limit reached')) {
          // 存储配额错误状态
          chrome.storage.local.set({ 
            ttsQuotaError: true, 
            ttsLastError: jsonResponse.err_msg,
            quotaErrorTime: Date.now()
          });
          throw new Error(`百度TTS字符限制已达上限: ${jsonResponse.err_msg}`);
        }
        
        // 检查其他错误
        if (jsonResponse.err_msg) {
          throw new Error(`百度TTS错误: ${jsonResponse.err_msg}`);
        }
        
        // 检查是否是成功的JSON响应（某些API可能返回成功状态的JSON）
        if (jsonResponse.success === false) {
          throw new Error(`TTS请求失败: ${jsonResponse.message || '未知错误'}`);
        }
        
        // 如果JSON响应没有错误代码，但也不是音频数据，抛出错误
        throw new Error(`服务器返回了JSON响应而不是音频数据: ${JSON.stringify(jsonResponse)}`);
      } catch (jsonError) {
        // 如果JSON解析失败，可能是音频数据，继续处理
        console.log('JSON解析失败，可能是音频数据:', jsonError.message);
      }
    }

    // 将音频转换为Base64
    console.log('开始处理音频数据...');
    const arrayBuffer = await response.arrayBuffer();
    console.log('音频ArrayBuffer大小:', arrayBuffer.byteLength, 'bytes');
    
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    console.log('Base64编码完成，长度:', base64Audio.length);
    
    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;
    console.log('音频Data URL长度:', audioDataUrl.length);
    console.log('音频Data URL前缀:', audioDataUrl.substring(0, 50) + '...');
    
    const responseData = { 
      success: true, 
      audioData: audioDataUrl 
    };
    
    console.log('发送响应给content script:', {
      success: responseData.success,
      audioDataLength: responseData.audioData.length
    });
    
    sendResponse(responseData);

  } catch (error) {
    console.error('=== TTS音频获取失败 ===');
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    
    const errorResponse = { 
      success: false, 
      error: error.message 
    };
    
    console.error('发送错误响应给content script:', errorResponse);
    sendResponse(errorResponse);
  }
}

// 构建Google TTS URL
async function buildGoogleTTSUrl(text, settings) {
  const maxLength = 200;
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

  const params = new URLSearchParams({
    ie: 'UTF-8',
    q: truncatedText,
    tl: settings.language || 'zh-CN',
    client: 'tw-ob',
    ttsspeed: settings.speed || 1.0,
    total: 1,
    idx: 0
  });

  return `https://translate.google.com/translate_tts?${params.toString()}`;
}

// 获取代理服务器配置
async function getProxyConfig() {
  try {
    const result = await chrome.storage.sync.get(['proxyConfig']);
    const defaultConfig = {
      enabled: true,
      baseUrl: 'http://localhost:8000',
      timeout: 10000
    };
    return result.proxyConfig || defaultConfig;
  } catch (error) {
    console.warn('获取代理配置失败，使用默认配置:', error);
    return {
      enabled: true,
      baseUrl: 'http://localhost:8000',
      timeout: 10000
    };
  }
}

// 构建百度TTS请求（通过本地代理服务）
async function buildBaiduTTSRequest(text, settings) {
  // 百度TTS API对字符数有严格限制：不超过60个汉字或字母数字
  const maxLength = 600; // 与standalone-tts-debug.html保持一致
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;
  
  console.log(`百度TTS文本长度: ${text.length} -> ${truncatedText.length} (限制: ${maxLength})`);
  
  // 如果文本被截断，记录警告
  if (text.length > maxLength) {
    console.warn(`文本被截断: "${text}" -> "${truncatedText}"`);
  }
  
  // 从语音选择中提取语音ID
  const voiceId = settings.voice ? settings.voice.replace('baidu-', '') : '4140';
  
  // 使用用户提供的API密钥
  const AK = "FeNVdlSqSTt9IO3Bz4SCDiVj";
  const SK = "NL9bpxsOt7pxf1m3v43G5vPD5CIjoSFo";
  
  // 获取access token
  const accessToken = await getBaiduAccessToken(AK, SK);
  
  // 根据成功的调用方式，直接传输原始文本（不进行URL编码）
  console.log(`原始文本: "${truncatedText}"`);
  
  // 根据成功的调用方式构建请求数据
  const requestData = {
    tex: truncatedText,   // 直接传输原始文本，与standalone-tts-debug.html一致
    tok: accessToken,     // 访问令牌
    cuid: 'Lb4nwynEiEtTYmg6L7VlgxYPKUDS76Mg', // 用户唯一标识
    ctp: '1',            // 客户端类型，web端填写固定值1
    lan: 'zh',           // 语言选择，固定值zh
    spd: '5',            // 语速，取值0-15，默认为5
    pit: '5',            // 音调，取值0-15，默认为5
    vol: '5',            // 音量，取值0-15，默认为5
    per: voiceId,        // 语音人选择
    aue: '3'             // 音频格式：3为mp3格式(默认)
  };

  console.log('百度TTS请求数据:', requestData);

  // 获取代理配置
  const proxyConfig = await getProxyConfig();
  
  // 使用本地代理服务 - 与proxy-server.py格式完全一致
  return {
    url: `${proxyConfig.baseUrl}/proxy/baidu-tts`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '*/*'
    },
    data: requestData
  };
}

// 构建有道TTS请求
async function buildYoudaoTTSRequest(text, settings) {
  // 有道TTS API对字符数有严格限制（UTF-8编码长度不能超过2048）
  const maxLength = 2000; // 使用更保守的限制
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;
  
  console.log(`有道TTS文本长度: ${text.length} -> ${truncatedText.length} (限制: ${maxLength})`);
  
  // 如果文本被截断，记录警告
  if (text.length > maxLength) {
    console.warn(`文本被截断: "${text}" -> "${truncatedText}"`);
  }
  
  // 有道TTS API密钥
  const APP_KEY = "619fed97463dc5b1";
  const APP_SECRET = "uZx0ZOBV3WUh8Tzzk8R0PXYEH92HLlzl";
  
  // 生成UUID作为salt
  const salt = generateUUID();
  
  // 生成当前时间戳（秒）
  const curtime = Math.floor(Date.now() / 1000).toString();
  
  // 计算input（按照文档规则）
  let input;
  if (truncatedText.length > 20) {
    input = truncatedText.substring(0, 10) + truncatedText.length + truncatedText.substring(truncatedText.length - 10);
  } else {
    input = truncatedText;
  }
  
  console.log(`有道TTS input计算: 文本="${truncatedText}", 长度=${truncatedText.length}, input="${input}"`);
  
  // 构建签名字符串：appKey + input + salt + curtime + appSecret
  const signStr = APP_KEY + input + salt + curtime + APP_SECRET;
  console.log(`有道TTS签名字符串: ${signStr}`);
  const sign = await generateSHA256(signStr);
  console.log(`有道TTS签名: ${sign}`);
  
  // 从语音选择中提取语音名称
  const voiceName = settings.voice ? settings.voice.replace('youdao-', '') : 'youxiaoqin';
  
  // 处理语速设置（有道TTS支持0.5-2.0，需要字符串格式）
  const speedValue = Math.max(0.5, Math.min(2.0, settings.speed || 1.0));
  const speed = speedValue.toString();
  console.log(`有道TTS语速设置: 原始值=${settings.speed}, 处理后=${speed}`);
  
  // 处理音量设置（有道TTS支持0.50-5.00，需要字符串格式）
  const volumeValue = Math.max(0.50, Math.min(5.00, (settings.volume || 1.0) * 5.0));
  const volume = volumeValue.toFixed(2);
  console.log(`有道TTS音量设置: 原始值=${settings.volume}, 处理后=${volume}`);

  const requestData = {
    q: truncatedText,           // 要转换的文本
    appKey: APP_KEY,           // 应用ID
    salt: salt,                // UUID
    sign: sign,                // SHA256签名
    signType: 'v3',            // 签名类型
    curtime: curtime,          // 时间戳
    format: 'mp3',             // 音频格式
    speed: speed,              // 语速（0.5-2.0）
    volume: volume,            // 音量（0.50-5.00）
    voiceName: voiceName       // 发言人名字
  };
  
  console.log('有道TTS请求数据键:', Object.keys(requestData));

  return {
    url: 'https://openapi.youdao.com/ttsapi',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '*/*'
    },
    data: requestData
  };
}

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 生成SHA256哈希
async function generateSHA256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


// 获取百度API访问令牌
async function getBaiduAccessToken(ak, sk) {
  try {
    // 检查缓存的token是否还有效
    const result = await chrome.storage.local.get(['baiduAccessToken', 'tokenExpireTime']);
    const now = Date.now();
    
    if (result.baiduAccessToken && result.tokenExpireTime && now < result.tokenExpireTime) {
      console.log('使用缓存的百度API token');
      return result.baiduAccessToken;
    }
    
    // 获取新的token（通过本地代理服务）
    const proxyConfig = await getProxyConfig();
    const tokenUrl = `${proxyConfig.baseUrl}/proxy/baidu-token`;
    console.log('获取新的百度API token，通过代理服务:', tokenUrl);
    
    // 构建POST数据 - 与proxy-server.py期望的格式一致
    const formData = new URLSearchParams();
    formData.append('ak', ak);
    formData.append('sk', sk);
    
    const response = await fetch(tokenUrl, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
    console.log('百度API token响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('百度API token请求失败，响应内容:', errorText);
      throw new Error(`获取百度API token失败: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('百度API token响应数据键:', Object.keys(data));
    
    if (data.error) {
      throw new Error(`百度API认证失败: ${data.error_description || data.error}`);
    }
    
    if (!data.access_token) {
      throw new Error('百度API响应中没有access_token');
    }
    
    // 缓存token（有效期通常为30天，这里设置为25天以确保安全）
    const expireTime = now + (25 * 24 * 60 * 60 * 1000);
    await chrome.storage.local.set({
      baiduAccessToken: data.access_token,
      tokenExpireTime: expireTime
    });
    
    console.log('百度API token获取成功并已缓存');
    return data.access_token;
  } catch (error) {
    console.error('获取百度API访问令牌失败:', error);
    throw new Error(`获取百度API访问令牌失败: ${error.message}`);
  }
}

// 同步教程数据到API
async function handleSyncTutorialsToFirebase(request, sendResponse) {
  try {
    const { tutorials } = request;
    console.log('开始同步教程数据到API:', tutorials);
    
    // 将教程对象转换为数组格式
    const tutorialsArray = Object.values(tutorials);
    
    // 使用API服务同步教程数据
    const results = await apiService.syncTutorials(tutorialsArray);
    
    console.log('所有教程数据同步到API成功');
    sendResponse({ 
      success: true, 
      message: `成功同步 ${tutorialsArray.length} 个教程到API`,
      results: results
    });
    
  } catch (error) {
    console.error('同步教程数据到API失败:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}


// 处理扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  // 如果不是 Scratch 编辑器页面，打开新标签页
  if (!tab.url.includes('scratch.mit.edu/projects/editor/')) {
    chrome.tabs.create({
      url: 'https://scratch.mit.edu/projects/editor/'
    });
  }
});