// Firebase 配置文件
// 由于Chrome扩展的CSP限制，我们需要使用CDN版本的Firebase SDK

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyCGAtiGTiGa-_cZxtJZvViBga_ci0SmusM",
  authDomain: "scratch-21d62.firebaseapp.com",
  projectId: "scratch-21d62",
  storageBucket: "scratch-21d62.firebasestorage.app",
  messagingSenderId: "655135966773",
  appId: "1:655135966773:web:2c03b1e12d8d822031137c",
  measurementId: "G-8MLLDD345R"
};

// Firebase 初始化函数
async function initializeFirebase() {
  try {
    // 动态加载Firebase SDK
    if (typeof firebase === 'undefined') {
      // 加载Firebase SDK
      await loadFirebaseSDK();
    }
    
    // 初始化Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // 初始化Firestore
    const db = firebase.firestore();
    
    console.log('Firebase 初始化成功');
    return db;
  } catch (error) {
    console.error('Firebase 初始化失败:', error);
    throw error;
  }
}

// 动态加载Firebase SDK
function loadFirebaseSDK() {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    if (typeof firebase !== 'undefined') {
      resolve();
      return;
    }
    
    // 创建script标签加载Firebase SDK
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
    script.onload = () => {
      // 加载Firestore
      const firestoreScript = document.createElement('script');
      firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
      firestoreScript.onload = () => {
        console.log('Firebase SDK 加载完成');
        resolve();
      };
      firestoreScript.onerror = reject;
      document.head.appendChild(firestoreScript);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 获取教程数据的函数
async function getTutorialsFromFirebase() {
  try {
    const db = await initializeFirebase();
    
    // 从Firestore获取教程数据
    const tutorialsRef = db.collection('tutorials');
    const snapshot = await tutorialsRef.get();
    
    const tutorials = {};
    snapshot.forEach(doc => {
      tutorials[doc.id] = {
        id: doc.id,
        ...doc.data()
      };
    });
    
    console.log('从Firebase获取教程数据:', tutorials);
    return tutorials;
  } catch (error) {
    console.error('从Firebase获取教程数据失败:', error);
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
