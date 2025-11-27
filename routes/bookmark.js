const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('./authMiddleware');

// 获取书签列表（支持分页、搜索、文件夹筛选）
router.get('/', (req, res) => {
  const { page = 1, pageSize = 50, folder, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  let query = `SELECT * FROM cards WHERE type = 'bookmark'`;
  let countQuery = `SELECT COUNT(*) as total FROM cards WHERE type = 'bookmark'`;
  const params = [];
  const countParams = [];
  
  if (folder) {
    query += ` AND folder = ?`;
    countQuery += ` AND folder = ?`;
    params.push(folder);
    countParams.push(folder);
  }
  
  if (search) {
    query += ` AND (title LIKE ? OR url LIKE ? OR desc LIKE ?)`;
    countQuery += ` AND (title LIKE ? OR url LIKE ? OR desc LIKE ?)`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
    countParams.push(searchPattern, searchPattern, searchPattern);
  }
  
  query += ` ORDER BY "order" DESC, id DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(pageSize), offset);
  
  db.get(countQuery, countParams, (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        data: rows,
        total: countResult.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    });
  });
});

// 获取书签文件夹列表
router.get('/folders', (req, res) => {
  db.all(
    `SELECT DISTINCT folder FROM cards WHERE type = 'bookmark' AND folder IS NOT NULL ORDER BY folder`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => r.folder));
    }
  );
});

// 获取书签总数（用于首页显示）
router.get('/count', (req, res) => {
  db.get(`SELECT COUNT(*) as count FROM cards WHERE type = 'bookmark'`, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ count: row.count });
  });
});

// 搜索书签（用于首页搜索匹配）
router.get('/search', (req, res) => {
  const { q, limit = 5 } = req.query;
  if (!q) return res.json([]);
  
  const searchPattern = `%${q}%`;
  db.all(
    `SELECT id, title, url, logo_url, folder FROM cards 
     WHERE type = 'bookmark' AND (title LIKE ? OR url LIKE ?)
     ORDER BY "order" DESC LIMIT ?`,
    [searchPattern, searchPattern, parseInt(limit)],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 从浏览器导入书签（批量）
router.post('/import', auth, async (req, res) => {
  const { bookmarks } = req.body;
  
  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    return res.status(400).json({ error: '请提供书签数据' });
  }
  
  // 限制单次导入数量
  if (bookmarks.length > 500) {
    return res.status(400).json({ error: '单次最多导入500个书签' });
  }
  
  try {
    // 获取现有书签URL用于去重
    const existingUrls = await new Promise((resolve, reject) => {
      db.all(`SELECT url FROM cards WHERE type = 'bookmark'`, (err, rows) => {
        if (err) reject(err);
        else resolve(new Set(rows.map(r => r.url)));
      });
    });
    
    let imported = 0;
    let skipped = 0;
    const errors = [];
    
    for (const bookmark of bookmarks) {
      if (!bookmark.url || !bookmark.title) {
        skipped++;
        continue;
      }
      
      // 去重检查
      if (existingUrls.has(bookmark.url)) {
        skipped++;
        continue;
      }
      
      // 生成favicon URL
      let logoUrl = bookmark.favicon || null;
      if (!logoUrl) {
        try {
          const urlObj = new URL(bookmark.url);
          logoUrl = `https://api.xinac.net/icon/?url=${urlObj.origin}&sz=128`;
        } catch (e) {
          logoUrl = null;
        }
      }
      
      try {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO cards (title, url, logo_url, desc, folder, type, source, "order") 
             VALUES (?, ?, ?, ?, ?, 'bookmark', 'browser_import', ?)`,
            [
              bookmark.title.substring(0, 200),
              bookmark.url,
              logoUrl,
              bookmark.description || '',
              bookmark.folder || null,
              Date.now()
            ],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
        existingUrls.add(bookmark.url);
        imported++;
      } catch (err) {
        errors.push({ url: bookmark.url, error: err.message });
      }
    }
    
    res.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除书签
router.delete('/:id', auth, (req, res) => {
  const { id } = req.params;
  
  db.run(
    `DELETE FROM cards WHERE id = ? AND type = 'bookmark'`,
    [id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: '书签不存在' });
      }
      res.json({ success: true });
    }
  );
});

// 批量删除书签
router.post('/batch-delete', auth, (req, res) => {
  const { ids } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '请提供要删除的书签ID' });
  }
  
  const placeholders = ids.map(() => '?').join(',');
  db.run(
    `DELETE FROM cards WHERE id IN (${placeholders}) AND type = 'bookmark'`,
    ids,
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, deleted: this.changes });
    }
  );
});

// 书签转卡片
router.post('/:id/to-card', auth, (req, res) => {
  const { id } = req.params;
  const { menuId, subMenuId } = req.body;
  
  if (!menuId) {
    return res.status(400).json({ error: '请选择目标分类' });
  }
  
  db.run(
    `UPDATE cards SET type = 'card', menu_id = ?, sub_menu_id = ?, folder = NULL, source = 'bookmark_convert'
     WHERE id = ? AND type = 'bookmark'`,
    [menuId, subMenuId || null, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: '书签不存在' });
      }
      res.json({ success: true });
    }
  );
});

// 更新书签
router.put('/:id', auth, (req, res) => {
  const { id } = req.params;
  const { title, url, logo_url, desc, folder } = req.body;
  
  db.run(
    `UPDATE cards SET title = ?, url = ?, logo_url = ?, desc = ?, folder = ?
     WHERE id = ? AND type = 'bookmark'`,
    [title, url, logo_url, desc, folder, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: '书签不存在' });
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;
