const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 导入主应用
const app = require('./app');

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const ENABLE_HTTPS = process.env.ENABLE_HTTPS === 'true';
const CERT_DIR = path.join(__dirname, 'certs');
const CERT_FILE = path.join(CERT_DIR, 'server.crt');
const KEY_FILE = path.join(CERT_DIR, 'server.key');

// 生成自签名证书
function generateSelfSignedCert() {
  console.log('🔒 生成自签名 SSL 证书...');
  
  // 创建证书目录
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }

  try {
    // 生成私钥和证书
    execSync(`openssl req -x509 -newkey rsa:4096 -keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 365 -nodes -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"`, {
      stdio: 'inherit'
    });
    
    console.log('✓ 自签名证书生成成功');
    console.log(`  证书文件: ${CERT_FILE}`);
    console.log(`  私钥文件: ${KEY_FILE}`);
    console.log('');
    console.log('⚠️  提示：自签名证书在浏览器中会显示"不安全"警告');
    console.log('   点击"高级"→"继续访问"即可使用');
    console.log('   如需使用受信任的证书，请替换 certs/ 目录下的文件\n');
    
    return true;
  } catch (error) {
    console.error('✗ 生成证书失败:', error.message);
    console.error('  请确保已安装 OpenSSL');
    return false;
  }
}

// 检查证书是否存在
function checkCertificates() {
  if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
    console.log('📋 未找到 SSL 证书，将生成新的自签名证书\n');
    return generateSelfSignedCert();
  }
  
  console.log('✓ 找到现有 SSL 证书');
  console.log(`  证书文件: ${CERT_FILE}`);
  console.log(`  私钥文件: ${KEY_FILE}\n`);
  return true;
}

// 启动服务器
function startServers() {
  // 始终启动 HTTP 服务器
  http.createServer(app).listen(PORT, () => {
    console.log(`🌐 HTTP 服务器运行在: http://localhost:${PORT}`);
  });

  // 如果启用 HTTPS，启动 HTTPS 服务器
  if (ENABLE_HTTPS) {
    if (checkCertificates()) {
      try {
        const httpsOptions = {
          key: fs.readFileSync(KEY_FILE),
          cert: fs.readFileSync(CERT_FILE)
        };

        https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
          console.log(`🔒 HTTPS 服务器运行在: https://localhost:${HTTPS_PORT}`);
          console.log('');
          console.log('💡 访问提示:');
          console.log(`   HTTP:  http://localhost:${PORT}`);
          console.log(`   HTTPS: https://localhost:${HTTPS_PORT} (可能显示证书警告)\n`);
        });
      } catch (error) {
        console.error('✗ HTTPS 服务器启动失败:', error.message);
        console.log('   将仅使用 HTTP 模式\n');
      }
    } else {
      console.log('⚠️  证书检查失败，仅启动 HTTP 服务器\n');
    }
  } else {
    console.log('');
    console.log('💡 提示: 如需启用 HTTPS，请设置环境变量:');
    console.log('   ENABLE_HTTPS=true\n');
  }
}

// 主流程
console.log('='.repeat(60));
console.log('Con-Nav-Item 服务器启动');
console.log('='.repeat(60));
console.log('');

startServers();
