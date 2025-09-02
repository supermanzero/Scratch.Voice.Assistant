# Scratch 教程语音助手

一个专为 Scratch 编程学习设计的 Chrome 扩展程序，通过语音指导帮助用户学习 Scratch 编程。

## 功能特点

- 🎯 **智能语音指导** - 支持多种语音引擎的中文语音教学
- 🎨 **现代化 UI** - 基于 shadcn/ui 设计系统的简洁界面
- 📚 **分类教程** - 按积木类型组织的结构化教程内容
- 🎮 **播放控制** - 完整的播放/暂停/上一步/下一步控制
- 📊 **进度跟踪** - 自动保存学习进度
- 🎙️ **多语音选择** - 支持浏览器语音、Google TTS 等多种语音引擎
- ⚙️ **个性化设置** - 可调节语音引擎、语音类型、语速、音量等参数
- 🔊 **语音测试** - 实时测试不同语音设置的效果
- 🔍 **积木高亮** - 智能高亮相关的 Scratch 积木（计划功能）

## 安装方法

### 开发模式安装

1. 克隆或下载此项目到本地
2. 打开 Chrome 浏览器，进入 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录
6. 扩展程序安装完成

### 使用方法

1. 访问 [Scratch 编辑器](https://scratch.mit.edu/projects/editor/)
2. 页面右下角会自动出现"教学助手"悬浮控件
3. 点击扩展程序图标打开设置面板
4. 在设置中选择你喜欢的语音引擎和语音类型：
   - **浏览器语音** - 使用系统内置语音
   - **Google 语音** - 使用 Google Translate TTS（免费）
   - **Google Cloud TTS** - 使用 Google Cloud 高质量语音（需要 API Key）
5. 调节语音速度和音量到合适的水平
6. 点击"测试语音"按钮试听效果
7. 选择想要学习的教程类型
8. 点击播放按钮开始语音指导
9. 使用控制按钮进行播放控制

### 故障排除

#### 连接问题
如果遇到 "Could not establish connection" 错误：

1. **刷新页面** - 在 Scratch 编辑器页面按 F5 刷新
2. **重新加载扩展** - 在 `chrome://extensions/` 页面点击扩展的刷新按钮
3. **检查页面URL** - 确保在正确的 Scratch 编辑器页面
4. **使用调试工具** - 在浏览器控制台运行：

```javascript
console.log('Content Script 状态:', window.scratchVoiceAssistantLoaded);
console.log('助手实例:', window.scratchVoiceAssistant);
```

#### 语音问题
如果遇到 "TTS 服务加载失败" 错误：

1. **使用测试页面** - 打开 `test-simple-tts.html` 进行基础测试
2. **检查浏览器语音支持**：
```javascript
console.log('语音合成支持:', typeof speechSynthesis !== 'undefined');
console.log('可用语音:', speechSynthesis.getVoices());
```

3. **手动测试语音**：
```javascript
speechSynthesis.speak(new SpeechSynthesisUtterance('测试'));
```

4. **切换语音引擎** - 在设置中尝试不同的语音引擎：
   - 优先使用"浏览器语音"（最稳定）
   - Google 语音需要网络连接

#### 常见解决方案

- **语音无声音**：检查系统音量、浏览器音量、扩展设置中的音量
- **语音播放中断**：确保页面保持活跃状态，避免切换标签页
- **Google 语音失败**：检查网络连接，或切换到浏览器语音
- **扩展无响应**：重新加载扩展程序，刷新 Scratch 页面

## 项目结构

```
Scratch.Voice.Assistant/
├── manifest.json              # Chrome 扩展配置
├── src/
│   ├── content/
│   │   └── main.js           # 主内容脚本
│   ├── background/
│   │   └── service-worker.js # 后台服务脚本
│   └── popup/
│       ├── popup.html        # 扩展弹窗页面
│       ├── popup.css         # 弹窗样式
│       └── popup.js          # 弹窗逻辑
├── assets/
│   └── css/
│       └── content.css       # 内容页面样式
└── .kiro/
    └── steering/             # AI 助手指导文档
```

## 技术栈

- **Chrome Extension Manifest V3** - 现代化的扩展程序架构
- **多语音引擎支持**：
  - **Web Speech API** - 浏览器原生语音合成
  - **Google Translate TTS** - 免费的 Google 语音服务
  - **Google Cloud Text-to-Speech** - 高质量的云端语音合成
- **shadcn/ui 设计系统** - 现代化的 UI 组件和样式
- **原生 JavaScript** - 轻量级实现，无外部依赖

## 开发指南

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-username/scratch-voice-assistant.git
cd scratch-voice-assistant

# 在 Chrome 中加载扩展程序
# 1. 打开 chrome://extensions/
# 2. 开启开发者模式
# 3. 点击"加载已解压的扩展程序"
# 4. 选择项目目录
```

### 项目打包

```bash
npm run pack
```

### 测试功能

1. 打开 Scratch 编辑器页面
2. 确认右下角出现教学助手控件
3. 测试各项功能：
   - 教程选择
   - 语音播放控制
   - 设置调节
   - 进度保存

## 语音设置说明

### 语音引擎选择

1. **浏览器语音**
   - 使用系统内置的语音合成引擎
   - 完全离线工作，无需网络连接
   - 语音质量取决于操作系统
   - 支持多种中文语音（如有安装）

2. **Google 语音**
   - 使用 Google Translate 的免费 TTS 服务
   - 需要网络连接
   - 语音质量较好，发音自然
   - 支持多种中文语音选项

3. **Google Cloud TTS**
   - 使用 Google Cloud 的高级语音合成服务
   - 需要 Google Cloud API Key
   - 最高质量的语音合成
   - 支持神经网络语音，更加自然

### 语音选项

- **标准语音** - 基础的语音合成，清晰易懂
- **神经网络语音** - 使用 AI 技术的高质量语音，更加自然流畅
- **多地区支持** - 支持普通话、粤语、台湾中文等

### 参数调节

- **语音速度** - 0.5x 到 2.0x，默认 1.0x
- **音量** - 0% 到 100%，默认 80%
- **实时测试** - 点击"测试语音"按钮即时试听效果

## 教程内容

目前包含以下教程：

- **运动积木教程** - 学习如何让角色移动
- **外观积木教程** - 改变角色外观和对话
- **事件积木教程** - 让程序响应用户操作

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 更新日志

### v1.0.0 (2024-12-XX)
- 🎉 初始版本发布
- ✨ 基础语音教学功能
- 🎨 现代化 UI 设计
- 📚 三个基础教程模块