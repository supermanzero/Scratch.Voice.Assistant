# UI 设计指南

## 设计风格
参考 **shadcn/ui** 设计系统，采用现代、简洁、一致的视觉风格。

## 设计原则
- **简洁性**: 界面简洁明了，避免视觉干扰
- **一致性**: 统一的颜色、字体、间距和交互模式
- **可访问性**: 支持键盘导航，良好的对比度
- **响应式**: 适配不同屏幕尺寸

## 颜色系统
基于 shadcn/ui 的颜色规范：
```css
/* 主色调 */
--primary: 222.2 84% 4.9%;           /* 深色主色 */
--primary-foreground: 210 40% 98%;   /* 主色前景 */

/* 次要色调 */
--secondary: 210 40% 96%;            /* 浅灰背景 */
--secondary-foreground: 222.2 84% 4.9%; /* 次要前景 */

/* 边框和分割线 */
--border: 214.3 31.8% 91.4%;         /* 边框色 */
--ring: 222.2 84% 4.9%;              /* 焦点环 */

/* 背景色 */
--background: 0 0% 100%;             /* 主背景 */
--card: 0 0% 100%;                   /* 卡片背景 */
```

## 组件设计规范

### 悬浮控件
- **位置**: 页面右下角固定定位
- **尺寸**: 紧凑设计，不遮挡 Scratch 编辑器
- **阴影**: `shadow-lg` 柔和阴影效果
- **圆角**: `rounded-lg` (8px)
- **背景**: 半透明白色背景 `bg-white/95`

### 按钮设计
遵循 shadcn/ui Button 组件规范：
```css
/* 主要按钮 */
.btn-primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 500;
}

/* 次要按钮 */
.btn-secondary {
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  border: 1px solid hsl(var(--border));
}

/* 图标按钮 */
.btn-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 播放控制器
- **布局**: 水平排列的图标按钮
- **图标**: 使用 Lucide React 图标库
- **状态**: 清晰的播放/暂停状态指示
- **间距**: 按钮间距 `gap-2` (8px)

### 教程选择器
- **样式**: 下拉选择框 (Select 组件)
- **选项分组**: 按积木类别分组
- **搜索**: 支持教程内容搜索
- **高度**: 最大高度限制，超出滚动

## 动画效果
使用 CSS transitions 和 transforms：
```css
/* 悬浮效果 */
.floating-widget {
  transition: all 0.2s ease-in-out;
}

.floating-widget:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

/* 按钮点击反馈 */
.btn:active {
  transform: scale(0.95);
}

/* 淡入淡出 */
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## 响应式设计
- **桌面**: 完整功能界面
- **平板**: 适当缩小控件尺寸
- **移动端**: 简化界面，保留核心功能

## 可访问性
- **键盘导航**: 支持 Tab 键导航
- **ARIA 标签**: 为屏幕阅读器提供语义信息
- **对比度**: 确保文字和背景对比度 ≥ 4.5:1
- **焦点指示**: 清晰的焦点环效果

## 图标使用
使用 **Icons8** 图标库 (https://icons8.com/icons)：
- 播放控制：`play--v1`, `pause--v1`
- 导航控制：`skip-to-start--v1`, `end--v1`
- 功能图标：`repeat--v1`, `settings--v1`
- 界面图标：`expand-arrow--v1`, `collapse-arrow--v1`
- 主图标：`voice-presentation` (语音助手主题)

### 图标样式规范
```css
.icon {
  width: 16px;
  height: 16px;
  filter: brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%);
}

/* 主要按钮中的图标 */
.primary .icon {
  filter: brightness(0) saturate(100%) invert(100%);
}
```