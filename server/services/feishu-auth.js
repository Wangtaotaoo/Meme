const axios = require('axios');
const config = require('../config');
const { sha1 } = require('../utils/signature');

const BASE_URL = 'https://open.feishu.cn/open-apis';

let tenantAccessToken = null;
let tokenExpiresAt = 0;

let jsapiTicket = null;
let ticketExpiresAt = 0;

async function getTenantAccessToken() {
  if (tenantAccessToken && Date.now() < tokenExpiresAt) {
    return tenantAccessToken;
  }

  const res = await axios.post(`${BASE_URL}/auth/v3/tenant_access_token/internal`, {
    app_id: config.feishuAppId,
    app_secret: config.feishuAppSecret,
  });

  if (res.data.code !== 0) {
    throw new Error(`Failed to get tenant_access_token: ${res.data.msg}`);
  }

  tenantAccessToken = res.data.tenant_access_token;
  tokenExpiresAt = Date.now() + (res.data.expire - 300) * 1000; // 5 min buffer
  return tenantAccessToken;
}

async function getJsapiTicket() {
  if (jsapiTicket && Date.now() < ticketExpiresAt) {
    return jsapiTicket;
  }

  const token = await getTenantAccessToken();
  const res = await axios.get(`${BASE_URL}/jsapi/ticket/get`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.data.code !== 0) {
    throw new Error(`Failed to get jsapi_ticket: ${res.data.msg}`);
  }

  jsapiTicket = res.data.data.ticket;
  ticketExpiresAt = Date.now() + (res.data.data.expire_in - 300) * 1000;
  return jsapiTicket;
}

async function getJsapiConfig(url) {
  const ticket = await getJsapiTicket();
  const nonceStr = Math.random().toString(36).slice(2, 15);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const signatureStr = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  const signature = sha1(signatureStr);

  return {
    appId: config.feishuAppId,
    timestamp,
    nonceStr,
    signature,
  };
}

async function getUserInfo(code) {
  const token = await getTenantAccessToken();
  const res = await axios.post(
    `${BASE_URL}/authen/v1/oidc/access_token`,
    { grant_type: 'authorization_code', code },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.data.code !== 0) {
    throw new Error(`Failed to get user token: ${res.data.msg}`);
  }

  const userToken = res.data.data.access_token;
  const userRes = await axios.get(`${BASE_URL}/authen/v1/user_info`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });

  if (userRes.data.code !== 0) {
    throw new Error(`Failed to get user info: ${userRes.data.msg}`);
  }

  return userRes.data.data;
}

module.exports = { getTenantAccessToken, getJsapiTicket, getJsapiConfig, getUserInfo };
