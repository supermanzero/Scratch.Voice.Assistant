// Scratch 教程语音助手 - 主内容脚本
class ScratchVoiceAssistant {
  constructor() {
    console.log("ScratchVoiceAssistant 构造函数开始执行...");

    this.isInitialized = false;
    this.widget = null;
    this.isCollapsed = false;
    this.currentTutorial = null;
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.ttsService = null;
    this.hasUserInteracted = false;
    this.autoPlayTimer = null;
    this.countdownTimer = null;
    this.isAutoPlaying = false;
    // 检测操作系统
    this.isWindows = this.detectWindowsOS();
    // 字幕相关
    this.subtitleContainer = null;
    this.subtitleTimeout = null;

    console.log("开始初始化各个组件...");

    try {
      // 先设置消息监听器，确保能响应ping消息
      console.log("设置消息监听器...");
      this.setupMessageListener();
      console.log("设置存储监听器...");
      this.setupStorageListener();

      // 标记消息监听器已设置
      this.messageListenerReady = true;
      console.log("消息监听器已就绪");

      // 异步初始化其他组件
      console.log("开始异步初始化...");
      this.init()
        .then(() => {
          console.log("ScratchVoiceAssistant 异步初始化完成");
          this.isInitialized = true;
        })
        .catch((error) => {
          console.error("ScratchVoiceAssistant 异步初始化失败:", error);
          console.error("错误堆栈:", error.stack);
          this.isInitialized = false;
        });

      console.log("ScratchVoiceAssistant 构造函数执行完成");
    } catch (error) {
      console.error("ScratchVoiceAssistant 构造函数执行失败:", error);
      console.error("错误堆栈:", error.stack);
      throw error;
    }
  }

  // 检测是否为Windows操作系统
  detectWindowsOS() {
    try {
      // 方法1: 通过navigator.platform检测
      const platform = navigator.platform.toLowerCase();
      if (platform.includes("win")) {
        console.log("检测到Windows系统 (navigator.platform):", platform);
        return true;
      }

      // 方法2: 通过navigator.userAgent检测
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes("windows")) {
        console.log("检测到Windows系统 (userAgent):", userAgent);
        return true;
      }

      // 方法3: 通过navigator.oscpu检测（Firefox）
      if (
        navigator.oscpu &&
        navigator.oscpu.toLowerCase().includes("windows")
      ) {
        console.log("检测到Windows系统 (oscpu):", navigator.oscpu);
        return true;
      }

      console.log("检测到非Windows系统，平台信息:", {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        oscpu: navigator.oscpu,
      });
      return false;
    } catch (error) {
      console.warn("操作系统检测失败，默认使用Windows模式:", error);
      return true; // 默认使用Windows模式
    }
  }

  async init() {
    if (this.isInitialized) return;

    // 加载 TTS 服务
    await this.loadTTSService();

    // 等待页面完全加载
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.createWidget();
        this.createSubtitleContainer();
      });
    } else {
      this.createWidget();
      this.createSubtitleContainer();
    }

    this.isInitialized = true;

    // 输出操作系统检测结果
    console.log("=== 操作系统检测结果 ===");
    console.log(
      "检测到的系统类型:",
      this.isWindows ? "Windows" : "非Windows (Mac/Linux等)"
    );
    console.log('是否添加"嗯"前缀:', this.isWindows ? "是" : "否");
    console.log("========================");
  }

  // 加载 TTS 服务 - 简化版本
  async loadTTSService() {
    try {
      // 直接在这里定义一个简化的 TTS 服务类
      this.ttsService = this.createSimpleTTSService();

      // 从存储中加载设置
      const result = await chrome.storage.sync.get(["settings"]);
      if (result.settings) {
        const ttsSettings = {
          engine: result.settings.voiceEngine || "baidu",
          language: result.settings.language || "zh-CN",
          voice: result.settings.voiceSelect || "baidu-4140", // 度小新 - 专业女主播
          speed: result.settings.speechRate || 1.0,
          volume: result.settings.speechVolume || 0.8,
        };
        console.log("从存储加载TTS设置:", ttsSettings);
        this.ttsService.updateSettings(ttsSettings);
      } else {
        // 如果没有保存的设置，使用默认的百度TTS度小童
        const defaultTtsSettings = {
          engine: "baidu",
          language: "zh-CN",
          voice: "baidu-4140", // 度小新 - 专业女主播
          speed: 1.0,
          volume: 0.8,
        };
        this.ttsService.updateSettings(defaultTtsSettings);
      }
    } catch (error) {
      this.ttsService = null;
    }
  }

  // 创建简化的 TTS 服务
  createSimpleTTSService() {
    return {
      settings: {
        engine: "baidu",
        language: "zh-CN",
        voice: "baidu-4140", // 度小新 - 专业女主播
        speed: 1.0,
        volume: 0.8,
      },

      currentAudio: null,
      currentUtterance: null,
      isPlaying: false,

      updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
      },

      stop() {
        console.log("TTS服务停止播放");
        this.isPlaying = false;

        // 停止当前音频
        if (this.currentAudio) {
          console.log("停止当前音频");
          try {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            // 清空音频源，确保完全停止
            this.currentAudio.src = '';
            this.currentAudio.load(); // 重新加载空源
            // 移除所有事件监听器，防止内存泄漏
            this.currentAudio.onplay = null;
            this.currentAudio.onended = null;
            this.currentAudio.onerror = null;
            this.currentAudio.oncanplaythrough = null;
            this.currentAudio.onloadstart = null;
            this.currentAudio.onloadeddata = null;
            this.currentAudio = null;
          } catch (error) {
            console.log("停止音频时出错:", error);
            this.currentAudio = null;
          }
        }

        // 停止浏览器 TTS
        if (speechSynthesis.speaking || speechSynthesis.pending) {
          console.log("停止浏览器TTS");
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
          settings: this.settings,
        };
      },
    };
  }

  // 创建内联 TTS 服务（最后的回退方案）
  createInlineTTSService() {
    return {
      settings: {
        engine: "browser-inline",
        language: "zh-CN",
        voice: "",
        speed: 1.0,
        volume: 0.8,
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
            const chineseVoice = voices.find(
              (voice) => voice.lang.includes("zh") || voice.lang.includes("cmn")
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
          engine: "browser-inline",
          settings: this.settings,
        };
      },
    };
  }

  createWidget() {
    try {
      console.log("开始创建语音助手浮窗...");

      // 检查是否已存在
      const existingWidget = document.querySelector(".scratch-voice-assistant");
      if (existingWidget) {
        console.log("浮窗已存在，移除旧的");
        existingWidget.remove();
      }

      // 创建主容器
      this.widget = document.createElement("div");
      this.widget.className = "scratch-voice-assistant fade-in";
      this.widget.innerHTML = this.getWidgetHTML();

      console.log("浮窗HTML已生成，准备添加到页面");
      document.body.appendChild(this.widget);
      console.log("浮窗已添加到页面");

      // 绑定事件
      this.bindEvents();
      console.log("事件已绑定");

      // 添加拖动功能
      this.initDragFunctionality();
      console.log("拖动功能已初始化");

      // 加载教程数据
      this.loadTutorials();
      console.log("教程数据已加载");

      // 加载浮窗设置
      this.loadWidgetSettings();
      console.log("浮窗设置已加载");

      // 加载语音选项（根据默认的百度TTS）
      this.loadWidgetVoiceOptions("baidu");
      console.log("语音选项已加载");

      // 恢复上次选择的教程
      this.restoreLastTutorial();
      console.log("上次教程状态已恢复");

      console.log("语音助手浮窗创建完成");
    } catch (error) {
      console.error("创建浮窗时出错:", error);
    }
  }

  // 创建字幕容器
  createSubtitleContainer() {
    try {
      console.log("开始创建字幕容器...");

      // 检查是否已存在
      const existingSubtitle = document.querySelector(
        ".scratch-voice-subtitle"
      );
      if (existingSubtitle) {
        console.log("字幕容器已存在，移除旧的");
        existingSubtitle.remove();
      }

      // 创建字幕容器
      this.subtitleContainer = document.createElement("div");
      this.subtitleContainer.className = "scratch-voice-subtitle";
      this.subtitleContainer.innerHTML = `
        <div class="subtitle-content" id="subtitleContent"></div>
      `;

      // 添加样式
      this.addSubtitleStyles();

      // 添加到页面
      document.body.appendChild(this.subtitleContainer);
      console.log("字幕容器已添加到页面");
    } catch (error) {
      console.error("创建字幕容器时出错:", error);
    }
  }

  // 添加字幕样式
  addSubtitleStyles() {
    // 检查是否已添加样式
    if (document.querySelector("#scratch-subtitle-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "scratch-subtitle-styles";
    style.textContent = `
      .scratch-voice-subtitle {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }

      .scratch-voice-subtitle.show {
        opacity: 1;
      }

      .subtitle-content {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        line-height: 1.4;
        max-width: 80vw;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      /* 响应式设计 */
      @media (max-width: 768px) {
        .subtitle-content {
          font-size: 14px;
          padding: 10px 20px;
          max-width: 90vw;
        }
      }

      /* 动画效果 */
      .subtitle-content {
        animation: subtitleFadeIn 0.3s ease-out;
      }

      @keyframes subtitleFadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;

    document.head.appendChild(style);
  }

  getWidgetHTML() {
    return `
      <div class="assistant-widget" id="assistantWidget">
        <div class="widget-header">
          <div class="title-section">
            <h3 class="widget-title">教学助手</h3>
          </div>
          <button class="toggle-btn" id="toggleBtn" title="折叠/展开">
            ${this.getIcon("chevron-down")}
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
            <button class="control-btn" id="prevBtn" title="上一步 (快捷键：←)">
              ${this.getIcon("skip-back")}
            </button>
            <button class="control-btn primary" id="playBtn" title="播放/暂停 (快捷键：/)">
              ${this.getIcon("play")}
            </button>
            <button class="control-btn" id="nextBtn" title="下一步 (快捷键：→)">
              ${this.getIcon("skip-forward")}
            </button>
            <button class="control-btn" id="repeatBtn" title="重复当前步骤 (快捷键：R)">
              ${this.getIcon("rotate-ccw")}
            </button>
            <button class="control-btn" id="settingsBtn" title="设置 (快捷键：S)">
              ${this.getIcon("settings")}
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
                <input type="checkbox" id="subtitleSetting" checked>
                <span class="checkmark"></span>
                显示字幕
              </label>
            </div>
            <div class="setting-item hidden">
              <span class="setting-text">语音引擎</span>
              <select class="setting-select" id="voiceEngineSetting">
                <option value="browser">浏览器TTS</option>
                <option value="google">Google TTS</option>
                <option value="baidu" selected>百度TTS</option>
                <option value="youdao">有道TTS</option>
              </select>
            </div>
            <div class="setting-item hidden" style="display: none;">
              <span class="setting-text">语音选择</span>
              <select class="setting-select" id="voiceSelectSetting">
                <option value="baidu-4140">度小新 (专业女主播)</option>
              </select>
            </div>
            <div class="setting-item hidden">
              <span class="setting-text">语音语言</span>
              <select class="setting-select" id="languageSetting">
                <option value="zh-CN" selected>中文</option>
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
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 防止重复绑定事件监听器
    if (this.eventsBound) {
      console.log("事件已绑定，跳过重复绑定");
      return;
    }

    console.log("开始绑定事件监听器...");

    // 折叠/展开按钮
    const toggleBtn = this.widget.querySelector("#toggleBtn");
    toggleBtn.addEventListener("click", () => this.toggleWidget());

    // 播放控制按钮
    const playBtn = this.widget.querySelector("#playBtn");
    const prevBtn = this.widget.querySelector("#prevBtn");
    const nextBtn = this.widget.querySelector("#nextBtn");
    const repeatBtn = this.widget.querySelector("#repeatBtn");
    const settingsBtn = this.widget.querySelector("#settingsBtn");

    playBtn.addEventListener("click", () => this.togglePlay());
    prevBtn.addEventListener("click", () => this.previousStep());
    nextBtn.addEventListener("click", () => this.nextStep());
    repeatBtn.addEventListener("click", () => this.repeatStep());
    settingsBtn.addEventListener("click", () => this.toggleSettings());

    // 添加键盘快捷键监听
    this.setupKeyboardShortcuts();

    // 教程选择
    const tutorialSelect = this.widget.querySelector("#tutorialSelect");
    tutorialSelect.addEventListener("change", (e) =>
      this.selectTutorial(e.target.value)
    );

    // 设置控制
    const autoPlaySetting = this.widget.querySelector("#autoPlaySetting");
    const highlightSetting = this.widget.querySelector("#highlightSetting");
    const subtitleSetting = this.widget.querySelector("#subtitleSetting");
    const voiceEngineSetting = this.widget.querySelector("#voiceEngineSetting");
    const languageSetting = this.widget.querySelector("#languageSetting");
    const voiceSelectSetting = this.widget.querySelector("#voiceSelectSetting");
    const speechRateSetting = this.widget.querySelector("#speechRateSetting");
    const speechVolumeSetting = this.widget.querySelector(
      "#speechVolumeSetting"
    );
    const testVoiceBtn = this.widget.querySelector("#testVoiceBtn");

    if (autoPlaySetting)
      autoPlaySetting.addEventListener("change", () =>
        this.onAutoPlaySettingChange()
      );
    if (highlightSetting)
      highlightSetting.addEventListener("change", () =>
        this.saveWidgetSettings()
      );
    if (subtitleSetting)
      subtitleSetting.addEventListener("change", () =>
        this.saveWidgetSettings()
      );
    if (voiceEngineSetting)
      voiceEngineSetting.addEventListener("change", () =>
        this.onWidgetVoiceEngineChange()
      );
    if (languageSetting)
      languageSetting.addEventListener("change", () =>
        this.saveWidgetSettings()
      );
    if (voiceSelectSetting)
      voiceSelectSetting.addEventListener("change", () =>
        this.saveWidgetSettings()
      );
    if (speechRateSetting)
      speechRateSetting.addEventListener("input", () =>
        this.onWidgetSpeechRateChange()
      );
    if (speechVolumeSetting)
      speechVolumeSetting.addEventListener("input", () =>
        this.onWidgetSpeechVolumeChange()
      );
    if (testVoiceBtn) {
      console.log("绑定测试语音按钮事件");
      testVoiceBtn.addEventListener("click", () => {
        console.log("测试语音按钮被点击");
        this.testWidgetVoice();
      });
    } else {
      console.log("未找到测试语音按钮元素");
    }

    // 标记事件已绑定
    this.eventsBound = true;
    console.log("事件监听器绑定完成");
  }

  toggleWidget() {
    const widget = this.widget.querySelector("#assistantWidget");
    const content = this.widget.querySelector("#widgetContent");
    const toggleBtn = this.widget.querySelector("#toggleBtn");

    this.isCollapsed = !this.isCollapsed;

    if (this.isCollapsed) {
      content.classList.add("hidden");
      widget.classList.add("collapsed");
      toggleBtn.innerHTML = this.getIcon("chevron-up");
    } else {
      content.classList.remove("hidden");
      widget.classList.remove("collapsed");
      toggleBtn.innerHTML = this.getIcon("chevron-down");
    }
  }

  async loadTutorials() {
    // 初始化时只显示默认选项，等待套餐选择后再加载课程
    const select = this.widget.querySelector("#tutorialSelect");
    if (!select) return;

    select.innerHTML = '<option value="">请先选择套餐...</option>';
  }

  // 从API获取套餐数据
  async getPackagesFromFirebase() {
    try {
      // 通过background script获取套餐数据
      const response = await chrome.runtime.sendMessage({
        action: "getPackages",
      });

      if (response && response.success) {
        return response.data;
      } else {
        throw new Error(
          response?.error || "获取套餐数据失败：Background script 无响应"
        );
      }
    } catch (error) {
      console.error("从API获取套餐数据失败:", error);
      throw error;
    }
  }

  // 从API获取教程数据
  async getTutorialsFromFirebase() {
    try {
      // 通过background script获取教程数据
      const response = await chrome.runtime.sendMessage({
        action: "getTutorials",
      });

      if (response && response.success) {
        return response.data;
      } else {
        throw new Error(
          response?.error || "获取教程数据失败：Background script 无响应"
        );
      }
    } catch (error) {
      console.error("从API获取教程数据失败:", error);
      throw error;
    }
  }

  // 刷新教程数据（从API重新加载）
  async refreshTutorials() {
    try {
      console.log("刷新教程数据...");
      await this.loadTutorials();

      // 如果当前有选中的套餐，重新加载该套餐的课程
      if (this.currentPackage) {
        await this.loadTutorialsForPackage(this.currentPackage);
      }

      console.log("教程数据刷新完成");
    } catch (error) {
      console.error("刷新教程数据失败:", error);
    }
  }

  // 恢复上次选择的教程
  async restoreLastTutorial() {
    try {
      const result = await chrome.storage.local.get([
        "currentPackage",
        "currentTutorial",
        "currentStepIndex",
      ]);

      // 如果有选中的套餐，先加载该套餐的课程
      if (result.currentPackage) {
        console.log("恢复上次套餐:", result.currentPackage);
        await this.loadTutorialsForPackage(result.currentPackage);

        // 然后恢复选中的教程
        if (
          result.currentTutorial &&
          this.tutorials &&
          this.tutorials[result.currentTutorial]
        ) {
          console.log(
            "恢复上次教程:",
            result.currentTutorial,
            "步骤:",
            result.currentStepIndex
          );

          this.currentTutorial = this.tutorials[result.currentTutorial];
          this.currentStepIndex = result.currentStepIndex || 0;

          // 更新下拉选择
          const tutorialSelect = this.widget.querySelector("#tutorialSelect");
          if (tutorialSelect) {
            tutorialSelect.value = result.currentTutorial;
          }

          this.updateUI();
        }
      }
    } catch (error) {
      console.log("恢复教程状态失败:", error);
    }
  }

  // 为指定套餐加载课程
  async loadTutorialsForPackage(packageId) {
    try {
      console.log("为套餐加载课程:", packageId);

      // 获取套餐数据
      const packagesResponse = await this.getPackagesFromFirebase();
      console.log("获取到的套餐数据:", packagesResponse);
      
      // API返回的是数组格式，需要找到对应的套餐
      let packageData = null;
      if (Array.isArray(packagesResponse)) {
        packageData = packagesResponse.find(pkg => pkg.id === packageId);
      } else if (packagesResponse[packageId]) {
        packageData = packagesResponse[packageId];
      }

      if (!packageData || !packageData.tutorialIds) {
        console.warn("套餐数据无效或没有课程ID:", packageData);
        return;
      }

      console.log("找到套餐数据:", packageData);
      console.log("套餐包含的教程ID:", packageData.tutorialIds);

      // 获取所有教程数据
      const allTutorialsResponse = await this.getTutorialsFromFirebase();
      console.log("获取到的教程数据:", allTutorialsResponse);

      // 将教程数组转换为以ID为key的对象
      const allTutorials = {};
      if (Array.isArray(allTutorialsResponse)) {
        allTutorialsResponse.forEach(tutorial => {
          if (tutorial.id) {
            allTutorials[tutorial.id] = tutorial;
          }
        });
      } else {
        // 如果已经是对象格式，直接使用
        Object.assign(allTutorials, allTutorialsResponse);
      }

      console.log("处理后的教程数据:", Object.keys(allTutorials));

      // 筛选出套餐中的教程
      this.tutorials = {};
      let foundCount = 0;
      let missingCount = 0;
      
      packageData.tutorialIds.forEach((tutorialId) => {
        if (allTutorials[tutorialId]) {
          this.tutorials[tutorialId] = allTutorials[tutorialId];
          foundCount++;
          console.log("添加教程:", tutorialId, allTutorials[tutorialId].title);
        } else {
          missingCount++;
          console.warn("未找到教程:", tutorialId);
        }
      });
      
      console.log(`教程匹配统计: 找到 ${foundCount} 个，缺失 ${missingCount} 个`);
      
      if (missingCount > 0) {
        console.warn(`⚠️ 套餐"${packageData.name}"中有 ${missingCount} 个教程在API中不存在`);
        console.warn('建议检查教程数据同步状态或联系管理员');
      }

      // 更新下拉选择
      const select = this.widget.querySelector("#tutorialSelect");
      if (!select) return;

      // 清空现有选项
      select.innerHTML = '<option value="">选择课程...</option>';

      const tutorialKeys = Object.keys(this.tutorials);
      
      if (tutorialKeys.length === 0) {
        // 如果没有找到任何教程，显示提示信息
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "该套餐暂无可用课程";
        option.disabled = true;
        select.appendChild(option);
        console.warn("套餐中没有可用的教程");
      } else {
        // 如果有缺失的教程，在下拉选项中添加提示
        if (missingCount > 0) {
          const infoOption = document.createElement("option");
          infoOption.value = "";
          infoOption.textContent = `📋 可用课程 (${foundCount}/${packageData.tutorialIds.length})`;
          infoOption.disabled = true;
          infoOption.style.fontWeight = "bold";
          infoOption.style.color = "#666";
          select.appendChild(infoOption);
        }
        // 添加套餐中的课程选项
        tutorialKeys.forEach((key) => {
          const option = document.createElement("option");
          option.value = key;
          option.textContent = this.tutorials[key].title || `教程 ${key}`;
          select.appendChild(option);
        });
        
        console.log("套餐课程加载完成:", tutorialKeys);
        console.log("成功加载的教程:");
        tutorialKeys.forEach(key => {
          console.log(`  - ${key}: ${this.tutorials[key].title}`);
        });
      }
      
      console.log("下拉选项数量:", select.options.length - 1); // 减去默认选项
    } catch (error) {
      console.error("加载套餐课程失败:", error);
    }
  }

  // 选择套餐
  async selectPackage(packageId) {
    try {
      console.log("选择套餐:", packageId);

      // 保存当前选择的套餐
      this.currentPackage = packageId;

      // 加载该套餐的课程
      await this.loadTutorialsForPackage(packageId);

      // 清空当前教程选择
      this.currentTutorial = null;
      this.currentStepIndex = 0;

      // 清除之前的自动播放定时器
      this.clearAutoPlayTimer();

      // 保存当前选择的套餐到存储
      try {
        chrome.storage.local.set({
          currentPackage: packageId,
          currentTutorial: null,
          currentStepIndex: 0,
        });
      } catch (error) {
        console.log("保存套餐状态失败:", error);
      }

      this.updateUI();

      console.log("套餐选择完成:", packageId);
    } catch (error) {
      console.error("选择套餐失败:", error);
    }
  }

  selectTutorial(tutorialKey) {
    if (!tutorialKey || !this.tutorials[tutorialKey]) {
      this.currentTutorial = null;
      this.updateUI();
      // 清空下拉选择
      const tutorialSelect = this.widget.querySelector("#tutorialSelect");
      if (tutorialSelect) {
        tutorialSelect.value = "";
      }
      return;
    }

    this.currentTutorial = this.tutorials[tutorialKey];
    this.currentStepIndex = 0;

    // 清除之前的自动播放定时器
    this.clearAutoPlayTimer();

    // 同步更新浮窗的下拉选择
    const tutorialSelect = this.widget.querySelector("#tutorialSelect");
    if (tutorialSelect) {
      tutorialSelect.value = tutorialKey;
      console.log("已同步教程选择到浮窗:", tutorialKey);
    }

    // 保存当前选择的教程到存储，以便其他组件可以访问
    try {
      chrome.storage.local.set({
        currentPackage: this.currentPackage,
        currentTutorial: tutorialKey,
        currentStepIndex: this.currentStepIndex,
      });
    } catch (error) {
      console.log("保存教程状态失败:", error);
    }

    this.updateUI();

    // 如果开启了自动播放，自动开始第一步
    const autoPlaySetting = this.widget.querySelector("#autoPlaySetting");
    if (autoPlaySetting?.checked) {
      console.log("自动播放已开启，开始播放第一步");
      setTimeout(() => {
        this.playCurrentStep();
      }, 500); // 稍微延迟以确保UI更新完成
    }
  }

  updateUI() {
    const stepInfo = this.widget.querySelector("#stepInfo");
    const tutorialTitle = this.widget.querySelector("#tutorialTitle");
    const progressFill = this.widget.querySelector("#progressFill");
    const prevBtn = this.widget.querySelector("#prevBtn");
    const nextBtn = this.widget.querySelector("#nextBtn");
    const playBtn = this.widget.querySelector("#playBtn");
    const repeatBtn = this.widget.querySelector("#repeatBtn");

    if (!this.currentTutorial) {
      stepInfo.textContent = "第 0 步，共 0 步";
      tutorialTitle.textContent = "未选择教程";
      progressFill.style.width = "0%";

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

  async togglePlay() {
    // 确保有用户交互手势
    if (!this.hasUserInteracted) {
      this.hasUserInteracted = true;
    }

    // 如果正在倒计时，点击按钮取消自动播放
    if (this.isAutoPlaying && !this.isPlaying) {
      console.log("用户取消自动播放");
      this.clearAutoPlayTimer();
      return;
    }

    if (this.isPlaying) {
      // 强制停止所有音频
      await this.forceStopAllAudio();
    } else {
      // 手动播放时，暂时停止自动播放定时器
      this.clearAutoPlayTimer();
      // 先强制停止所有音频，然后播放
      await this.forceStopAllAudio();
      // 稍微延迟以确保停止完成
      setTimeout(() => {
        this.playCurrentStep();
      }, 100);
    }
  }

  playCurrentStep() {
    if (
      !this.currentTutorial ||
      !this.currentTutorial.steps[this.currentStepIndex]
    ) {
      return;
    }

    const step = this.currentTutorial.steps[this.currentStepIndex];

    // 根据操作系统决定是否添加"嗯"前缀
    let textToSpeak = step.text;
    if (this.isWindows) {
      textToSpeak = "嗯" + step.text;
      console.log('Windows系统，添加"嗯"前缀');
    } else {
      console.log('非Windows系统，不添加"嗯"前缀');
    }

    // 使用统一入口，传递回调函数
    this.speak(
      textToSpeak,
      () => {
        console.log("音频开始播放");
        this.isPlaying = true;
        this.updatePlayButton();
        // 显示字幕
        this.showSubtitle(step.text);
      },
      () => {
        console.log("音频播放完成");
        this.isPlaying = false;
        this.updatePlayButton();
        // 隐藏字幕
        this.hideSubtitle();
        // 检查是否需要自动播放下一步
        this.checkAutoPlayNext();
      },
      (error) => {
        console.error("音频播放失败:", error);
        this.isPlaying = false;
        this.updatePlayButton();
        // 隐藏字幕
        this.hideSubtitle();
      }
    );
  }

  // 统一入口 - 唯一允许调用TTS的地方
  async speak(text, onStart, onEnd, onError) {
    console.log("=== 统一入口speak方法 ===");
    console.log("开始播放新音频，文本:", text.substring(0, 20) + "...");

    // 强制停止所有音频播放
    await this.forceStopAllAudio();

    // 等待更长时间确保音频完全停止
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      if (this.ttsService) {
        const engine = this.ttsService.settings.engine;
        console.log("使用TTS引擎:", engine);

        // 根据引擎选择对应的播放方法
        if (engine === "baidu") {
          await this.speakWithBaiduDirect(text, onStart, onEnd, onError);
        } else if (engine === "youdao") {
          await this.speakWithYoudaoDirect(text, onStart, onEnd, onError);
        } else if (engine === "google") {
          await this.speakWithGoogleDirect(text, onStart, onEnd, onError);
        } else {
          // 默认使用浏览器TTS
          await this.speakWithBrowserDirect(text, onStart, onEnd, onError);
        }
      } else {
        // 回退到浏览器TTS
        await this.speakWithBrowserDirect(text, onStart, onEnd, onError);
      }
    } catch (error) {
      console.error("TTS调用失败:", error);

      // 检查是否是扩展上下文失效错误
      if (
        error.message &&
        error.message.includes("Extension context invalidated")
      ) {
        console.error("扩展上下文已失效，请刷新页面或重新加载扩展");
        if (onError) onError(error);
        return;
      }

      // 最后的回退尝试 - 使用浏览器TTS
      console.warn("主TTS失败，回退到浏览器TTS");
      try {
        await this.speakWithBrowserDirect(text, onStart, onEnd, onError);
      } catch (fallbackError) {
        console.error("浏览器TTS回退也失败:", fallbackError);
        this.isPlaying = false;
        this.updatePlayButton();
        if (onError) onError(fallbackError);
      }
    }
  }

  // 获取百度API访问令牌
  async getBaiduAccessToken() {
    try {
      // 检查缓存的token是否还有效
      const result = await chrome.storage.local.get([
        "baiduAccessToken",
        "tokenExpireTime",
      ]);
      const now = Date.now();

      if (
        result.baiduAccessToken &&
        result.tokenExpireTime &&
        now < result.tokenExpireTime
      ) {
        console.log("使用缓存的百度API token");
        return result.baiduAccessToken;
      }

      // 百度API密钥
      const AK = "FeNVdlSqSTt9IO3Bz4SCDiVj";
      const SK = "NL9bpxsOt7pxf1m3v43G5vPD5CIjoSFo";

      // 直接调用百度API获取token
      const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${AK}&client_secret=${SK}`;
      console.log("获取新的百度API token，直接调用百度API");

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(
        "百度API token响应状态:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("百度API token请求失败，响应内容:", errorText);
        throw new Error(
          `获取百度API token失败: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("百度API token响应数据键:", Object.keys(data));

      if (data.error) {
        throw new Error(
          `百度API认证失败: ${data.error_description || data.error}`
        );
      }

      if (!data.access_token) {
        throw new Error("百度API响应中没有access_token");
      }

      // 缓存token（有效期通常为30天，这里设置为25天以确保安全）
      const expireTime = now + 25 * 24 * 60 * 60 * 1000;
      await chrome.storage.local.set({
        baiduAccessToken: data.access_token,
        tokenExpireTime: expireTime,
      });

      console.log("百度API token获取成功并已缓存");
      return data.access_token;
    } catch (error) {
      console.error("获取百度API访问令牌失败:", error);
      throw new Error(`获取百度API访问令牌失败: ${error.message}`);
    }
  }

  // 纯粹的百度TTS播放方法 - 直接调用百度API
  async speakWithBaiduDirect(text, onStart, onEnd, onError) {
    console.log("=== speakWithBaiduDirect 纯播放方法 ===");
    console.log("调用百度TTS，设置:", this.ttsService.settings);

    try {
      // 1. 获取access token
      const accessToken = await this.getBaiduAccessToken();

      // 2. 从语音选择中提取语音ID
      const voiceId = this.ttsService.settings.voice
        ? this.ttsService.settings.voice.replace("baidu-", "")
        : "4140";

      // 3. 构建请求数据
      const requestData = {
        tex: text,
        tok: accessToken,
        cuid: "Lb4nwynEiEtTYmg6L7VlgxYPKUDS76Mg",
        ctp: "1",
        lan: "zh",
        spd: "5",
        pit: "5",
        vol: "5",
        per: voiceId,
        aue: "3",
      };

      console.log("百度TTS请求数据:", requestData);

      // 4. 构建form data
      const formData = new URLSearchParams();
      Object.keys(requestData).forEach((key) => {
        formData.append(key, requestData[key]);
      });

      // 5. 直接调用百度TTS API
      const response = await fetch("https://tsn.baidu.com/text2audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "*/*",
        },
        body: formData,
      });

      console.log("百度TTS响应状态:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`百度TTS请求失败: ${response.status} - ${errorText}`);
      }

      // 6. 获取音频数据
      const audioBlob = await response.blob();
      console.log("音频数据大小:", audioBlob.size, "bytes");

      if (audioBlob.size === 0) {
        throw new Error("百度TTS返回的音频数据为空");
      }

      // 7. 创建音频URL
      const audioUrl = URL.createObjectURL(audioBlob);

      // 8. 在播放前再次确认没有其他音频在播放
      if (this.ttsService.currentAudio) {
        console.log("发现残留音频，强制停止");
        try {
          this.ttsService.currentAudio.pause();
          this.ttsService.currentAudio.currentTime = 0;
          this.ttsService.currentAudio.src = '';
        } catch (e) {
          console.log("停止残留音频时出错:", e);
        }
        this.ttsService.currentAudio = null;
      }

      // 9. 构造 Audio，绑定事件
      const audio = new Audio(audioUrl);
      audio.volume = this.ttsService.settings.volume;
      audio.playbackRate = this.ttsService.settings.speed;

      // 设置音频为当前播放的音频
      this.ttsService.currentAudio = audio;

      audio.onplay = () => {
        console.log("百度TTS音频开始播放");
        this.ttsService.isPlaying = true;
        this.isPlaying = true;
        this.updatePlayButton();
        if (onStart) onStart();
      };

      audio.onended = () => {
        console.log("百度TTS音频播放完成");
        this.ttsService.isPlaying = false;
        this.isPlaying = false;
        this.updatePlayButton();
        // 清理URL对象
        URL.revokeObjectURL(audioUrl);
        // 清理当前音频引用
        if (this.ttsService.currentAudio === audio) {
          this.ttsService.currentAudio = null;
        }
        if (onEnd) onEnd();
      };

      audio.onerror = (err) => {
        console.error("百度TTS音频播放错误:", err);
        this.ttsService.isPlaying = false;
        this.isPlaying = false;
        this.updatePlayButton();
        // 清理URL对象
        URL.revokeObjectURL(audioUrl);
        // 清理当前音频引用
        if (this.ttsService.currentAudio === audio) {
          this.ttsService.currentAudio = null;
        }
        if (onError) onError(err);
      };

      // 10. 播放
      console.log("开始播放百度TTS音频");
      await audio.play();
    } catch (error) {
      console.error("百度TTS播放失败:", error);
      // 只抛出错误，不调用任何其他方法
      throw error;
    }
  }

  // 纯粹的有道TTS播放方法 - 不调用任何其他方法
  async speakWithYoudaoDirect(text, onStart, onEnd, onError) {
    console.log("=== speakWithYoudaoDirect 纯播放方法 ===");
    console.log("调用有道TTS，设置:", this.ttsService.settings);

    try {
      // 1. 请求音频
      const ttsSettings = {
        voice: this.ttsService.settings.voice,
        speed: this.ttsService.settings.speed,
        volume: this.ttsService.settings.volume,
        language: this.ttsService.settings.language,
      };

      const response = await chrome.runtime.sendMessage({
        action: "fetchTTSAudio",
        engine: "youdao",
        text: text,
        settings: ttsSettings,
      });

      if (!response || !response.success) {
        throw new Error(response?.error || "有道TTS 请求失败");
      }

      if (!response.audioData) {
        throw new Error("有道TTS 返回音频为空");
      }

      console.log("有道TTS音频数据获取成功，开始播放");

      // 2. 构造 Audio，绑定事件
      const audio = new Audio(response.audioData);
      audio.volume = this.ttsService.settings.volume;
      audio.playbackRate = this.ttsService.settings.speed;

      audio.onplay = () => {
        console.log("有道TTS音频开始播放");
        this.ttsService.isPlaying = true;
        this.isPlaying = true;
        this.updatePlayButton();
        if (onStart) onStart();
      };

      audio.onended = () => {
        console.log("有道TTS音频播放完成");
        this.ttsService.isPlaying = false;
        this.isPlaying = false;
        this.updatePlayButton();
        if (onEnd) onEnd();
      };

      audio.onerror = (err) => {
        console.error("有道TTS音频播放错误:", err);
        this.ttsService.isPlaying = false;
        this.isPlaying = false;
        this.updatePlayButton();
        if (onError) onError(err);
      };

      // 3. 播放
      await audio.play();
      this.ttsService.currentAudio = audio;
    } catch (error) {
      console.error("有道TTS播放失败:", error);
      // 只抛出错误，不调用任何其他方法
      throw error;
    }
  }

  // 纯粹的Google TTS播放方法 - 不调用任何其他方法
  async speakWithGoogleDirect(text, onStart, onEnd, onError) {
    console.log("=== speakWithGoogleDirect 纯播放方法 ===");
    console.log("调用Google TTS，设置:", this.ttsService.settings);

    try {
      // 1. 请求音频
      const response = await chrome.runtime.sendMessage({
        action: "fetchTTSAudio",
        engine: "google",
        text: text,
        settings: this.ttsService.settings,
      });

      if (!response || !response.success) {
        throw new Error(response?.error || "Google TTS 请求失败");
      }

      if (!response.audioData) {
        throw new Error("Google TTS 返回音频为空");
      }

      console.log("Google TTS音频数据获取成功，开始播放");

      // 2. 构造 Audio，绑定事件
      const audio = new Audio(response.audioData);
      audio.volume = this.ttsService.settings.volume;
      audio.playbackRate = this.ttsService.settings.speed;

      audio.onplay = () => {
        console.log("Google TTS音频开始播放");
        this.ttsService.isPlaying = true;
        this.isPlaying = true;
        this.updatePlayButton();
        if (onStart) onStart();
      };

      audio.onended = () => {
        console.log("Google TTS音频播放完成");
        this.ttsService.isPlaying = false;
        this.isPlaying = false;
        this.updatePlayButton();
        if (onEnd) onEnd();
      };

      audio.onerror = (err) => {
        console.error("Google TTS音频播放错误:", err);
        this.ttsService.isPlaying = false;
        this.isPlaying = false;
        this.updatePlayButton();
        if (onError) onError(err);
      };

      // 3. 播放
      await audio.play();
      this.ttsService.currentAudio = audio;
    } catch (error) {
      console.error("Google TTS播放失败:", error);
      // 只抛出错误，不调用任何其他方法
      throw error;
    }
  }

  // 纯粹的浏览器TTS播放方法 - 不调用任何其他方法
  async speakWithBrowserDirect(text, onStart, onEnd, onError) {
    console.log("=== speakWithBrowserDirect 纯播放方法 ===");
    console.log(
      "调用浏览器TTS，设置:",
      this.ttsService?.settings || "无TTS服务"
    );

    return new Promise(async (resolve, reject) => {
      try {
        // 强制确保之前的语音已停止
        if (speechSynthesis.speaking || speechSynthesis.pending) {
          console.log("强制停止之前的浏览器TTS");
          speechSynthesis.cancel();
          // 等待一小段时间确保停止完成
          await new Promise(resolveTimeout => setTimeout(resolveTimeout, 50));
        }
        
        // 如果还在播放，再次尝试停止
        if (speechSynthesis.speaking) {
          console.log("再次尝试停止浏览器TTS");
          speechSynthesis.cancel();
          await new Promise(resolveTimeout => setTimeout(resolveTimeout, 50));
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.ttsService?.settings?.language || "zh-CN";
        utterance.rate = this.ttsService?.settings?.speed || 1.0;
        utterance.volume = this.ttsService?.settings?.volume || 0.8;

        // 获取语音列表
        let voices = speechSynthesis.getVoices();

        const setupAndSpeak = () => {
          voices = speechSynthesis.getVoices();

          // 选择语音
          if (this.ttsService?.settings?.voice && voices.length > 0) {
            const selectedVoice = voices.find(
              (voice) => voice.name === this.ttsService.settings.voice
            );
            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }
          } else if (voices.length > 0) {
            // 自动选择中文语音
            const chineseVoice = voices.find(
              (voice) => voice.lang.includes("zh") || voice.lang.includes("cmn")
            );
            if (chineseVoice) {
              utterance.voice = chineseVoice;
            }
          }

          utterance.onstart = () => {
            console.log("浏览器TTS开始播放");
            this.isPlaying = true;
            this.updatePlayButton();
            if (onStart) onStart();
            resolve();
          };

          utterance.onend = () => {
            console.log("浏览器TTS播放完成");
            this.isPlaying = false;
            this.updatePlayButton();
            if (onEnd) onEnd();
          };

          utterance.onerror = (error) => {
            console.error("浏览器TTS播放错误:", error);
            this.isPlaying = false;
            this.updatePlayButton();
            if (onError) onError(error);
            reject(error);
          };

          // 播放前最后一次确保没有其他语音在播放
          if (speechSynthesis.speaking || speechSynthesis.pending) {
            console.log("播放前发现残留语音，强制停止");
            speechSynthesis.cancel();
          }

          console.log("开始播放浏览器TTS");
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
      } catch (error) {
        console.error("浏览器TTS播放失败:", error);
        reject(error);
      }
    });
  }

  stopSpeech() {
    console.log("停止语音播放");
    // 清除自动播放定时器
    this.clearAutoPlayTimer();

    if (this.ttsService) {
      this.ttsService.stop();
    } else if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    // 确保播放状态被重置
    this.isPlaying = false;
    this.updatePlayButton();

    // 隐藏字幕
    this.hideSubtitle();

    console.log("语音播放已停止");
  }

  // 强制停止所有音频播放
  async forceStopAllAudio() {
    console.log("=== 强制停止所有音频播放 ===");
    
    // 1. 清除自动播放定时器
    this.clearAutoPlayTimer();
    
    // 2. 停止TTS服务中的音频
    if (this.ttsService) {
      console.log("停止TTS服务音频");
      this.ttsService.stop();
      
      // 额外确保TTS服务的音频被停止
      if (this.ttsService.currentAudio) {
        try {
          this.ttsService.currentAudio.pause();
          this.ttsService.currentAudio.currentTime = 0;
          this.ttsService.currentAudio.src = '';
          this.ttsService.currentAudio = null;
        } catch (error) {
          console.log("停止TTS音频时出错:", error);
        }
      }
    }
    
    // 3. 强制停止浏览器TTS
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      console.log("强制停止浏览器TTS");
      speechSynthesis.cancel();
      
      // 等待一小段时间确保取消完成
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 如果还在播放，再次尝试停止
      if (speechSynthesis.speaking) {
        console.log("再次尝试停止浏览器TTS");
        speechSynthesis.cancel();
      }
    }
    
    // 4. 停止页面中所有可能的Audio元素
    const allAudioElements = document.querySelectorAll('audio');
    allAudioElements.forEach((audio, index) => {
      if (!audio.paused) {
        console.log(`停止页面音频元素 ${index}`);
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (error) {
          console.log(`停止音频元素 ${index} 时出错:`, error);
        }
      }
    });
    
    // 5. 重置播放状态
    this.isPlaying = false;
    if (this.ttsService) {
      this.ttsService.isPlaying = false;
    }
    
    // 6. 隐藏字幕
    this.hideSubtitle();
    
    // 7. 更新UI
    this.updatePlayButton();
    
    console.log("所有音频已强制停止");
  }

  // 显示字幕
  showSubtitle(text) {
    if (!this.subtitleContainer) {
      console.log("字幕容器不存在，跳过显示字幕");
      return;
    }

    // 检查字幕设置
    const subtitleSetting = this.widget?.querySelector("#subtitleSetting");
    const isSubtitleEnabled = subtitleSetting?.checked !== false; // 默认开启

    if (!isSubtitleEnabled) {
      console.log("字幕已关闭，跳过显示");
      return;
    }

    console.log("显示字幕:", text);

    // 清除之前的隐藏定时器
    if (this.subtitleTimeout) {
      clearTimeout(this.subtitleTimeout);
      this.subtitleTimeout = null;
    }

    // 更新字幕内容
    const subtitleContent =
      this.subtitleContainer.querySelector("#subtitleContent");
    if (subtitleContent) {
      subtitleContent.textContent = text;
    }

    // 显示字幕
    this.subtitleContainer.classList.add("show");
  }

  // 隐藏字幕
  hideSubtitle(delay = 0) {
    if (!this.subtitleContainer) {
      return;
    }

    // 清除之前的定时器
    if (this.subtitleTimeout) {
      clearTimeout(this.subtitleTimeout);
      this.subtitleTimeout = null;
    }

    if (delay > 0) {
      // 延迟隐藏
      this.subtitleTimeout = setTimeout(() => {
        this.subtitleContainer.classList.remove("show");
        console.log("字幕已隐藏");
      }, delay);
    } else {
      // 立即隐藏
      this.subtitleContainer.classList.remove("show");
      console.log("字幕已隐藏");
    }
  }

  updatePlayButton(countdown = null) {
    const playBtn = this.widget.querySelector("#playBtn");

    if (countdown !== null && countdown > 0) {
      // 显示倒计时
      playBtn.innerHTML = `<span class="countdown-text">${countdown}</span>`;
      playBtn.classList.add("countdown-mode");
      playBtn.title = "点击取消自动播放 (/)";
    } else if (this.isPlaying) {
      // 播放中，显示暂停图标
      playBtn.innerHTML = this.getIcon("pause");
      playBtn.classList.remove("countdown-mode");
      playBtn.title = "暂停 (/)";
    } else {
      // 未播放，显示播放图标
      playBtn.innerHTML = this.getIcon("play");
      playBtn.classList.remove("countdown-mode");
      playBtn.title = "播放/暂停 (/)";
    }
  }

  // 检查是否需要自动播放下一步
  async checkAutoPlayNext() {
    // 获取自动播放设置
    const autoPlaySetting = this.widget.querySelector("#autoPlaySetting");
    const isAutoPlayEnabled = autoPlaySetting?.checked || false;

    if (!isAutoPlayEnabled || !this.currentTutorial) {
      return;
    }

    // 检查是否还有下一步
    if (this.currentStepIndex < this.currentTutorial.steps.length - 1) {
      console.log("自动播放：准备播放下一步，5秒后开始");
      this.scheduleAutoPlayNext();
    } else {
      console.log("教程已完成，停止自动播放");
      this.isAutoPlaying = false;
    }
  }

  // 安排自动播放下一步
  scheduleAutoPlayNext() {
    this.clearAutoPlayTimer();
    this.isAutoPlaying = true;

    // 显示自动播放状态并开始倒计时
    this.startAutoPlayCountdown();

    this.autoPlayTimer = setTimeout(() => {
      if (this.isAutoPlaying && this.currentTutorial) {
        console.log("自动播放：切换到下一步");
        this.nextStep();
      }
    }, 5000); // 5秒间隔
  }

  // 开始自动播放倒计时
  startAutoPlayCountdown() {
    let countdown = 5;
    this.updatePlayButton(countdown);

    const countdownTimer = setInterval(() => {
      countdown--;
      if (countdown > 0 && this.isAutoPlaying) {
        this.updatePlayButton(countdown);
      } else {
        clearInterval(countdownTimer);
        if (this.isAutoPlaying) {
          // 倒计时结束，显示正常的播放按钮
          this.updatePlayButton();
        }
      }
    }, 1000);

    // 保存倒计时定时器的引用
    this.countdownTimer = countdownTimer;
  }

  // 清除自动播放定时器
  clearAutoPlayTimer() {
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }

    // 清除倒计时定时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.isAutoPlaying = false;

    // 恢复按钮正常状态
    this.updatePlayButton();
  }

  // 处理自动播放设置变化
  onAutoPlaySettingChange() {
    const autoPlaySetting = this.widget.querySelector("#autoPlaySetting");
    const isEnabled = autoPlaySetting?.checked || false;

    console.log("自动播放设置变化:", isEnabled);

    if (!isEnabled) {
      // 关闭自动播放时，清除定时器
      this.clearAutoPlayTimer();
    } else if (this.currentTutorial && !this.isPlaying) {
      // 开启自动播放且当前有教程且没在播放时，可以考虑开始自动播放
      // 但这里不自动开始，等用户手动播放一次后再启动自动模式
      console.log("自动播放已开启，下次播放完成后将自动进入下一步");
    }

    // 保存设置
    this.saveWidgetSettings();
  }

  async previousStep() {
    if (!this.currentTutorial || this.currentStepIndex <= 0) return;

    console.log("切换到上一步");
    // 手动操作时停止自动播放
    this.clearAutoPlayTimer();

    // 强制停止所有音频播放
    await this.forceStopAllAudio();

    this.currentStepIndex--;
    this.updateUI();
    this.saveCurrentTutorialState();

    // 延迟播放，确保停止操作完全完成
    setTimeout(() => {
      this.playCurrentStep();
    }, 300);
  }

  async nextStep() {
    if (
      !this.currentTutorial ||
      this.currentStepIndex >= this.currentTutorial.steps.length - 1
    )
      return;

    console.log("切换到下一步");
    // 手动点击下一步时，不清除自动播放（让自动播放继续）
    // 但如果是最后一步，则停止自动播放
    if (this.currentStepIndex >= this.currentTutorial.steps.length - 2) {
      this.clearAutoPlayTimer();
    }

    // 强制停止所有音频播放
    await this.forceStopAllAudio();

    this.currentStepIndex++;
    this.updateUI();
    this.saveCurrentTutorialState();

    // 延迟播放，确保停止操作完全完成
    setTimeout(() => {
      this.playCurrentStep();
    }, 300);
  }

  // 保存当前教程状态
  async saveCurrentTutorialState() {
    if (!this.currentTutorial) return;

    try {
      // 从当前教程对象中找到对应的key
      const tutorialKey = Object.keys(this.tutorials).find(
        (key) => this.tutorials[key] === this.currentTutorial
      );

      if (tutorialKey) {
        await chrome.storage.local.set({
          currentTutorial: tutorialKey,
          currentStepIndex: this.currentStepIndex,
        });
      }
    } catch (error) {
      console.log("保存教程状态失败:", error);
    }
  }

  async repeatStep() {
    console.log("重复播放当前步骤");
    // 重复播放时停止自动播放定时器，避免冲突
    this.clearAutoPlayTimer();

    // 强制停止所有音频播放
    await this.forceStopAllAudio();

    // 延迟播放，确保停止操作完全完成
    setTimeout(() => {
      this.playCurrentStep();
    }, 300);
  }

  toggleSettings() {
    const settingsPanel = this.widget.querySelector("#settingsPanel");
    settingsPanel.classList.toggle("hidden");
  }

  updateSpeed(value) {
    const speedValue = this.widget.querySelector("#speedValue");
    speedValue.textContent = `${parseFloat(value).toFixed(1)}x`;
  }

  updateVolume(value) {
    const volumeValue = this.widget.querySelector("#volumeValue");
    volumeValue.textContent = `${Math.round(parseFloat(value) * 100)}%`;
  }

  // 浮窗面板设置方法
  async saveWidgetSettings() {
    try {
      const settings = {
        autoPlay:
          this.widget.querySelector("#autoPlaySetting")?.checked || false,
        highlight:
          this.widget.querySelector("#highlightSetting")?.checked || true,
        subtitle:
          this.widget.querySelector("#subtitleSetting")?.checked !== false, // 默认开启
        language:
          this.widget.querySelector("#languageSetting")?.value || "zh-CN",
        voiceEngine:
          this.widget.querySelector("#voiceEngineSetting")?.value || "browser",
        voiceSelect:
          this.widget.querySelector("#voiceSelectSetting")?.value || "",
        speechRate: parseFloat(
          this.widget.querySelector("#speechRateSetting")?.value || 1.0
        ),
        speechVolume: parseFloat(
          this.widget.querySelector("#speechVolumeSetting")?.value || 0.8
        ),
      };

      // 保存到 Chrome 存储，确保与主面板同步
      await chrome.storage.sync.set({ settings });

      // 更新 TTS 服务设置
      if (this.ttsService) {
        const ttsSettings = {
          engine: settings.voiceEngine,
          language: settings.language,
          voice: settings.voiceSelect,
          speed: settings.speechRate,
          volume: settings.speechVolume,
        };
        this.ttsService.updateSettings(ttsSettings);
      }

      // 通知其他可能的监听器设置已更新
      chrome.runtime
        .sendMessage({
          action: "settingsUpdated",
          settings: settings,
        })
        .catch(() => {
          // 忽略发送失败的错误
        });
    } catch (error) {
      // 静默处理错误
    }
  }

  onWidgetSpeechRateChange() {
    const rate = this.widget.querySelector("#speechRateSetting")?.value || 1.0;
    const rateValue = this.widget.querySelector("#speechRateValue");
    if (rateValue) {
      rateValue.textContent = `${parseFloat(rate).toFixed(1)}x`;
    }
    this.saveWidgetSettings();
  }

  onWidgetSpeechVolumeChange() {
    const volume =
      this.widget.querySelector("#speechVolumeSetting")?.value || 0.8;
    const volumeValue = this.widget.querySelector("#speechVolumeValue");
    if (volumeValue) {
      volumeValue.textContent = `${Math.round(parseFloat(volume) * 100)}%`;
    }
    this.saveWidgetSettings();
  }

  async onWidgetVoiceEngineChange() {
    const voiceEngine =
      this.widget.querySelector("#voiceEngineSetting")?.value || "browser";
    await this.loadWidgetVoiceOptions(voiceEngine);
    this.saveWidgetSettings();
  }

  async loadWidgetVoiceOptions(voiceEngine) {
    switch (voiceEngine) {
      case "browser":
        await this.loadWidgetVoices();
        break;
      case "google":
        this.populateWidgetGoogleVoices();
        break;
      case "baidu":
        // 百度TTS直接使用固定角色，不需要选择
        this.setFixedWidgetBaiduVoice();
        break;
      case "youdao":
        this.populateWidgetYoudaoVoices();
        break;
      default:
        await this.loadWidgetVoices();
    }
  }

  async testWidgetVoice() {
    console.log("testWidgetVoice 被调用");
    const testBtn = this.widget.querySelector("#testVoiceBtn");
    if (!testBtn) {
      console.log("未找到测试按钮");
      return;
    }

    // 临时调试：显示设置面板
    const settingsPanel = this.widget.querySelector("#settingsPanel");
    if (settingsPanel && settingsPanel.classList.contains("hidden")) {
      console.log("设置面板被隐藏，自动显示设置面板");
      settingsPanel.classList.remove("hidden");
    }

    const originalText = testBtn.textContent;

    try {
      testBtn.textContent = "测试中...";
      testBtn.disabled = true;

      const settings = {
        voiceEngine:
          this.widget.querySelector("#voiceEngineSetting")?.value || "browser",
        language:
          this.widget.querySelector("#languageSetting")?.value || "zh-CN",
        voiceSelect:
          this.widget.querySelector("#voiceSelectSetting")?.value || "",
        speechRate: parseFloat(
          this.widget.querySelector("#speechRateSetting")?.value || 1.0
        ),
        speechVolume: parseFloat(
          this.widget.querySelector("#speechVolumeSetting")?.value || 0.8
        ),
      };

      console.log("测试语音设置:", settings);
      console.log("当前语音引擎:", settings.voiceEngine);

      // 根据语音引擎选择测试方法
      if (settings.voiceEngine === "baidu") {
        console.log("选择百度TTS测试");
        await this.testVoiceWithBaidu(
          settings,
          "学会用 Scratch 的键盘检测、角色移动和说话积木，制作一个可以键盘控制猫咪移动并说话的互动程序！"
        );
      } else if (settings.voiceEngine === "youdao") {
        console.log("选择有道TTS测试");
        await this.testVoiceWithYoudao(settings, "这是有道语音测试，你好！");
      } else {
        console.log("选择浏览器TTS测试，引擎:", settings.voiceEngine);
        // 使用浏览器 TTS 测试
        await this.testVoiceWithBrowser(settings, "这是语音测试，你好！");
      }
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
            const selectedVoice = voices.find(
              (voice) => voice.name === settings.voiceSelect
            );
            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }
          }

          utterance.onstart = () => {
            this.showSubtitle(text);
            resolve();
          };

          utterance.onend = () => {
            this.hideSubtitle();
          };

          utterance.onerror = (error) => {
            this.hideSubtitle();
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

  async testVoiceWithBaidu(settings, text) {
    try {
      console.log("测试百度TTS，设置:", settings);

      // 临时更新TTS服务设置
      const originalSettings = this.ttsService.settings;
      this.ttsService.settings = { ...originalSettings, ...settings };

      // 使用统一入口进行测试，传递回调函数
      await this.speak(
        text,
        () => {
          console.log("测试百度TTS开始播放");
          this.showSubtitle(text);
        },
        () => {
          console.log("测试百度TTS播放完成");
          this.hideSubtitle();
        },
        (error) => {
          console.error("测试百度TTS播放失败:", error);
          this.hideSubtitle();
        }
      );

      // 恢复原始设置
      this.ttsService.settings = originalSettings;
    } catch (error) {
      throw new Error(`百度TTS测试失败: ${error.message}`);
    }
  }

  async testVoiceWithYoudao(settings, text) {
    try {
      console.log("测试有道TTS，设置:", settings);

      // 临时更新TTS服务设置
      const originalSettings = this.ttsService.settings;
      this.ttsService.settings = {
        ...originalSettings,
        ...settings,
        engine: "youdao",
      };

      // 使用统一入口进行测试，传递回调函数
      await this.speak(
        text,
        () => {
          console.log("测试有道TTS开始播放");
          this.showSubtitle(text);
        },
        () => {
          console.log("测试有道TTS播放完成");
          this.hideSubtitle();
        },
        (error) => {
          console.error("测试有道TTS播放失败:", error);
          this.hideSubtitle();
        }
      );

      // 恢复原始设置
      this.ttsService.settings = originalSettings;
    } catch (error) {
      throw new Error(`有道TTS测试失败: ${error.message}`);
    }
  }

  async loadWidgetVoices() {
    const voiceSelect = this.widget.querySelector("#voiceSelectSetting");
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
    const voiceSelect = this.widget.querySelector("#voiceSelectSetting");
    if (!voiceSelect) return;

    const voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '<option value="">选择语音</option>';

    if (voices.length === 0) {
      voiceSelect.innerHTML = '<option value="">暂无可用语音</option>';
      return;
    }

    // 优先显示中文语音
    const chineseVoices = voices.filter(
      (voice) => voice.lang.includes("zh") || voice.lang.includes("cmn")
    );

    const otherVoices = voices.filter(
      (voice) => !voice.lang.includes("zh") && !voice.lang.includes("cmn")
    );

    if (chineseVoices.length > 0) {
      const chineseGroup = document.createElement("optgroup");
      chineseGroup.label = "中文语音";
      chineseVoices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        chineseGroup.appendChild(option);
      });
      voiceSelect.appendChild(chineseGroup);
    }

    if (otherVoices.length > 0) {
      const otherGroup = document.createElement("optgroup");
      otherGroup.label = "其他语音";
      otherVoices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        otherGroup.appendChild(option);
      });
      voiceSelect.appendChild(otherGroup);
    }

    // 加载完成后，应用当前设置
    this.loadWidgetSettings();
  }

  populateWidgetGoogleVoices() {
    const voiceSelect = this.widget.querySelector("#voiceSelectSetting");
    if (!voiceSelect) return;

    voiceSelect.innerHTML = '<option value="">选择语音</option>';

    const googleVoices = [
      {
        name: "Google 中文女声 (标准)",
        value: "zh-CN-Standard-A",
        lang: "zh-CN",
      },
      {
        name: "Google 中文男声 (标准)",
        value: "zh-CN-Standard-B",
        lang: "zh-CN",
      },
      {
        name: "Google 中文女声2 (标准)",
        value: "zh-CN-Standard-C",
        lang: "zh-CN",
      },
      {
        name: "Google 中文男声2 (标准)",
        value: "zh-CN-Standard-D",
        lang: "zh-CN",
      },
      {
        name: "Google 中文女声 (神经网络)",
        value: "zh-CN-Neural2-A",
        lang: "zh-CN",
      },
      {
        name: "Google 中文男声 (神经网络)",
        value: "zh-CN-Neural2-B",
        lang: "zh-CN",
      },
      {
        name: "Google 中文女声2 (神经网络)",
        value: "zh-CN-Neural2-C",
        lang: "zh-CN",
      },
      {
        name: "Google 中文男声2 (神经网络)",
        value: "zh-CN-Neural2-D",
        lang: "zh-CN",
      },
    ];

    const chineseGroup = document.createElement("optgroup");
    chineseGroup.label = "中文语音";

    googleVoices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.value;
      option.textContent = voice.name;
      chineseGroup.appendChild(option);
    });

    voiceSelect.appendChild(chineseGroup);
  }

  setFixedWidgetBaiduVoice() {
    const voiceSelect = this.widget.querySelector("#voiceSelectSetting");
    if (!voiceSelect) return;

    voiceSelect.innerHTML =
      '<option value="baidu-4140">度小新 (专业女主播)</option>';
    voiceSelect.value = "baidu-4140";
  }

  populateWidgetBaiduVoices() {
    const voiceSelect = this.widget.querySelector("#voiceSelectSetting");
    if (!voiceSelect) return;

    voiceSelect.innerHTML = '<option value="">选择语音</option>';

    const baiduVoices = [
      { name: "百度女声 (度小美)", value: "baidu-0", lang: "zh-CN" },
      { name: "百度男声 (度小宇)", value: "baidu-1", lang: "zh-CN" },
      { name: "百度女声 (度小娇)", value: "baidu-4140", lang: "zh-CN" },
      { name: "百度男声 (度米朵)", value: "baidu-4", lang: "zh-CN" },
      { name: "百度女声 (度小鹿)", value: "baidu-103", lang: "zh-CN" },
      { name: "百度男声 (度博文)", value: "baidu-106", lang: "zh-CN" },
      { name: "百度女声 (度小童)", value: "baidu-110", lang: "zh-CN" },
      { name: "百度女声 (度小萌)", value: "baidu-111", lang: "zh-CN" },
    ];

    const chineseGroup = document.createElement("optgroup");
    chineseGroup.label = "百度语音";

    baiduVoices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.value;
      option.textContent = voice.name;
      chineseGroup.appendChild(option);
    });

    voiceSelect.appendChild(chineseGroup);
  }

  populateWidgetYoudaoVoices() {
    const voiceSelect = this.widget.querySelector("#voiceSelectSetting");
    if (!voiceSelect) return;

    voiceSelect.innerHTML = '<option value="">选择语音</option>';

    const youdaoVoices = [
      { name: "有小智 (男声-标准)", value: "youdao-youxiaozhi", lang: "zh-CN" },
      { name: "有小可 (女声-标准)", value: "youdao-youxiaoke", lang: "zh-CN" },
      { name: "有小宇 (男声-标准)", value: "youdao-youxiaoyu", lang: "zh-CN" },
      { name: "有小美 (女声-标准)", value: "youdao-youxiaomei", lang: "zh-CN" },
      { name: "有小文 (男声-标准)", value: "youdao-youxiaowen", lang: "zh-CN" },
      { name: "有小雅 (女声-标准)", value: "youdao-youxiaoya", lang: "zh-CN" },
    ];

    const chineseGroup = document.createElement("optgroup");
    chineseGroup.label = "有道语音";

    youdaoVoices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.value;
      option.textContent = voice.name;
      chineseGroup.appendChild(option);
    });

    voiceSelect.appendChild(chineseGroup);
  }

  async loadWidgetSettings() {
    try {
      const result = await chrome.storage.sync.get(["settings"]);
      const settings = result.settings || {
        autoPlay: false,
        highlight: true,
        subtitle: true, // 默认开启字幕
        language: "zh-CN",
        voiceEngine: "baidu",
        voiceSelect: "baidu-4140", // 度小新 - 专业女主播
        speechRate: 1.0,
        speechVolume: 0.8,
      };

      // 应用设置到浮窗控件
      const autoPlaySetting = this.widget.querySelector("#autoPlaySetting");
      const highlightSetting = this.widget.querySelector("#highlightSetting");
      const subtitleSetting = this.widget.querySelector("#subtitleSetting");
      const voiceEngineSetting = this.widget.querySelector(
        "#voiceEngineSetting"
      );
      const languageSetting = this.widget.querySelector("#languageSetting");
      const voiceSelectSetting = this.widget.querySelector(
        "#voiceSelectSetting"
      );
      const speechRateSetting = this.widget.querySelector("#speechRateSetting");
      const speechVolumeSetting = this.widget.querySelector(
        "#speechVolumeSetting"
      );
      const speechRateValue = this.widget.querySelector("#speechRateValue");
      const speechVolumeValue = this.widget.querySelector("#speechVolumeValue");

      if (autoPlaySetting) autoPlaySetting.checked = settings.autoPlay;
      if (highlightSetting) highlightSetting.checked = settings.highlight;
      if (subtitleSetting)
        subtitleSetting.checked = settings.subtitle !== false; // 默认开启
      if (voiceEngineSetting) voiceEngineSetting.value = settings.voiceEngine;
      if (languageSetting) languageSetting.value = settings.language;

      // 根据语音引擎加载相应的语音选项
      await this.loadWidgetVoiceOptions(settings.voiceEngine);

      // 确保默认选择度小童
      if (voiceSelectSetting) {
        voiceSelectSetting.value = settings.voiceSelect || "baidu-4140";
      }
      if (speechRateSetting) speechRateSetting.value = settings.speechRate;
      if (speechVolumeSetting)
        speechVolumeSetting.value = settings.speechVolume;
      if (speechRateValue)
        speechRateValue.textContent = `${settings.speechRate}x`;
      if (speechVolumeValue)
        speechVolumeValue.textContent = `${Math.round(
          settings.speechVolume * 100
        )}%`;
    } catch (error) {
      // 静默处理错误
    }
  }

  // 设置消息监听器
  setupMessageListener() {
    // 确保只设置一次监听器
    if (this.messageListenerSetup) {
      console.log("消息监听器已设置，跳过重复设置");
      return;
    }

    console.log("设置消息监听器...");
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("Content script 收到消息:", request);

      try {
        switch (request.action) {
          case "ping":
            console.log("响应 ping 消息");
            sendResponse({ status: "connected", timestamp: Date.now() });
            return true; // 保持消息通道开放

          case "toggleWidget":
            console.log("切换控件显示状态");
            if (this.widget) {
              this.toggleWidgetVisibility();
            } else {
              console.log("Widget不存在，重新创建...");
              this.createWidget();
            }
            sendResponse({ success: true });
            return true;

          case "selectPackage":
            console.log("选择套餐:", request.packageId);
            this.selectPackage(request.packageId);
            sendResponse({ success: true });
            return true;

          case "selectTutorial":
            console.log("选择教程:", request.tutorialId);
            this.selectTutorial(request.tutorialId);
            sendResponse({ success: true });
            return true;

          case "refreshTutorials":
            console.log("刷新教程数据请求");
            // 异步处理刷新请求
            this.refreshTutorials()
              .then(() => {
                sendResponse({ success: true });
              })
              .catch((error) => {
                console.error("刷新教程数据失败:", error);
                sendResponse({ success: false, error: error.message });
              });
            return true; // 异步响应

          case "updateSettings":
            console.log("更新设置:", request.settings);
            this.updateSettings(request.settings);
            sendResponse({ success: true });
            return true;

          case "testVoice":
            console.log("测试语音:", request.settings, request.text);
            // 异步处理语音测试
            this.testVoice(request.settings, request.text)
              .then(() => {
                console.log("语音测试完成");
                sendResponse({ success: true });
              })
              .catch((error) => {
                console.error("语音测试失败:", error);
                sendResponse({ success: false, error: error.message });
              });
            return true; // 异步响应

          default:
            console.warn("未知的消息类型:", request.action);
            sendResponse({ error: "Unknown action", action: request.action });
            return true;
        }
      } catch (error) {
        console.error("处理消息时出错:", error);
        sendResponse({ success: false, error: error.message });
        return true;
      }
    });

    this.messageListenerSetup = true;
    console.log("Content script 消息监听器已设置");
  }

  // 设置存储监听器，用于同步教程选择
  setupStorageListener() {
    // 监听存储变化，实现跨组件同步
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local") {
        // 监听教程选择变化
        if (changes.currentTutorial) {
          const newTutorialKey = changes.currentTutorial.newValue;
          const newStepIndex = changes.currentStepIndex?.newValue || 0;

          console.log(
            "检测到教程选择变化:",
            newTutorialKey,
            "步骤:",
            newStepIndex
          );

          // 只有当选择的教程与当前不同时才更新
          const currentTutorialKey = Object.keys(this.tutorials || {}).find(
            (key) => this.tutorials[key] === this.currentTutorial
          );

          if (newTutorialKey !== currentTutorialKey) {
            // 更新浮窗的下拉选择（不触发事件）
            const tutorialSelect =
              this.widget?.querySelector("#tutorialSelect");
            if (tutorialSelect && newTutorialKey) {
              tutorialSelect.value = newTutorialKey;
              console.log("从存储同步教程选择到浮窗:", newTutorialKey);

              // 更新当前教程状态
              if (this.tutorials[newTutorialKey]) {
                this.currentTutorial = this.tutorials[newTutorialKey];
                this.currentStepIndex = newStepIndex;
                this.updateUI();
              }
            } else if (tutorialSelect && !newTutorialKey) {
              tutorialSelect.value = "";
              this.currentTutorial = null;
              this.currentStepIndex = 0;
              this.updateUI();
            }
          }
        }
      }
    });

    console.log("存储监听器已设置");
  }

  // 设置键盘快捷键
  setupKeyboardShortcuts() {
    // 确保只设置一次键盘监听器
    if (this.keyboardListenerSetup) {
      console.log("键盘监听器已设置，跳过重复设置");
      return;
    }

    console.log("设置键盘快捷键监听器...");

    document.addEventListener("keydown", (e) => {
      // 检查是否在输入框中，如果是则不处理快捷键
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.contentEditable === "true" ||
          activeElement.closest('[contenteditable="true"]'));

      // 如果在输入框中，不处理快捷键
      if (isInputFocused) {
        return;
      }

      // 处理 '/' 键 - 播放/暂停
      if (e.key === "/" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        console.log("检测到 / 键，切换播放状态");
        this.togglePlay();
        return;
      }

      // 处理方向键 - 上一步/下一步
      if (e.key === "ArrowLeft" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        console.log("检测到左箭头键，上一步");
        this.previousStep();
        return;
      }

      if (e.key === "ArrowRight" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        console.log("检测到右箭头键，下一步");
        this.nextStep();
        return;
      }

      // 处理 'r' 键 - 重复当前步骤
      if (e.key === "r" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        console.log("检测到 r 键，重复当前步骤");
        this.repeatStep();
        return;
      }

      // 处理 's' 键 - 切换设置面板
      if (e.key === "s" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        console.log("检测到 s 键，切换设置面板");
        this.toggleSettings();
        return;
      }
    });

    this.keyboardListenerSetup = true;
    console.log("键盘快捷键监听器已设置");
    console.log("可用快捷键:");
    console.log("  / - 播放/暂停");
    console.log("  ← - 上一步");
    console.log("  → - 下一步");
    console.log("  r - 重复当前步骤");
    console.log("  s - 切换设置面板");
  }

  // 切换浮窗显示/隐藏
  toggleWidgetVisibility() {
    if (!this.widget) {
      console.log("Widget不存在，创建新的");
      this.createWidget();
      return;
    }

    const isHidden = this.widget.style.display === "none";
    this.widget.style.display = isHidden ? "block" : "none";
    console.log("Widget显示状态已切换:", isHidden ? "显示" : "隐藏");
  }

  // 更新设置
  async updateSettings(settings) {
    // 更新浮窗面板的设置控件
    const autoPlaySetting = this.widget.querySelector("#autoPlaySetting");
    const highlightSetting = this.widget.querySelector("#highlightSetting");
    const subtitleSetting = this.widget.querySelector("#subtitleSetting");
    const voiceEngineSetting = this.widget.querySelector("#voiceEngineSetting");
    const languageSetting = this.widget.querySelector("#languageSetting");
    const voiceSelectSetting = this.widget.querySelector("#voiceSelectSetting");
    const speechRateSetting = this.widget.querySelector("#speechRateSetting");
    const speechVolumeSetting = this.widget.querySelector(
      "#speechVolumeSetting"
    );
    const speechRateValue = this.widget.querySelector("#speechRateValue");
    const speechVolumeValue = this.widget.querySelector("#speechVolumeValue");

    if (autoPlaySetting && settings.autoPlay !== undefined) {
      autoPlaySetting.checked = settings.autoPlay;
    }

    if (highlightSetting && settings.highlight !== undefined) {
      highlightSetting.checked = settings.highlight;
    }

    if (subtitleSetting && settings.subtitle !== undefined) {
      subtitleSetting.checked = settings.subtitle;
    }

    if (voiceEngineSetting && settings.voiceEngine) {
      voiceEngineSetting.value = settings.voiceEngine;
      // 当语音引擎改变时，重新加载语音选项
      await this.loadWidgetVoiceOptions(settings.voiceEngine);
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
        speechRateValue.textContent = settings.speechRate + "x";
      }
    }

    if (speechVolumeSetting && settings.speechVolume) {
      speechVolumeSetting.value = settings.speechVolume;
      if (speechVolumeValue) {
        speechVolumeValue.textContent =
          Math.round(settings.speechVolume * 100) + "%";
      }
    }

    // 更新 TTS 服务设置
    if (this.ttsService) {
      const ttsSettings = {
        engine: settings.voiceEngine || "browser",
        language: settings.language || "zh-CN",
        voice: settings.voiceSelect || "",
        speed: settings.speechRate || 1.0,
        volume: settings.speechVolume || 0.8,
      };

      this.ttsService.updateSettings(ttsSettings);

      // 保存到存储
      chrome.storage.sync.set({ ttsSettings });
    }
  }

  // 测试语音功能
  async testVoice(settings, text) {
    try {
      console.log("开始语音测试:", { settings, text });

      // 临时更新设置
      if (this.ttsService) {
        const ttsSettings = {
          engine: settings.voiceEngine || "browser",
          language: settings.language || "zh-CN",
          voice: settings.voiceSelect || "",
          speed: settings.speechRate || 1.0,
          volume: settings.speechVolume || 0.8,
        };

        console.log("更新 TTS 设置:", ttsSettings);
        this.ttsService.updateSettings(ttsSettings);

        await this.speak(
          text,
          () => console.log("语音测试开始"),
          () => console.log("语音测试完成"),
          (error) => console.error("语音测试失败:", error)
        );
      } else {
        console.log("TTS 服务未加载，使用浏览器 TTS");
        // 回退到浏览器 TTS
        await this.speak(
          text,
          () => console.log("语音测试开始"),
          () => console.log("语音测试完成"),
          (error) => console.error("语音测试失败:", error)
        );
      }
    } catch (error) {
      console.error("语音测试失败:", error);
      // 尝试浏览器 TTS 作为最后的回退
      try {
        await this.speak(
          text,
          () => console.log("语音测试开始"),
          () => console.log("语音测试完成"),
          (error) => console.error("语音测试失败:", error)
        );
      } catch (fallbackError) {
        console.error("浏览器 TTS 回退也失败:", fallbackError);
      }
    }
  }

  // 初始化拖动功能
  initDragFunctionality() {
    const header = this.widget.querySelector(".widget-header");

    if (!header) {
      console.log("未找到拖动手柄");
      return;
    }

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let widgetStartX = 0;
    let widgetStartY = 0;

    console.log("初始化拖动功能...");

    // 先加载保存的位置
    setTimeout(() => this.loadWidgetPosition(), 100);

    header.addEventListener("mousedown", (e) => {
      // 防止在点击按钮时触发拖动
      if (e.target.closest("button")) return;

      console.log("鼠标按下，准备拖动");

      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      // 获取当前浮窗的位置
      const rect = this.widget.getBoundingClientRect();
      widgetStartX = rect.left;
      widgetStartY = rect.top;

      header.classList.add("dragging");
      this.widget.classList.add("dragging");

      // 禁用过渡动画
      this.widget.style.transition = "none";

      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      let newX = widgetStartX + deltaX;
      let newY = widgetStartY + deltaY;

      // 限制拖动范围，确保不会拖出屏幕
      const widgetWidth = this.widget.offsetWidth;
      const widgetHeight = this.widget.offsetHeight;
      const maxX = window.innerWidth - widgetWidth;
      const maxY = window.innerHeight - widgetHeight;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      // 设置新位置
      this.widget.style.left = `${newX}px`;
      this.widget.style.top = `${newY}px`;
      this.widget.style.right = "auto";
      this.widget.style.bottom = "auto";

      e.preventDefault();
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        console.log("拖动结束");
        isDragging = false;
        header.classList.remove("dragging");
        this.widget.classList.remove("dragging");

        // 恢复过渡动画
        this.widget.style.transition = "";

        // 保存位置
        this.saveWidgetPosition();
      }
    });
  }

  // 保存浮窗位置
  async saveWidgetPosition() {
    try {
      const rect = this.widget.getBoundingClientRect();
      const position = {
        left: rect.left,
        top: rect.top,
        timestamp: Date.now(),
      };

      await chrome.storage.local.set({ widgetPosition: position });
    } catch (error) {
      // 静默处理错误
    }
  }

  // 加载浮窗位置
  async loadWidgetPosition() {
    try {
      const result = await chrome.storage.local.get(["widgetPosition"]);
      const position = result.widgetPosition;

      if (position) {
        // 检查位置是否仍然有效（防止屏幕尺寸变化导致的问题）
        const maxX = window.innerWidth - 280; // 最小宽度
        const maxY = window.innerHeight - 200; // 最小高度

        if (
          position.left >= 0 &&
          position.left <= maxX &&
          position.top >= 0 &&
          position.top <= maxY
        ) {
          this.widget.style.left = `${position.left}px`;
          this.widget.style.top = `${position.top}px`;
          this.widget.style.right = "auto";
          this.widget.style.bottom = "auto";
          this.widget.style.transform = `translate(0px, 0px)`;

          console.log("恢复浮窗位置:", position);
        }
      }
    } catch (error) {
      // 静默处理错误，使用默认位置
      console.log("加载位置失败，使用默认位置");
    }
  }

  // Icons8 图标生成器
  getIcon(name) {
    const icons = {
      "chevron-down":
        '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/expand-arrow--v1.png" alt="展开">',
      "chevron-up":
        '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/collapse-arrow--v1.png" alt="收起">',
      play: '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/play--v1.png" alt="播放">',
      pause:
        '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/pause--v1.png" alt="暂停">',
      "skip-back":
        '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/skip-to-start--v1.png" alt="上一步">',
      "skip-forward":
        '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/end--v1.png" alt="下一步">',
      "rotate-ccw":
        '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/repeat--v1.png" alt="重复">',
      settings:
        '<img class="icon" src="https://img.icons8.com/ios-glyphs/16/settings--v1.png" alt="设置">',
    };

    return icons[name] || "";
  }
}

// 检查是否为 Scratch 编辑器页面
function isScratchEditor() {
  const url = window.location.href;
  const scratchEditorPatterns = [
    "scratch.mit.edu/projects/editor/",
    "scratch.mit.edu/projects/",
    "scratch.mit.edu/create",
    "machinelearningforkids.co.uk/scratch",
  ];

  return scratchEditorPatterns.some((pattern) => url.includes(pattern));
}

// 初始化助手的函数
function initializeScratchAssistant() {
  console.log("=== 开始初始化Scratch语音助手 ===");
  console.log("当前URL:", window.location.href);
  console.log("页面加载状态:", document.readyState);
  console.log("是否为Scratch编辑器:", isScratchEditor());

  if (!isScratchEditor()) {
    console.log("当前页面不是 Scratch 编辑器，跳过初始化");
    return null;
  }

  console.log("检测到 Scratch 编辑器页面，开始初始化语音助手...");

  try {
    // 检查是否已经初始化过
    if (window.scratchVoiceAssistant) {
      console.log("语音助手已存在，跳过重复初始化");
      return window.scratchVoiceAssistant;
    }

    console.log("创建ScratchVoiceAssistant实例...");
    const assistant = new ScratchVoiceAssistant();

    console.log("将实例暴露到全局...");
    // 将实例暴露到全局，便于调试和消息处理
    window.scratchVoiceAssistant = assistant;

    console.log("Scratch 语音助手初始化成功！");
    console.log("全局实例:", window.scratchVoiceAssistant);
    console.log("消息监听器状态:", assistant.messageListenerReady);

    return assistant;
  } catch (error) {
    console.error("Scratch 语音助手初始化失败:", error);
    console.error("错误堆栈:", error.stack);
    console.error("错误详情:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return null;
  }
}

// 页面加载完成后初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeScratchAssistant);
} else {
  // 页面已经加载完成
  initializeScratchAssistant();
}

// 处理页面动态加载的情况
let initRetryCount = 0;
const maxRetries = 3;

function retryInitialization() {
  if (initRetryCount >= maxRetries) {
    console.log("达到最大重试次数，停止重试");
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
    console.log("页面URL发生变化:", currentUrl);

    // 如果切换到Scratch编辑器页面，重新初始化
    if (isScratchEditor() && !window.scratchVoiceAssistant) {
      setTimeout(initializeScratchAssistant, 1000);
    }
  }
}).observe(document, { subtree: true, childList: true });

// 添加页面加载完成的标记
console.log("Scratch Voice Assistant Content Script 已加载");
window.scratchVoiceAssistantLoaded = true;
