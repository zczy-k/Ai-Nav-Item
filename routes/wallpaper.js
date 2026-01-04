const express = require('express');
const path = require('path');
const fs = require('fs');
const { wallpaperLimiter } = require('../middleware/security');
const router = express.Router();

// 内置背景图片列表（存放在 public/backgrounds/ 目录）
// 这些是本地文件，不依赖外部网络
const BUILTIN_BACKGROUNDS = [
  { id: 1, name: '默认', file: 'background.webp' },
  { id: 2, name: '山峦', file: 'bg-mountain.webp' },
  { id: 3, name: '海洋', file: 'bg-ocean.webp' },
  { id: 4, name: '森林', file: 'bg-forest.webp' },
  { id: 5, name: '星空', file: 'bg-stars.webp' },
  { id: 6, name: '城市', file: 'bg-city.webp' },
  { id: 7, name: '日落', file: 'bg-sunset.webp' },
  { id: 8, name: '极光', file: 'bg-aurora.webp' }
];

// 在线壁纸源（作为可选增强，网络可用时使用）
const ONLINE_SOURCES = [
  // picsum.photos 精选风景图片ID
  10, 11, 15, 16, 17, 18, 19, 20, 22, 24, 27, 28, 29, 37, 39, 40, 41, 42, 47, 48,
  49, 50, 53, 54, 55, 56, 57, 58, 59, 60, 62, 63, 64, 66, 67, 68, 69, 71, 73, 74,
  76, 77, 78, 79, 82, 83, 84, 85, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98
];

// 记录最近使用的图片，避免连续重复
let recentIds = [];
const MAX_RECENT = 10;

// 获取内置背景列表
router.get('/builtin', (req, res) => {
  // 检查哪些内置背景文件实际存在
  const staticDir = fs.existsSync(path.join(__dirname, '../web/dist/backgrounds'))
    ? path.join(__dirname, '../web/dist/backgrounds')
    : path.join(__dirname, '../public/backgrounds');
  
  const availableBackgrounds = BUILTIN_BACKGROUNDS.filter(bg => {
    const filePath = path.join(staticDir, bg.file);
    return fs.existsSync(filePath);
  }).map(bg => ({
    id: bg.id,
    name: bg.name,
    url: `/backgrounds/${bg.file}`
  }));
  
  // 如果没有找到任何背景文件，返回默认背景
  if (availableBackgrounds.length === 0) {
    availableBackgrounds.push({
      id: 1,
      name: '默认',
      url: '/background.webp'
    });
  }
  
  res.json({
    success: true,
    backgrounds: availableBackgrounds
  });
});

// 获取随机壁纸（支持本地和在线两种模式）
router.get('/random', wallpaperLimiter, (req, res) => {
  const source = req.query.source || 'auto'; // auto | local | online
  
  // 本地模式：只使用内置背景
  if (source === 'local') {
    return getLocalBackground(res);
  }
  
  // 在线模式：只使用在线壁纸
  if (source === 'online') {
    return getOnlineBackground(res);
  }
  
  // 自动模式：优先在线，失败时降级到本地
  getOnlineBackground(res, true);
});

// 获取本地背景
function getLocalBackground(res) {
  const staticDir = fs.existsSync(path.join(__dirname, '../web/dist/backgrounds'))
    ? path.join(__dirname, '../web/dist/backgrounds')
    : path.join(__dirname, '../public/backgrounds');
  
  // 过滤出实际存在的背景文件
  const availableBackgrounds = BUILTIN_BACKGROUNDS.filter(bg => {
    const filePath = path.join(staticDir, bg.file);
    return fs.existsSync(filePath);
  });
  
  if (availableBackgrounds.length === 0) {
    // 没有背景文件，返回默认
    return res.json({
      success: true,
      source: 'local',
      url: '/background.webp',
      name: '默认'
    });
  }
  
  // 过滤掉最近使用过的
  let available = availableBackgrounds.filter(bg => !recentIds.includes(`local_${bg.id}`));
  if (available.length === 0) {
    recentIds = [];
    available = availableBackgrounds;
  }
  
  // 随机选择
  const selected = available[Math.floor(Math.random() * available.length)];
  
  // 记录使用
  recentIds.push(`local_${selected.id}`);
  if (recentIds.length > MAX_RECENT) recentIds.shift();
  
  res.json({
    success: true,
    source: 'local',
    url: `/backgrounds/${selected.file}`,
    name: selected.name
  });
}

// 获取在线背景
function getOnlineBackground(res, fallbackToLocal = false) {
  try {
    // 过滤掉最近使用过的
    let available = ONLINE_SOURCES.filter(id => !recentIds.includes(`online_${id}`));
    if (available.length < 5) {
      recentIds = recentIds.filter(id => !id.startsWith('online_'));
      available = ONLINE_SOURCES;
    }
    
    // 随机选择
    const selectedId = available[Math.floor(Math.random() * available.length)];
    
    // 记录使用
    recentIds.push(`online_${selectedId}`);
    if (recentIds.length > MAX_RECENT) recentIds.shift();
    
    const timestamp = Date.now();
    const wallpaperUrl = `https://picsum.photos/id/${selectedId}/1920/1080?_t=${timestamp}`;
    
    res.json({
      success: true,
      source: 'online',
      url: wallpaperUrl,
      id: selectedId
    });
  } catch (error) {
    if (fallbackToLocal) {
      return getLocalBackground(res);
    }
    res.status(500).json({
      success: false,
      error: '获取在线壁纸失败'
    });
  }
}

module.exports = router;
