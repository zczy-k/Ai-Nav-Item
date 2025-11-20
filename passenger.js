// Passenger 启动文件 - 用于 Serv00 等使用 Phusion Passenger 的平台
// 加载环境变量
require('dotenv').config();

// 导入 app（数据库初始化在 app.js 中已经处理）
const app = require('./app');

// 导出 app 供 Passenger 使用
// Passenger 会自动管理端口和监听
module.exports = app;
