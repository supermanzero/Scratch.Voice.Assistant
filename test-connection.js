// 测试连接的简单脚本
// 在浏览器控制台中运行此脚本来测试扩展连接

console.log('=== Scratch 语音助手连接测试 ===');

// 1. 检查当前页面
console.log('1. 当前页面信息:');
console.log('   URL:', window.location.href);
console.log('   是否为Scratch编辑器:', window.location.href.includes('scratch.mit.edu'));

// 2. 检查content script是否已加载
console.log('2. Content Script 状态:');
console.log('   scratchVoiceAssistant存在:', !!window.scratchVoiceAssistant);
console.log('   scratchVoiceAssistantLoaded:', !!window.scratchVoiceAssistantLoaded);

// 3. 检查DOM元素
console.log('3. DOM 元素检查:');
const assistantWidget = document.querySelector('.scratch-voice-assistant');
console.log('   助手浮窗存在:', !!assistantWidget);
if (assistantWidget) {
  console.log('   浮窗显示状态:', assistantWidget.style.display !== 'none');
}

// 4. 尝试手动初始化（如果需要）
if (!window.scratchVoiceAssistant && window.location.href.includes('scratch.mit.edu')) {
  console.log('4. 尝试手动初始化...');
  try {
    // 这里需要确保ScratchVoiceAssistant类已定义
    if (typeof ScratchVoiceAssistant !== 'undefined') {
      window.scratchVoiceAssistant = new ScratchVoiceAssistant();
      console.log('   手动初始化成功');
    } else {
      console.log('   ScratchVoiceAssistant类未定义');
    }
  } catch (error) {
    console.error('   手动初始化失败:', error);
  }
}

console.log('=== 测试完成 ===');
