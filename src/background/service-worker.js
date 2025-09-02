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
      language: 'zh-CN'
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

// 处理扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  // 如果不是 Scratch 编辑器页面，打开新标签页
  if (!tab.url.includes('scratch.mit.edu/projects/editor/')) {
    chrome.tabs.create({
      url: 'https://scratch.mit.edu/projects/editor/'
    });
  }
});