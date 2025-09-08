// Scratch 教程语音助手 - 弹窗脚本

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.init();
  }

  async init() {
    // 检查授权状态
    const isAuthorized = await this.checkLicenseStatus();
    if (!isAuthorized) {
      this.showLicenseRequired();
      return;
    }

    // 获取当前标签页信息
    await this.getCurrentTab();

    // 检查连接状态
    this.checkConnectionStatus();

    // 从Firebase加载教程信息
    await this.loadTutorialsFromFirebase();

    // 加载教程进度
    this.loadTutorialProgress();

    // 绑定事件
    this.bindEvents();

    // 加载设置
    this.loadSettings();
  }

  async checkLicenseStatus() {
    try {
      // 动态加载授权服务
      if (typeof window.licenseService === 'undefined') {
        await this.loadLicenseService();
      }
      
      const licenseService = window.licenseService;
      if (!licenseService) {
        console.error('授权服务未加载');
        return false;
      }
      
      console.log('开始检查授权状态...');
      
      // 智能检查授权状态（优先使用本地状态）
      const status = await licenseService.checkLicenseStatus();
      console.log('授权状态检查结果:', status);
      
      if (status.isAuthorized) {
        console.log('授权验证通过');
        if (status.localOnly) {
          console.log('使用本地授权状态（未过期）');
        } else if (status.cloudVerified) {
          console.log('云端验证通过');
        } else if (status.offline) {
          console.log('离线模式，使用本地状态');
        }
        return true;
      }
      
      // 如果本地没有授权信息，需要用户输入授权码
      if (status.needsValidation) {
        console.log('需要用户输入授权码:', status.message);
      }
      
      console.log('需要用户输入授权码');
      return false;
    } catch (error) {
      console.error('检查授权状态失败:', error);
      return false;
    }
  }

  async loadLicenseService() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '../services/licenseService.js';
      script.onload = () => {
        console.log('授权服务脚本加载完成');
        // 等待一下确保全局变量完全初始化
        setTimeout(() => {
          if (window.licenseService) {
            console.log('授权服务全局变量已就绪');
            resolve();
          } else {
            console.error('授权服务全局变量未就绪');
            reject(new Error('授权服务全局变量未就绪'));
          }
        }, 100);
      };
      script.onerror = (error) => {
        console.error('加载授权服务脚本失败:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  showLicenseRequired() {
    // 隐藏主要内容
    const mainContent = document.querySelector('.popup-main');
    if (mainContent) {
      mainContent.style.display = 'none';
    }
    
    // 显示授权提示
    const body = document.body;
    body.innerHTML = `
      <div class="license-required">
        <div class="license-icon">🔑</div>
        <h2>需要授权</h2>
        <p>请先验证授权码以使用 Scratch Voice Assistant</p>
        <button id="openLicenseModal" class="btn btn-primary">输入授权码</button>
        <div class="help-text">
          如果您没有授权码，请联系管理员获取
        </div>
      </div>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .license-required {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        padding: 40px 20px;
        text-align: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .license-icon {
        font-size: 64px;
        margin-bottom: 20px;
      }
      .license-required h2 {
        font-size: 24px;
        margin-bottom: 12px;
        font-weight: 600;
      }
      .license-required p {
        font-size: 16px;
        margin-bottom: 24px;
        opacity: 0.9;
      }
      .btn {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
        display: inline-block;
      }
      .btn-primary {
        background: white;
        color: #667eea;
      }
      .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
      }
      .help-text {
        margin-top: 20px;
        font-size: 12px;
        opacity: 0.8;
      }
    `;
    document.head.appendChild(style);
    
    // 绑定事件
    document.getElementById('openLicenseModal').addEventListener('click', () => {
      this.openLicenseModal();
    });
  }

  openLicenseModal() {
    // 打开授权码输入窗口
    chrome.windows.create({
      url: chrome.runtime.getURL('src/popup/licenseModal.html'),
      type: 'popup',
      width: 600,
      height: 500,
      focused: true
    }, (window) => {
      if (chrome.runtime.lastError) {
        console.error('打开授权窗口失败:', chrome.runtime.lastError);
        alert('无法打开授权窗口，请检查浏览器设置');
      } else {
        console.log('授权窗口已打开');
        // 监听窗口关闭事件
        this.monitorLicenseWindow(window.id);
      }
    });
  }

  monitorLicenseWindow(windowId) {
    // 监听窗口关闭事件
    const checkWindow = () => {
      chrome.windows.get(windowId, (window) => {
        if (chrome.runtime.lastError) {
          // 窗口已关闭，重新检查授权状态
          this.checkLicenseAndReload();
        } else {
          // 窗口仍然存在，继续监听
          setTimeout(checkWindow, 1000);
        }
      });
    };
    
    setTimeout(checkWindow, 1000);
  }

  async checkLicenseAndReload() {
    console.log('检查授权状态并重新加载...');
    const isAuthorized = await this.checkLicenseStatus();
    console.log('授权状态检查结果:', isAuthorized);
    
    if (isAuthorized) {
      console.log('授权成功，重新初始化界面');
      // 授权成功，重新初始化界面而不是重新加载页面
      await this.initializeAfterAuth();
    } else {
      console.log('授权失败，保持当前状态');
    }
  }

  async initializeAfterAuth() {
    try {
      // 隐藏授权提示界面
      const licenseRequired = document.querySelector('.license-required');
      if (licenseRequired) {
        licenseRequired.remove();
      }
      
      // 显示主要内容
      const mainContent = document.querySelector('.popup-main');
      if (mainContent) {
        mainContent.style.display = 'block';
      } else {
        // 如果主要内容不存在，重新加载页面
        location.reload();
        return;
      }
      
      // 重新初始化主要功能
      await this.getCurrentTab();
      this.checkConnectionStatus();
      await this.loadTutorialsFromFirebase();
      this.loadTutorialProgress();
      this.bindEvents();
      this.loadSettings();
      
      console.log('授权后界面初始化完成');
    } catch (error) {
      console.error('授权后初始化失败:', error);
      // 如果初始化失败，回退到重新加载页面
      location.reload();
    }
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
      'scratch.mit.edu/projects/create',
      'machinelearningforkids.co.uk/scratch'
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
              setTimeout(() => reject(new Error('消息超时')), 3000)
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
                const retryResponse = await Promise.race([
                  chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' }),
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('重试超时')), 3000)
                  )
                ]);
                
                if (retryResponse && retryResponse.status === 'connected') {
                  statusElement.textContent = '已连接';
                  statusElement.style.color = 'hsl(var(--success))';
                  console.log('注入后连接成功');
                } else {
                  statusElement.textContent = '注入后仍无法连接';
                  statusElement.style.color = 'hsl(var(--destructive))';
                }
              } catch (retryError) {
                console.log('注入后仍无法连接:', retryError);
                statusElement.textContent = '需要刷新页面';
                statusElement.style.color = 'hsl(var(--destructive))';
              }
            }, 2500);
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

      console.log('开始注入Content Script到标签页:', this.currentTab.id);

      // 按顺序注入脚本文件（Firebase配置必须在main.js之前）
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: ['src/firebase/config.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: ['src/content/main.js']
      });

      await chrome.scripting.insertCSS({
        target: { tabId: this.currentTab.id },
        files: ['assets/css/content.css']
      });

      console.log('Content Script注入完成，等待初始化...');

      // 等待更长时间让脚本完全初始化
      setTimeout(async () => {
        console.log('检查注入后的连接状态...');
        
        // 先检查脚本是否已注入
        try {
          const checkResult = await chrome.scripting.executeScript({
            target: { tabId: this.currentTab.id },
            func: () => {
              return {
                hasAssistant: !!window.scratchVoiceAssistant,
                messageListenerReady: window.scratchVoiceAssistant?.messageListenerReady || false,
                isInitialized: window.scratchVoiceAssistant?.isInitialized || false,
                readyState: document.readyState,
                url: window.location.href,
                timestamp: Date.now()
              };
            }
          });
          
          if (checkResult && checkResult[0]) {
            console.log('脚本注入检查结果:', checkResult[0].result);
          }
        } catch (checkError) {
          console.error('脚本注入检查失败:', checkError);
        }
        
        // 然后检查连接状态
        this.checkConnectionStatus();
      }, 5000); // 增加等待时间到5秒

    } catch (error) {
      console.error('注入Content Script失败:', error);
      throw error;
    }
  }

  // 从Firebase加载教程信息
  async loadTutorialsFromFirebase() {
    const tutorialList = document.getElementById('tutorialList');
    
    try {
      // 显示加载状态
      tutorialList.innerHTML = `
        <div class="loading-tutorials">
          <div class="loading-spinner"></div>
          <p>正在从Firebase加载教程...</p>
        </div>
      `;

      // 通过background script获取教程数据
      const response = await chrome.runtime.sendMessage({
        action: 'getTutorials'
      });

      if (response.success && response.data) {
        console.log('从Firebase获取教程数据成功:', response.data);
        this.tutorials = response.data;
        this.renderTutorialList(response.data);
      } else {
        throw new Error(response.error || '获取教程数据失败');
      }
    } catch (error) {
      console.error('从Firebase加载教程失败:', error);
      this.showTutorialError(error.message);
    }
  }

  // 渲染教程列表
  renderTutorialList(tutorials) {
    const tutorialList = document.getElementById('tutorialList');
    
    if (!tutorials || Object.keys(tutorials).length === 0) {
      tutorialList.innerHTML = `
        <div class="tutorial-error">
          <p>暂无可用教程</p>
        </div>
      `;
      return;
    }

    const tutorialKeys = Object.keys(tutorials);
    tutorialList.innerHTML = '';

    tutorialKeys.forEach((tutorialId, index) => {
      const tutorial = tutorials[tutorialId];
      const tutorialItem = this.createTutorialItem(tutorialId, tutorial, index);
      tutorialList.appendChild(tutorialItem);
    });
  }

  // 创建教程项
  createTutorialItem(tutorialId, tutorial, index) {
    const item = document.createElement('div');
    item.className = 'tutorial-item';
    item.setAttribute('data-tutorial-id', tutorialId);

    const difficultyClass = this.getDifficultyClass(tutorial.difficulty || 'beginner');
    const stepCount = tutorial.steps ? tutorial.steps.length : 0;

    item.innerHTML = `
      <div class="tutorial-info">
        <h4>${tutorial.title || '未命名教程'}</h4>
        <p>${tutorial.description || '暂无描述'}</p>
        <div class="tutorial-meta">
          <span class="difficulty ${difficultyClass}">${this.getDifficultyText(tutorial.difficulty || 'beginner')}</span>
          <span class="duration">${tutorial.duration || '未知'}</span>
        </div>
      </div>
      <div class="tutorial-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <span class="progress-text">0/${stepCount}</span>
      </div>
    `;

    return item;
  }

  // 获取难度样式类
  getDifficultyClass(difficulty) {
    const difficultyMap = {
      'beginner': 'beginner',
      'intermediate': 'intermediate', 
      'advanced': 'advanced'
    };
    return difficultyMap[difficulty] || 'beginner';
  }

  // 获取难度文本
  getDifficultyText(difficulty) {
    const difficultyMap = {
      'beginner': '初级',
      'intermediate': '中级',
      'advanced': '高级'
    };
    return difficultyMap[difficulty] || '初级';
  }

  // 显示教程加载错误
  showTutorialError(errorMessage) {
    const tutorialList = document.getElementById('tutorialList');
    tutorialList.innerHTML = `
      <div class="tutorial-error">
        <p>加载教程失败: ${errorMessage}</p>
        <button class="retry-button" onclick="location.reload()">重试</button>
      </div>
    `;
  }

  async loadTutorialProgress() {
    try {
      const result = await chrome.storage.sync.get(['tutorialProgress']);
      const progress = result.tutorialProgress || {};

      // 更新教程进度显示
      const tutorialItems = document.querySelectorAll('.tutorial-item');

      for (const item of tutorialItems) {
        const tutorialId = item.getAttribute('data-tutorial-id');
        if (!tutorialId) continue;

        const tutorialProgress = progress[tutorialId];
        const progressFill = item.querySelector('.progress-fill');
        const progressText = item.querySelector('.progress-text');

        if (tutorialProgress && this.tutorials && this.tutorials[tutorialId]) {
          const totalSteps = this.tutorials[tutorialId].steps ? this.tutorials[tutorialId].steps.length : 0;
          const currentStep = tutorialProgress.currentStep + 1;
          const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

          progressFill.style.width = `${progressPercent}%`;
          progressText.textContent = `${currentStep}/${totalSteps}`;

          if (tutorialProgress.completed) {
            item.style.borderColor = 'hsl(var(--success))';
            progressFill.style.background = 'hsl(var(--success))';
          }
        }
      }
    } catch (error) {
      console.error('加载教程进度失败:', error);
    }
  }

  async getTutorialStepCount(tutorialId) {
    try {
      // 优先使用已加载的教程数据
      if (this.tutorials && this.tutorials[tutorialId]) {
        return this.tutorials[tutorialId].steps ? this.tutorials[tutorialId].steps.length : 0;
      }

      // 如果本地没有数据，尝试从Firebase获取
      const response = await chrome.runtime.sendMessage({
        action: 'getTutorials'
      });
      
      if (response.success && response.data[tutorialId]) {
        return response.data[tutorialId].steps ? response.data[tutorialId].steps.length : 0;
      }
    } catch (error) {
      console.warn('获取教程步骤数失败:', error);
    }
    
    // 默认步骤数作为回退
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

    // 教程项点击事件 - 使用事件委托处理动态生成的元素
    const tutorialList = document.getElementById('tutorialList');
    tutorialList.addEventListener('click', (e) => {
      const tutorialItem = e.target.closest('.tutorial-item');
      if (tutorialItem) {
        const tutorialId = tutorialItem.getAttribute('data-tutorial-id');
        if (tutorialId) {
          this.selectTutorialById(tutorialId);
        }
      }
    });

    // 设置变更事件
    const autoPlaySetting = document.getElementById('autoPlaySetting');
    const highlightSetting = document.getElementById('highlightSetting');
    const voiceEngineSetting = document.getElementById('voiceEngineSetting');
    const languageSetting = document.getElementById('languageSetting');
    const voiceSelectSetting = document.getElementById('voiceSelectSetting');
    const speechRateSetting = document.getElementById('speechRateSetting');
    const speechVolumeSetting = document.getElementById('speechVolumeSetting');
    const testVoiceBtn = document.getElementById('testVoiceBtn');
    const syncFirebaseBtn = document.getElementById('syncFirebaseBtn');
    const refreshTutorialsBtn = document.getElementById('refreshTutorialsBtn');
    
    // 安全地绑定事件，检查元素是否存在
    if (autoPlaySetting) autoPlaySetting.addEventListener('change', () => this.saveSettings());
    if (highlightSetting) highlightSetting.addEventListener('change', () => this.saveSettings());
    if (voiceEngineSetting) voiceEngineSetting.addEventListener('change', () => this.onVoiceEngineChange());
    if (languageSetting) languageSetting.addEventListener('change', () => this.saveSettings());
    if (voiceSelectSetting) voiceSelectSetting.addEventListener('change', () => this.saveSettings());
    if (speechRateSetting) speechRateSetting.addEventListener('input', () => this.onSpeechRateChange());
    if (speechVolumeSetting) speechVolumeSetting.addEventListener('input', () => this.onSpeechVolumeChange());
    if (testVoiceBtn) testVoiceBtn.addEventListener('click', () => this.testVoice());
    if (syncFirebaseBtn) syncFirebaseBtn.addEventListener('click', () => this.syncTutorialsToFirebase());
    if (refreshTutorialsBtn) refreshTutorialsBtn.addEventListener('click', () => this.refreshTutorials());

    // 底部链接事件
    const helpLink = document.getElementById('helpLink');
    const feedbackLink = document.getElementById('feedbackLink');
    const aboutLink = document.getElementById('aboutLink');
    
    if (helpLink) helpLink.addEventListener('click', () => this.openHelp());
    if (feedbackLink) feedbackLink.addEventListener('click', () => this.openFeedback());
    if (aboutLink) aboutLink.addEventListener('click', () => this.showAbout());

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
        
        // 提供更详细的错误信息和解决方案
        if (toggleError.message.includes('Could not establish connection')) {
          throw new Error(`无法连接到助手：${toggleError.message}\n\n解决方案：\n1. 刷新 Scratch 编辑器页面\n2. 重新加载扩展程序\n3. 使用调试工具检查连接状态`);
        } else {
          throw new Error('助手已加载但无法切换显示状态，请重试');
        }
      }
      
    } catch (error) {
      console.error('切换助手显示状态失败:', error);
      alert(`${error.message}`);
    }
  }

  // 通过教程ID选择教程
  async selectTutorialById(tutorialId) {
    try {
      if (!this.currentTab || !this.isScratchEditor(this.currentTab.url)) {
        alert('请先打开 Scratch 编辑器页面');
        return;
      }

      if (!this.tutorials || !this.tutorials[tutorialId]) {
        alert('教程不存在或未加载');
        return;
      }

      // 保存教程选择到存储，用于同步
      await chrome.storage.local.set({ 
        currentTutorial: tutorialId,
        currentStepIndex: 0 
      });

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

  // 兼容旧的方法（通过索引选择）
  async selectTutorial(index) {
    if (!this.tutorials) {
      alert('教程数据未加载，请稍后重试');
      return;
    }

    const tutorialIds = Object.keys(this.tutorials);
    if (index >= 0 && index < tutorialIds.length) {
      await this.selectTutorialById(tutorialIds[index]);
    } else {
      alert('无效的教程索引');
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      const settings = result.settings || {
        autoPlay: false,
        highlight: true,
        language: 'zh-CN',
        voiceEngine: 'baidu',
        voiceSelect: 'baidu-110', // 度小童
        speechRate: 1.0,
        speechVolume: 0.8
      };

      document.getElementById('autoPlaySetting').checked = settings.autoPlay;
      document.getElementById('highlightSetting').checked = settings.highlight;
      document.getElementById('voiceEngineSetting').value = settings.voiceEngine;
      document.getElementById('languageSetting').value = settings.language;
      document.getElementById('speechRateSetting').value = settings.speechRate;
      document.getElementById('speechVolumeSetting').value = settings.speechVolume;

      // 更新滑块显示值
      document.getElementById('speechRateValue').textContent = settings.speechRate + 'x';
      document.getElementById('speechVolumeValue').textContent = Math.round(settings.speechVolume * 100) + '%';

      // 根据语音引擎加载语音选项
      await this.loadVoiceOptions(settings.voiceEngine);

      // 设置选中的语音，默认为度小童
      document.getElementById('voiceSelectSetting').value = settings.voiceSelect || 'baidu-110';
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
        voiceEngine: document.getElementById('voiceEngineSetting').value,
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

  async onVoiceEngineChange() {
    const voiceEngine = document.getElementById('voiceEngineSetting').value;
    await this.loadVoiceOptions(voiceEngine);
    this.saveSettings();
  }

  async loadVoiceOptions(voiceEngine) {
    switch (voiceEngine) {
      case 'browser':
        await this.loadBrowserVoices();
        break;
      case 'google':
        this.populateGoogleVoices();
        break;
      case 'baidu':
        this.populateBaiduVoices();
        break;
      default:
        await this.loadBrowserVoices();
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

  populateBaiduVoices() {
    const voiceSelect = document.getElementById('voiceSelectSetting');
    voiceSelect.innerHTML = '<option value="">选择语音</option>';

    const baiduVoices = [
      { name: '百度女声 (度小美)', value: 'baidu-0', lang: 'zh-CN' },
      { name: '百度男声 (度小宇)', value: 'baidu-1', lang: 'zh-CN' },
      { name: '百度女声 (度小娇)', value: 'baidu-3', lang: 'zh-CN' },
      { name: '百度男声 (度米朵)', value: 'baidu-4', lang: 'zh-CN' },
      { name: '百度女声 (度小鹿)', value: 'baidu-103', lang: 'zh-CN' },
      { name: '百度男声 (度博文)', value: 'baidu-106', lang: 'zh-CN' },
      { name: '百度女声 (度小童)', value: 'baidu-110', lang: 'zh-CN' },
      { name: '百度女声 (度小萌)', value: 'baidu-111', lang: 'zh-CN' }
    ];

    const chineseGroup = document.createElement('optgroup');
    chineseGroup.label = '百度语音';

    baiduVoices.forEach(voice => {
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
        voiceEngine: document.getElementById('voiceEngineSetting').value,
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
        } else if (settings.voiceEngine === 'baidu') {
          this.testBaiduVoice(settings, '这是百度语音测试，你好！')
            .then(resolve)
            .catch(reject);
        } else {
          alert('Google 和百度语音测试需要在 Scratch 编辑器页面中进行');
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async testBaiduVoice(settings, text) {
    try {
      // 通过background service worker获取音频（解决CORS问题）
      const response = await chrome.runtime.sendMessage({
        action: 'fetchTTSAudio',
        engine: 'baidu',
        text: text,
        settings: {
          voice: settings.voiceSelect,
          speed: settings.speechRate,
          volume: settings.speechVolume,
          language: settings.language
        }
      });

      if (!response.success) {
        throw new Error(response.error || '百度TTS 请求失败');
      }

      const audio = new Audio();
      audio.volume = settings.speechVolume;
      
      return new Promise((resolve, reject) => {
        audio.onloadstart = () => {
          resolve();
        };

        audio.onended = () => {
          console.log('百度TTS播放完成');
        };

        audio.onerror = () => {
          reject(new Error('百度TTS播放失败'));
        };

        audio.src = response.audioData;
        audio.play().catch(reject);
      });
    } catch (error) {
      throw new Error(`百度TTS测试失败: ${error.message}`);
    }
  }

  // 同步教程数据到Firebase
  async syncTutorialsToFirebase() {
    const syncBtn = document.getElementById('syncFirebaseBtn');
    const originalText = syncBtn.innerHTML;
    
    try {
      // 更新按钮状态
      syncBtn.innerHTML = '<img class="btn-icon" src="https://img.icons8.com/ios-glyphs/16/hourglass--v1.png" alt="同步中">同步中...';
      syncBtn.disabled = true;

      // 获取默认教程数据
      const defaultTutorials = this.getDefaultTutorials();
      
      // 通过background script同步到Firebase
      const response = await chrome.runtime.sendMessage({
        action: 'syncTutorialsToFirebase',
        tutorials: defaultTutorials
      });

      if (response.success) {
        // 显示成功消息
        syncBtn.innerHTML = '<img class="btn-icon" src="https://img.icons8.com/ios-glyphs/16/checkmark--v1.png" alt="成功">同步成功';
        syncBtn.style.background = '#28a745';
        
        // 2秒后恢复按钮
        setTimeout(() => {
          syncBtn.innerHTML = originalText;
          syncBtn.disabled = false;
          syncBtn.style.background = '';
        }, 2000);
        
        console.log('教程数据同步到Firebase成功');
      } else {
        throw new Error(response.error || '同步失败');
      }
    } catch (error) {
      console.error('同步教程数据到Firebase失败:', error);
      
      // 显示错误消息
      syncBtn.innerHTML = '<img class="btn-icon" src="https://img.icons8.com/ios-glyphs/16/cancel--v1.png" alt="失败">同步失败';
      syncBtn.style.background = '#dc3545';
      
      // 2秒后恢复按钮
      setTimeout(() => {
        syncBtn.innerHTML = originalText;
        syncBtn.disabled = false;
        syncBtn.style.background = '';
      }, 2000);
    }
  }

  // 刷新教程数据
  async refreshTutorials() {
    const refreshBtn = document.getElementById('refreshTutorialsBtn');
    const originalText = refreshBtn.innerHTML;
    
    try {
      // 更新按钮状态
      refreshBtn.innerHTML = '<img class="btn-icon" src="https://img.icons8.com/ios-glyphs/16/hourglass--v1.png" alt="刷新中">刷新中...';
      refreshBtn.disabled = true;

      // 检查是否在Scratch编辑器页面
      if (!this.currentTab || !this.isScratchEditor(this.currentTab.url)) {
        throw new Error('请在Scratch编辑器页面中使用此功能');
      }

      // 发送刷新消息到content script
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'refreshTutorials'
      });

      // 显示成功消息
      refreshBtn.innerHTML = '<img class="btn-icon" src="https://img.icons8.com/ios-glyphs/16/checkmark--v1.png" alt="成功">刷新成功';
      refreshBtn.style.background = '#28a745';
      
      // 2秒后恢复按钮
      setTimeout(() => {
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
        refreshBtn.style.background = '';
      }, 2000);
      
      console.log('教程数据刷新成功');
    } catch (error) {
      console.error('刷新教程数据失败:', error);
      
      // 显示错误消息
      refreshBtn.innerHTML = '<img class="btn-icon" src="https://img.icons8.com/ios-glyphs/16/cancel--v1.png" alt="失败">刷新失败';
      refreshBtn.style.background = '#dc3545';
      
      // 2秒后恢复按钮
      setTimeout(() => {
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
        refreshBtn.style.background = '';
      }, 2000);
      
      alert(`刷新教程数据失败: ${error.message}`);
    }
  }

  // 获取默认教程数据
  getDefaultTutorials() {
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


}

// 初始化弹窗管理器
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});