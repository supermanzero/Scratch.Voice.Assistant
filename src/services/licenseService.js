// 授权码服务
// 用于管理Chrome扩展的授权码验证

class LicenseService {
  constructor() {
    this.collectionName = 'licenses';
    this.storageKey = 'scratch_voice_assistant_license';
    this.deviceUuidKey = 'scratch_voice_assistant_device_uuid';
    this.deviceUuid = this.getOrGenerateDeviceUuid();
  }

  // 获取或生成设备UUID
  getOrGenerateDeviceUuid() {
    try {
      // 尝试从本地存储获取已存在的UUID
      let uuid = localStorage.getItem(this.deviceUuidKey);
      
      if (!uuid) {
        // 生成新的UUID
        uuid = this.generateUuid();
        
        // 保存到本地存储
        localStorage.setItem(this.deviceUuidKey, uuid);
        console.log('生成新的设备UUID:', uuid);
      } else {
        console.log('使用现有设备UUID:', uuid);
      }
      
      return uuid;
    } catch (error) {
      console.error('获取设备UUID失败:', error);
      // 如果localStorage不可用，生成临时UUID
      return this.generateUuid();
    }
  }

  // 生成UUID
  generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 获取设备UUID
  getDeviceUuid() {
    return this.deviceUuid;
  }

  // 使用Firebase REST API进行数据库操作
  async getFirestore() {
    // 返回一个模拟的Firestore对象，使用REST API
    return {
      collection: (collectionName) => ({
        doc: (docId) => ({
          get: () => this.getDocument(collectionName, docId),
          set: (data) => this.setDocument(collectionName, docId, data),
          update: (data) => this.updateDocument(collectionName, docId, data),
          delete: () => this.deleteDocument(collectionName, docId)
        })
      })
    };
  }

  // 获取文档
  async getDocument(collection, docId) {
    try {
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/scratch-21d62/databases/(default)/documents/${collection}/${docId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 404) {
        return { exists: false };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        exists: true,
        id: docId,
        data: () => this.convertFirestoreDocument(data)
      };
    } catch (error) {
      console.error('获取文档失败:', error);
      throw error;
    }
  }

  // 设置文档
  async setDocument(collection, docId, data) {
    try {
      const firestoreData = this.convertToFirestoreFormat(data);
      
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/scratch-21d62/databases/(default)/documents/${collection}/${docId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: firestoreData
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('设置文档失败:', error);
      throw error;
    }
  }

  // 更新文档
  async updateDocument(collection, docId, data) {
    return this.setDocument(collection, docId, data);
  }

  // 删除文档
  async deleteDocument(collection, docId) {
    try {
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/scratch-21d62/databases/(default)/documents/${collection}/${docId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('删除文档失败:', error);
      throw error;
    }
  }

  // 将JavaScript对象转换为Firestore格式
  convertToFirestoreFormat(data) {
    const result = {};
    
    for (const [key, value] of Object.entries(data)) {
      // 如果值已经是Firestore格式，直接使用
      if (value && typeof value === 'object' && 
          (value.stringValue !== undefined || 
           value.booleanValue !== undefined || 
           value.timestampValue !== undefined || 
           value.nullValue !== undefined ||
           value.doubleValue !== undefined)) {
        result[key] = value;
      } else if (value === null) {
        result[key] = { nullValue: null };
      } else if (typeof value === 'boolean') {
        result[key] = { booleanValue: value };
      } else if (typeof value === 'number') {
        result[key] = { doubleValue: value };
      } else if (typeof value === 'string') {
        result[key] = { stringValue: value };
      } else if (value instanceof Date) {
        result[key] = { timestampValue: value.toISOString() };
      } else if (value && value._methodName === 'serverTimestamp') {
        result[key] = { timestampValue: new Date().toISOString() };
      } else {
        result[key] = { stringValue: String(value) };
      }
    }
    
    return result;
  }

  // 将Firestore格式转换为JavaScript对象
  convertFirestoreDocument(firestoreDoc) {
    if (!firestoreDoc.fields) {
      return {};
    }

    const result = {};
    
    for (const [key, value] of Object.entries(firestoreDoc.fields)) {
      if (value.nullValue !== undefined) {
        result[key] = null;
      } else if (value.booleanValue !== undefined) {
        result[key] = value.booleanValue;
      } else if (value.doubleValue !== undefined) {
        result[key] = value.doubleValue;
      } else if (value.stringValue !== undefined) {
        result[key] = value.stringValue;
      } else if (value.timestampValue !== undefined) {
        result[key] = new Date(value.timestampValue);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  // 验证授权码（基于设备UUID绑定）
  async validateLicense(licenseCode) {
    try {
      console.log('开始验证授权码:', licenseCode);
      console.log('当前设备UUID:', this.deviceUuid);
      
      const db = await this.getFirestore();
      const licenseRef = db.collection(this.collectionName).doc(licenseCode);
      const doc = await licenseRef.get();
      
      if (!doc.exists) {
        console.log('授权码不存在:', licenseCode);
        return {
          success: false,
          message: '授权码不存在',
          code: 'LICENSE_NOT_FOUND'
        };
      }
      
      const licenseData = doc.data();
      console.log('授权码数据:', licenseData);
      
      // 检查授权码是否已绑定设备
      if (licenseData.boundDevice) {
        console.log('授权码已绑定设备:', licenseData.boundDevice);
        
        // 检查是否绑定到当前设备
        if (licenseData.boundDevice === this.deviceUuid) {
          console.log('授权码已绑定到当前设备，验证通过');
          
          // 保存授权信息到本地存储
          this.saveLicenseInfo(licenseCode, licenseData);
          
          return {
            success: true,
            message: '授权验证通过',
            code: 'LICENSE_VALID',
            licenseCode: licenseCode,
            deviceUuid: this.deviceUuid,
            boundDevice: licenseData.boundDevice
          };
        } else {
          console.log('授权码已绑定到其他设备，拒绝访问');
          return {
            success: false,
            message: '授权码已被其他设备使用',
            code: 'LICENSE_BOUND_TO_OTHER_DEVICE',
            boundDevice: licenseData.boundDevice,
            currentDevice: this.deviceUuid
          };
        }
      } else {
        // 授权码未绑定，绑定到当前设备
        console.log('授权码未绑定，绑定到当前设备:', this.deviceUuid);
        
        await licenseRef.update({
          boundDevice: { stringValue: this.deviceUuid },
          boundAt: { timestampValue: new Date().toISOString() },
          active: { booleanValue: true }
        });
        
        // 保存授权信息到本地存储
        const updatedLicenseData = {
          ...licenseData,
          boundDevice: { stringValue: this.deviceUuid },
          boundAt: { timestampValue: new Date().toISOString() },
          active: { booleanValue: true }
        };
        
        this.saveLicenseInfo(licenseCode, updatedLicenseData);
        
        return {
          success: true,
          message: '授权码绑定成功',
          code: 'LICENSE_BOUND',
          licenseCode: licenseCode,
          deviceUuid: this.deviceUuid
        };
      }
    } catch (error) {
      console.error('验证授权码失败:', error);
      return {
        success: false,
        message: '验证授权码时发生错误: ' + error.message,
        code: 'VALIDATION_ERROR'
      };
    }
  }

  // 保存授权信息到本地存储
  saveLicenseInfo(licenseCode, licenseData) {
    // 从Firestore格式中提取实际值
    const extractValue = (field) => {
      if (!field) return null;
      if (typeof field === 'object') {
        if (field.stringValue !== undefined) return field.stringValue;
        if (field.booleanValue !== undefined) return field.booleanValue;
        if (field.timestampValue !== undefined) return field.timestampValue;
        if (field.nullValue !== undefined) return null;
      }
      return field;
    };

    const licenseInfo = {
      licenseCode: licenseCode,
      deviceUuid: this.deviceUuid,
      boundDevice: extractValue(licenseData.boundDevice),
      boundAt: extractValue(licenseData.boundAt),
      active: extractValue(licenseData.active),
      createdAt: extractValue(licenseData.createdAt),
      validatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(this.storageKey, JSON.stringify(licenseInfo));
    console.log('授权信息已保存到本地存储:', licenseInfo);
  }

  // 检查本地授权状态
  checkLocalLicense() {
    try {
      const licenseInfo = localStorage.getItem(this.storageKey);
      if (!licenseInfo) {
        return {
          hasLicense: false,
          message: '未找到本地授权信息'
        };
      }
      
      const parsed = JSON.parse(licenseInfo);
      
      // 检查设备UUID是否匹配
      if (parsed.deviceUuid !== this.deviceUuid) {
        console.log('设备UUID不匹配，清除本地授权信息');
        console.log('期望UUID:', parsed.deviceUuid);
        console.log('当前UUID:', this.deviceUuid);
        localStorage.removeItem(this.storageKey);
        return {
          hasLicense: false,
          message: '设备UUID不匹配，需要重新验证'
        };
      }
      
      return {
        hasLicense: true,
        licenseCode: parsed.licenseCode,
        deviceUuid: parsed.deviceUuid,
        boundDevice: parsed.boundDevice,
        boundAt: parsed.boundAt,
        active: parsed.active,
        createdAt: parsed.createdAt,
        validatedAt: parsed.validatedAt
      };
    } catch (error) {
      console.error('检查本地授权状态失败:', error);
      return {
        hasLicense: false,
        message: '检查本地授权状态时发生错误'
      };
    }
  }

  // 清除本地授权信息
  clearLocalLicense() {
    localStorage.removeItem(this.storageKey);
    console.log('本地授权信息已清除');
  }


  // 检查授权状态（智能检查：优先使用本地状态）
  async checkLicenseStatus(forceCloudCheck = false) {
    try {
      console.log('开始检查授权状态...');
      
      // 首先检查本地授权状态
      const localStatus = this.checkLocalLicense();
      console.log('本地授权状态:', localStatus);
      
      if (!localStatus.hasLicense) {
        console.log('本地无授权信息，需要验证');
        return {
          isAuthorized: false,
          message: localStatus.message,
          needsValidation: true
        };
      }
      
      // 检查本地授权是否过期（超过7天需要重新验证）
      const shouldVerifyCloud = this.shouldVerifyWithCloud(localStatus, forceCloudCheck);
      
      if (!shouldVerifyCloud) {
        console.log('使用本地授权状态（未过期）');
        return {
          isAuthorized: true,
          licenseCode: localStatus.licenseCode,
          validatedAt: localStatus.validatedAt,
          localOnly: true,
          message: '使用本地授权状态'
        };
      }
      
      // 需要验证云端状态
      try {
        console.log('验证云端授权状态...');
        const db = await this.getFirestore();
        const licenseRef = db.collection(this.collectionName).doc(localStatus.licenseCode);
        const doc = await licenseRef.get();
        
        if (!doc.exists) {
          console.log('云端授权码不存在，清除本地信息');
          this.clearLocalLicense();
          return {
            isAuthorized: false,
            message: '授权码已失效',
            needsValidation: true
          };
        }
        
        const licenseData = doc.data();
        console.log('云端授权数据:', licenseData);
        
        // 检查云端状态
        if (!licenseData.active) {
          console.log('云端授权码未激活，清除本地信息');
          this.clearLocalLicense();
          return {
            isAuthorized: false,
            message: '授权码未激活，需要重新验证',
            needsValidation: true
          };
        }
        
        // 检查设备绑定
        if (licenseData.boundDevice !== this.deviceUuid) {
          console.log('设备UUID不匹配，清除本地信息');
          console.log('期望UUID:', licenseData.boundDevice);
          console.log('当前UUID:', this.deviceUuid);
          this.clearLocalLicense();
          return {
            isAuthorized: false,
            message: '授权码已绑定到其他设备',
            needsValidation: true,
            boundDevice: licenseData.boundDevice,
            currentDevice: this.deviceUuid
          };
        }
        
        // 云端验证通过，更新本地状态
        this.saveLicenseInfo(localStatus.licenseCode, licenseData);
        
        console.log('授权验证通过');
        return {
          isAuthorized: true,
          licenseCode: localStatus.licenseCode,
          validatedAt: new Date().toISOString(),
          cloudVerified: true,
          message: '云端验证通过'
        };
        
      } catch (error) {
        console.error('验证云端授权状态失败:', error);
        // 网络错误时，使用本地状态
        console.log('网络错误，使用本地授权状态');
        return {
          isAuthorized: true,
          licenseCode: localStatus.licenseCode,
          validatedAt: localStatus.validatedAt,
          offline: true,
          message: '使用本地授权状态（网络连接异常）'
        };
      }
    } catch (error) {
      console.error('检查授权状态失败:', error);
      return {
        isAuthorized: false,
        message: '检查授权状态时发生错误',
        needsValidation: true
      };
    }
  }

  // 判断是否需要验证云端状态
  shouldVerifyWithCloud(localStatus, forceCloudCheck = false) {
    if (forceCloudCheck) {
      console.log('强制云端验证');
      return true;
    }
    
    if (!localStatus.validatedAt) {
      console.log('本地状态缺少验证时间，需要云端验证');
      return true;
    }
    
    // 检查是否超过7天未验证
    const lastValidated = new Date(localStatus.validatedAt);
    const now = new Date();
    const daysSinceValidation = (now - lastValidated) / (1000 * 60 * 60 * 24);
    
    if (daysSinceValidation > 7) {
      console.log(`本地授权已过期（${Math.round(daysSinceValidation)}天），需要云端验证`);
      return true;
    }
    
    console.log(`本地授权有效（${Math.round(daysSinceValidation)}天前验证），跳过云端验证`);
    return false;
  }

  // 强制刷新授权状态（忽略本地缓存）
  async refreshLicenseStatus() {
    console.log('强制刷新授权状态...');
    return await this.checkLicenseStatus(true);
  }

  // 获取本地授权信息（不进行云端验证）
  getLocalLicenseInfo() {
    return this.checkLocalLicense();
  }

  // 清除授权码绑定（允许在其他设备重新使用）
  async clearLicense(licenseCode) {
    try {
      console.log('清除授权码绑定:', licenseCode);
      
      const db = await this.getFirestore();
      const licenseRef = db.collection(this.collectionName).doc(licenseCode);
      
      await licenseRef.update({
        boundDevice: { nullValue: null },
        boundAt: { nullValue: null },
        active: { booleanValue: false },
        clearedAt: { timestampValue: new Date().toISOString() }
      });
      
      // 同时清除本地授权信息
      this.clearLocalLicense();
      
      console.log('授权码绑定已清除，可以在其他设备重新使用');
      return {
        success: true,
        message: '授权码绑定已清除，可以在其他设备重新使用'
      };
    } catch (error) {
      console.error('清除授权码绑定失败:', error);
      return {
        success: false,
        message: '清除授权码绑定失败: ' + error.message
      };
    }
  }
}

// 创建全局实例
const licenseService = new LicenseService();

// 导出服务
if (typeof module !== 'undefined' && module.exports) {
  module.exports = licenseService;
} else {
  window.licenseService = licenseService;
}
