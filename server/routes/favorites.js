const express = require('express');
const router = express.Router();
const { getDb } = require('../db/connection');

// Get favorites for a user
router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.query.user_id || 'anonymous';

  const rows = db.prepare(
    `SELECT e.*, f.created_at as favorited_at
     FROM favorites f
     JOIN emojis e ON f.emoji_id = e.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`
  ).all(userId);

  res.json(rows);
});

// Add to favorites
router.post('/', (req, res) => {
  const db = getDb();
  const { user_id, emoji_id } = req.body;
  const userId = user_id || 'anonymous';

  if (!emoji_id) {
    return res.status(400).json({ error: 'emoji_id is required' });
  }

  const emoji = db.prepare('SELECT * FROM emojis WHERE id = ?').get(emoji_id);
  if (!emoji) {
    return res.status(404).json({ error: 'Emoji not found' });
  }

  try {
    db.prepare(
      `INSERT INTO favorites (user_id, emoji_id) VALUES (?, ?)`
    ).run(userId, emoji_id);
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Already favorited' });
    }
    throw err;
  }
});

// Remove from favorites
router.delete('/:emoji_id', (req, res) => {
  const db = getDb();
  const userId = req.query.user_id || 'anonymous';

  const result = db.prepare(
    `DELETE FROM favorites WHERE user_id = ? AND emoji_id = ?`
  ).run(userId, req.params.emoji_id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Favorite not found' });
  }
  res.json({ success: true });
});

module.exports = router;
