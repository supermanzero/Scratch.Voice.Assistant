# Project Structure

## Chrome 扩展目录结构
```
Scratch.Voice.Assistant/
├── manifest.json        # Chrome 扩展配置文件
├── src/                 # 源代码
│   ├── content/        # Content Scripts
│   │   ├── main.js     # 主注入脚本
│   │   └── ui.js       # UI 控件逻辑
│   ├── background/     # Background Scripts
│   │   └── service-worker.js
│   ├── popup/          # 扩展弹窗（可选）
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── components/     # UI 组件
│   │   ├── player.js   # 播放控制器
│   │   └── tutorial-selector.js
│   ├── data/           # 教程数据
│   │   ├── tutorials/  # 分类教程 JSON
│   │   │   ├── motion.json    # 运动积木教程
│   │   │   ├── looks.json     # 外观积木教程
│   │   │   ├── control.json   # 控制积木教程
│   │   │   └── events.json    # 事件积木教程
│   │   └── index.js    # 数据管理
│   ├── services/       # 核心服务
│   │   ├── tts.js      # 语音合成服务
│   │   ├── tutorial.js # 教程管理
│   │   └── scratch-integration.js # Scratch 集成
│   └── utils/          # 工具函数
│       ├── dom.js      # DOM 操作工具
│       └── storage.js  # 存储管理
├── assets/             # 静态资源
│   ├── icons/          # 扩展图标
│   ├── css/            # 样式文件
│   └── audio/          # 音频文件（可选）
├── dist/               # 构建输出
└── tests/              # 测试文件
```

## 命名约定
- **文件名**: kebab-case (`tutorial-selector.js`)
- **变量/函数**: camelCase (`currentStepIndex`)
- **类名**: PascalCase (`TutorialPlayer`)
- **常量**: UPPER_SNAKE_CASE (`MAX_STEP_COUNT`)
- **CSS 类**: kebab-case (`.tutorial-player`)

## 关键文件说明
- **manifest.json**: 定义扩展权限、content_scripts 注入规则
- **content/main.js**: 主要注入逻辑，创建悬浮控件
- **services/tts.js**: Web Speech API 封装
- **data/tutorials/**: JSON 格式的分类教程数据
- **components/player.js**: 播放控制器（播放/暂停/上一步/下一步）