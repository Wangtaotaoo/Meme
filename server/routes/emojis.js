const express = require('express');
const router = express.Router();
const { getDb } = require('../db/connection');

// List emojis with filtering, search, and pagination
router.get('/', (req, res) => {
  const db = getDb();
  const { category, search, page = '1', limit = '250' } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 250));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = [];
  let params = [];

  if (category) {
    if (category === 'favorites') {
      // handled by favorites route
      return res.json({ data: [], total: 0, page: pageNum, limit: limitNum });
    }
    whereClauses.push('e.category_id = ?');
    params.push(category);
  }

  if (search) {
    whereClauses.push('(e.name LIKE ? OR e.tags LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term);
  }

  const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM emojis e ${whereStr}`).get(...params);
  const rows = db.prepare(
    `SELECT e.*, GROUP_CONCAT(f.user_id) as favorited_by_users
     FROM emojis e
     LEFT JOIN favorites f ON e.id = f.emoji_id
     ${whereStr}
     GROUP BY e.id
     ORDER BY e.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limitNum, offset);

  res.json({
    data: rows,
    total: countRow.total,
    page: pageNum,
    limit: limitNum,
  });
});

// Get single emoji
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(
    `SELECT e.*, GROUP_CONCAT(f.user_id) as favorited_by_users
     FROM emojis e
     LEFT JOIN favorites f ON e.id = f.emoji_id
     WHERE e.id = ?
     GROUP BY e.id`
  ).get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: 'Emoji not found' });
  }
  res.json(row);
});

// Create emoji
router.post('/', (req, res) => {
  const db = getDb();
  const { id, name, slug, image_url, source, category_id, tags, uploaded_by } = req.body;

  if (!name || !slug || !image_url) {
    return res.status(400).json({ error: 'name, slug, and image_url are required' });
  }

  const emojiId = id || `emoji_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    db.prepare(
      `INSERT INTO emojis (id, name, slug, image_url, source, category_id, tags, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(emojiId, name, slug, image_url, source || 'user', category_id || null, tags || '', uploaded_by || '');

    const emoji = db.prepare('SELECT * FROM emojis WHERE id = ?').get(emojiId);
    res.status(201).json(emoji);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    throw err;
  }
});

// Update emoji
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, slug, category_id, tags } = req.body;

  const existing = db.prepare('SELECT * FROM emojis WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Emoji not found' });
  }

  try {
    db.prepare(
      `UPDATE emojis SET name = ?, slug = ?, category_id = ?, tags = ? WHERE id = ?`
    ).run(
      name || existing.name,
      slug || existing.slug,
      category_id !== undefined ? category_id : existing.category_id,
      tags !== undefined ? tags : existing.tags,
      req.params.id
    );

    const emoji = db.prepare('SELECT * FROM emojis WHERE id = ?').get(req.params.id);
    res.json(emoji);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    throw err;
  }
});

// Delete emoji
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM emojis WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Emoji not found' });
  }
  res.json({ success: true });
});

module.exports = router;
