const express = require('express');
const router = express.Router();
const { getJsapiConfig, getUserInfo } = require('../services/feishu-auth');
const { sendMessage } = require('../services/image-upload');
const { uploadImageToFeishu } = require('../services/image-upload');
const path = require('path');

// Get JSAPI auth config for frontend
router.get('/jssdk-config', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'url parameter is required' });
    }
    const config = await getJsapiConfig(url);
    res.json(config);
  } catch (err) {
    console.error('Failed to get JSAPI config:', err.message);
    res.status(500).json({ error: 'Failed to get JSAPI config', detail: err.message });
  }
});

// Get user info via auth code
router.get('/user-info', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).json({ error: 'code parameter is required' });
    }
    const userInfo = await getUserInfo(code);
    res.json(userInfo);
  } catch (err) {
    console.error('Failed to get user info:', err.message);
    res.status(500).json({ error: 'Failed to get user info', detail: err.message });
  }
});

// Send emoji to a Feishu chat
router.post('/send-message', async (req, res) => {
  try {
    const { chatId, imageUrl } = req.body;
    if (!chatId || !imageUrl) {
      return res.status(400).json({ error: 'chatId and imageUrl are required' });
    }

    // Resolve the image file path
    let filePath;
    if (imageUrl.startsWith('/uploads/')) {
      filePath = path.resolve('./data', imageUrl.slice(1));
    } else if (imageUrl.startsWith('/assets/')) {
      filePath = path.resolve('./public', imageUrl.slice(1));
    } else {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    const imageKey = await uploadImageToFeishu(filePath, 'emoji.png');
    const result = await sendMessage(chatId, imageKey);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Failed to send message:', err.message);
    res.status(500).json({ error: 'Failed to send message', detail: err.message });
  }
});

module.exports = router;
