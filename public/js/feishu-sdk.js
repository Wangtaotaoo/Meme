let sdkReady = false;

export async function initFeishuSDK() {
  // Check if running inside Feishu client
  if (!window.tt) {
    console.log('Not running inside Feishu client. JSAPI features disabled.');
    return false;
  }

  try {
    const url = encodeURIComponent(window.location.href);
    const config = await fetch(`/api/feishu/jssdk-config?url=${url}`).then(r => r.json());

    await new Promise((resolve, reject) => {
      window.tt.config({
        appId: config.appId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: ['user.info', 'util.openLink'],
        onSuccess: resolve,
        onFail: (err) => reject(new Error(JSON.stringify(err))),
      });
    });

    sdkReady = true;
    console.log('Feishu JSAPI initialized.');
    return true;
  } catch (err) {
    console.error('Failed to init Feishu JSAPI:', err);
    return false;
  }
}

export async function getFeishuUserInfo() {
  if (!sdkReady || !window.tt) return null;

  try {
    const code = await new Promise((resolve, reject) => {
      window.tt.requestAuthCode({
        appId: window.tt.appId,
        onSuccess: (result) => resolve(result.code),
        onFail: (err) => reject(err),
      });
    });

    const userInfo = await fetch(`/api/feishu/user-info?code=${code}`).then(r => r.json());
    return userInfo;
  } catch (err) {
    console.error('Failed to get Feishu user info:', err);
    return null;
  }
}

export function isFeishuEnvironment() {
  return !!window.tt;
}
