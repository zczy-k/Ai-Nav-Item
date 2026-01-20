/**
 * Server-Sent Events 管理器
 * 用于向所有连接的客户端推送数据版本变更通知
 */

// 存储所有SSE连接
const clients = new Set();

/**
 * 添加SSE客户端连接
 */
function addClient(res) {
  clients.add(res);
  
  // 客户端断开时移除
  res.on('close', () => {
    clients.delete(res);
  });
}

/**
 * 向所有客户端广播数据版本变更
 * @param {number} version 新数据版本号
 * @param {string} clientId 发起变更的客户端ID (可选)
 * @param {Object} payload 附加数据 (可选，例如 { type: 'menu_updated' })
 */
function broadcastVersionChange(version, clientId = null, payload = null) {
  const messageData = { 
    type: 'version_change', 
    version,
    senderId: clientId
  };
  
  if (payload) {
    Object.assign(messageData, payload);
  }

  const message = JSON.stringify(messageData);
  const data = `data: ${message}\n\n`;
  
  clients.forEach(client => {
    try {
      client.write(data);
      // 确保数据立即发送，不被缓冲
      if (client.flush) client.flush();
    } catch (e) {
      // 写入失败，移除该客户端
      clients.delete(client);
    }
  });
}

/**
 * 获取当前连接数
 */
function getClientCount() {
  return clients.size;
}

module.exports = {
  addClient,
  broadcastVersionChange,
  getClientCount
};
