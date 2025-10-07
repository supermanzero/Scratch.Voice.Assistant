// API集成测试脚本
// 用于验证Voice Assistant项目与Tutorial API的集成

const API_BASE_URL = 'http://47.79.88.53:3000';

// 测试API连接
async function testApiConnection() {
  try {
    console.log('测试API连接...');
    const response = await fetch(API_BASE_URL);
    const data = await response.json();
    
    console.log('✅ API连接成功');
    console.log('API信息:', data);
    return true;
  } catch (error) {
    console.error('❌ API连接失败:', error.message);
    return false;
  }
}

// 测试教程API
async function testTutorialsApi() {
  try {
    console.log('\n测试教程API...');
    const response = await fetch(`${API_BASE_URL}/api/tutorials`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 教程API测试成功');
      console.log('教程数量:', Object.keys(data.data || {}).length);
    } else {
      console.log('⚠️ 教程API返回错误:', data.error);
    }
    return data.success;
  } catch (error) {
    console.error('❌ 教程API测试失败:', error.message);
    return false;
  }
}

// 测试套餐API
async function testPackagesApi() {
  try {
    console.log('\n测试套餐API...');
    const response = await fetch(`${API_BASE_URL}/api/packages`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 套餐API测试成功');
      console.log('套餐数量:', Object.keys(data.data || {}).length);
    } else {
      console.log('⚠️ 套餐API返回错误:', data.error);
    }
    return data.success;
  } catch (error) {
    console.error('❌ 套餐API测试失败:', error.message);
    return false;
  }
}

// 测试授权API
async function testAuthApi() {
  try {
    console.log('\n测试授权API...');
    
    // 生成测试设备UUID
    const testDeviceUuid = 'test-device-' + Math.random().toString(36).substr(2, 9);
    
    // 测试检查授权状态
    const response = await fetch(`${API_BASE_URL}/api/auth/status/${testDeviceUuid}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 授权API测试成功');
      console.log('授权状态:', data.data);
    } else {
      console.log('⚠️ 授权API返回错误:', data.error);
    }
    return data.success;
  } catch (error) {
    console.error('❌ 授权API测试失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始API集成测试...\n');
  
  const results = {
    connection: await testApiConnection(),
    tutorials: await testTutorialsApi(),
    packages: await testPackagesApi(),
    auth: await testAuthApi()
  };
  
  console.log('\n📊 测试结果汇总:');
  console.log('API连接:', results.connection ? '✅ 成功' : '❌ 失败');
  console.log('教程API:', results.tutorials ? '✅ 成功' : '❌ 失败');
  console.log('套餐API:', results.packages ? '✅ 成功' : '❌ 失败');
  console.log('授权API:', results.auth ? '✅ 成功' : '❌ 失败');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 所有测试通过！API集成成功。');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查API服务状态。');
  }
  
  return allPassed;
}

// 检查fetch是否可用
if (typeof fetch === 'undefined') {
  console.error('❌ fetch不可用。请在支持fetch的环境中运行此测试（Node.js 18+或现代浏览器）');
  process.exit(1);
}

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testApiConnection,
    testTutorialsApi,
    testPackagesApi,
    testAuthApi,
    runAllTests
  };
} else {
  // 浏览器环境直接运行
  runAllTests();
}
