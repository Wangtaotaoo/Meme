import { $, hide, show } from '../utils/dom.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { showToast } from './toast.js';
import { copyImageToClipboard, downloadImage } from '../utils/clipboard.js';

let currentPage = 1;
let hasMore = true;
let isLoading = false;

state.subscribe('emojis', render);

export async function loadEmojis(params = {}) {
  if (isLoading) return;
  isLoading = true;
  show($('#loading'));

  try {
    const result = await api.getEmojis(params);
    const emojis = result.data || [];

    if (params.page === 1 || !params.page) {
      state.set('emojis', emojis);
      currentPage = 1;
    } else {
      const existing = state.get('emojis') || [];
      state.set('emojis', [...existing, ...emojis]);
    }

    hasMore = emojis.length >= (params.limit || 40);
    currentPage = params.page || 1;

    if (emojis.length === 0 && (!params.page || params.page === 1)) {
      show($('#empty-state'));
    } else {
      hide($('#empty-state'));
    }
  } catch (err) {
    showToast('加载表情失败: ' + err.message, 'error');
  } finally {
    isLoading = false;
    hide($('#loading'));
  }
}

function render(emojis = []) {
  const gridEl = $('#emoji-grid');
  if (!gridEl) return;
  gridEl.innerHTML = '';

  const favorites = state.get('favorites') || [];
  const favIds = new Set(favorites.map(f => f.id));

  for (const emoji of emojis) {
    const card = document.createElement('div');
    card.className = 'emoji-card';
    card.dataset.id = emoji.id;

    const img = document.createElement('img');
    img.src = emoji.image_url;
    img.alt = emoji.name;
    img.loading = 'lazy';
    card.appendChild(img);

    const nameLabel = document.createElement('span');
    nameLabel.className = 'card-name';
    nameLabel.textContent = emoji.name;
    card.appendChild(nameLabel);

    if (favIds.has(emoji.id)) {
      const badge = document.createElement('span');
      badge.className = 'fav-badge visible';
      badge.textContent = '\u2605';
      card.appendChild(badge);
    }

    // Click to copy
    card.addEventListener('click', () => handleEmojiClick(emoji));

    // Right click / long press for detail
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      state.set('selectedEmoji', emoji);
    });

    gridEl.appendChild(card);
  }
}

async function handleEmojiClick(emoji) {
  try {
    await copyImageToClipboard(emoji.image_url);
    showToast('已复制到剪贴板，在聊天中粘贴发送', 'success');
  } catch (err) {
    showToast('复制失败，请尝试右键下载', 'error');
  }
}

// Infinite scroll
export function setupInfiniteScroll() {
  const area = $('.emoji-area');
  if (!area) return;

  area.addEventListener('scroll', () => {
    if (isLoading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = area;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      const category = state.get('activeCategory');
      const search = state.get('searchQuery');
      loadEmojis({
        category: category && category !== 'all' ? category : undefined,
        search: search || undefined,
        page: currentPage + 1,
      });
    }
  });
}
