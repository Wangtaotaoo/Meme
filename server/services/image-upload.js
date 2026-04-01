const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getTenantAccessToken } = require('./feishu-auth');

const BASE_URL = 'https://open.feishu.cn/open-apis';

async function uploadImageToFeishu(filePath, imageName) {
  const token = await getTenantAccessToken();
  const FormData = require('form-data');

  const form = new FormData();
  form.append('image_type', 'message');
  form.append('image', fs.createReadStream(filePath), imageName);

  const res = await axios.post(`${BASE_URL}/im/v1/images`, form, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders(),
    },
  });

  if (res.data.code !== 0) {
    throw new Error(`Failed to upload image: ${res.data.msg}`);
  }

  return res.data.data.image_key;
}

async function sendMessage(chatId, imageKey) {
  const token = await getTenantAccessToken();

  const res = await axios.post(
    `${BASE_URL}/im/v1/messages?receive_id_type=chat_id`,
    {
      receive_id: chatId,
      msg_type: 'image',
      content: JSON.stringify({ image_key: imageKey }),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (res.data.code !== 0) {
    throw new Error(`Failed to send message: ${res.data.msg}`);
  }

  return res.data.data;
}

module.exports = { uploadImageToFeishu, sendMessage };
