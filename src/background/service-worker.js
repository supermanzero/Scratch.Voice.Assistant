// Scratch 教程语音助手 - 后台服务脚本

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
      voiceSelect: 'baidu-110', // 度小童
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
      
    case 'saveTutorialProgress':
      handleSaveTutorialProgress(request.data, sendResponse);
      return true;
      
    case 'getTutorialProgress':
      handleGetTutorialProgress(request.tutorialId, sendResponse);
      return true;

    case 'fetchTTSAudio':
      handleFetchTTSAudio(request, sendResponse);
      return true; // 异步响应
      
    default:
      console.log('未知消息类型:', request.action);
  }
});

// 获取教程数据
async function handleGetTutorials(sendResponse) {
  try {
    // 这里可以从远程服务器获取最新的教程数据
    // 目前使用本地数据
    const tutorials = await loadLocalTutorials();
    sendResponse({ success: true, data: tutorials });
  } catch (error) {
    console.error('获取教程数据失败:', error);
    sendResponse({ success: false, error: error.message });
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
        // 构建form data
        const formData = new URLSearchParams();
        Object.keys(baiduRequest.data).forEach(key => {
          formData.append(key, baiduRequest.data[key]);
        });
        
        response = await fetch(baiduRequest.url, {
          method: baiduRequest.method,
          headers: baiduRequest.headers,
          body: formData
        });
        break;
      default:
        throw new Error('不支持的TTS引擎');
    }

    if (!response.ok) {
      throw new Error(`TTS请求失败: ${response.status} ${response.statusText}`);
    }

    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // 如果返回JSON，可能是错误信息
      const jsonResponse = await response.json();
      if (jsonResponse.error_code) {
        throw new Error(`百度TTS API错误: ${jsonResponse.error_msg || jsonResponse.error_code}`);
      }
    }

    // 将音频转换为Base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    sendResponse({ 
      success: true, 
      audioData: `data:audio/mp3;base64,${base64Audio}` 
    });

  } catch (error) {
    console.error('TTS音频获取失败:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
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

// 构建百度TTS请求（使用正确的API格式）
async function buildBaiduTTSRequest(text, settings) {
  const maxLength = 200;
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;
  
  // 从语音选择中提取语音ID
  const voiceId = settings.voice ? settings.voice.replace('baidu-', '') : '1';
  
  // 使用默认API密钥
  const DEFAULT_AK = "FeNVdlSqSTt9IO3Bz4SCDiVj";
  const DEFAULT_SK = "NL9bpxsOt7pxf1m3v43G5vPD5CIjoSFo";
  
  // 优先使用用户配置的密钥，如果没有则使用默认密钥
  const result = await chrome.storage.sync.get(['baiduApiKeys']);
  const userApiKeys = result.baiduApiKeys;
  
  const ak = (userApiKeys && userApiKeys.ak) ? userApiKeys.ak : DEFAULT_AK;
  const sk = (userApiKeys && userApiKeys.sk) ? userApiKeys.sk : DEFAULT_SK;
  
  // 获取access token
  const accessToken = await getBaiduAccessToken(ak, sk);
  
  const requestData = {
    tex: truncatedText,
    tok: accessToken,
    cuid: 'scratch-voice-assistant',
    ctp: '1',
    lan: 'zh',
    spd: Math.round((settings.speed || 1.0) * 5).toString(), // 百度TTS速度范围0-15
    pit: '5', // 音调
    vol: Math.round((settings.volume || 0.8) * 15).toString(), // 百度TTS音量范围0-15
    per: voiceId, // 语音人选择
    aue: '3' // 音频格式：3为mp3
  };

  return {
    url: 'https://tsn.baidu.com/text2audio',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '*/*'
    },
    data: requestData
  };
}

// 获取百度API访问令牌
async function getBaiduAccessToken(ak, sk) {
  try {
    // 检查缓存的token是否还有效
    const result = await chrome.storage.local.get(['baiduAccessToken', 'tokenExpireTime']);
    const now = Date.now();
    
    if (result.baiduAccessToken && result.tokenExpireTime && now < result.tokenExpireTime) {
      return result.baiduAccessToken;
    }
    
    // 获取新的token
    const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${ak}&client_secret=${sk}`;
    
    const response = await fetch(tokenUrl, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`获取百度API token失败: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.error) {
      throw new Error(`百度API认证失败: ${data.error_description || data.error}`);
    }
    
    // 缓存token（有效期通常为30天，这里设置为25天以确保安全）
    const expireTime = now + (25 * 24 * 60 * 60 * 1000);
    await chrome.storage.local.set({
      baiduAccessToken: data.access_token,
      tokenExpireTime: expireTime
    });
    
    return data.access_token;
  } catch (error) {
    throw new Error(`获取百度API访问令牌失败: ${error.message}`);
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