# Technology Stack

## Chrome 扩展架构
- **平台**: Chrome Extension Manifest V3
- **注入机制**: Content Scripts 注入到 Scratch 编辑器页面
- **目标页面**: `https://scratch.mit.edu/projects/editor/*`
- **UI 集成**: 页面右下角/左侧悬浮控件

## 核心技术栈
- **语音合成**: Web Speech API (speechSynthesis)
  - 支持中文/英文语音播放
  - 浏览器端直接播放，无需后端
  - 可扩展第三方 TTS 服务 (Google Cloud TTS, Azure Speech)
- **数据存储**: JSON 格式教程数据
- **DOM 操作**: 原生 JavaScript 或轻量级库
- **UI 框架**: 原生 HTML/CSS/JS 或轻量级框架

## 教程数据管理
- **格式**: JSON 文件存储教程步骤
- **存储方式**: 插件内置，支持更新
- **分类**: 按 Scratch 积木分类（运动/外观/控制/事件等）

## 进阶功能技术
- **Scratch 集成**: DOM 分析 Blockly/Scratch Blocks 结构
- **事件监听**: 监听用户积木点击事件
- **状态管理**: currentStepIndex 维护播放进度

## 构建工具
推荐使用现代前端工具链：
- **打包**: Webpack 或 Vite
- **开发**: Chrome Extension 开发模式
- **测试**: Jest 或 Vitest

## 常用命令
```bash
npm install           # 安装依赖
npm run dev          # 开发模式构建
npm run build        # 生产构建
npm run pack         # 打包扩展程序
npm run test         # 运行测试
```