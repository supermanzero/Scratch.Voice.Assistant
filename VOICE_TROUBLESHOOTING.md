# 语音问题排查指南

## 快速诊断步骤

### 1. 基础检查
1. 打开 `test-voice.html` 文件进行基础语音测试
2. 检查浏览器是否支持语音合成
3. 确认系统音量和浏览器音量设置

### 2. 在 Scratch 页面测试
1. 打开 [Scratch 编辑器](https://scratch.mit.edu/projects/editor/)
2. 按 F12 打开开发者工具
3. 在 Console 标签中查看错误信息
4. 点击扩展程序图标，使用"语音调试"功能

### 3. 常见问题及解决方案

#### 问题：完全没有声音
**可能原因：**
- 浏览器音量被静音
- 系统音量设置问题
- 语音合成服务未启动

**解决方案：**
```javascript
// 在浏览器控制台中测试基础语音功能
speechSynthesis.speak(new SpeechSynthesisUtterance('测试'));
```

#### 问题：语音列表为空
**可能原因：**
- 语音服务未加载完成
- 系统语音包未安装

**解决方案：**
```javascript
// 检查语音列表
console.log('可用语音:', speechSynthesis.getVoices());

// 等待语音列表加载
speechSynthesis.onvoiceschanged = () => {
    console.log('语音列表已更新:', speechSynthesis.getVoices());
};
```

#### 问题：Google 语音无法播放
**可能原因：**
- 网络连接问题
- CORS 限制
- API 限流

**解决方案：**
1. 检查网络连接
2. 尝试切换到浏览器语音
3. 查看控制台网络错误

#### 问题：语音播放中断
**可能原因：**
- 页面失去焦点
- 浏览器节能模式
- 语音服务冲突

**解决方案：**
1. 确保页面保持活跃状态
2. 检查浏览器设置中的媒体播放权限
3. 重新加载扩展程序

### 4. 调试命令

在浏览器控制台中运行以下命令进行调试：

```javascript
// 检查语音合成支持
console.log('speechSynthesis 支持:', typeof speechSynthesis !== 'undefined');

// 获取语音列表
console.log('可用语音:', speechSynthesis.getVoices());

// 测试基础语音
const utterance = new SpeechSynthesisUtterance('测试语音');
utterance.onstart = () => console.log('开始播放');
utterance.onend = () => console.log('播放完成');
utterance.onerror = (e) => console.error('播放错误:', e);
speechSynthesis.speak(utterance);

// 检查 TTS 服务状态（在 Scratch 页面中）
if (window.TTSService) {
    const tts = new window.TTSService();
    console.log('TTS 服务状态:', tts.getStatus());
}
```

### 5. 系统特定问题

#### Windows 系统
- 确保安装了中文语音包
- 检查"设置 > 时间和语言 > 语音"中的语音设置

#### macOS 系统
- 检查"系统偏好设置 > 辅助功能 > 语音"
- 确保启用了中文语音

#### Linux 系统
- 安装 espeak 或 festival 语音合成引擎
- 检查 PulseAudio 音频设置

### 6. 浏览器特定问题

#### Chrome/Edge
- 检查 `chrome://settings/content/sound` 中的音频设置
- 确保网站有播放音频的权限

#### Firefox
- 检查 `about:preferences#privacy` 中的权限设置
- 确保启用了语音合成功能

#### Safari
- 检查"偏好设置 > 网站 > 自动播放"设置
- 确保允许音频播放

### 7. 高级调试

如果以上方法都无法解决问题，请：

1. **收集调试信息：**
   - 浏览器版本和操作系统
   - 控制台错误信息
   - 语音调试信息输出

2. **创建最小复现案例：**
   - 使用 `test-voice.html` 进行测试
   - 记录具体的操作步骤和错误现象

3. **提交问题报告：**
   - 包含完整的调试信息
   - 描述预期行为和实际行为
   - 提供复现步骤

### 8. 临时解决方案

如果语音功能暂时无法正常工作，可以：

1. **使用文本显示：**
   - 在控件中显示教程文本
   - 手动阅读教程内容

2. **外部语音工具：**
   - 使用系统自带的语音朗读功能
   - 安装第三方语音软件

3. **降级使用：**
   - 仅使用浏览器原生语音
   - 关闭高级语音功能

## 联系支持

如果问题仍然存在，请：
1. 查看项目 GitHub Issues
2. 提交新的 Issue 并包含调试信息
3. 参考项目文档和 FAQ