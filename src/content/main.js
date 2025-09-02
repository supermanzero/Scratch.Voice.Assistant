// Scratch 教程语音助手 - 主内容脚本
class ScratchVoiceAssistant {
  constructor() {
    this.isInitialized = false;
    this.widget = null;
    this.isCollapsed = false;
    this.currentTutorial = null;
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.speechSynthesis = window.speechSynthesis;
    this.currentUtterance = null;

    this.init();
    this.setupMessageListener();
  }

  async init() {
    if (this.isInitialized) return;

    // 等待页面完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createWidget());
    } else {
      this.createWidget();
    }

    this.isInitialized = true;
  }

  createWidget() {
    // 创建主容器
    this.widget = document.createElement('div');
    this.widget.className = 'scratch-voice-assistant fade-in';
    this.widget.innerHTML = this.getWidgetHTML();

    document.body.appendChild(this.widget);

    // 绑定事件
    this.bindEvents();

    // 加载教程数据
    this.loadTutorials();

    console.log('Scratch 语音助手已加载');
  }

  getWidgetHTML() {
    return `
      <div class="assistant-widget" id="assistantWidget">
        <div class="widget-header">
          <div class="title-section">
            <h3 class="widget-title">教学助手</h3>
          </div>
          <button class="toggle-btn" id="toggleBtn" title="折叠/展开">
            ${this.getIcon('chevron-down')}
          </button>
        </div>
        
        <div class="widget-content" id="widgetContent">
          <div class="tutorial-selector">
            <select class="tutorial-select" id="tutorialSelect">
              <option value="">选择教程...</option>
            </select>
          </div>
          
          <div class="progress-info">
            <span id="stepInfo">第 0 步，共 0 步</span>
            <span id="tutorialTitle">未选择教程</span>
          </div>
          
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill" style="width: 0%"></div>
          </div>
          
          <div class="player-controls">
            <button class="control-btn" id="prevBtn" title="上一步">
              ${this.getIcon('skip-back')}
            </button>
            <button class="control-btn primary" id="playBtn" title="播放/暂停">
              ${this.getIcon('play')}
            </button>
            <button class="control-btn" id="nextBtn" title="下一步">
              ${this.getIcon('skip-forward')}
            </button>
            <button class="control-btn" id="repeatBtn" title="重复当前步骤">
              ${this.getIcon('rotate-ccw')}
            </button>
            <button class="control-btn" id="settingsBtn" title="设置">
              ${this.getIcon('settings')}
            </button>
          </div>
          
          <div class="settings-panel hidden" id="settingsPanel">
            <div class="setting-item">
              <span class="setting-label">语速</span>
              <div class="setting-control">
                <input type="range" class="range-input" id="speedRange" 
                       min="0.5" max="2" step="0.1" value="1">
                <span id="speedValue">1.0x</span>
              </div>
            </div>
            <div class="setting-item">
              <span class="setting-label">音量</span>
              <div class="setting-control">
                <input type="range" class="range-input" id="volumeRange" 
                       min="0" max="1" step="0.1" value="0.8">
                <span id="volumeValue">80%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 折叠/展开按钮
    const toggleBtn = this.widget.querySelector('#toggleBtn');
    toggleBtn.addEventListener('click', () => this.toggleWidget());

    // 播放控制按钮
    const playBtn = this.widget.querySelector('#playBtn');
    const prevBtn = this.widget.querySelector('#prevBtn');
    const nextBtn = this.widget.querySelector('#nextBtn');
    const repeatBtn = this.widget.querySelector('#repeatBtn');
    const settingsBtn = this.widget.querySelector('#settingsBtn');

    playBtn.addEventListener('click', () => this.togglePlay());
    prevBtn.addEventListener('click', () => this.previousStep());
    nextBtn.addEventListener('click', () => this.nextStep());
    repeatBtn.addEventListener('click', () => this.repeatStep());
    settingsBtn.addEventListener('click', () => this.toggleSettings());

    // 教程选择
    const tutorialSelect = this.widget.querySelector('#tutorialSelect');
    tutorialSelect.addEventListener('change', (e) => this.selectTutorial(e.target.value));

    // 设置控制
    const speedRange = this.widget.querySelector('#speedRange');
    const volumeRange = this.widget.querySelector('#volumeRange');

    speedRange.addEventListener('input', (e) => this.updateSpeed(e.target.value));
    volumeRange.addEventListener('input', (e) => this.updateVolume(e.target.value));
  }

  toggleWidget() {
    const widget = this.widget.querySelector('#assistantWidget');
    const content = this.widget.querySelector('#widgetContent');
    const toggleBtn = this.widget.querySelector('#toggleBtn');

    this.isCollapsed = !this.isCollapsed;

    if (this.isCollapsed) {
      content.classList.add('hidden');
      widget.classList.add('collapsed');
      toggleBtn.innerHTML = this.getIcon('chevron-up');
    } else {
      content.classList.remove('hidden');
      widget.classList.remove('collapsed');
      toggleBtn.innerHTML = this.getIcon('chevron-down');
    }
  }

  async loadTutorials() {
    // 模拟教程数据 - 实际项目中会从 JSON 文件加载
    const tutorials = {
      'motion': {
        title: '运动积木教程',
        steps: [
          { text: '欢迎学习 Scratch 运动积木！让我们开始创建一个简单的动画。', action: 'intro' },
          { text: '首先，从积木面板中找到运动分类，它通常是蓝色的。', action: 'find-motion' },
          { text: '拖拽"移动10步"积木到脚本区域。', action: 'drag-move' },
          { text: '点击这个积木，看看角色是否移动了。', action: 'test-move' },
          { text: '很好！现在尝试修改步数，比如改成50步。', action: 'modify-steps' }
        ]
      },
      'looks': {
        title: '外观积木教程',
        steps: [
          { text: '现在学习外观积木，让角色更有趣！', action: 'intro' },
          { text: '找到紫色的外观积木分类。', action: 'find-looks' },
          { text: '拖拽"说Hello!持续2秒"积木到脚本区域。', action: 'drag-say' },
          { text: '点击积木，角色会说话！', action: 'test-say' },
          { text: '尝试修改文字内容，让角色说不同的话。', action: 'modify-text' }
        ]
      }
    };

    const select = this.widget.querySelector('#tutorialSelect');

    Object.keys(tutorials).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = tutorials[key].title;
      select.appendChild(option);
    });

    this.tutorials = tutorials;
  }

  selectTutorial(tutorialKey) {
    if (!tutorialKey || !this.tutorials[tutorialKey]) {
      this.currentTutorial = null;
      this.updateUI();
      return;
    }

    this.currentTutorial = this.tutorials[tutorialKey];
    this.currentStepIndex = 0;
    this.updateUI();
  }

  updateUI() {
    const stepInfo = this.widget.querySelector('#stepInfo');
    const tutorialTitle = this.widget.querySelector('#tutorialTitle');
    const progressFill = this.widget.querySelector('#progressFill');
    const prevBtn = this.widget.querySelector('#prevBtn');
    const nextBtn = this.widget.querySelector('#nextBtn');
    const playBtn = this.widget.querySelector('#playBtn');
    const repeatBtn = this.widget.querySelector('#repeatBtn');

    if (!this.currentTutorial) {
      stepInfo.textContent = '第 0 步，共 0 步';
      tutorialTitle.textContent = '未选择教程';
      progressFill.style.width = '0%';

      // 禁用控制按钮
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      playBtn.disabled = true;
      repeatBtn.disabled = true;
      return;
    }

    const totalSteps = this.currentTutorial.steps.length;
    const currentStep = this.currentStepIndex + 1;
    const progress = (currentStep / totalSteps) * 100;

    stepInfo.textContent = `第 ${currentStep} 步，共 ${totalSteps} 步`;
    tutorialTitle.textContent = this.currentTutorial.title;
    progressFill.style.width = `${progress}%`;

    // 更新按钮状态
    prevBtn.disabled = this.currentStepIndex <= 0;
    nextBtn.disabled = this.currentStepIndex >= totalSteps - 1;
    playBtn.disabled = false;
    repeatBtn.disabled = false;
  }

  togglePlay() {
    if (this.isPlaying) {
      this.stopSpeech();
    } else {
      this.playCurrentStep();
    }
  }

  playCurrentStep() {
    if (!this.currentTutorial || !this.currentTutorial.steps[this.currentStepIndex]) {
      return;
    }

    const step = this.currentTutorial.steps[this.currentStepIndex];
    this.speak(step.text);
  }

  speak(text) {
    // 停止当前播放
    this.stopSpeech();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.lang = 'zh-CN';
    this.currentUtterance.rate = parseFloat(this.widget.querySelector('#speedRange').value);
    this.currentUtterance.volume = parseFloat(this.widget.querySelector('#volumeRange').value);

    this.currentUtterance.onstart = () => {
      this.isPlaying = true;
      this.updatePlayButton();
    };

    this.currentUtterance.onend = () => {
      this.isPlaying = false;
      this.updatePlayButton();
    };

    this.speechSynthesis.speak(this.currentUtterance);
  }

  stopSpeech() {
    if (this.speechSynthesis.speaking) {
      this.speechSynthesis.cancel();
    }
    this.isPlaying = false;
    this.updatePlayButton();
  }

  updatePlayButton() {
    const playBtn = this.widget.querySelector('#playBtn');
    playBtn.innerHTML = this.isPlaying ? this.getIcon('pause') : this.getIcon('play');
  }

  previousStep() {
    if (!this.currentTutorial || this.currentStepIndex <= 0) return;

    this.currentStepIndex--;
    this.updateUI();
    this.playCurrentStep();
  }

  nextStep() {
    if (!this.currentTutorial || this.currentStepIndex >= this.currentTutorial.steps.length - 1) return;

    this.currentStepIndex++;
    this.updateUI();
    this.playCurrentStep();
  }

  repeatStep() {
    this.playCurrentStep();
  }

  toggleSettings() {
    const settingsPanel = this.widget.querySelector('#settingsPanel');
    settingsPanel.classList.toggle('hidden');
  }

  updateSpeed(value) {
    const speedValue = this.widget.querySelector('#speedValue');
    speedValue.textContent = `${parseFloat(value).toFixed(1)}x`;
  }

  updateVolume(value) {
    const volumeValue = this.widget.querySelector('#volumeValue');
    volumeValue.textContent = `${Math.round(parseFloat(value) * 100)}%`;
  }

  // 设置消息监听器
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'ping':
          sendResponse({ status: 'connected' });
          break;

        case 'toggleWidget':
          this.toggleWidget();
          sendResponse({ success: true });
          break;

        case 'selectTutorial':
          this.selectTutorial(request.tutorialId);
          sendResponse({ success: true });
          break;

        case 'updateSettings':
          this.updateSettings(request.settings);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    });
  }

  // 更新设置
  updateSettings(settings) {
    if (settings.speechRate) {
      const speedRange = this.widget.querySelector('#speedRange');
      speedRange.value = settings.speechRate;
      this.updateSpeed(settings.speechRate);
    }

    if (settings.speechVolume) {
      const volumeRange = this.widget.querySelector('#volumeRange');
      volumeRange.value = settings.speechVolume;
      this.updateVolume(settings.speechVolume);
    }
  }

  // Icons8 图标生成器
  getIcon(name) {
    const icons = {
      'chevron-down': '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/expand-arrow--v1.png" alt="展开">',
      'chevron-up': '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/collapse-arrow--v1.png" alt="收起">',
      'play': '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/play--v1.png" alt="播放">',
      'pause': '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/pause--v1.png" alt="暂停">',
      'skip-back': '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/skip-to-start--v1.png" alt="上一步">',
      'skip-forward': '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/end--v1.png" alt="下一步">',
      'rotate-ccw': '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/repeat--v1.png" alt="重复">',
      'settings': '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/settings--v1.png" alt="设置">'
    };

    return icons[name] || '';
  }
}

// 检查是否为 Scratch 编辑器页面
function isScratchEditor() {
  const url = window.location.href;
  const scratchEditorPatterns = [
    'scratch.mit.edu/projects/editor/',
    'scratch.mit.edu/projects/',
    'scratch.mit.edu/create'
  ];

  return scratchEditorPatterns.some(pattern => url.includes(pattern));
}

// 初始化助手
if (isScratchEditor()) {
  console.log('检测到 Scratch 编辑器页面，初始化语音助手...');
  new ScratchVoiceAssistant();
} else {
  console.log('当前页面不是 Scratch 编辑器:', window.location.href);
}