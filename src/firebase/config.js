// API配置文件
// 使用Tutorial API替代直接的Firebase调用

// 引入API服务
// 注意：在浏览器环境中，需要确保apiService.js已经加载
let apiService;

// 初始化API服务
async function initializeApiService() {
  try {
    // 在浏览器环境中，apiService应该已经通过script标签加载
    if (typeof window !== 'undefined' && window.apiService) {
      apiService = window.apiService;
      console.log('API服务初始化成功');
      return apiService;
    }
    
    // 在Node.js环境中，直接require
    if (typeof require !== 'undefined') {
      apiService = require('../services/apiService');
      console.log('API服务初始化成功');
      return apiService;
    }
    
    throw new Error('无法加载API服务');
  } catch (error) {
    console.error('API服务初始化失败:', error);
    throw error;
  }
}

// 获取API服务实例（兼容原Firebase接口）
async function initializeFirebase() {
  try {
    if (!apiService) {
      apiService = await initializeApiService();
    }
    
    // 返回兼容Firebase接口的对象
    return apiService.getFirestore();
  } catch (error) {
    console.error('API服务初始化失败:', error);
    throw error;
  }
}

// 获取教程数据的函数（使用新的API）
async function getTutorialsFromFirebase() {
  try {
    if (!apiService) {
      apiService = await initializeApiService();
    }
    
    // 使用API服务获取教程数据
    const tutorials = await apiService.getTutorials();
    
    console.log('从API获取教程数据:', tutorials);
    return tutorials;
  } catch (error) {
    console.error('从API获取教程数据失败:', error);
    // 返回默认教程数据作为回退
    return getDefaultTutorials();
  }
}

// 默认教程数据（作为回退）
function getDefaultTutorials() {
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

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeFirebase,
    getTutorialsFromFirebase,
    getDefaultTutorials
  };
}
