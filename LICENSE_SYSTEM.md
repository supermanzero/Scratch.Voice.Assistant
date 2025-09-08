# 授权系统使用指南

## 概述

Scratch Voice Assistant 现在集成了基于 Firebase Firestore 的授权码验证系统，确保只有授权用户才能使用扩展功能。

## 系统架构

### 数据流程
```
用户输入授权码 → 验证授权码 → 绑定设备 → 保存授权状态 → 允许使用扩展
```

### Firestore 数据结构
```
集合: licenses
文档ID: 授权码 (如 "ABC123")

文档内容:
{
  "active": true,           // 是否已激活
  "uuid": "设备唯一标识",    // 绑定的设备UUID
  "createdAt": "创建时间",   // 授权码创建时间
  "activatedAt": "激活时间"  // 首次激活时间
}
```

## 授权流程

### 1. 首次使用
1. 用户打开扩展
2. 系统检查本地授权状态
3. 如果未授权，显示授权界面
4. 用户输入授权码
5. 系统验证授权码并绑定设备

### 2. 后续使用
1. 系统检查本地授权状态
2. 验证云端授权状态
3. 如果设备UUID匹配，允许使用
4. 如果不匹配，拒绝使用

## 文件结构

```
src/
├── services/
│   └── licenseService.js      # 授权服务核心逻辑
├── popup/
│   ├── licenseModal.html      # 授权码输入界面
│   ├── licenseModal.js        # 授权界面逻辑
│   └── popup.js               # 主弹窗（集成授权检查）
└── firebase/
    └── config.js              # Firebase配置
```

## 核心功能

### LicenseService 类

#### 主要方法

```javascript
// 验证授权码
async validateLicense(licenseCode)

// 检查授权状态
async checkLicenseStatus()

// 检查本地授权状态
checkLocalLicense()

// 清除本地授权信息
clearLocalLicense()

// 获取设备UUID
getDeviceUuid()
```

#### 验证逻辑

1. **授权码不存在**
   - 返回错误：`LICENSE_NOT_FOUND`

2. **首次激活 (active=false)**
   - 绑定当前设备UUID
   - 设置 `active=true`
   - 记录激活时间
   - 返回成功：`LICENSE_ACTIVATED`

3. **已激活 (active=true)**
   - 检查设备UUID是否匹配
   - 匹配：返回成功 `LICENSE_VALID`
   - 不匹配：返回错误 `LICENSE_ALREADY_USED`

## 使用方法

### 1. 用户操作

#### 首次使用
1. 安装扩展后，点击扩展图标
2. 系统显示"需要授权"界面
3. 点击"输入授权码"按钮
4. 在弹出的窗口中输入授权码
5. 点击"验证授权"
6. 验证成功后，扩展自动重新加载

#### 日常使用
- 扩展会自动检查授权状态
- 如果授权有效，直接显示主界面
- 如果授权失效，会提示重新验证

### 2. 管理员操作

#### 创建授权码
```javascript
// 在Firebase控制台或通过代码创建
db.collection('licenses').doc('ABC123').set({
  active: false,
  createdAt: new Date()
});
```

#### 重置授权码
```javascript
// 重置授权码，允许重新绑定
db.collection('licenses').doc('ABC123').update({
  active: false,
  uuid: null,
  activatedAt: null
});
```

#### 删除授权码
```javascript
// 删除授权码
db.collection('licenses').doc('ABC123').delete();
```

## 测试

### 测试页面
使用 `test-license.html` 页面进行测试：

1. 打开测试页面
2. 查看设备信息
3. 检查当前授权状态
4. 创建测试授权码
5. 验证授权码
6. 测试各种场景

### 测试场景

#### 正常流程测试
1. 创建新的授权码
2. 使用授权码进行首次激活
3. 验证授权状态
4. 重新打开扩展，确认授权有效

#### 异常流程测试
1. 使用不存在的授权码
2. 使用已被其他设备绑定的授权码
3. 清除本地授权信息后重新验证
4. 网络异常情况下的授权检查

## 安全考虑

### 1. 设备绑定
- 每个授权码只能绑定一个设备
- 设备UUID基于浏览器和系统信息生成
- 重装系统或更换浏览器会生成新的UUID

### 2. 本地存储
- 授权信息存储在 `localStorage` 中
- 包含设备UUID验证，防止简单复制
- 支持离线模式下的授权检查

### 3. 云端验证
- 定期验证云端授权状态
- 防止授权码被恶意重置
- 支持授权码的集中管理

## 错误处理

### 常见错误码

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| `LICENSE_NOT_FOUND` | 授权码不存在 | 检查授权码是否正确 |
| `LICENSE_ALREADY_USED` | 授权码已被使用 | 联系管理员重置 |
| `VALIDATION_ERROR` | 验证过程出错 | 检查网络连接 |

### 错误恢复

1. **网络错误**
   - 使用本地缓存的授权状态
   - 显示离线模式提示
   - 网络恢复后自动重新验证

2. **授权失效**
   - 清除本地授权信息
   - 显示重新授权界面
   - 引导用户重新输入授权码

## 部署配置

### 1. Firebase 配置
确保 `firestore.rules` 包含 licenses 集合的权限：

```javascript
match /licenses/{licenseId} {
  allow read, write: if true; // 开发环境
}
```

### 2. 扩展权限
确保 `manifest.json` 包含必要的权限：

```json
{
  "host_permissions": [
    "https://firebase.googleapis.com/*",
    "https://firestore.googleapis.com/*"
  ]
}
```

### 3. 资源访问
确保授权相关文件在 `web_accessible_resources` 中：

```json
{
  "web_accessible_resources": [
    {
      "resources": [
        "src/popup/licenseModal.html",
        "src/services/licenseService.js"
      ]
    }
  ]
}
```

## 维护指南

### 1. 监控授权使用情况
- 定期检查 Firestore 中的 licenses 集合
- 监控激活的授权码数量
- 识别异常使用模式

### 2. 授权码管理
- 定期清理测试授权码
- 重置长期未使用的授权码
- 备份重要的授权数据

### 3. 系统更新
- 更新授权逻辑时保持向后兼容
- 测试新版本与现有授权码的兼容性
- 提供授权码迁移方案

## 故障排除

### 1. 授权验证失败
- 检查网络连接
- 验证 Firebase 配置
- 查看浏览器控制台错误

### 2. 设备UUID不匹配
- 清除浏览器数据
- 重新安装扩展
- 联系管理员重置授权码

### 3. 界面显示异常
- 检查文件路径配置
- 验证资源访问权限
- 查看扩展权限设置

## 总结

授权系统提供了完整的用户验证和设备绑定功能，确保扩展的安全使用。通过合理的错误处理和用户引导，提供了良好的用户体验。
