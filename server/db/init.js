const { getDb } = require('./connection');
const fs = require('fs');
const path = require('path');

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emojis (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      image_url TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'builtin',
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      tags TEXT DEFAULT '',
      uploaded_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      emoji_id TEXT NOT NULL REFERENCES emojis(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, emoji_id)
    );
  `);

  // Remove emojis whose local image file doesn't exist
  const publicDir = path.join(__dirname, '..', '..', 'public');
  const stale = db.prepare(`
    SELECT id, image_url FROM emojis
    WHERE image_url LIKE '/assets/%'
      AND image_url NOT LIKE 'data:%'
  `).all();

  const toDelete = stale.filter(e => {
    const filePath = path.join(publicDir, e.image_url);
    return !fs.existsSync(filePath) || fs.statSync(filePath).size === 0;
  });

  if (toDelete.length > 0) {
    const deleteStmt = db.prepare('DELETE FROM emojis WHERE id = ?');
    db.transaction(() => {
      for (const e of toDelete) deleteStmt.run(e.id);
    })();
    console.log(`Removed ${toDelete.length} emojis with missing image files.`);
  }

  console.log('Database tables initialized.');
}

module.exports = { initDb };
