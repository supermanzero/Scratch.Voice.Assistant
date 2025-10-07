// API服务 - 统一的API调用服务
// 替代直接的Firebase调用，通过Tutorial API进行代理

class ApiService {
  constructor() {
    this.baseUrl = 'http://47.79.88.53:3000';
    this.apiEndpoints = {
      // 教程相关接口
      tutorials: '/api/tutorials',
      tutorialsSync: '/api/tutorials/sync',
      
      // 授权相关接口
      authValidate: '/api/auth/validate',
      authStatus: '/api/auth/status',
      authClear: '/api/auth/clear',
      authDevice: '/api/auth/device',
      
      // Firebase代理接口
      firestoreGet: '/api/auth/firestore',
      firestorePatch: '/api/auth/firestore',
      firestoreDelete: '/api/auth/firestore'
    };
  }

  // 通用HTTP请求方法
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  // GET请求
  async get(endpoint, params = {}) {
    const url = new URL(this.baseUrl + endpoint);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    return this.request(url.toString(), {
      method: 'GET'
    });
  }

  // POST请求
  async post(endpoint, data = {}) {
    return this.request(this.baseUrl + endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PATCH请求
  async patch(endpoint, data = {}) {
    return this.request(this.baseUrl + endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // DELETE请求
  async delete(endpoint, data = {}) {
    return this.request(this.baseUrl + endpoint, {
      method: 'DELETE',
      body: JSON.stringify(data)
    });
  }

  // 教程相关API方法

  // 获取所有教程
  async getTutorials() {
    try {
      console.log('从API获取教程数据...');
      const response = await this.get(this.apiEndpoints.tutorials);
      
      if (response.success && response.data) {
        console.log('从API获取教程数据成功:', response.data);
        return response.data;
      } else {
        throw new Error(response.error || '获取教程数据失败');
      }
    } catch (error) {
      console.error('从API获取教程数据失败:', error);
      // 返回默认教程数据作为回退
      return this.getDefaultTutorials();
    }
  }

  // 同步教程数据
  async syncTutorials(tutorials) {
    try {
      console.log('同步教程数据到API...');
      const response = await this.post(this.apiEndpoints.tutorialsSync, {
        tutorials: tutorials
      });
      
      if (response.success) {
        console.log('教程数据同步成功');
        return response.data;
      } else {
        throw new Error(response.error || '同步教程数据失败');
      }
    } catch (error) {
      console.error('同步教程数据失败:', error);
      throw error;
    }
  }

  // 授权相关API方法

  // 验证授权码
  async validateLicense(licenseCode, deviceUuid) {
    try {
      console.log('通过API验证授权码:', licenseCode);
      const response = await this.post(this.apiEndpoints.authValidate, {
        licenseCode: licenseCode,
        deviceUuid: deviceUuid
      });
      
      return {
        success: response.success,
        message: response.message,
        code: response.data?.code,
        licenseCode: response.data?.licenseCode,
        deviceUuid: response.data?.deviceUuid,
        boundDevice: response.data?.boundDevice
      };
    } catch (error) {
      console.error('API验证授权码失败:', error);
      return {
        success: false,
        message: '验证授权码时发生错误: ' + error.message,
        code: 'VALIDATION_ERROR'
      };
    }
  }

  // 检查授权状态
  async checkLicenseStatus(deviceUuid) {
    try {
      console.log('通过API检查授权状态:', deviceUuid);
      const response = await this.get(`${this.apiEndpoints.authStatus}/${deviceUuid}`);
      
      if (response.success && response.data) {
        return {
          isAuthorized: response.data.isAuthorized,
          needsValidation: response.data.needsValidation,
          licenseCode: response.data.licenseCode,
          boundAt: response.data.boundAt,
          message: response.data.message
        };
      } else {
        throw new Error(response.error || '检查授权状态失败');
      }
    } catch (error) {
      console.error('API检查授权状态失败:', error);
      return {
        isAuthorized: false,
        message: '检查授权状态时发生错误: ' + error.message,
        needsValidation: true
      };
    }
  }

  // 清除授权
  async clearLicense(licenseCode, deviceUuid) {
    try {
      console.log('通过API清除授权:', licenseCode);
      const response = await this.delete(this.apiEndpoints.authClear, {
        licenseCode: licenseCode,
        deviceUuid: deviceUuid
      });
      
      return {
        success: response.success,
        message: response.message
      };
    } catch (error) {
      console.error('API清除授权失败:', error);
      return {
        success: false,
        message: '清除授权时发生错误: ' + error.message
      };
    }
  }

  // 获取设备信息
  async getDeviceInfo(deviceUuid) {
    try {
      console.log('通过API获取设备信息:', deviceUuid);
      const response = await this.get(`${this.apiEndpoints.authDevice}/${deviceUuid}`);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || '获取设备信息失败');
      }
    } catch (error) {
      console.error('API获取设备信息失败:', error);
      throw error;
    }
  }

  // Firebase代理API方法

  // 获取Firestore文档
  async getFirestoreDocument(collection, docId) {
    try {
      console.log(`通过API获取Firestore文档: ${collection}/${docId}`);
      const response = await this.get(`${this.apiEndpoints.firestoreGet}/${collection}/${docId}`);
      
      return {
        exists: response.exists,
        id: docId,
        data: () => response.data || {}
      };
    } catch (error) {
      console.error('API获取Firestore文档失败:', error);
      if (error.message.includes('404')) {
        return { exists: false };
      }
      throw error;
    }
  }

  // 设置Firestore文档
  async setFirestoreDocument(collection, docId, data) {
    try {
      console.log(`通过API设置Firestore文档: ${collection}/${docId}`);
      const response = await this.patch(`${this.apiEndpoints.firestorePatch}/${collection}/${docId}`, {
        fields: data
      });
      
      return response;
    } catch (error) {
      console.error('API设置Firestore文档失败:', error);
      throw error;
    }
  }

  // 删除Firestore文档
  async deleteFirestoreDocument(collection, docId) {
    try {
      console.log(`通过API删除Firestore文档: ${collection}/${docId}`);
      const response = await this.delete(`${this.apiEndpoints.firestoreDelete}/${collection}/${docId}`);
      
      return response.success;
    } catch (error) {
      console.error('API删除Firestore文档失败:', error);
      throw error;
    }
  }

  // 模拟Firestore接口，提供与原Firebase SDK兼容的接口
  getFirestore() {
    return {
      collection: (collectionName) => ({
        doc: (docId) => ({
          get: () => this.getFirestoreDocument(collectionName, docId),
          set: (data) => this.setFirestoreDocument(collectionName, docId, data),
          update: (data) => this.setFirestoreDocument(collectionName, docId, data),
          delete: () => this.deleteFirestoreDocument(collectionName, docId)
        })
      })
    };
  }

  // 默认教程数据（作为回退）
  getDefaultTutorials() {
    return {
      motion: {
        id: 'motion',
        title: '运动积木教程',
        category: 'motion',
        difficulty: 'beginner',
        duration: '5分钟',
        description: '学习如何使用运动积木让角色移动',
        steps: [
          {
            id: 'motion_1',
            text: '欢迎学习 Scratch 运动积木！运动积木可以让你的角色在舞台上移动。',
            action: 'intro',
            highlight: null
          },
          {
            id: 'motion_2', 
            text: '首先，在积木面板左侧找到蓝色的"运动"分类，点击它。',
            action: 'find-motion-category',
            highlight: '.blocklyTreeRow[data-id="motion"]'
          },
          {
            id: 'motion_3',
            text: '找到"移动10步"积木，用鼠标拖拽它到右侧的脚本区域。',
            action: 'drag-move-block',
            highlight: '[data-id="motion_movesteps"]'
          },
          {
            id: 'motion_4',
            text: '点击这个积木试试看，你的角色应该会向右移动10步。',
            action: 'test-move-block',
            highlight: '.blocklyDraggable[data-id*="motion_movesteps"]'
          },
          {
            id: 'motion_5',
            text: '很好！现在双击积木中的数字"10"，把它改成"50"，看看有什么变化。',
            action: 'modify-steps',
            highlight: '.blocklyEditableText'
          }
        ]
      },
      
      looks: {
        id: 'looks',
        title: '外观积木教程',
        category: 'looks', 
        difficulty: 'beginner',
        duration: '4分钟',
        description: '学习如何使用外观积木改变角色的外观',
        steps: [
          {
            id: 'looks_1',
            text: '现在学习外观积木！外观积木可以改变角色的样子和说话。',
            action: 'intro',
            highlight: null
          },
          {
            id: 'looks_2',
            text: '在积木面板中找到紫色的"外观"分类，点击它。',
            action: 'find-looks-category', 
            highlight: '.blocklyTreeRow[data-id="looks"]'
          },
          {
            id: 'looks_3',
            text: '找到"说 Hello! 持续2秒"积木，拖拽到脚本区域。',
            action: 'drag-say-block',
            highlight: '[data-id="looks_sayforsecs"]'
          },
          {
            id: 'looks_4',
            text: '点击这个积木，你的角色会说话并显示一个对话框！',
            action: 'test-say-block',
            highlight: '.blocklyDraggable[data-id*="looks_sayforsecs"]'
          },
          {
            id: 'looks_5',
            text: '试着修改对话内容，双击"Hello!"文字，输入你想说的话。',
            action: 'modify-text',
            highlight: '.blocklyEditableText'
          }
        ]
      },
      
      events: {
        id: 'events',
        title: '事件积木教程',
        category: 'events',
        difficulty: 'beginner', 
        duration: '6分钟',
        description: '学习如何使用事件积木让程序响应用户操作',
        steps: [
          {
            id: 'events_1',
            text: '事件积木非常重要！它们告诉程序什么时候开始运行。',
            action: 'intro',
            highlight: null
          },
          {
            id: 'events_2',
            text: '找到橙色的"事件"分类，这里有各种启动程序的方式。',
            action: 'find-events-category',
            highlight: '.blocklyTreeRow[data-id="event"]'
          },
          {
            id: 'events_3', 
            text: '拖拽"当点击绿旗时"积木到脚本区域，这是最常用的启动方式。',
            action: 'drag-flag-block',
            highlight: '[data-id="event_whenflagclicked"]'
          },
          {
            id: 'events_4',
            text: '现在把之前的运动积木连接到这个事件积木下面。',
            action: 'connect-blocks',
            highlight: '.blocklyDraggable'
          },
          {
            id: 'events_5',
            text: '点击舞台上方的绿色旗子，看看程序是否运行了！',
            action: 'test-flag',
            highlight: '.green-flag'
          }
        ]
      }
    };
  }
}

// 创建全局实例
const apiService = new ApiService();

// 导出服务
if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiService;
} else {
  window.apiService = apiService;
}
