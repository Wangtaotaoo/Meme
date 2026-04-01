const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { initDb } = require('./db/init');
const { closeDb } = require('./db/connection');

// Initialize database
initDb();

// Ensure upload directory exists
const uploadDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();

// Parse JSON bodies
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/feishu', require('./routes/auth'));
app.use('/api/emojis', require('./routes/emojis'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/upload', require('./routes/upload'));

// SPA fallback: serve index.html for non-API, non-file routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const server = app.listen(config.port, '0.0.0.0', () => {
  const interfaces = require('os').networkInterfaces();
  const localIp = Object.values(interfaces).flat().find(i => i.family === 'IPv4' && !i.internal)?.address || 'localhost';
  console.log(`Server running at:`);
  console.log(`  Local:   http://localhost:${config.port}`);
  console.log(`  Network: http://${localIp}:${config.port}`);
});

process.on('SIGINT', () => {
  closeDb();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  server.close();
  process.exit(0);
});
