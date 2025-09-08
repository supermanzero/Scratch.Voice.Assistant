// 授权码验证界面逻辑
class LicenseModal {
  constructor() {
    this.licenseService = null;
    this.init();
  }

  async init() {
    try {
      // 等待页面加载完成
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
      } else {
        this.setupEventListeners();
      }

      // 初始化授权服务
      await this.initLicenseService();
      
      // 显示设备UUID
      this.displayDeviceUuid();
    } catch (error) {
      console.error('初始化授权界面失败:', error);
      this.showMessage('初始化失败: ' + error.message, 'error');
    }
  }

  async initLicenseService() {
    try {
      // 动态加载授权服务
      if (typeof licenseService === 'undefined') {
        await this.loadLicenseService();
      }
      
      this.licenseService = window.licenseService;
      console.log('授权服务初始化成功');
    } catch (error) {
      console.error('加载授权服务失败:', error);
      throw error;
    }
  }

  loadLicenseService() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '../services/licenseService.js';
      script.onload = () => {
        console.log('授权服务脚本加载完成');
        resolve();
      };
      script.onerror = (error) => {
        console.error('加载授权服务脚本失败:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  setupEventListeners() {
    const form = document.getElementById('licenseForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const licenseInput = document.getElementById('licenseCode');

    // 表单提交事件
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // 取消按钮事件
    cancelBtn.addEventListener('click', () => {
      this.handleCancel();
    });

    // 输入框事件
    licenseInput.addEventListener('input', (e) => {
      this.clearMessage();
      // 自动转换为大写
      e.target.value = e.target.value.toUpperCase();
    });

    // 回车键提交
    licenseInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSubmit();
      }
    });

    // 自动聚焦到输入框
    licenseInput.focus();
  }

  displayDeviceUuid() {
    const deviceUuidElement = document.getElementById('deviceUuid');
    
    if (this.licenseService) {
      const uuid = this.licenseService.getDeviceUuid();
      deviceUuidElement.textContent = `设备ID: ${uuid}`;
    } else {
      deviceUuidElement.textContent = '无法获取设备ID';
    }
  }

  async handleSubmit() {
    const licenseCode = document.getElementById('licenseCode').value.trim();
    
    if (!licenseCode) {
      this.showMessage('请输入授权码', 'error');
      return;
    }

    if (!this.licenseService) {
      this.showMessage('授权服务未初始化', 'error');
      return;
    }

    this.setLoading(true);
    this.clearMessage();

    try {
      console.log('开始验证授权码:', licenseCode);
      
      const result = await this.licenseService.validateLicense(licenseCode);
      
      if (result.success) {
        this.showMessage(result.message, 'success');
        
        // 授权成功，保存状态并通知父窗口
        console.log('授权验证成功，保存状态:', result);
        
        // 延迟关闭窗口，让用户看到成功消息
        setTimeout(() => {
          this.closeWindow(result);
        }, 2000);
      } else {
        this.showMessage(result.message, 'error');
        
        // 根据错误类型提供不同的处理建议
        if (result.code === 'LICENSE_BOUND_TO_OTHER_DEVICE') {
          this.showMessage(
            `此授权码已被其他设备使用。\n\n绑定设备: ${result.boundDevice}\n当前设备: ${result.currentDevice}\n\n如果您是合法用户，请联系管理员重置授权码。`, 
            'error'
          );
        } else if (result.code === 'LICENSE_NOT_FOUND') {
          this.showMessage(
            '授权码不存在，请检查输入是否正确。', 
            'error'
          );
        }
      }
    } catch (error) {
      console.error('验证授权码时发生错误:', error);
      this.showMessage('验证失败: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  handleCancel() {
    this.closeWindow();
  }

  setLoading(isLoading) {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loadingElement = submitBtn.querySelector('.loading');
    const licenseInput = document.getElementById('licenseCode');

    if (loadingElement) {
      btnText.style.display = isLoading ? 'none' : 'inline';
      loadingElement.style.display = isLoading ? 'flex' : 'none';
      submitBtn.disabled = isLoading;
      licenseInput.disabled = isLoading;
    }
  }

  showMessage(message, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.style.display = 'block';

    // 自动隐藏成功消息
    if (type === 'success') {
      setTimeout(() => {
        this.clearMessage();
      }, 5000);
    }
  }

  clearMessage() {
    const messageElement = document.getElementById('message');
    messageElement.style.display = 'none';
    messageElement.textContent = '';
  }

  closeWindow(result = null) {
    // 发送消息给父窗口（如果存在）
    if (window.opener) {
      window.opener.postMessage({
        type: 'LICENSE_VALIDATION_COMPLETE',
        success: result ? result.success : true,
        result: result
      }, '*');
    }
    
    // 关闭窗口
    window.close();
  }

  // 检查当前授权状态
  async checkCurrentLicenseStatus() {
    if (!this.licenseService) {
      return null;
    }

    try {
      const status = await this.licenseService.checkLicenseStatus();
      return status;
    } catch (error) {
      console.error('检查授权状态失败:', error);
      return null;
    }
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new LicenseModal();
});

// 如果页面已经加载完成，直接初始化
if (document.readyState === 'complete') {
  new LicenseModal();
}
