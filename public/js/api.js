const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Emojis
  getEmojis(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/emojis${query ? '?' + query : ''}`);
  },
  getEmoji(id) {
    return request(`/emojis/${id}`);
  },
  createEmoji(data) {
    return request('/emojis', { method: 'POST', body: JSON.stringify(data) });
  },
  updateEmoji(id, data) {
    return request(`/emojis/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteEmoji(id) {
    return request(`/emojis/${id}`, { method: 'DELETE' });
  },

  // Categories
  getCategories() {
    return request('/categories');
  },
  createCategory(data) {
    return request('/categories', { method: 'POST', body: JSON.stringify(data) });
  },

  // Favorites
  getFavorites(userId = 'anonymous') {
    return request(`/favorites?user_id=${encodeURIComponent(userId)}`);
  },
  addFavorite(emojiId, userId = 'anonymous') {
    return request('/favorites', {
      method: 'POST',
      body: JSON.stringify({ emoji_id: emojiId, user_id: userId }),
    });
  },
  removeFavorite(emojiId, userId = 'anonymous') {
    return request(`/favorites/${emojiId}?user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },

  // Upload
  uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    return fetch(`${BASE}/upload/emoji`, {
      method: 'POST',
      body: formData,
    }).then(res => {
      if (!res.ok) return res.json().then(err => { throw new Error(err.error); });
      return res.json();
    });
  },
};
