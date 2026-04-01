require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  feishuAppId: process.env.FEISHU_APP_ID || '',
  feishuAppSecret: process.env.FEISHU_APP_SECRET || '',
  dbPath: process.env.DB_PATH || './data/emojis.db',
  uploadDir: process.env.UPLOAD_DIR || './data/uploads',
};
