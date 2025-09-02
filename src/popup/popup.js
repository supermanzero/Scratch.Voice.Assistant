// Scratch 教程语音助手 - 弹窗脚本

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.init();
  }

  async init() {
    // 获取当前标签页信息
    await this.getCurrentTab();



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
          console.log('检查content script连接状态...');
          
          // 添加超时处理
          const response = await Promise.race([
            chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('消息超时')), 2000)
            )
          ]);

          console.log('Ping响应:', response);

          if (response && response.status === 'connected') {
            statusElement.textContent = '已连接';
            statusElement.style.color = 'hsl(var(--success))';
            console.log('Content script连接正常');
          } else {
            statusElement.textContent = '助手未响应';
            statusElement.style.color = 'hsl(var(--warning))';
            console.log('Content script响应异常:', response);
          }
        } catch (messageError) {
          console.log('Content script连接失败:', messageError);
          statusElement.textContent = '助手未加载';
          statusElement.style.color = 'hsl(var(--warning))';

          // 尝试注入 content script
          try {
            console.log('尝试自动注入content script...');
            await this.injectContentScript();
            
            // 等待注入完成后重新检查
            setTimeout(async () => {
              try {
                const retryResponse = await chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' });
                if (retryResponse && retryResponse.status === 'connected') {
                  statusElement.textContent = '已连接';
                  statusElement.style.color = 'hsl(var(--success))';
                  console.log('注入后连接成功');
                }
              } catch (retryError) {
                console.log('注入后仍无法连接:', retryError);
                statusElement.textContent = '需要刷新页面';
                statusElement.style.color = 'hsl(var(--destructive))';
              }
            }, 1500);
          } catch (injectError) {
            console.error('注入content script失败:', injectError);
            statusElement.textContent = '注入失败';
            statusElement.style.color = 'hsl(var(--destructive))';
          }
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

  // 手动注入 content script
  async injectContentScript() {
    try {
      if (!this.currentTab || !this.isScratchEditor(this.currentTab.url)) {
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: ['src/content/main.js']
      });

      await chrome.scripting.insertCSS({
        target: { tabId: this.currentTab.id },
        files: ['assets/css/content.css']
      });

      // 等待一下再检查连接
      setTimeout(() => this.checkConnectionStatus(), 1000);

    } catch (error) {
      // 静默处理注入失败
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
    const voiceSelectSetting = document.getElementById('voiceSelectSetting');
    const speechRateSetting = document.getElementById('speechRateSetting');
    const speechVolumeSetting = document.getElementById('speechVolumeSetting');
    const testVoiceBtn = document.getElementById('testVoiceBtn');
    autoPlaySetting.addEventListener('change', () => this.saveSettings());
    highlightSetting.addEventListener('change', () => this.saveSettings());
    languageSetting.addEventListener('change', () => this.saveSettings());
    voiceSelectSetting.addEventListener('change', () => this.saveSettings());
    speechRateSetting.addEventListener('input', () => this.onSpeechRateChange());
    speechVolumeSetting.addEventListener('input', () => this.onSpeechVolumeChange());
    testVoiceBtn.addEventListener('click', () => this.testVoice());

    // 底部链接事件
    document.getElementById('helpLink').addEventListener('click', () => this.openHelp());
    document.getElementById('feedbackLink').addEventListener('click', () => this.openFeedback());
    document.getElementById('aboutLink').addEventListener('click', () => this.showAbout());

    // 添加调试按钮事件（如果存在）
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

      // 先检查content script是否已加载
      let isContentScriptLoaded = false;
      try {
        const response = await Promise.race([
          chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('ping超时')), 2000)
          )
        ]);
        isContentScriptLoaded = response && response.status === 'connected';
      } catch (pingError) {
        console.log('Content script未响应ping，需要注入:', pingError);
        isContentScriptLoaded = false;
      }

      // 如果content script未加载，先注入
      if (!isContentScriptLoaded) {
        console.log('注入content script...');
        try {
          await this.injectContentScript();
          
          // 等待content script初始化
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // 验证注入是否成功
          const verifyResponse = await Promise.race([
            chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('验证超时')), 2000)
            )
          ]);
          
          if (!verifyResponse || verifyResponse.status !== 'connected') {
            throw new Error('Content script注入后仍无法连接');
          }
        } catch (injectError) {
          console.error('注入content script失败:', injectError);
          throw new Error(`无法加载助手：${injectError.message}\n\n解决方法:\n1. 刷新 Scratch 编辑器页面\n2. 重新加载扩展程序\n3. 检查浏览器是否允许扩展在此页面运行`);
        }
      }

      // 现在发送切换消息
      try {
        await chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'toggleWidget'
        });
        window.close();
      } catch (toggleError) {
        console.error('发送切换消息失败:', toggleError);
        throw new Error('助手已加载但无法切换显示状态，请重试');
      }
      
    } catch (error) {
      console.error('切换助手显示状态失败:', error);
      alert(`${error.message}`);
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
        language: 'zh-CN',
        voiceEngine: 'browser',
        voiceSelect: '',
        speechRate: 1.0,
        speechVolume: 0.8
      };

      document.getElementById('autoPlaySetting').checked = settings.autoPlay;
      document.getElementById('highlightSetting').checked = settings.highlight;
      document.getElementById('languageSetting').value = settings.language;
      document.getElementById('speechRateSetting').value = settings.speechRate;
      document.getElementById('speechVolumeSetting').value = settings.speechVolume;

      // 更新滑块显示值
      document.getElementById('speechRateValue').textContent = settings.speechRate + 'x';
      document.getElementById('speechVolumeValue').textContent = Math.round(settings.speechVolume * 100) + '%';

      // 加载浏览器语音选项
      await this.loadBrowserVoices();

      // 设置选中的语音
      if (settings.voiceSelect) {
        document.getElementById('voiceSelectSetting').value = settings.voiceSelect;
      }
    } catch (error) {
      // 静默处理错误
    }
  }

  async saveSettings() {
    try {
      const settings = {
        autoPlay: document.getElementById('autoPlaySetting').checked,
        highlight: document.getElementById('highlightSetting').checked,
        language: document.getElementById('languageSetting').value,
        voiceEngine: 'browser',
        voiceSelect: document.getElementById('voiceSelectSetting').value,
        speechRate: parseFloat(document.getElementById('speechRateSetting').value),
        speechVolume: parseFloat(document.getElementById('speechVolumeSetting').value)
      };

      await chrome.storage.sync.set({ settings });

      // 通知 content script 设置已更新
      if (this.currentTab && this.isScratchEditor(this.currentTab.url)) {
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
      // 静默处理错误
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

  async showDebugInfo() {
    try {
      let debugInfo = '=== 调试信息 ===\n\n';
      
      // 当前标签页信息
      debugInfo += `当前标签页:\n`;
      debugInfo += `- ID: ${this.currentTab?.id || '未知'}\n`;
      debugInfo += `- URL: ${this.currentTab?.url || '未知'}\n`;
      debugInfo += `- 标题: ${this.currentTab?.title || '未知'}\n`;
      debugInfo += `- 是否为Scratch编辑器: ${this.currentTab ? this.isScratchEditor(this.currentTab.url) : '否'}\n\n`;
      
      // 扩展权限检查
      debugInfo += `扩展权限:\n`;
      try {
        const permissions = await chrome.permissions.getAll();
        debugInfo += `- 权限: ${permissions.permissions?.join(', ') || '无'}\n`;
        debugInfo += `- 主机权限: ${permissions.origins?.join(', ') || '无'}\n`;
      } catch (permError) {
        debugInfo += `- 权限检查失败: ${permError.message}\n`;
      }
      debugInfo += '\n';
      
      // Content script 连接测试
      debugInfo += `Content Script 连接测试:\n`;
      if (this.currentTab && this.isScratchEditor(this.currentTab.url)) {
        try {
          const startTime = Date.now();
          const response = await Promise.race([
            chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('超时')), 3000)
            )
          ]);
          const endTime = Date.now();
          
          debugInfo += `- 连接状态: 成功\n`;
          debugInfo += `- 响应时间: ${endTime - startTime}ms\n`;
          debugInfo += `- 响应内容: ${JSON.stringify(response)}\n`;
        } catch (testError) {
          debugInfo += `- 连接状态: 失败\n`;
          debugInfo += `- 错误信息: ${testError.message}\n`;
          
          // 尝试检查是否可以注入
          try {
            await chrome.scripting.executeScript({
              target: { tabId: this.currentTab.id },
              func: () => {
                return {
                  url: window.location.href,
                  readyState: document.readyState,
                  hasAssistant: !!window.scratchVoiceAssistant
                };
              }
            });
            debugInfo += `- 注入测试: 成功\n`;
          } catch (injectTestError) {
            debugInfo += `- 注入测试: 失败 - ${injectTestError.message}\n`;
          }
        }
      } else {
        debugInfo += `- 连接状态: 跳过（不在Scratch编辑器页面）\n`;
      }
      
      debugInfo += '\n=== 建议解决方案 ===\n';
      debugInfo += '1. 刷新 Scratch 编辑器页面\n';
      debugInfo += '2. 重新加载扩展程序\n';
      debugInfo += '3. 检查扩展程序是否有权限访问该网站\n';
      debugInfo += '4. 确保在支持的页面格式下使用';
      
      // 使用更好的显示方式
      const debugWindow = window.open('', '_blank', 'width=600,height=400,scrollbars=yes');
      debugWindow.document.write(`
        <html>
          <head>
            <title>Scratch 语音助手 - 调试信息</title>
            <style>
              body { font-family: monospace; margin: 20px; line-height: 1.5; }
              pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
            </style>
          </head>
          <body>
            <h2>Scratch 语音助手 - 调试信息</h2>
            <pre>${debugInfo}</pre>
            <button onclick="window.close()">关闭</button>
          </body>
        </html>
      `);
      
    } catch (error) {
      console.error('生成调试信息失败:', error);
      alert(`调试信息生成失败: ${error.message}`);
    }
  }

  async loadBrowserVoices() {
    const voiceSelect = document.getElementById('voiceSelectSetting');
    voiceSelect.innerHTML = '<option value="">加载中...</option>';

    try {
      // 加载浏览器语音
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) {
        // 如果语音列表为空，等待加载
        speechSynthesis.onvoiceschanged = () => {
          this.populateBrowserVoices();
        };
      } else {
        this.populateBrowserVoices();
      }
    } catch (error) {
      voiceSelect.innerHTML = '<option value="">加载失败</option>';
    }
  }

  populateBrowserVoices() {
    const voiceSelect = document.getElementById('voiceSelectSetting');
    const voices = speechSynthesis.getVoices();

    voiceSelect.innerHTML = '<option value="">选择语音</option>';

    // 优先显示中文语音
    const chineseVoices = voices.filter(voice =>
      voice.lang.includes('zh') || voice.lang.includes('cmn')
    );

    const otherVoices = voices.filter(voice =>
      !voice.lang.includes('zh') && !voice.lang.includes('cmn')
    );

    if (chineseVoices.length > 0) {
      const chineseGroup = document.createElement('optgroup');
      chineseGroup.label = '中文语音';
      chineseVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        chineseGroup.appendChild(option);
      });
      voiceSelect.appendChild(chineseGroup);
    }

    if (otherVoices.length > 0) {
      const otherGroup = document.createElement('optgroup');
      otherGroup.label = '其他语音';
      otherVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        otherGroup.appendChild(option);
      });
      voiceSelect.appendChild(otherGroup);
    }
  }

  populateGoogleVoices() {
    const voiceSelect = document.getElementById('voiceSelectSetting');
    voiceSelect.innerHTML = '<option value="">选择语音</option>';

    const googleVoices = [
      { name: 'Google 中文女声 (标准)', value: 'zh-CN-Standard-A', lang: 'zh-CN' },
      { name: 'Google 中文男声 (标准)', value: 'zh-CN-Standard-B', lang: 'zh-CN' },
      { name: 'Google 中文女声2 (标准)', value: 'zh-CN-Standard-C', lang: 'zh-CN' },
      { name: 'Google 中文男声2 (标准)', value: 'zh-CN-Standard-D', lang: 'zh-CN' },
      { name: 'Google 中文女声 (神经网络)', value: 'zh-CN-Neural2-A', lang: 'zh-CN' },
      { name: 'Google 中文男声 (神经网络)', value: 'zh-CN-Neural2-B', lang: 'zh-CN' },
      { name: 'Google 中文女声2 (神经网络)', value: 'zh-CN-Neural2-C', lang: 'zh-CN' },
      { name: 'Google 中文男声2 (神经网络)', value: 'zh-CN-Neural2-D', lang: 'zh-CN' }
    ];

    const chineseGroup = document.createElement('optgroup');
    chineseGroup.label = '中文语音';

    googleVoices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.value;
      option.textContent = voice.name;
      chineseGroup.appendChild(option);
    });

    voiceSelect.appendChild(chineseGroup);
  }

  onSpeechRateChange() {
    const rate = document.getElementById('speechRateSetting').value;
    document.getElementById('speechRateValue').textContent = rate + 'x';
    this.saveSettings();
  }

  onSpeechVolumeChange() {
    const volume = document.getElementById('speechVolumeSetting').value;
    document.getElementById('speechVolumeValue').textContent = Math.round(volume * 100) + '%';
    this.saveSettings();
  }

  async testVoice() {
    const testBtn = document.getElementById('testVoiceBtn');
    const originalText = testBtn.textContent;

    try {
      testBtn.textContent = '测试中...';
      testBtn.disabled = true;

      const settings = {
        voiceEngine: 'browser',
        voiceSelect: document.getElementById('voiceSelectSetting').value,
        language: document.getElementById('languageSetting').value,
        speechRate: parseFloat(document.getElementById('speechRateSetting').value),
        speechVolume: parseFloat(document.getElementById('speechVolumeSetting').value)
      };

      // 使用浏览器语音测试
      await this.testVoiceLocally(settings);

    } catch (error) {
      // 显示更详细的错误信息
      let errorMessage = '语音测试失败';
      if (error.message.includes('Could not establish connection')) {
        errorMessage += '\n\n可能的原因:\n1. 请刷新 Scratch 编辑器页面\n2. 重新加载扩展程序\n3. 检查是否在正确的页面';
      } else if (error.message.includes('消息超时')) {
        errorMessage += '\n\n页面响应超时，请重试';
      } else {
        errorMessage += `\n\n错误详情: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setTimeout(() => {
        testBtn.textContent = originalText;
        testBtn.disabled = false;
      }, 2000);
    }
  }

  async testVoiceLocally(settings) {
    return new Promise((resolve, reject) => {
      try {
        if (settings.voiceEngine === 'browser') {
          const utterance = new SpeechSynthesisUtterance('这是语音测试，你好！');
          utterance.lang = settings.language;
          utterance.rate = settings.speechRate;
          utterance.volume = settings.speechVolume;

          // 等待语音列表加载
          let voices = speechSynthesis.getVoices();

          const setupAndSpeak = () => {
            voices = speechSynthesis.getVoices();

            if (settings.voiceSelect && voices.length > 0) {
              const selectedVoice = voices.find(voice => voice.name === settings.voiceSelect);
              if (selectedVoice) {
                utterance.voice = selectedVoice;
              }
            }

            utterance.onstart = () => {
              resolve();
            };

            utterance.onend = () => {
              // 语音播放完成
            };

            utterance.onerror = (error) => {
              reject(error);
            };

            // 确保之前的语音已停止
            if (speechSynthesis.speaking) {
              speechSynthesis.cancel();
            }

            speechSynthesis.speak(utterance);
          };

          if (voices.length === 0) {
            speechSynthesis.onvoiceschanged = setupAndSpeak;
            // 设置超时
            setTimeout(() => {
              if (speechSynthesis.getVoices().length === 0) {
                setupAndSpeak();
              }
            }, 1000);
          } else {
            setupAndSpeak();
          }
        } else {
          alert('Google 语音测试需要在 Scratch 编辑器页面中进行');
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }


}

// 初始化弹窗管理器
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});