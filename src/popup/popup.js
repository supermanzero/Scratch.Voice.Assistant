// Scratch 教程语音助手 - 弹窗脚本

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.init();
  }

  async init() {
    // 获取当前标签页信息
    await this.getCurrentTab();
    
    // 显示调试信息按钮
    document.getElementById('debugInfo').style.display = 'flex';
    
    // 检查连接状态
    this.checkConnectionStatus();
    
    // 加载教程进度
    this.loadTutorialProgress();
    
    // 绑定事件
    this.bindEvents();
    
    // 加载设置
    this.loadSettings();
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      this.updatePageStatus();
    } catch (error) {
      console.error('获取当前标签页失败:', error);
    }
  }

  updatePageStatus() {
    const currentPageElement = document.getElementById('currentPage');
    
    if (!this.currentTab) {
      currentPageElement.textContent = '未知';
      return;
    }

    console.log('当前页面 URL:', this.currentTab.url);
    
    // 更宽松的 URL 匹配，支持多种 Scratch 编辑器 URL 格式
    if (this.isScratchEditor(this.currentTab.url)) {
      currentPageElement.textContent = 'Scratch 编辑器';
      currentPageElement.style.color = 'hsl(var(--success))';
    } else if (this.currentTab.url.includes('scratch.mit.edu')) {
      currentPageElement.textContent = 'Scratch 网站';
      currentPageElement.style.color = 'hsl(var(--warning))';
    } else {
      currentPageElement.textContent = '其他页面';
      currentPageElement.style.color = 'hsl(var(--muted-foreground))';
    }
  }

  // 检查是否为 Scratch 编辑器页面
  isScratchEditor(url) {
    const scratchEditorPatterns = [
      'scratch.mit.edu/projects/editor/',
      'scratch.mit.edu/projects/',
      'scratch.mit.edu/create',
      'scratch.mit.edu/projects/create'
    ];
    
    return scratchEditorPatterns.some(pattern => url.includes(pattern));
  }

  async checkConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    
    try {
      if (this.currentTab && this.isScratchEditor(this.currentTab.url)) {
        // 尝试向 content script 发送消息
        try {
          const response = await chrome.tabs.sendMessage(this.currentTab.id, { 
            action: 'ping' 
          });
          
          if (response && response.status === 'connected') {
            statusElement.textContent = '已连接';
            statusElement.style.color = 'hsl(var(--success))';
          } else {
            statusElement.textContent = '助手未加载';
            statusElement.style.color = 'hsl(var(--warning))';
          }
        } catch (messageError) {
          console.log('消息发送失败:', messageError);
          statusElement.textContent = '助手未加载';
          statusElement.style.color = 'hsl(var(--warning))';
        }
      } else {
        statusElement.textContent = '未在 Scratch 编辑器';
        statusElement.style.color = 'hsl(var(--warning))';
      }
    } catch (error) {
      console.error('检查连接状态失败:', error);
      statusElement.textContent = '检查失败';
      statusElement.style.color = 'hsl(var(--muted-foreground))';
    }
  }

  async loadTutorialProgress() {
    try {
      const result = await chrome.storage.sync.get(['tutorialProgress']);
      const progress = result.tutorialProgress || {};
      
      // 更新教程进度显示
      const tutorialItems = document.querySelectorAll('.tutorial-item');
      const tutorials = ['motion', 'looks', 'events'];
      
      tutorialItems.forEach((item, index) => {
        const tutorialId = tutorials[index];
        const tutorialProgress = progress[tutorialId];
        
        const progressFill = item.querySelector('.progress-fill');
        const progressText = item.querySelector('.progress-text');
        
        if (tutorialProgress) {
          const totalSteps = this.getTutorialStepCount(tutorialId);
          const currentStep = tutorialProgress.currentStep + 1;
          const progressPercent = (currentStep / totalSteps) * 100;
          
          progressFill.style.width = `${progressPercent}%`;
          progressText.textContent = `${currentStep}/${totalSteps}`;
          
          if (tutorialProgress.completed) {
            item.style.borderColor = 'hsl(var(--success))';
            progressFill.style.background = 'hsl(var(--success))';
          }
        }
      });
    } catch (error) {
      console.error('加载教程进度失败:', error);
    }
  }

  getTutorialStepCount(tutorialId) {
    const stepCounts = {
      'motion': 5,
      'looks': 5,
      'events': 5
    };
    return stepCounts[tutorialId] || 0;
  }

  bindEvents() {
    // 打开 Scratch 编辑器按钮
    const openScratchBtn = document.getElementById('openScratchBtn');
    openScratchBtn.addEventListener('click', () => this.openScratchEditor());

    // 显示/隐藏助手按钮
    const toggleAssistantBtn = document.getElementById('toggleAssistantBtn');
    toggleAssistantBtn.addEventListener('click', () => this.toggleAssistant());

    // 教程项点击事件
    const tutorialItems = document.querySelectorAll('.tutorial-item');
    tutorialItems.forEach((item, index) => {
      item.addEventListener('click', () => this.selectTutorial(index));
    });

    // 设置变更事件
    const autoPlaySetting = document.getElementById('autoPlaySetting');
    const highlightSetting = document.getElementById('highlightSetting');
    const languageSetting = document.getElementById('languageSetting');

    autoPlaySetting.addEventListener('change', () => this.saveSettings());
    highlightSetting.addEventListener('change', () => this.saveSettings());
    languageSetting.addEventListener('change', () => this.saveSettings());

    // 底部链接事件
    document.getElementById('helpLink').addEventListener('click', () => this.openHelp());
    document.getElementById('feedbackLink').addEventListener('click', () => this.openFeedback());
    document.getElementById('aboutLink').addEventListener('click', () => this.showAbout());
    
    // 调试按钮事件
    const debugBtn = document.getElementById('debugBtn');
    if (debugBtn) {
      debugBtn.addEventListener('click', () => this.showDebugInfo());
    }
  }

  async openScratchEditor() {
    try {
      await chrome.tabs.create({
        url: 'https://scratch.mit.edu/projects/editor/'
      });
      window.close();
    } catch (error) {
      console.error('打开 Scratch 编辑器失败:', error);
    }
  }

  async toggleAssistant() {
    try {
      if (!this.currentTab || !this.isScratchEditor(this.currentTab.url)) {
        alert(`请先打开 Scratch 编辑器页面\n\n当前页面: ${this.currentTab ? this.currentTab.url : '未知'}\n\n支持的页面格式:\n• scratch.mit.edu/projects/editor/\n• scratch.mit.edu/create`);
        return;
      }

      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'toggleWidget'
      });
      
      window.close();
    } catch (error) {
      console.error('切换助手显示状态失败:', error);
      alert('无法连接到助手，请刷新页面后重试\n\n可能的原因:\n1. 助手未在此页面加载\n2. 页面需要刷新\n3. 扩展程序需要重新加载');
    }
  }

  async selectTutorial(index) {
    try {
      if (!this.currentTab || !this.isScratchEditor(this.currentTab.url)) {
        alert('请先打开 Scratch 编辑器页面');
        return;
      }

      const tutorials = ['motion', 'looks', 'events'];
      const tutorialId = tutorials[index];

      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'selectTutorial',
        tutorialId: tutorialId
      });

      window.close();
    } catch (error) {
      console.error('选择教程失败:', error);
      alert('无法连接到助手，请刷新页面后重试');
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      const settings = result.settings || {
        autoPlay: false,
        highlight: true,
        language: 'zh-CN'
      };

      document.getElementById('autoPlaySetting').checked = settings.autoPlay;
      document.getElementById('highlightSetting').checked = settings.highlight;
      document.getElementById('languageSetting').value = settings.language;
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  async saveSettings() {
    try {
      const settings = {
        autoPlay: document.getElementById('autoPlaySetting').checked,
        highlight: document.getElementById('highlightSetting').checked,
        language: document.getElementById('languageSetting').value,
        speechRate: 1.0,
        speechVolume: 0.8
      };

      await chrome.storage.sync.set({ settings });

      // 通知 content script 设置已更新
      if (this.currentTab && this.currentTab.url.includes('scratch.mit.edu/projects/editor/')) {
        try {
          await chrome.tabs.sendMessage(this.currentTab.id, {
            action: 'updateSettings',
            settings: settings
          });
        } catch (error) {
          // 忽略连接错误，设置仍然会保存
        }
      }
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }

  openHelp() {
    chrome.tabs.create({
      url: 'https://github.com/your-repo/scratch-voice-assistant/wiki'
    });
  }

  openFeedback() {
    chrome.tabs.create({
      url: 'https://github.com/your-repo/scratch-voice-assistant/issues'
    });
  }

  showAbout() {
    alert(`Scratch 教程语音助手 v1.0.0

一个帮助学习 Scratch 编程的语音教学工具。

功能特点：
• 语音指导教程
• 积木高亮显示  
• 进度跟踪
• 多语言支持

开发者：Your Name
许可证：MIT License`);
  }

  showDebugInfo() {
    const debugInfo = `调试信息:

当前标签页 URL: ${this.currentTab ? this.currentTab.url : '未获取到'}
标签页 ID: ${this.currentTab ? this.currentTab.id : '未知'}
是否为 Scratch 编辑器: ${this.currentTab ? this.isScratchEditor(this.currentTab.url) : false}

支持的 URL 格式:
• scratch.mit.edu/projects/editor/
• scratch.mit.edu/projects/
• scratch.mit.edu/create

如果助手无法正常工作，请尝试:
1. 刷新 Scratch 编辑器页面
2. 重新加载扩展程序
3. 检查浏览器控制台错误信息`;

    alert(debugInfo);
  }
}

// 初始化弹窗管理器
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});