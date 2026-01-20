const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const { paginateQuery } = require('../utils/dbHelpers');
const { triggerDebouncedBackup } = require('../utils/autoBackup');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const result = await paginateQuery('promos', { page, pageSize });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, (req, res) => {
  const { position, img, url } = req.body;
  const clientId = req.headers['x-client-id'];
  db.run('INSERT INTO promos (position, img, url) VALUES (?, ?, ?)', [position, img, url], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    triggerDebouncedBackup(clientId, { type: 'promos_updated' });
    res.json({ id: this.lastID });
  });
});

router.put('/:id', auth, (req, res) => {
  const { img, url } = req.body;
  const clientId = req.headers['x-client-id'];
  db.run('UPDATE promos SET img=?, url=? WHERE id=?', [img, url, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    triggerDebouncedBackup(clientId, { type: 'promos_updated' });
    res.json({ changed: this.changes });
  });
});

router.delete('/:id', auth, (req, res) => {
  const clientId = req.headers['x-client-id'];
  db.run('DELETE FROM promos WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    triggerDebouncedBackup(clientId, { type: 'promos_updated' });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
