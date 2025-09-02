# 连接问题故障排除指南

如果您遇到"Could not establish connection. Receiving end does not exist"错误，请按照以下步骤进行故障排除：

## 问题描述
这个错误通常表示Chrome扩展的popup无法与网页中的content script建立连接。

## 解决方案

### 1. 基本检查
- **确认页面类型**：确保您在Scratch编辑器页面（如 `https://scratch.mit.edu/projects/editor/` 或 `https://scratch.mit.edu/create`）
- **检查扩展状态**：确认扩展程序已启用且没有错误

### 2. 刷新页面
最简单的解决方法：
1. 刷新Scratch编辑器页面（F5或Ctrl+R）
2. 等待页面完全加载
3. 再次尝试使用扩展

### 3. 重新加载扩展
如果刷新页面无效：
1. 打开Chrome扩展管理页面（`chrome://extensions/`）
2. 找到"Scratch 教程语音助手"
3. 点击刷新按钮重新加载扩展
4. 返回Scratch页面并刷新

### 4. 检查权限
1. 在扩展管理页面，确认扩展有权限访问`https://scratch.mit.edu/*`
2. 如果没有权限，点击"详细信息"并启用相关权限

### 5. 使用调试功能
1. 点击扩展图标打开popup
2. 在底部点击"调试"链接
3. 查看详细的连接诊断信息
4. 根据诊断结果采取相应措施

### 6. 手动注入（高级）
如果以上方法都无效：
1. 打开Chrome开发者工具（F12）
2. 在Console中运行测试脚本（test-connection.js的内容）
3. 查看输出信息并根据提示操作

## 常见原因和解决方法

### Content Script未加载
**原因**：页面加载时content script没有正确注入
**解决**：刷新页面或重新加载扩展

### 页面URL不匹配
**原因**：当前页面不在支持的URL列表中
**解决**：确保在正确的Scratch编辑器页面

### 扩展权限不足
**原因**：扩展没有权限在该网站运行
**解决**：在扩展管理中检查并启用权限

### 浏览器兼容性
**原因**：某些浏览器版本可能有兼容性问题
**解决**：更新Chrome到最新版本

## 支持的页面格式
扩展支持以下Scratch页面格式：
- `https://scratch.mit.edu/projects/editor/*`
- `https://scratch.mit.edu/projects/*/editor`
- `https://scratch.mit.edu/projects/*/editor/*`
- `https://scratch.mit.edu/create*`

## 预防措施
- 保持Chrome和扩展程序更新到最新版本
- 避免在页面完全加载前使用扩展功能
- 如果经常遇到问题，可以将扩展设置为总是允许在Scratch网站运行

## 仍然无法解决？
如果按照以上步骤仍然无法解决问题，请：
1. 记录详细的错误信息和操作步骤
2. 包含浏览器版本和操作系统信息
3. 提供调试信息的截图
4. 通过GitHub Issues或其他渠道报告问题

---

*最后更新：2024年*
