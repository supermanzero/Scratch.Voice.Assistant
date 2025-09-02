# Scratch 教程语音助手

一个专为 Scratch 编程学习设计的 Chrome 扩展程序，通过语音指导帮助用户学习 Scratch 编程。

## 功能特点

- 🎯 **智能语音指导** - 使用 Web Speech API 提供中文语音教学
- 🎨 **现代化 UI** - 基于 shadcn/ui 设计系统的简洁界面
- 📚 **分类教程** - 按积木类型组织的结构化教程内容
- 🎮 **播放控制** - 完整的播放/暂停/上一步/下一步控制
- 📊 **进度跟踪** - 自动保存学习进度
- ⚙️ **个性化设置** - 可调节语速、音量等参数
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
3. 选择想要学习的教程类型
4. 点击播放按钮开始语音指导
5. 使用控制按钮进行播放控制

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
- **Web Speech API** - 浏览器原生语音合成
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