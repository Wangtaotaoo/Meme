import { $, show, hide } from '../utils/dom.js';
import { state } from '../state.js';
import { api } from '../api.js';
import { showToast } from './toast.js';
import { copyImageToClipboard, downloadImage } from '../utils/clipboard.js';
import { loadEmojis } from './emoji-grid.js';

let currentEmoji = null;

state.subscribe('selectedEmoji', open);

function getModalEl() { return $('#emoji-detail-modal'); }

function open(emoji) {
  if (!emoji) return;
  currentEmoji = emoji;

  const modalEl = getModalEl();
  const detailImg = $('#detail-image');
  const detailName = $('#detail-name');
  const detailTags = $('#detail-tags');
  const deleteBtn = $('#detail-delete');
  const favoriteBtn = $('#detail-favorite');

  detailImg.src = emoji.image_url;
  detailName.textContent = emoji.name;
  detailTags.textContent = emoji.tags ? emoji.tags.split(',').map(t => `#${t.trim()}`).join(' ') : '';

  // Show/hide delete button for user-uploaded emojis
  if (emoji.source === 'user') {
    show(deleteBtn);
  } else {
    hide(deleteBtn);
  }

  // Update favorite button text
  const favorites = state.get('favorites') || [];
  const isFav = favorites.some(f => f.id === emoji.id);
  favoriteBtn.textContent = isFav ? '取消收藏' : '收藏';

  show(modalEl);
}

function close() {
  hide(getModalEl());
  currentEmoji = null;
  state.set('selectedEmoji', null);
}

export function initEmojiDetail() {
  const closeBtn = $('#detail-close');
  const copyBtn = $('#detail-copy');
  const downloadBtn = $('#detail-download');
  const favoriteBtn = $('#detail-favorite');
  const deleteBtn = $('#detail-delete');

  closeBtn.addEventListener('click', close);

  getModalEl().addEventListener('click', (e) => {
    if (e.target === getModalEl()) close();
  });

  copyBtn.addEventListener('click', async () => {
    if (!currentEmoji) return;
    try {
      await copyImageToClipboard(currentEmoji.image_url);
      showToast('已复制到剪贴板', 'success');
    } catch (err) {
      showToast('复制失败', 'error');
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (!currentEmoji) return;
    downloadImage(currentEmoji.image_url, `${currentEmoji.slug || currentEmoji.name}.png`);
    showToast('开始下载', 'success');
  });

  favoriteBtn.addEventListener('click', async () => {
    if (!currentEmoji) return;
    try {
      const favorites = state.get('favorites') || [];
      const isFav = favorites.some(f => f.id === currentEmoji.id);

      if (isFav) {
        await api.removeFavorite(currentEmoji.id);
        showToast('已取消收藏', 'success');
      } else {
        await api.addFavorite(currentEmoji.id);
        showToast('已收藏', 'success');
      }
      // Refresh favorites
      const favs = await api.getFavorites();
      state.set('favorites', favs);
      // Re-render emoji grid to update badges
      const emojis = state.get('emojis') || [];
      state.set('emojis', [...emojis]);
      close();
    } catch (err) {
      showToast('操作失败: ' + err.message, 'error');
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if (!currentEmoji) return;
    if (!confirm(`确定删除表情 "${currentEmoji.name}" 吗？`)) return;

    try {
      await api.deleteEmoji(currentEmoji.id);
      showToast('已删除', 'success');
      close();
      // Refresh grid
      const category = state.get('activeCategory');
      const search = state.get('searchQuery');
      loadEmojis({
        category: category && category !== 'all' ? category : undefined,
        search: search || undefined,
        page: 1,
      });
    } catch (err) {
      showToast('删除失败: ' + err.message, 'error');
    }
  });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentEmoji) close();
  });
}
