const express = require('express');
const router = express.Router();
const { getDb } = require('../db/connection');

// List categories
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    `SELECT c.*, (SELECT COUNT(*) FROM emojis WHERE category_id = c.id) as emoji_count
     FROM categories c
     ORDER BY c.sort_order ASC, c.created_at ASC`
  ).all();
  res.json(rows);
});

// Create category
router.post('/', (req, res) => {
  const db = getDb();
  const { id, name, icon, sort_order } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const catId = id || `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  db.prepare(
    `INSERT INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)`
  ).run(catId, name, icon || '', sort_order || 0);

  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(catId);
  res.status(201).json(cat);
});

// Update category
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, icon, sort_order } = req.body;

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Category not found' });
  }

  db.prepare(
    `UPDATE categories SET name = ?, icon = ?, sort_order = ? WHERE id = ?`
  ).run(
    name || existing.name,
    icon !== undefined ? icon : existing.icon,
    sort_order !== undefined ? sort_order : existing.sort_order,
    req.params.id
  );

  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json(cat);
});

// Delete category
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json({ success: true });
});

module.exports = router;
