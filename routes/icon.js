const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ICON_CACHE_DIR = path.join(__dirname, '../public/icons/cache');
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const CDN_PROVIDERS = [
  (domain) => `https://api.xinac.net/icon/?url=https://${domain}&sz=128`,
  (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  (domain) => `https://icon.horse/icon/${domain}`,
  (domain) => `https://api.afmax.cn/so/ico/index.php?r=https://${domain}&sz=128`,
  (domain) => `https://favicon.im/${domain}?larger=true`,
];

if (!fs.existsSync(ICON_CACHE_DIR)) {
  fs.mkdirSync(ICON_CACHE_DIR, { recursive: true });
}

const pendingRequests = new Map();

router.get('/', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  let domain;
  try {
    domain = new URL(url).hostname;
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const hash = crypto.createHash('md5').update(domain).digest('hex');
  const cachePath = path.join(ICON_CACHE_DIR, `${hash}.png`);

  try {
    if (fs.existsSync(cachePath)) {
      const stat = fs.statSync(cachePath);
      if (Date.now() - stat.mtimeMs < CACHE_MAX_AGE) {
        res.set('Cache-Control', 'public, max-age=604800');
        res.set('Content-Type', 'image/png');
        return res.sendFile(cachePath);
      }
    }
  } catch (e) {}

  if (pendingRequests.has(domain)) {
    const pending = pendingRequests.get(domain);
    pending.push(res);
    return;
  }

  pendingRequests.set(domain, []);

  let iconBuffer = null;
  let contentType = 'image/png';

  for (let i = 0; i < CDN_PROVIDERS.length; i++) {
    try {
      const cdnUrl = CDN_PROVIDERS[i](domain);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(cdnUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeout);

      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        
        if (buffer.length > 100) {
          iconBuffer = buffer;
          contentType = response.headers.get('content-type') || 'image/png';
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }

  const waitingResponses = pendingRequests.get(domain) || [];
  pendingRequests.delete(domain);

  if (iconBuffer) {
    try {
      fs.writeFileSync(cachePath, iconBuffer);
    } catch (e) {
      console.error('Failed to cache icon:', e.message);
    }

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=604800');
    res.send(iconBuffer);

    waitingResponses.forEach(waitingRes => {
      try {
        waitingRes.set('Content-Type', contentType);
        waitingRes.set('Cache-Control', 'public, max-age=604800');
        waitingRes.send(iconBuffer);
      } catch (e) {}
    });
  } else {
    const defaultIconPath = path.join(__dirname, '../public/icons/common/default-favicon.png');
    
    if (fs.existsSync(defaultIconPath)) {
      res.set('Cache-Control', 'public, max-age=86400');
      res.sendFile(defaultIconPath);
      
      waitingResponses.forEach(waitingRes => {
        try {
          waitingRes.set('Cache-Control', 'public, max-age=86400');
          waitingRes.sendFile(defaultIconPath);
        } catch (e) {}
      });
    } else {
      res.status(404).json({ error: 'Icon not found' });
      waitingResponses.forEach(waitingRes => {
        try {
          waitingRes.status(404).json({ error: 'Icon not found' });
        } catch (e) {}
      });
    }
  }
});

router.delete('/cache', (req, res) => {
  try {
    const files = fs.readdirSync(ICON_CACHE_DIR);
    let deleted = 0;
    
    files.forEach(file => {
      try {
        fs.unlinkSync(path.join(ICON_CACHE_DIR, file));
        deleted++;
      } catch (e) {}
    });
    
    res.json({ success: true, deleted });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    const files = fs.readdirSync(ICON_CACHE_DIR);
    let totalSize = 0;
    
    files.forEach(file => {
      try {
        const stat = fs.statSync(path.join(ICON_CACHE_DIR, file));
        totalSize += stat.size;
      } catch (e) {}
    });
    
    res.json({
      cachedIcons: files.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
