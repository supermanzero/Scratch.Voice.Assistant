// Scratch 教程语音助手 - 主内容脚本
class ScratchVoiceAssistant {
  constructor() {
    this.isInitialized = false;
    this.widget = null;
    this.isCollapsed = false;
    this.currentTutorial = null;
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.ttsService = null;
    this.hasUserInteracted = false;

    this.init();
    this.setupMessageListener();
  }

  async init() {
    if (this.isInitialized) return;

    // 加载 TTS 服务
    await this.loadTTSService();

    // 等待页面完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createWidget());
    } else {
      this.createWidget();
    }

    this.isInitialized = true;
  }

  // 加载 TTS 服务 - 简化版本
  async loadTTSService() {
    try {
      // 直接在这里定义一个简化的 TTS 服务类
      this.ttsService = this.createSimpleTTSService();

      // 从存储中加载设置
      const result = await chrome.storage.sync.get(['settings']);
      if (result.settings) {
        const ttsSettings = {
          engine: result.settings.voiceEngine || 'browser',
          language: result.settings.language || 'zh-CN',
          voice: result.settings.voiceSelect || '',
          speed: result.settings.speechRate || 1.0,
          volume: result.settings.speechVolume || 0.8
        };
        this.ttsService.updateSettings(ttsSettings);
      }
    } catch (error) {
      this.ttsService = null;
    }
  }

  // 创建简化的 TTS 服务
  createSimpleTTSService() {
    return {
      settings: {
        engine: 'browser',
        language: 'zh-CN',
        voice: '',
        speed: 1.0,
        volume: 0.8
      },

      currentAudio: null,
      currentUtterance: null,
      isPlaying: false,

      updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
      },

      async speak(text, onStart, onEnd, onError) {
        try {
          // 停止当前播放
          this.stop();

          if (this.settings.engine === 'google' || this.settings.engine === 'google-cloud') {
            // 尝试 Google TTS
            try {
              await this.speakWithGoogle(text, onStart, onEnd, onError);
            } catch (googleError) {
              await this.speakWithBrowser(text, onStart, onEnd, onError);
            }
          } else {
            // 使用浏览器 TTS
            await this.speakWithBrowser(text, onStart, onEnd, onError);
          }
        } catch (error) {
          if (onError) onError(error);
        }
      },

      async speakWithBrowser(text, onStart, onEnd, onError) {
        return new Promise((resolve, reject) => {
          try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.settings.language;
            utterance.rate = this.settings.speed;
            utterance.volume = this.settings.volume;

            // 获取语音列表
            let voices = speechSynthesis.getVoices();

            const setupAndSpeak = () => {
              voices = speechSynthesis.getVoices();

              // 选择语音
              if (this.settings.voice && voices.length > 0) {
                const selectedVoice = voices.find(voice => voice.name === this.settings.voice);
                if (selectedVoice) {
                  utterance.voice = selectedVoice;
                }
              } else if (voices.length > 0) {
                // 自动选择中文语音
                const chineseVoice = voices.find(voice =>
                  voice.lang.includes('zh') || voice.lang.includes('cmn')
                );
                if (chineseVoice) {
                  utterance.voice = chineseVoice;
                }
              }

              utterance.onstart = () => {
                this.isPlaying = true;
                if (onStart) onStart();
                resolve();
              };

              utterance.onend = () => {
                this.isPlaying = false;
                if (onEnd) onEnd();
              };

              utterance.onerror = (error) => {
                this.isPlaying = false;
                if (onError) onError(error);
                reject(error);
              };

              // 确保之前的语音已停止
              if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
              }

              speechSynthesis.speak(utterance);
              this.currentUtterance = utterance;
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
          } catch (error) {
            reject(error);
          }
        });
      },

      async speakWithGoogle(text, onStart, onEnd, onError) {
        console.log('speakWithGoogle', text);
        try {
          // 构建 Google TTS URL
          const maxLength = 200;
          const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

          const params = new URLSearchParams({
            ie: 'UTF-8',
            q: truncatedText,
            tl: this.settings.language,
            client: 'tw-ob',
            ttsspeed: this.settings.speed,
            total: 1,
            idx: 0
          });

          const audioUrl = `https://translate.google.com/translate_tts?${params.toString()}`;

          this.currentAudio = new Audio();
          this.currentAudio.crossOrigin = 'anonymous';
          this.currentAudio.volume = this.settings.volume;
          this.currentAudio.playbackRate = this.settings.speed;

          this.currentAudio.onloadstart = () => {
            this.isPlaying = true;
            if (onStart) onStart();
          };

          this.currentAudio.onended = () => {
            this.isPlaying = false;
            if (onEnd) onEnd();
          };

          this.currentAudio.onerror = (error) => {
            this.isPlaying = false;
            throw new Error('Google TTS 播放失败');
          };

          this.currentAudio.src = audioUrl;
          await this.currentAudio.play();
        } catch (error) {
          throw error;
        }
      },

      stop() {
        this.isPlaying = false;

        // 停止 Google TTS 音频
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
          this.currentAudio = null;
        }

        // 停止浏览器 TTS
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
        }

        if (this.currentUtterance) {
          this.currentUtterance = null;
        }
      },

      getStatus() {
        return {
          isPlaying: this.isPlaying,
          engine: this.settings.engine,
          settings: this.settings
        };
      }
    };
  }



  // 创建内联 TTS 服务（最后的回退方案）
  createInlineTTSService() {
    return {
      settings: {
        engine: 'browser-inline',
        language: 'zh-CN',
        voice: '',
        speed: 1.0,
        volume: 0.8
      },

      isPlaying: false,
      currentUtterance: null,

      updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
      },

      async speak(text, onStart, onEnd, onError) {
        try {
          // 停止当前播放
          this.stop();

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = this.settings.language;
          utterance.rate = this.settings.speed;
          utterance.volume = this.settings.volume;

          // 等待并选择语音
          let voices = speechSynthesis.getVoices();
          if (voices.length === 0) {
            await new Promise((resolve) => {
              speechSynthesis.onvoiceschanged = () => {
                voices = speechSynthesis.getVoices();
                resolve();
              };
              setTimeout(resolve, 1000);
            });
            voices = speechSynthesis.getVoices();
          }

          // 选择中文语音
          if (voices.length > 0) {
            const chineseVoice = voices.find(voice =>
              voice.lang.includes('zh') || voice.lang.includes('cmn')
            );
            if (chineseVoice) {
              utterance.voice = chineseVoice;
            }
          }

          utterance.onstart = () => {
            this.isPlaying = true;
            if (onStart) onStart();
          };

          utterance.onend = () => {
            this.isPlaying = false;
            if (onEnd) onEnd();
          };

          utterance.onerror = (error) => {
            this.isPlaying = false;
            if (onError) onError(error);
          };

          speechSynthesis.speak(utterance);
          this.currentUtterance = utterance;

        } catch (error) {
          this.isPlaying = false;
          if (onError) onError(error);
        }
      },

      stop() {
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
        }
        this.isPlaying = false;
        this.currentUtterance = null;
      },

      pause() {
        if (speechSynthesis.speaking) {
          speechSynthesis.pause();
          this.isPlaying = false;
        }
      },

      resume() {
        if (speechSynthesis.paused) {
          speechSynthesis.resume();
          this.isPlaying = true;
        }
      },

      getStatus() {
        return {
          isPlaying: this.isPlaying,
          engine: 'browser-inline',
          settings: this.settings
        };
      }
    };
  }

  createWidget() {
    try {
      console.log('开始创建语音助手浮窗...');
      
      // 检查是否已存在
      const existingWidget = document.querySelector('.scratch-voice-assistant');
      if (existingWidget) {
        console.log('浮窗已存在，移除旧的');
        existingWidget.remove();
      }

      // 创建主容器
      this.widget = document.createElement('div');
      this.widget.className = 'scratch-voice-assistant fade-in';
      this.widget.innerHTML = this.getWidgetHTML();

      console.log('浮窗HTML已生成，准备添加到页面');
      document.body.appendChild(this.widget);
      console.log('浮窗已添加到页面');

      // 绑定事件
      this.bindEvents();
      console.log('事件已绑定');

      // 加载教程数据
      this.loadTutorials();
      console.log('教程数据已加载');

      // 加载浮窗设置
      this.loadWidgetSettings();
      console.log('浮窗设置已加载');

      // 加载语音选项
      this.loadWidgetVoices();
      console.log('语音选项已加载');

      console.log('语音助手浮窗创建完成');
    } catch (error) {
      console.error('创建浮窗时出错:', error);
    }
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
              <label class="setting-label">
                <input type="checkbox" id="autoPlaySetting">
                <span class="checkmark"></span>
                自动播放下一步
              </label>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <input type="checkbox" id="highlightSetting" checked>
                <span class="checkmark"></span>
                高亮显示相关积木
              </label>
            </div>
            <div class="setting-item">
              <span class="setting-text">语音选择</span>
              <select class="setting-select" id="voiceSelectSetting">
                <option value="">加载中...</option>
              </select>
            </div>
            <div class="setting-item">
              <span class="setting-text">语音语言</span>
              <select class="setting-select" id="languageSetting">
                <option value="zh-CN">中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
            <div class="setting-item">
              <span class="setting-text">语音速度</span>
              <div class="slider-container">
                <input type="range" class="setting-slider" id="speechRateSetting" min="0.5" max="2" step="0.1" value="1">
                <span class="slider-value" id="speechRateValue">1.0x</span>
              </div>
            </div>
            <div class="setting-item">
              <span class="setting-text">音量</span>
              <div class="slider-container">
                <input type="range" class="setting-slider" id="speechVolumeSetting" min="0" max="1" step="0.1" value="0.8">
                <span class="slider-value" id="speechVolumeValue">80%</span>
              </div>
            </div>
            <div class="setting-item">
              <button class="test-voice-btn" id="testVoiceBtn">
                <img class="btn-icon" src="https://img.icons8.com/ios-glyphs/16/play--v1.png" alt="测试">
                测试语音
              </button>
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
    const autoPlaySetting = this.widget.querySelector('#autoPlaySetting');
    const highlightSetting = this.widget.querySelector('#highlightSetting');
    const languageSetting = this.widget.querySelector('#languageSetting');
    const voiceSelectSetting = this.widget.querySelector('#voiceSelectSetting');
    const speechRateSetting = this.widget.querySelector('#speechRateSetting');
    const speechVolumeSetting = this.widget.querySelector('#speechVolumeSetting');
    const testVoiceBtn = this.widget.querySelector('#testVoiceBtn');

    if (autoPlaySetting) autoPlaySetting.addEventListener('change', () => this.saveWidgetSettings());
    if (highlightSetting) highlightSetting.addEventListener('change', () => this.saveWidgetSettings());
    if (languageSetting) languageSetting.addEventListener('change', () => this.saveWidgetSettings());
    if (voiceSelectSetting) voiceSelectSetting.addEventListener('change', () => this.saveWidgetSettings());
    if (speechRateSetting) speechRateSetting.addEventListener('input', () => this.onWidgetSpeechRateChange());
    if (speechVolumeSetting) speechVolumeSetting.addEventListener('input', () => this.onWidgetSpeechVolumeChange());
    if (testVoiceBtn) testVoiceBtn.addEventListener('click', () => this.testWidgetVoice());
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
      },
      'events': {
        title: '事件积木教程',
        steps: [
          { text: '学习事件积木，让程序响应用户操作！', action: 'intro' },
          { text: '找到黄色的事件积木分类。', action: 'find-events' },
          { text: '拖拽"当绿旗被点击"积木到脚本区域。', action: 'drag-flag' },
          { text: '这是程序的开始积木，点击绿旗试试。', action: 'test-flag' },
          { text: '现在可以在下面连接其他积木了！', action: 'connect-blocks' }
        ]
      },
      'control': {
        title: '控制积木教程',
        steps: [
          { text: '学习控制积木，让程序更智能！', action: 'intro' },
          { text: '找到橙色的控制积木分类。', action: 'find-control' },
          { text: '拖拽"重复10次"积木到脚本区域。', action: 'drag-repeat' },
          { text: '在重复积木内放入其他积木。', action: 'add-inside' },
          { text: '点击运行，看看重复效果！', action: 'test-repeat' }
        ]
      }
    };

    const select = this.widget.querySelector('#tutorialSelect');
    if (!select) return;

    // 清空现有选项（保留默认选项）
    select.innerHTML = '<option value="">选择教程...</option>';

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
    // 确保有用户交互手势
    if (!this.hasUserInteracted) {
      this.hasUserInteracted = true;
    }

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

  async speak(text) {
    // 停止当前播放
    this.stopSpeech();

    try {
      if (this.ttsService) {
        // 使用 TTS 服务
        await this.ttsService.speak(
          text,
          () => {
            this.isPlaying = true;
            this.updatePlayButton();
          },
          () => {
            this.isPlaying = false;
            this.updatePlayButton();
          },
          (error) => {
            this.isPlaying = false;
            this.updatePlayButton();
            // 尝试浏览器 TTS 作为回退
            // this.fallbackToBasicTTS(text);
          }
        );
      } else {
        // await this.fallbackToBasicTTS(text);
      }
    } catch (error) {
      this.isPlaying = false;
      this.updatePlayButton();
      // 最后的回退尝试
      try {
        // await this.fallbackToBasicTTS(text);
      } catch (fallbackError) {
        alert('语音播放失败，请检查浏览器设置或尝试刷新页面');
      }
    }
  }

  // 基础浏览器 TTS 回退方法
  async fallbackToBasicTTS(text) {
    return new Promise((resolve, reject) => {
      try {
        console.log('使用基础浏览器 TTS');

        // 确保之前的语音已停止
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';

        const speedRange = this.widget.querySelector('#speedRange');
        const volumeRange = this.widget.querySelector('#volumeRange');

        if (speedRange) utterance.rate = parseFloat(speedRange.value);
        if (volumeRange) utterance.volume = parseFloat(volumeRange.value);

        utterance.onstart = () => {
          console.log('基础 TTS 开始播放');
          this.isPlaying = true;
          this.updatePlayButton();
          resolve();
        };

        utterance.onend = () => {
          console.log('基础 TTS 播放完成');
          this.isPlaying = false;
          this.updatePlayButton();
        };

        utterance.onerror = (error) => {
          console.error('基础 TTS 播放错误:', error);
          this.isPlaying = false;
          this.updatePlayButton();
          reject(error);
        };

        speechSynthesis.speak(utterance);
        this.currentUtterance = utterance;
      } catch (error) {
        reject(error);
      }
    });
  }

  stopSpeech() {
    if (this.ttsService) {
      this.ttsService.stop();
    } else if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
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

  // 浮窗面板设置方法
  async saveWidgetSettings() {
    try {
      const settings = {
        autoPlay: this.widget.querySelector('#autoPlaySetting')?.checked || false,
        highlight: this.widget.querySelector('#highlightSetting')?.checked || true,
        language: this.widget.querySelector('#languageSetting')?.value || 'zh-CN',
        voiceEngine: 'browser',
        voiceSelect: this.widget.querySelector('#voiceSelectSetting')?.value || '',
        speechRate: parseFloat(this.widget.querySelector('#speechRateSetting')?.value || 1.0),
        speechVolume: parseFloat(this.widget.querySelector('#speechVolumeSetting')?.value || 0.8)
      };

      // 保存到 Chrome 存储，确保与主面板同步
      await chrome.storage.sync.set({ settings });

      // 更新 TTS 服务设置
      if (this.ttsService) {
        const ttsSettings = {
          engine: 'browser',
          language: settings.language,
          voice: settings.voiceSelect,
          speed: settings.speechRate,
          volume: settings.speechVolume
        };
        this.ttsService.updateSettings(ttsSettings);
      }

      // 通知其他可能的监听器设置已更新
      chrome.runtime.sendMessage({
        action: 'settingsUpdated',
        settings: settings
      }).catch(() => {
        // 忽略发送失败的错误
      });

    } catch (error) {
      // 静默处理错误
    }
  }

  onWidgetSpeechRateChange() {
    const rate = this.widget.querySelector('#speechRateSetting')?.value || 1.0;
    const rateValue = this.widget.querySelector('#speechRateValue');
    if (rateValue) {
      rateValue.textContent = `${parseFloat(rate).toFixed(1)}x`;
    }
    this.saveWidgetSettings();
  }

  onWidgetSpeechVolumeChange() {
    const volume = this.widget.querySelector('#speechVolumeSetting')?.value || 0.8;
    const volumeValue = this.widget.querySelector('#speechVolumeValue');
    if (volumeValue) {
      volumeValue.textContent = `${Math.round(parseFloat(volume) * 100)}%`;
    }
    this.saveWidgetSettings();
  }

  async testWidgetVoice() {
    const testBtn = this.widget.querySelector('#testVoiceBtn');
    if (!testBtn) return;

    const originalText = testBtn.textContent;
    
    try {
      testBtn.textContent = '测试中...';
      testBtn.disabled = true;

      const settings = {
        language: this.widget.querySelector('#languageSetting')?.value || 'zh-CN',
        voiceSelect: this.widget.querySelector('#voiceSelectSetting')?.value || '',
        speechRate: parseFloat(this.widget.querySelector('#speechRateSetting')?.value || 1.0),
        speechVolume: parseFloat(this.widget.querySelector('#speechVolumeSetting')?.value || 0.8)
      };

      // 使用浏览器 TTS 测试
      await this.testVoiceWithBrowser(settings, '这是语音测试，你好！');
    } catch (error) {
      // 静默处理错误
    } finally {
      setTimeout(() => {
        testBtn.textContent = originalText;
        testBtn.disabled = false;
      }, 2000);
    }
  }

  async testVoiceWithBrowser(settings, text) {
    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
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
          setTimeout(() => {
            if (speechSynthesis.getVoices().length === 0) {
              setupAndSpeak();
            }
          }, 1000);
        } else {
          setupAndSpeak();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async loadWidgetVoices() {
    const voiceSelect = this.widget.querySelector('#voiceSelectSetting');
    if (!voiceSelect) return;

    voiceSelect.innerHTML = '<option value="">加载中...</option>';

    try {
      // 加载浏览器语音
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) {
        // 如果语音列表为空，等待加载
        speechSynthesis.onvoiceschanged = () => {
          this.populateWidgetBrowserVoices();
        };
        // 设置超时，防止无限等待
        setTimeout(() => {
          if (speechSynthesis.getVoices().length === 0) {
            this.populateWidgetBrowserVoices();
          }
        }, 2000);
      } else {
        this.populateWidgetBrowserVoices();
      }
    } catch (error) {
      voiceSelect.innerHTML = '<option value="">加载失败</option>';
    }
  }

  populateWidgetBrowserVoices() {
    const voiceSelect = this.widget.querySelector('#voiceSelectSetting');
    if (!voiceSelect) return;

    const voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '<option value="">选择语音</option>';

    if (voices.length === 0) {
      voiceSelect.innerHTML = '<option value="">暂无可用语音</option>';
      return;
    }

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

    // 加载完成后，应用当前设置
    this.loadWidgetSettings();
  }

  async loadWidgetSettings() {
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

      // 应用设置到浮窗控件
      const autoPlaySetting = this.widget.querySelector('#autoPlaySetting');
      const highlightSetting = this.widget.querySelector('#highlightSetting');
      const languageSetting = this.widget.querySelector('#languageSetting');
      const voiceSelectSetting = this.widget.querySelector('#voiceSelectSetting');
      const speechRateSetting = this.widget.querySelector('#speechRateSetting');
      const speechVolumeSetting = this.widget.querySelector('#speechVolumeSetting');
      const speechRateValue = this.widget.querySelector('#speechRateValue');
      const speechVolumeValue = this.widget.querySelector('#speechVolumeValue');

      if (autoPlaySetting) autoPlaySetting.checked = settings.autoPlay;
      if (highlightSetting) highlightSetting.checked = settings.highlight;
      if (languageSetting) languageSetting.value = settings.language;
      if (voiceSelectSetting) voiceSelectSetting.value = settings.voiceSelect;
      if (speechRateSetting) speechRateSetting.value = settings.speechRate;
      if (speechVolumeSetting) speechVolumeSetting.value = settings.speechVolume;
      if (speechRateValue) speechRateValue.textContent = `${settings.speechRate}x`;
      if (speechVolumeValue) speechVolumeValue.textContent = `${Math.round(settings.speechVolume * 100)}%`;

    } catch (error) {
      // 静默处理错误
    }
  }



  // 设置消息监听器
  setupMessageListener() {
    // 确保只设置一次监听器
    if (this.messageListenerSetup) {
      return;
    }
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Content script 收到消息:', request);

      try {
        switch (request.action) {
          case 'ping':
            console.log('响应 ping 消息');
            sendResponse({ status: 'connected', timestamp: Date.now() });
            return true; // 保持消息通道开放

          case 'toggleWidget':
            console.log('切换控件显示状态');
            if (this.widget) {
              this.toggleWidgetVisibility();
            } else {
              console.log('Widget不存在，重新创建...');
              this.createWidget();
            }
            sendResponse({ success: true });
            return true;

          case 'selectTutorial':
            console.log('选择教程:', request.tutorialId);
            this.selectTutorial(request.tutorialId);
            sendResponse({ success: true });
            return true;

          case 'updateSettings':
            console.log('更新设置:', request.settings);
            this.updateSettings(request.settings);
            sendResponse({ success: true });
            return true;

          case 'testVoice':
            console.log('测试语音:', request.settings, request.text);
            // 异步处理语音测试
            this.testVoice(request.settings, request.text)
              .then(() => {
                console.log('语音测试完成');
                sendResponse({ success: true });
              })
              .catch((error) => {
                console.error('语音测试失败:', error);
                sendResponse({ success: false, error: error.message });
              });
            return true; // 异步响应

          default:
            console.warn('未知的消息类型:', request.action);
            sendResponse({ error: 'Unknown action', action: request.action });
            return true;
        }
      } catch (error) {
        console.error('处理消息时出错:', error);
        sendResponse({ success: false, error: error.message });
        return true;
      }
    });

    this.messageListenerSetup = true;
    console.log('Content script 消息监听器已设置');
  }

  // 切换浮窗显示/隐藏
  toggleWidgetVisibility() {
    if (!this.widget) {
      console.log('Widget不存在，创建新的');
      this.createWidget();
      return;
    }

    const isHidden = this.widget.style.display === 'none';
    this.widget.style.display = isHidden ? 'block' : 'none';
    console.log('Widget显示状态已切换:', isHidden ? '显示' : '隐藏');
  }

  // 更新设置
  updateSettings(settings) {
    // 更新浮窗面板的设置控件
    const autoPlaySetting = this.widget.querySelector('#autoPlaySetting');
    const highlightSetting = this.widget.querySelector('#highlightSetting');
    const languageSetting = this.widget.querySelector('#languageSetting');
    const voiceSelectSetting = this.widget.querySelector('#voiceSelectSetting');
    const speechRateSetting = this.widget.querySelector('#speechRateSetting');
    const speechVolumeSetting = this.widget.querySelector('#speechVolumeSetting');
    const speechRateValue = this.widget.querySelector('#speechRateValue');
    const speechVolumeValue = this.widget.querySelector('#speechVolumeValue');

    if (autoPlaySetting && settings.autoPlay !== undefined) {
      autoPlaySetting.checked = settings.autoPlay;
    }

    if (highlightSetting && settings.highlight !== undefined) {
      highlightSetting.checked = settings.highlight;
    }

    if (languageSetting && settings.language) {
      languageSetting.value = settings.language;
    }

    if (voiceSelectSetting && settings.voiceSelect) {
      voiceSelectSetting.value = settings.voiceSelect;
    }

    if (speechRateSetting && settings.speechRate) {
      speechRateSetting.value = settings.speechRate;
      if (speechRateValue) {
        speechRateValue.textContent = settings.speechRate + 'x';
      }
    }

    if (speechVolumeSetting && settings.speechVolume) {
      speechVolumeSetting.value = settings.speechVolume;
      if (speechVolumeValue) {
        speechVolumeValue.textContent = Math.round(settings.speechVolume * 100) + '%';
      }
    }

    // 更新 TTS 服务设置
    if (this.ttsService) {
      const ttsSettings = {
        engine: 'browser',
        language: settings.language || 'zh-CN',
        voice: settings.voiceSelect || '',
        speed: settings.speechRate || 1.0,
        volume: settings.speechVolume || 0.8
      };

      this.ttsService.updateSettings(ttsSettings);

      // 保存到存储
      chrome.storage.sync.set({ ttsSettings });
    }
  }

  // 测试语音功能
  async testVoice(settings, text) {
    try {
      console.log('开始语音测试:', { settings, text });

      // 临时更新设置
      if (this.ttsService) {
        const ttsSettings = {
          engine: settings.voiceEngine || 'browser',
          language: settings.language || 'zh-CN',
          voice: settings.voiceSelect || '',
          speed: settings.speechRate || 1.0,
          volume: settings.speechVolume || 0.8
        };

        console.log('更新 TTS 设置:', ttsSettings);
        this.ttsService.updateSettings(ttsSettings);

        await this.ttsService.speak(
          text,
          () => console.log('语音测试开始'),
          () => console.log('语音测试完成'),
          (error) => console.error('语音测试失败:', error)
        );
      } else {
        console.log('TTS 服务未加载，使用浏览器 TTS');
        // 回退到浏览器 TTS
        await this.fallbackBrowserTTS(settings, text);
      }
    } catch (error) {
      console.error('语音测试失败:', error);
      // 尝试浏览器 TTS 作为最后的回退
      try {
        await this.fallbackBrowserTTS(settings, text);
      } catch (fallbackError) {
        console.error('浏览器 TTS 回退也失败:', fallbackError);
      }
    }
  }

  // 浏览器 TTS 回退方法
  async fallbackBrowserTTS(settings, text) {
    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = settings.language || 'zh-CN';
        utterance.rate = settings.speechRate || 1.0;
        utterance.volume = settings.speechVolume || 0.8;

        // 等待语音列表加载
        let voices = speechSynthesis.getVoices();

        const setupVoiceAndSpeak = () => {
          voices = speechSynthesis.getVoices();
          console.log('浏览器可用语音:', voices.length);

          if (settings.voiceSelect && voices.length > 0) {
            const selectedVoice = voices.find(voice => voice.name === settings.voiceSelect);
            if (selectedVoice) {
              utterance.voice = selectedVoice;
              console.log('选择语音:', selectedVoice.name);
            }
          }

          utterance.onstart = () => {
            console.log('浏览器 TTS 开始播放');
            resolve();
          };

          utterance.onend = () => {
            console.log('浏览器 TTS 播放完成');
          };

          utterance.onerror = (error) => {
            console.error('浏览器 TTS 错误:', error);
            reject(error);
          };

          // 确保之前的语音已停止
          if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
          }

          speechSynthesis.speak(utterance);
        };

        if (voices.length === 0) {
          speechSynthesis.onvoiceschanged = setupVoiceAndSpeak;
          // 设置超时
          setTimeout(() => {
            if (voices.length === 0) {
              console.log('语音列表加载超时，使用默认设置');
              setupVoiceAndSpeak();
            }
          }, 1000);
        } else {
          setupVoiceAndSpeak();
        }
      } catch (error) {
        reject(error);
      }
    });
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
    'scratch.mit.edu/create',
    'machinelearningforkids.co.uk/scratch'
  ];

  return scratchEditorPatterns.some(pattern => url.includes(pattern));
}

// 初始化助手的函数
function initializeScratchAssistant() {
  if (!isScratchEditor()) {
    console.log('当前页面不是 Scratch 编辑器:', window.location.href);
    return;
  }

  console.log('检测到 Scratch 编辑器页面，初始化语音助手...');
  console.log('页面 URL:', window.location.href);
  console.log('页面加载状态:', document.readyState);

  try {
    // 检查是否已经初始化过
    if (window.scratchVoiceAssistant) {
      console.log('语音助手已存在，跳过重复初始化');
      return window.scratchVoiceAssistant;
    }

    const assistant = new ScratchVoiceAssistant();
    // 将实例暴露到全局，便于调试和消息处理
    window.scratchVoiceAssistant = assistant;
    console.log('Scratch 语音助手初始化成功');
    return assistant;
  } catch (error) {
    console.error('Scratch 语音助手初始化失败:', error);
    return null;
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScratchAssistant);
} else {
  // 页面已经加载完成
  initializeScratchAssistant();
}

// 处理页面动态加载的情况
let initRetryCount = 0;
const maxRetries = 3;

function retryInitialization() {
  if (initRetryCount >= maxRetries) {
    console.log('达到最大重试次数，停止重试');
    return;
  }

  initRetryCount++;
  console.log(`重试初始化 (${initRetryCount}/${maxRetries})`);
  
  setTimeout(() => {
    if (!window.scratchVoiceAssistant && isScratchEditor()) {
      initializeScratchAssistant();
    }
  }, 2000 * initRetryCount);
}

// 监听页面变化，处理SPA路由
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log('页面URL发生变化:', currentUrl);
    
    // 如果切换到Scratch编辑器页面，重新初始化
    if (isScratchEditor() && !window.scratchVoiceAssistant) {
      setTimeout(initializeScratchAssistant, 1000);
    }
  }
}).observe(document, { subtree: true, childList: true });

// 添加页面加载完成的标记
console.log('Scratch Voice Assistant Content Script 已加载');
window.scratchVoiceAssistantLoaded = true;